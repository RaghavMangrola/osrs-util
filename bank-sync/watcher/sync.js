#!/usr/bin/env node
/**
 * Watches RuneLite profiles2 directory for bank memory changes
 * and syncs all accounts to the Cloudflare Worker.
 *
 * Usage: node sync.js
 * Env vars:
 *   BANK_WORKER_URL  - e.g. https://bank-sync.your-subdomain.workers.dev
 *   BANK_AUTH_SECRET - bearer token matching the Worker's AUTH_SECRET
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { extractAccounts, buildSyncPayload } = require('./parse');

const LOG_FILE = path.join(__dirname, 'sync.log');
const _log = console.log.bind(console);
console.log = (...args) => {
  const line = args.join(' ');
  _log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
};
console.error = (...args) => {
  const line = '[ERROR] ' + args.join(' ');
  _log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
};

const PROFILES_DIR = path.join(process.env.USERPROFILE, '.runelite', 'profiles2');
const RSPROFILE = path.join(PROFILES_DIR, '$rsprofile--1.properties');
// Local, append-only supply history consumed by Hermes (~/Documents/Hermes).
const HISTORY_FILE = path.join(process.env.USERPROFILE, 'Documents', 'Hermes', 'dwms-history.jsonl');
const WORKER_URL = process.env.BANK_WORKER_URL;
const AUTH_SECRET = process.env.BANK_AUTH_SECRET;
const POLL_MS = 10 * 60 * 1000;

if (!WORKER_URL || !AUTH_SECRET) {
  console.error('Missing BANK_WORKER_URL or BANK_AUTH_SECRET env vars');
  process.exit(1);
}

// Track last uploaded payload hash to avoid redundant uploads
let lastPayloadHash = null;

// Per-account item signature of the last recorded history snapshot, so we only
// append a line when that account's items actually change.
const lastItemSig = new Map();

// --- Aggregation ---

function extractAllAccounts() {
  const content = fs.readFileSync(RSPROFILE, 'utf-8');
  const accounts = extractAccounts(content);
  return buildSyncPayload(accounts);
}

// --- Local history (SCRAPPED FEATURE) ---
//
// These functions fed the Hermes "Supplies" burn-rate tab, which was scrapped.
// They are kept intact but no longer called (see the disabled calls in sync()
// and main). They have no effect unless re-enabled.

// Stable signature for an item list (order-independent).
function itemsSig(items) {
  return JSON.stringify([...items].sort((a, b) => a.id - b.id));
}

// Seed per-account signatures from the existing history file so a watcher
// restart doesn't re-append unchanged snapshots.
function seedHistoryState() {
  if (!fs.existsSync(HISTORY_FILE)) return;
  for (const line of fs.readFileSync(HISTORY_FILE, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      if (rec.hash && Array.isArray(rec.items)) lastItemSig.set(rec.hash, itemsSig(rec.items));
    } catch { /* ignore malformed line */ }
  }
}

// Append a snapshot line per account whose items changed since last recorded.
function recordHistory(accounts) {
  let appended = 0;
  for (const acct of accounts) {
    const sig = itemsSig(acct.items);
    if (lastItemSig.get(acct.hash) === sig) continue;
    lastItemSig.set(acct.hash, sig);
    const rec = {
      ts: new Date().toISOString(),
      hash: acct.hash,
      name: acct.name,
      snapshotTime: acct.snapshotTime,
      items: acct.items,
    };
    if (appended === 0) fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.appendFileSync(HISTORY_FILE, JSON.stringify(rec) + '\n');
    appended++;
  }
  if (appended) console.log(`[${ts()}] Recorded ${appended} history snapshot(s)`);
}

// --- Upload ---

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h.toString(16);
}

function post(url, body, secret) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;

    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${secret}`,
      },
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sync(reason) {
  let accounts;
  try {
    accounts = extractAllAccounts();
  } catch (err) {
    console.error(`[${ts()}] Failed to parse profiles:`, err.message);
    return;
  }

  if (accounts.length === 0) {
    console.log(`[${ts()}] No accounts found, skipping`);
    return;
  }

  // SCRAPPED FEATURE: local supply history. recordHistory() is left intact but
  // no longer called — the Hermes "Supplies" burn-rate tab it fed was scrapped
  // (short-window noise + equip/withdraw churn made the rates untrustworthy).
  // To revive: uncomment the call below and seedHistoryState() in main, and
  // re-wire the Supplies tab in hermes/. See bank-sync/CLAUDE.md.
  // try {
  //   recordHistory(accounts);
  // } catch (err) {
  //   console.error(`[${ts()}] Failed to record history:`, err.message);
  // }

  const payload = { accounts };
  const hash = simpleHash(JSON.stringify(payload));

  if (hash === lastPayloadHash) {
    console.log(`[${ts()}] No changes detected (${reason}), skipping upload`);
    return;
  }

  try {
    const res = await post(`${WORKER_URL}/bank`, payload, AUTH_SECRET);
    if (res.status === 200 || res.status === 201) {
      lastPayloadHash = hash;
      console.log(`[${ts()}] Synced ${accounts.length} accounts (${reason}) — ${res.body}`);
    } else {
      console.error(`[${ts()}] Upload failed: HTTP ${res.status} — ${res.body}`);
    }
  } catch (err) {
    console.error(`[${ts()}] Upload error:`, err.message);
  }
}

function ts() {
  return new Date().toLocaleTimeString();
}

// --- Main ---

console.log(`[${ts()}] Starting bank-sync watcher`);
console.log(`[${ts()}] Watching: ${PROFILES_DIR}`);
console.log(`[${ts()}] Worker:   ${WORKER_URL}`);

// Initial sync then poll every 10 minutes
// seedHistoryState();  // disabled with the scrapped supply-history feature (see above)
sync('startup');
setInterval(() => sync('poll'), POLL_MS);

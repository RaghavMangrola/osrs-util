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

const PROFILES_DIR = path.join(process.env.USERPROFILE || 'C:/Users/raghav', '.runelite', 'profiles2');
const WORKER_URL = process.env.BANK_WORKER_URL;
const AUTH_SECRET = process.env.BANK_AUTH_SECRET;
const HOURLY_MS = 60 * 60 * 1000;
const DEBOUNCE_MS = 3000;

if (!WORKER_URL || !AUTH_SECRET) {
  console.error('Missing BANK_WORKER_URL or BANK_AUTH_SECRET env vars');
  process.exit(1);
}

// Track last uploaded payload hash to avoid redundant uploads
let lastPayloadHash = null;
let debounceTimer = null;

// --- Parsing ---

function parseProperties(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    result[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1);
  }
  return result;
}

function unescapePropertiesValue(value) {
  return value.replace(/\\:/g, ':').replace(/\\#/g, '#');
}

function parseNameMap(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(unescapePropertiesValue(raw));
  } catch {
    return {};
  }
}

function parseCurrentList(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(unescapePropertiesValue(raw));
  } catch {
    return [];
  }
}

function parseItemData(itemDataStr) {
  const parts = itemDataStr.replace(/,$/, '').split(',');
  const items = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const id = parseInt(parts[i]);
    const qty = parseInt(parts[i + 1]);
    if (!isNaN(id) && !isNaN(qty)) items.push({ id, qty });
  }
  return items;
}

// --- Aggregation ---

function extractAllAccounts() {
  const files = fs.readdirSync(PROFILES_DIR).filter(
    f => f.endsWith('.properties') && !f.startsWith('._')
  );

  // Map of hash -> latest snapshot across all profile files
  const latestByHash = {};
  // Map of hash -> name (from any nameMap that has it)
  const nameByHash = {};

  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(path.join(PROFILES_DIR, file), 'utf-8');
    } catch {
      continue;
    }

    const props = parseProperties(content);
    const nameMap = parseNameMap(props['bankMemory.nameMap']);
    const list = parseCurrentList(props['bankMemory.currentList']);

    // Merge names
    for (const [key, name] of Object.entries(nameMap)) {
      nameByHash[key] = name;
    }

    // Keep latest snapshot per account hash
    for (const entry of list) {
      const hash = entry.accountIdentifier;
      if (!hash) continue;
      const existing = latestByHash[hash];
      if (!existing || entry.id > existing.id) {
        latestByHash[hash] = entry;
      }
    }
  }

  // Build output
  return Object.values(latestByHash).map(entry => ({
    hash: entry.accountIdentifier,
    name: nameByHash[entry.accountIdentifier] || entry.accountIdentifier,
    worldType: entry.worldType,
    snapshotTime: entry.dateTimeString,
    items: parseItemData(entry.itemData),
  }));
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

// Initial sync
sync('startup');

// Hourly fallback
setInterval(() => sync('hourly'), HOURLY_MS);

// File watcher with debounce
try {
  fs.watch(PROFILES_DIR, { persistent: true }, (event, filename) => {
    if (!filename || !filename.endsWith('.properties')) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => sync(`file change: ${filename}`), DEBOUNCE_MS);
  });
  console.log(`[${ts()}] File watcher active`);
} catch (err) {
  console.warn(`[${ts()}] Could not watch directory: ${err.message} — hourly sync only`);
}

// Revenant dragon "luck / dryness" readout for the Slayer tab.
//
// Reads the RuneLite Loot Tracker log (~/.runelite/loots/<accountHash>/npc/
// revenant dragon.log — one JSON object per kill) and computes kill count, loot
// value, the notable uniques received, and how dry the account is on the marquee
// uniques (the three Ancient Warriors' weapons + amulet of avarice).
//
// Drop rates are the OSRS Wiki "Unique (on-task)" table for a *skulled* player —
// the account hunts Revenants on a Krystilia slayer task and is usually skulled.

import fs from 'node:fs';
import path from 'node:path';

export const LOOTS_DIR = 'C:/Users/raghav/.runelite/loots';
const REVENANT_LOG = path.join('npc', 'revenant dragon.log');

// Per-kill probabilities — OSRS Wiki, Revenant dragon, Unique (on-task), skulled.
// The unique table is rolled 1/586.6; when it hits, avarice is 2/5 and each weapon 1/5.
export const RATES = {
  weaponEach: 1 / 2933, // a specific weapon (Craw's / Viggora's / Thammaron's)
  weaponAny: 3 / 2933, // any of the three weapons
  avarice: 1 / 1466.5, // amulet of avarice
  uniqueTable: 1 / 586.6, // any weapon OR avarice
};

const WEAPON_NAMES = ["Craw's bow (u)", "Viggora's chainmace (u)", "Thammaron's sceptre (u)"];
const BRACELET = 'Bracelet of ethereum (uncharged)';

// Rare-table items pinpointed to the exact kill they dropped on (these are rare
// enough to list individually). The common Bracelet of ethereum is counted, not
// listed (it would be dozens of entries).
const RARE_NAMES = new Set([
  'Amulet of avarice',
  ...WEAPON_NAMES,
  'Ancient relic',
  'Ancient statuette',
  'Ancient totem',
  'Ancient medallion',
  'Ancient effigy',
  'Ancient emblem',
  'Ancient crystal',
]);

/** Parse a loot log body (JSONL, one kill per line). Skips blank/corrupt lines. */
export function parseLootLog(content) {
  const kills = [];
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      kills.push(JSON.parse(trimmed));
    } catch {
      // Ignore a partially-written line.
    }
  }
  return kills;
}

/** Dryness stats for a target with per-kill probability `p` over `kc` kills. */
function dryness(label, p, kc, got) {
  const pStillZero = Math.pow(1 - p, kc);
  return {
    label,
    oneIn: Math.round(1 / p),
    got,
    expected: kc * p,
    // Fraction of (on-task, skulled) players who would already have it by now.
    wouldHaveByNow: 1 - pStillZero,
    // Fraction who would still be empty — your company in the dry club.
    stillDry: pStillZero,
  };
}

/** Build the luck summary from a revenant dragon loot log body (pure, testable). */
export function buildRevenantLuck(content) {
  const kills = parseLootLog(content);
  const killCount = kills.length;

  let totalValue = 0;
  let braceletCount = 0;
  let avariceCount = 0;
  let weaponCount = 0;
  // Each rare-table drop, pinned to the kill it landed on (1-based KC).
  const rareHits = [];

  kills.forEach((k, i) => {
    for (const d of k.drops || []) {
      totalValue += d.quantity * d.price;
      if (d.name === BRACELET) braceletCount += d.quantity;
      if (RARE_NAMES.has(d.name)) {
        rareHits.push({ name: d.name, killNumber: i + 1, date: k.date ?? null });
        if (d.name === 'Amulet of avarice') avariceCount += d.quantity;
        if (WEAPON_NAMES.includes(d.name)) weaponCount += d.quantity;
      }
    }
  });

  return {
    killCount,
    totalValue,
    gpPerKill: killCount > 0 ? Math.round(totalValue / killCount) : 0,
    firstKill: killCount > 0 ? kills[0].date ?? null : null,
    lastKill: killCount > 0 ? kills[killCount - 1].date ?? null : null,
    braceletCount,
    // Newest-first so the latest unique is at the top.
    rareHits: rareHits.reverse(),
    dryness: [
      dryness('Any revenant weapon', RATES.weaponAny, killCount, weaponCount),
      dryness('A specific weapon', RATES.weaponEach, killCount, weaponCount),
      dryness('Amulet of avarice', RATES.avarice, killCount, avariceCount),
    ],
  };
}

/**
 * Find the loot log to use: the loots/<accountHash>/npc/revenant dragon.log with
 * the most kills (the funmaxxing account is the one farming revenants). Returns
 * { account, content } or throws if no revenant dragon log exists.
 */
export function readRevenantLog(dir = LOOTS_DIR) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    throw new Error(`Failed to read ${dir}: ${e.message}`);
  }

  let best = null; // { account, content, kc }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const logPath = path.join(dir, entry.name, REVENANT_LOG);
    let content;
    try {
      content = fs.readFileSync(logPath, 'utf8');
    } catch {
      continue;
    }
    const kc = parseLootLog(content).length;
    if (kc === 0) continue;
    if (best === null || kc > best.kc) best = { account: entry.name, content, kc };
  }

  if (best === null) {
    throw new Error(`No "revenant dragon" loot log found under ${dir}`);
  }
  return { account: best.account, content: best.content };
}

export function getRevenantLuck() {
  const { account, content } = readRevenantLog();
  return { account, ...buildRevenantLuck(content) };
}

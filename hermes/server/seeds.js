// Herb seed bank counts from the "Dude Where's My Stuff" plugin data.
// Ported from src-tauri/src/lib.rs (get_herb_seeds, extract_funmaxxing_items).

import fs from 'node:fs';
import path from 'node:path';
import { parseProperties, parseItemList } from './dwms.js';

export const PROFILES_DIR = 'C:/Users/raghav/.runelite/profiles2';
export const RSPROFILE_FILE = '$rsprofile--1.properties';
const FUNMAXXING_DISPLAY_NAME = 'funmaxxing';

const DWMS_PREFIX = 'dudewheresmystuff.rsprofile.';
const DISPLAY_NAME_PREFIX = 'rsprofile.rsprofile.';

export const HERB_SEED_IDS = [
  [5291, 'GUAM'],
  [5292, 'MARRENTILL'],
  [5293, 'TARROMIN'],
  [5294, 'HARRALANDER'],
  [5295, 'RANARR'],
  [5296, 'TOADFLAX'],
  [5297, 'IRIT'],
  [5298, 'AVANTOE'],
  [5299, 'KWUARM'],
  [5300, 'SNAPDRAGON'],
  [5301, 'CADANTINE'],
  [5302, 'LANTADYME'],
  [5303, 'DWARF_WEED'],
  [5304, 'TORSTOL'],
];

/** Format epoch milliseconds as "YYYY-MM-DD HH:MM:SS UTC". */
export function formatEpochMs(ms) {
  // toISOString -> "YYYY-MM-DDTHH:MM:SS.sssZ"
  const iso = new Date(ms).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

/**
 * Resolve the funmaxxing account's herb-seed-bearing storages (bank + seed vault)
 * from the rsprofile properties content, merging quantities across both. Returns
 * `{ items: Map<id, qty>, timestamp: number|null }` for the freshest matching hash.
 * Throws if no funmaxxing account / storage is present.
 */
export function extractFunmaxxingItems(content) {
  const props = parseProperties(content);

  // The same display name can map to multiple profile hashes (alts).
  const hashes = [];
  for (const [key, value] of Object.entries(props)) {
    if (!key.startsWith(DISPLAY_NAME_PREFIX)) continue;
    const rest = key.slice(DISPLAY_NAME_PREFIX.length);
    if (!rest.endsWith('.displayName')) continue;
    if (value.trim() === FUNMAXXING_DISPLAY_NAME) {
      hashes.push(rest.slice(0, -'.displayName'.length));
    }
  }
  if (hashes.length === 0) {
    throw new Error(`No account named '${FUNMAXXING_DISPLAY_NAME}' found`);
  }

  let best = null; // { timestamp, items: Map }
  for (const hash of hashes) {
    const storages = [`${DWMS_PREFIX}${hash}.world.bank`, `${DWMS_PREFIX}${hash}.world.seedvault`]
      .filter((k) => props[k] !== undefined)
      .map((k) => parseItemList(props[k]));
    if (storages.length === 0) continue;

    const merged = new Map();
    let timestamp = null;
    for (const { timestamp: ts, items } of storages) {
      if (ts != null) timestamp = timestamp == null ? ts : Math.max(timestamp, ts);
      for (const { id, qty } of items) merged.set(id, (merged.get(id) || 0) + qty);
    }

    if (best === null || (timestamp || 0) > (best.timestamp || 0)) {
      best = { timestamp, items: merged };
    }
  }

  if (best === null) {
    throw new Error(`No bank or seed vault data found for '${FUNMAXXING_DISPLAY_NAME}'`);
  }
  return best;
}

/** Build the seed counts + snapshot date from rsprofile content (pure, testable). */
export function buildSeedData(content) {
  const { items, timestamp } = extractFunmaxxingItems(content);
  const seeds = HERB_SEED_IDS.map(([id, herb]) => ({
    herb,
    itemId: id,
    quantity: Math.max(0, items.get(id) || 0),
  }));
  const snapshotDate = timestamp != null ? formatEpochMs(timestamp) : 'unknown';
  return { seeds, snapshotDate };
}

export function getHerbSeeds() {
  const file = path.join(PROFILES_DIR, RSPROFILE_FILE);
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (e) {
    throw new Error(`Failed to read ${file}: ${e.message}`);
  }
  return buildSeedData(content);
}

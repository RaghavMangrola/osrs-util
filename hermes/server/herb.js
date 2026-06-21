// Farm-run herb preset commands. Ported from src-tauri/src/lib.rs
// (get_current_herb, update_herb, get_valid_herbs). Reads/writes the RuneLite
// Hydra farming plugin properties file in place, preserving its line endings.

import fs from 'node:fs';

export const HERB_PROPERTIES_FILE =
  'C:/Users/raghav/.runelite/hydraprofiles/GIM-40957150339800.properties';

// All eight farm-run patch keys are set to the same herb.
export const HERB_KEYS = [
  'hydrafarmrun.herbCatherby',
  'hydrafarmrun.herbArdougne',
  'hydrafarmrun.herbHosidius',
  'hydrafarmrun.herbPortPhasmatys',
  'hydrafarmrun.herbTrollStronghold',
  'hydrafarmrun.herbVarlamore',
  'hydrafarmrun.herbFalador',
  'hydrafarmrun.herbWeiss',
];

export const VALID_HERBS = [
  'GUAM', 'MARRENTILL', 'TARROMIN', 'HARRALANDER', 'RANARR', 'TOADFLAX',
  'IRIT', 'AVANTOE', 'KWUARM', 'SNAPDRAGON', 'CADANTINE', 'LANTADYME',
  'DWARF_WEED', 'TORSTOL',
];

export function getValidHerbs() {
  return [...VALID_HERBS];
}

/**
 * Split like Rust's `str::lines()`: break on \n (and a preceding \r), and treat a
 * trailing line ending as optional so a final newline doesn't yield an empty line.
 */
export function splitLines(content) {
  const lines = content.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  if (content.endsWith('\n')) lines.pop();
  return lines;
}

export function getCurrentHerb() {
  if (!fs.existsSync(HERB_PROPERTIES_FILE)) {
    throw new Error(`Properties file not found: ${HERB_PROPERTIES_FILE}`);
  }
  const content = fs.readFileSync(HERB_PROPERTIES_FILE, 'utf8');
  const target = HERB_KEYS[0];
  for (const line of splitLines(content)) {
    const trimmed = line.trim();
    if (trimmed.startsWith(target + '=')) {
      return trimmed.slice(target.length + 1).trim();
    }
  }
  throw new Error(`Key ${target} not found in properties file`);
}

/**
 * Pure core of update_herb: rewrite every HERB_KEYS line to `herbUpper`,
 * preserving line endings. Returns the new content, the previous herb (from the
 * first matched key), and how many keys were updated.
 */
export function applyHerbUpdate(content, herbUpper) {
  const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
  let oldHerb = '';
  let keysUpdated = 0;
  const newLines = [];

  for (const line of splitLines(content)) {
    const trimmed = line.trim();
    let matched = false;
    for (const key of HERB_KEYS) {
      if (trimmed.startsWith(key + '=')) {
        if (oldHerb === '') oldHerb = trimmed.slice(key.length + 1).trim();
        newLines.push(`${key}=${herbUpper}`);
        keysUpdated += 1;
        matched = true;
        break;
      }
    }
    if (!matched) newLines.push(line);
  }

  return { content: newLines.join(lineEnding), oldHerb, keysUpdated };
}

export function updateHerb({ herb }) {
  const herbUpper = String(herb ?? '').trim().toUpperCase().replace(/ /g, '_');
  if (!VALID_HERBS.includes(herbUpper)) {
    throw new Error(`Invalid herb: ${herb}. Valid herbs: ${VALID_HERBS.join(', ')}`);
  }
  if (!fs.existsSync(HERB_PROPERTIES_FILE)) {
    throw new Error(`Properties file not found: ${HERB_PROPERTIES_FILE}`);
  }
  const content = fs.readFileSync(HERB_PROPERTIES_FILE, 'utf8');
  const { content: newContent, oldHerb, keysUpdated } = applyHerbUpdate(content, herbUpper);
  fs.writeFileSync(HERB_PROPERTIES_FILE, newContent);
  return { oldHerb, newHerb: herbUpper, keysUpdated };
}

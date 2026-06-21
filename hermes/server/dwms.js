// DWMS ("Dude Where's My Stuff") property parsing.
//
// Vendored from bank-sync/watcher/parse.js to keep the Hermes server
// self-contained (the old Rust backend likewise kept its own copy of this
// logic). If the parsing rules change, update both copies. The shared format is
// documented in bank-sync/CLAUDE.md.

/** Parse a `key=value` properties file into a plain object. Skips blank lines and `#`/`!` comments. */
export function parseProperties(content) {
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

/**
 * Parse a DWMS storage value: an optional `<epochMs>;` prefix followed by a
 * comma-separated `<itemId>x<qty>` list. `-1` ids (empty slots) are dropped.
 * Returns `{ timestamp, items }` where items is `[{ id, qty }]`.
 */
export function parseItemList(raw) {
  if (!raw) return { timestamp: null, items: [] };

  let timestamp = null;
  let itemStr = raw;

  const semiIdx = raw.indexOf(';');
  if (semiIdx !== -1) {
    const maybeTs = raw.slice(0, semiIdx);
    if (/^\d+$/.test(maybeTs)) {
      timestamp = parseInt(maybeTs);
      itemStr = raw.slice(semiIdx + 1);
    }
  }

  const items = [];
  for (const part of itemStr.split(',')) {
    const xIdx = part.indexOf('x');
    if (xIdx === -1) continue;
    const id = parseInt(part.slice(0, xIdx));
    const qty = parseInt(part.slice(xIdx + 1));
    if (isNaN(id) || isNaN(qty)) continue;
    if (id === -1) continue;
    items.push({ id, qty });
  }

  return { timestamp, items };
}

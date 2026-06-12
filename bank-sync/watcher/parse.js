const fs = require('fs');
const path = require('path');

const DWMS_PREFIX = 'dudewheresmystuff.rsprofile.';
const DISPLAY_NAME_PREFIX = 'rsprofile.rsprofile.';

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

function parseItemList(raw) {
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

function extractDisplayNames(props) {
  const names = {};
  for (const [key, value] of Object.entries(props)) {
    if (!key.startsWith(DISPLAY_NAME_PREFIX)) continue;
    const rest = key.slice(DISPLAY_NAME_PREFIX.length);
    if (rest.endsWith('.displayName')) {
      const hash = rest.slice(0, -'.displayName'.length);
      names[hash] = value;
    }
  }
  return names;
}

function extractAccounts(content) {
  const props = parseProperties(content);
  const displayNames = extractDisplayNames(props);
  const accounts = {};

  for (const [key, value] of Object.entries(props)) {
    if (!key.startsWith(DWMS_PREFIX)) continue;

    const rest = key.slice(DWMS_PREFIX.length);
    const dotIdx = rest.indexOf('.');
    if (dotIdx === -1) continue;

    const hash = rest.slice(0, dotIdx);
    const field = rest.slice(dotIdx + 1);

    if (!accounts[hash]) accounts[hash] = { hash, displayName: displayNames[hash] || null, storages: {}, meta: {} };

    const secondDot = field.indexOf('.');
    if (secondDot === -1) {
      accounts[hash].meta[field] = value;
    } else {
      const category = field.slice(0, secondDot);
      const storage = field.slice(secondDot + 1);
      if (!accounts[hash].storages[category]) accounts[hash].storages[category] = {};
      accounts[hash].storages[category][storage] = value;
    }
  }

  return accounts;
}

function mergeItems(...itemLists) {
  const byId = new Map();
  for (const items of itemLists) {
    for (const { id, qty } of items) {
      byId.set(id, (byId.get(id) || 0) + qty);
    }
  }
  return [...byId.entries()].map(([id, qty]) => ({ id, qty }));
}

function buildSyncPayload(accounts) {
  return Object.values(accounts).map(account => {
    const bankRaw = account.storages.world?.bank;
    const seedVaultRaw = account.storages.world?.seedvault;
    if (!bankRaw && !seedVaultRaw) return null;

    const bank = parseItemList(bankRaw);
    const seedVault = parseItemList(seedVaultRaw);

    return {
      hash: account.hash,
      name: account.displayName || account.hash,
      snapshotTime: Math.max(bank.timestamp || 0, seedVault.timestamp || 0) || null,
      items: mergeItems(bank.items, seedVault.items),
    };
  }).filter(Boolean);
}

module.exports = { parseProperties, parseItemList, extractAccounts, buildSyncPayload };

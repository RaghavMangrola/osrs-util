import { test } from 'node:test';
import assert from 'node:assert';

import { formatEpochMs, buildSeedData, extractFunmaxxingItems } from './seeds.js';

test('formatEpochMs renders "YYYY-MM-DD HH:MM:SS UTC"', () => {
  assert.equal(formatEpochMs(1700000000000), '2023-11-14 22:13:20 UTC');
});

test('buildSeedData merges bank + seed vault quantities for funmaxxing', () => {
  const hash = 'abc123';
  const content = [
    `rsprofile.rsprofile.${hash}.displayName=funmaxxing`,
    // bank: 10 guam (5291), 100 ranarr (5295), plus an empty slot
    `dudewheresmystuff.rsprofile.${hash}.world.bank=1700000000000;5291x10,5295x100,-1x0`,
    // seed vault: 5 more guam
    `dudewheresmystuff.rsprofile.${hash}.world.seedvault=5291x5`,
  ].join('\n');

  const { seeds, snapshotDate } = buildSeedData(content);
  const byHerb = Object.fromEntries(seeds.map((s) => [s.herb, s.quantity]));

  assert.equal(byHerb.GUAM, 15, 'bank + vault guam merged');
  assert.equal(byHerb.RANARR, 100);
  assert.equal(byHerb.TORSTOL, 0, 'absent herb is 0');
  assert.equal(seeds.length, 14);
  assert.equal(snapshotDate, '2023-11-14 22:13:20 UTC');
});

test('buildSeedData picks the freshest hash when a name has multiple', () => {
  const content = [
    'rsprofile.rsprofile.old.displayName=funmaxxing',
    'dudewheresmystuff.rsprofile.old.world.bank=1000;5291x1',
    'rsprofile.rsprofile.new.displayName=funmaxxing',
    'dudewheresmystuff.rsprofile.new.world.bank=2000;5291x999',
  ].join('\n');

  const { items } = extractFunmaxxingItems(content);
  assert.equal(items.get(5291), 999, 'newer snapshot wins');
});

test('extractFunmaxxingItems throws when no funmaxxing account exists', () => {
  const content = 'rsprofile.rsprofile.x.displayName=someoneElse';
  assert.throws(() => extractFunmaxxingItems(content), /No account named 'funmaxxing'/);
});

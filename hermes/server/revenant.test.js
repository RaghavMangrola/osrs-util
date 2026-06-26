import { test } from 'node:test';
import assert from 'node:assert';

import { parseLootLog, buildRevenantLuck, RATES } from './revenant.js';

const kill = (drops, date = 'Jun 16, 2026, 4:02:17 PM') =>
  JSON.stringify({ name: 'Revenant dragon', drops, date });

test('parseLootLog skips blank and malformed lines', () => {
  const content = [
    kill([{ name: 'Revenant ether', id: 21820, quantity: 10, price: 180 }]),
    '',
    '{ broken',
    kill([{ name: 'Coal', id: 453, quantity: 5, price: 150 }]),
  ].join('\n');
  assert.equal(parseLootLog(content).length, 2);
});

test('buildRevenantLuck tallies kills, value, and pinpoints rare drops to a kill', () => {
  const content = [
    kill([
      { name: 'Revenant ether', id: 21820, quantity: 10, price: 100 },
      { name: 'Bracelet of ethereum (uncharged)', id: 21817, quantity: 1, price: 40000 },
    ]),
    kill([{ name: 'Ancient relic', id: 26948, quantity: 1, price: 16000000 }], 'Jun 18, 2026, 1:00:00 PM'),
    kill([{ name: 'Revenant ether', id: 21820, quantity: 8, price: 100 }]),
  ].join('\n');

  const r = buildRevenantLuck(content);
  assert.equal(r.killCount, 3);
  // 10*100 + 1*40000 + 1*16000000 + 8*100 = 16,041,800
  assert.equal(r.totalValue, 16041800);
  assert.equal(r.gpPerKill, Math.round(16041800 / 3));
  assert.equal(r.braceletCount, 1, 'bracelet counted, not listed');

  assert.equal(r.rareHits.length, 1, 'only the rare relic is pinned');
  assert.deepEqual(r.rareHits[0], {
    name: 'Ancient relic',
    killNumber: 2, // dropped on the 2nd logged kill
    date: 'Jun 18, 2026, 1:00:00 PM',
  });
});

test('buildRevenantLuck counts the three weapons together as "Any revenant weapon"', () => {
  const content = [
    kill([{ name: "Craw's bow (u)", id: 22550, quantity: 1, price: 0 }]),
    kill([{ name: "Thammaron's sceptre (u)", id: 22552, quantity: 1, price: 0 }]),
    kill([{ name: 'Revenant ether', id: 21820, quantity: 5, price: 100 }]),
  ].join('\n');

  const r = buildRevenantLuck(content);
  const anyWeapon = r.dryness.find((d) => d.label === 'Any revenant weapon');
  assert.equal(anyWeapon.got, 2, 'both weapons counted');
  assert.equal(anyWeapon.oneIn, Math.round(1 / RATES.weaponAny));

  // Each weapon is pinned to its kill, newest first.
  assert.deepEqual(
    r.rareHits.map((h) => [h.name, h.killNumber]),
    [["Thammaron's sceptre (u)", 2], ["Craw's bow (u)", 1]]
  );
});

test('buildRevenantLuck dryness math matches (1-p)^kc', () => {
  // 711 empty kills → 0 weapons, classic dry case.
  const content = Array.from({ length: 711 }, () =>
    kill([{ name: 'Revenant ether', id: 21820, quantity: 1, price: 100 }])
  ).join('\n');

  const r = buildRevenantLuck(content);
  assert.equal(r.killCount, 711);

  const anyWeapon = r.dryness.find((d) => d.label === 'Any revenant weapon');
  assert.equal(anyWeapon.got, 0);
  const expectedStillDry = Math.pow(1 - RATES.weaponAny, 711);
  assert.ok(Math.abs(anyWeapon.stillDry - expectedStillDry) < 1e-9);
  assert.ok(Math.abs(anyWeapon.wouldHaveByNow - (1 - expectedStillDry)) < 1e-9);
  // Sanity: ~52% would have a weapon by 711 on-task skulled.
  assert.ok(anyWeapon.wouldHaveByNow > 0.5 && anyWeapon.wouldHaveByNow < 0.55);
});

test('buildRevenantLuck handles an empty log without dividing by zero', () => {
  const r = buildRevenantLuck('');
  assert.equal(r.killCount, 0);
  assert.equal(r.gpPerKill, 0);
  assert.equal(r.rareHits.length, 0);
  assert.equal(r.braceletCount, 0);
});

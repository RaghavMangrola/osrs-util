import { test } from 'node:test';
import assert from 'node:assert';

import { getValidHerbs, applyHerbUpdate, updateHerb, splitLines, HERB_KEYS } from './herb.js';

function propsFile(herb, lineEnding) {
  const lines = [
    'somethingElse=1',
    ...HERB_KEYS.map((k) => `${k}=${herb}`),
    'another.key=value',
  ];
  return lines.join(lineEnding);
}

test('getValidHerbs returns the 14 herbs', () => {
  assert.equal(getValidHerbs().length, 14);
  assert.ok(getValidHerbs().includes('RANARR'));
});

test('applyHerbUpdate rewrites every herb key and reports the old herb', () => {
  const content = propsFile('GUAM', '\n');
  const { content: out, oldHerb, keysUpdated } = applyHerbUpdate(content, 'RANARR');
  assert.equal(oldHerb, 'GUAM');
  assert.equal(keysUpdated, HERB_KEYS.length);
  for (const key of HERB_KEYS) assert.ok(out.includes(`${key}=RANARR`));
  // Untouched lines survive.
  assert.ok(out.includes('somethingElse=1'));
  assert.ok(out.includes('another.key=value'));
});

test('applyHerbUpdate preserves CRLF line endings', () => {
  const content = propsFile('GUAM', '\r\n');
  const { content: out } = applyHerbUpdate(content, 'TORSTOL');
  assert.ok(out.includes('\r\n'));
  assert.ok(!/[^\r]\n/.test(out), 'no bare LF should remain');
});

test('applyHerbUpdate preserves LF line endings (no CRLF introduced)', () => {
  const content = propsFile('GUAM', '\n');
  const { content: out } = applyHerbUpdate(content, 'TORSTOL');
  assert.ok(!out.includes('\r\n'));
});

test('updateHerb rejects an invalid herb', () => {
  assert.throws(() => updateHerb({ herb: 'NOTAHERB' }), /Invalid herb/);
});

test('splitLines drops a single trailing newline like Rust lines()', () => {
  assert.deepEqual(splitLines('a\nb\n'), ['a', 'b']);
  assert.deepEqual(splitLines('a\nb'), ['a', 'b']);
  assert.deepEqual(splitLines('a\r\nb\r\n'), ['a', 'b']);
  assert.deepEqual(splitLines('a\n\nb'), ['a', '', 'b']);
});

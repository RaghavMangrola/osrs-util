import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  splitArgs,
  parseLaunchers,
  getLaunchers,
  addLauncher,
  updateLauncher,
  deleteLauncher,
} from './launchers.js';

// --- splitArgs (shell_words-equivalent tokenizer) ---

test('splitArgs splits on whitespace', () => {
  assert.deepEqual(splitArgs('--flag value other'), ['--flag', 'value', 'other']);
});

test('splitArgs keeps double-quoted runs together', () => {
  assert.deepEqual(splitArgs('--dir "C:/Program Files/App"'), ['--dir', 'C:/Program Files/App']);
});

test('splitArgs keeps single-quoted runs literally', () => {
  assert.deepEqual(splitArgs("--name 'hello world'"), ['--name', 'hello world']);
});

test('splitArgs honours backslash escapes outside quotes', () => {
  assert.deepEqual(splitArgs('a\\ b'), ['a b']);
});

test('splitArgs allows empty quoted token', () => {
  assert.deepEqual(splitArgs('a "" b'), ['a', '', 'b']);
});

test('splitArgs returns empty array for empty string', () => {
  assert.deepEqual(splitArgs(''), []);
});

test('splitArgs throws on an unterminated quote', () => {
  assert.throws(() => splitArgs('foo "bar'), /Missing closing quote/);
});

// --- parseLaunchers ---

test('parseLaunchers handles empty and BOM-prefixed content', () => {
  assert.deepEqual(parseLaunchers(''), []);
  assert.deepEqual(parseLaunchers('﻿'), []);
  assert.deepEqual(parseLaunchers('﻿[]'), []);
});

test('parseLaunchers throws on invalid JSON', () => {
  assert.throws(() => parseLaunchers('{not json'), /Failed to parse launchers\.json/);
});

// --- CRUD round trip against a temp home directory ---

let tmpHome;
let savedUserProfile;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-test-'));
  savedUserProfile = process.env.USERPROFILE;
  process.env.USERPROFILE = tmpHome;
});

afterEach(() => {
  if (savedUserProfile === undefined) delete process.env.USERPROFILE;
  else process.env.USERPROFILE = savedUserProfile;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

const formData = (over = {}) => ({
  name: 'RuneLite',
  executable: 'C:/runelite.exe',
  arguments: '--flag',
  workingDirectory: '',
  category: 'RuneLite',
  icon: '🎮',
  envVars: {},
  ...over,
});

test('add/get/update/delete round trip persists to launchers.json', () => {
  assert.deepEqual(getLaunchers(), []);

  const added = addLauncher({ data: formData() });
  assert.ok(added.id, 'a UUID id is assigned');
  assert.equal(added.name, 'RuneLite');

  const all = getLaunchers();
  assert.equal(all.length, 1);
  assert.equal(all[0].id, added.id);

  const updated = updateLauncher({ id: added.id, data: formData({ name: 'Renamed' }) });
  assert.equal(updated.name, 'Renamed');
  assert.equal(updated.id, added.id, 'id is preserved across update');

  deleteLauncher({ id: added.id });
  assert.deepEqual(getLaunchers(), []);
});

test('updateLauncher throws when the id is unknown', () => {
  assert.throws(() => updateLauncher({ id: 'nope', data: formData() }), /Launcher not found/);
});

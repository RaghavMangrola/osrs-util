const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseProperties, parseItemList, extractAccounts, buildSyncPayload } = require('./parse');

describe('parseProperties', () => {
  it('parses key=value pairs', () => {
    const result = parseProperties('foo=bar\nbaz=qux');
    assert.deepEqual(result, { foo: 'bar', baz: 'qux' });
  });

  it('skips comments and blank lines', () => {
    const result = parseProperties('# comment\n\n!also comment\nfoo=bar');
    assert.deepEqual(result, { foo: 'bar' });
  });

  it('handles values with equals signs', () => {
    const result = parseProperties('key=a=b=c');
    assert.deepEqual(result, { key: 'a=b=c' });
  });

  it('handles empty values', () => {
    const result = parseProperties('key=');
    assert.deepEqual(result, { key: '' });
  });

  it('handles lines with no equals sign', () => {
    const result = parseProperties('noequals\nfoo=bar');
    assert.deepEqual(result, { foo: 'bar' });
  });
});

describe('parseItemList', () => {
  it('parses items without timestamp', () => {
    const result = parseItemList('563x1572,555x8848,557x14627');
    assert.equal(result.timestamp, null);
    assert.deepEqual(result.items, [
      { id: 563, qty: 1572 },
      { id: 555, qty: 8848 },
      { id: 557, qty: 14627 },
    ]);
  });

  it('parses items with timestamp prefix', () => {
    const result = parseItemList('1780859561852;563x1572,555x8848');
    assert.equal(result.timestamp, 1780859561852);
    assert.deepEqual(result.items, [
      { id: 563, qty: 1572 },
      { id: 555, qty: 8848 },
    ]);
  });

  it('filters out empty slots (-1)', () => {
    const result = parseItemList('563x1,-1x1,-1x0,555x2');
    assert.deepEqual(result.items, [
      { id: 563, qty: 1 },
      { id: 555, qty: 2 },
    ]);
  });

  it('handles empty/null input', () => {
    assert.deepEqual(parseItemList(''), { timestamp: null, items: [] });
    assert.deepEqual(parseItemList(null), { timestamp: null, items: [] });
    assert.deepEqual(parseItemList(undefined), { timestamp: null, items: [] });
  });

  it('handles single item', () => {
    const result = parseItemList('995x1000000');
    assert.deepEqual(result.items, [{ id: 995, qty: 1000000 }]);
  });

  it('handles timestamp with single item (coins.bank format)', () => {
    const result = parseItemList('1780859899687;8820444');
    assert.equal(result.timestamp, 1780859899687);
    assert.deepEqual(result.items, []);
  });
});

describe('extractAccounts', () => {
  const SAMPLE = [
    'dudewheresmystuff.rsprofile.abc123.world.bank=1780859561852;563x1572,555x8848',
    'dudewheresmystuff.rsprofile.abc123.world.seedvault=5285x92,5101x327',
    'dudewheresmystuff.rsprofile.abc123.carryable.inventory=4722x1,-1x1',
    'dudewheresmystuff.rsprofile.abc123.minutesPlayed=77423',
    'dudewheresmystuff.rsprofile.abc123.isMember=true',
    'dudewheresmystuff.rsprofile.abc123.accountType=4',
    'dudewheresmystuff.rsprofile.abc123.coins.bank=1780859561852;1',
    'dudewheresmystuff.itemSortMode=UNSORTED',
    'someOtherPlugin.key=value',
  ].join('\n');

  it('extracts account hash', () => {
    const accounts = extractAccounts(SAMPLE);
    assert.ok(accounts['abc123']);
    assert.equal(accounts['abc123'].hash, 'abc123');
  });

  it('groups storages by category', () => {
    const accounts = extractAccounts(SAMPLE);
    const acc = accounts['abc123'];
    assert.ok(acc.storages.world);
    assert.ok(acc.storages.carryable);
    assert.ok(acc.storages.coins);
  });

  it('stores raw values for storages', () => {
    const accounts = extractAccounts(SAMPLE);
    const acc = accounts['abc123'];
    assert.equal(acc.storages.world.bank, '1780859561852;563x1572,555x8848');
    assert.equal(acc.storages.world.seedvault, '5285x92,5101x327');
  });

  it('puts metadata fields in meta', () => {
    const accounts = extractAccounts(SAMPLE);
    const acc = accounts['abc123'];
    assert.equal(acc.meta.minutesPlayed, '77423');
    assert.equal(acc.meta.isMember, 'true');
    assert.equal(acc.meta.accountType, '4');
  });

  it('ignores non-rsprofile DWMS keys', () => {
    const accounts = extractAccounts(SAMPLE);
    const hashes = Object.keys(accounts);
    assert.equal(hashes.length, 1);
    assert.equal(hashes[0], 'abc123');
  });

  it('handles multiple accounts', () => {
    const content = [
      'dudewheresmystuff.rsprofile.acc1.world.bank=563x10',
      'dudewheresmystuff.rsprofile.acc2.world.bank=555x20',
    ].join('\n');
    const accounts = extractAccounts(content);
    assert.equal(Object.keys(accounts).length, 2);
    assert.ok(accounts['acc1']);
    assert.ok(accounts['acc2']);
  });

  it('returns empty object for no DWMS data', () => {
    const accounts = extractAccounts('somePlugin.key=value');
    assert.deepEqual(accounts, {});
  });

  it('picks up displayName from rsprofile keys', () => {
    const content = [
      'rsprofile.rsprofile.abc123.displayName=funmaxxing',
      'rsprofile.rsprofile.def456.displayName=bassArcade',
      'dudewheresmystuff.rsprofile.abc123.world.bank=563x1',
      'dudewheresmystuff.rsprofile.def456.world.bank=555x2',
    ].join('\n');
    const accounts = extractAccounts(content);
    assert.equal(accounts['abc123'].displayName, 'funmaxxing');
    assert.equal(accounts['def456'].displayName, 'bassArcade');
  });

  it('sets displayName to null when not found', () => {
    const accounts = extractAccounts(
      'dudewheresmystuff.rsprofile.abc123.world.bank=563x1'
    );
    assert.equal(accounts['abc123'].displayName, null);
  });
});

describe('buildSyncPayload', () => {
  it('builds payload from accounts with bank data', () => {
    const accounts = extractAccounts(
      'dudewheresmystuff.rsprofile.abc123.world.bank=1780859561852;563x1572,555x8848'
    );
    const payload = buildSyncPayload(accounts);
    assert.equal(payload.length, 1);
    assert.equal(payload[0].hash, 'abc123');
    assert.equal(payload[0].snapshotTime, 1780859561852);
    assert.deepEqual(payload[0].items, [
      { id: 563, qty: 1572 },
      { id: 555, qty: 8848 },
    ]);
  });

  it('skips accounts without bank data', () => {
    const accounts = extractAccounts(
      'dudewheresmystuff.rsprofile.abc123.carryable.inventory=563x1'
    );
    const payload = buildSyncPayload(accounts);
    assert.equal(payload.length, 0);
  });

  it('filters -1 items from bank', () => {
    const accounts = extractAccounts(
      'dudewheresmystuff.rsprofile.abc123.world.bank=563x1,-1x1,-1x0,555x2'
    );
    const payload = buildSyncPayload(accounts);
    assert.deepEqual(payload[0].items, [
      { id: 563, qty: 1 },
      { id: 555, qty: 2 },
    ]);
  });

  it('uses displayName from rsprofile', () => {
    const accounts = extractAccounts([
      'rsprofile.rsprofile.abc123.displayName=funmaxxing',
      'dudewheresmystuff.rsprofile.abc123.world.bank=563x1',
    ].join('\n'));
    const payload = buildSyncPayload(accounts);
    assert.equal(payload[0].name, 'funmaxxing');
  });

  it('falls back to hash when no displayName', () => {
    const accounts = extractAccounts(
      'dudewheresmystuff.rsprofile.abc123.world.bank=563x1'
    );
    const payload = buildSyncPayload(accounts);
    assert.equal(payload[0].name, 'abc123');
  });
});

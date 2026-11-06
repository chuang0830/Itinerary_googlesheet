import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  submittedSettings,
  settingsFromRaw,
  settingsVersion,
  settingsWrite,
  loadSettings,
  saveSettings,
} from '../lib/trip/settings-edit';
import { ItineraryError } from '../lib/trip/edit-schema';
import type { RawItinerary, ItineraryGateway } from '../lib/trip/itinerary-edit';
const settings = {
  tripName: 'Trip',
  subtitle: 'Subtitle',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  themeColor: '#24513e',
};
function fixture() {
  let raw: RawItinerary = {
    sheetId: 0,
    rowCount: 100,
    values: [
      ['Key', 'Value'],
      ['future', 123],
      ['endDate', settings.endDate],
      ['tripName', settings.tripName],
      ['startDate', settings.startDate],
      ['themeColor', settings.themeColor],
      ['subtitle', settings.subtitle],
      ['anotherFuture', false],
    ],
  };
  let writes = 0;
  let allowed = true;
  const gateway: ItineraryGateway = {
    async canEdit() {
      return allowed;
    },
    async read() {
      return structuredClone(raw);
    },
    async write(body) {
      writes++;
      const copy = structuredClone(raw);
      for (const request of (
        body as {
          requests: {
            updateCells: {
              start: { rowIndex: number; columnIndex: number };
              rows: { values: { userEnteredValue: { stringValue: string } }[] }[];
            };
          }[];
        }
      ).requests) {
        const update = request.updateCells;
        copy.values[update.start.rowIndex] ??= [];
        update.rows[0].values.forEach((cell, offset) => {
          copy.values[update.start.rowIndex][update.start.columnIndex + offset] =
            cell.userEnteredValue.stringValue;
        });
      }
      raw = copy;
    },
  };
  return {
    gateway,
    raw: () => raw,
    replace: (value: RawItinerary) => {
      raw = value;
    },
    deny: () => {
      allowed = false;
    },
    writes: () => writes,
  };
}
test('settings snapshot is read-only and supports existing key order plus extra settings', async () => {
  const f = fixture();
  const snapshot = await loadSettings(f.gateway);
  assert.deepEqual(snapshot.settings, settings);
  assert.equal(f.writes(), 0);
});
test('settings Done updates all five values while preserving unknown settings, keys, and row positions', async () => {
  const f = fixture();
  const start = await loadSettings(f.gateway);
  const before = structuredClone(f.raw());
  const desired = {
    ...settings,
    tripName: 'Updated',
    subtitle: '',
    startDate: '2026-11-02',
    endDate: '2026-11-29',
    themeColor: '#294f6a',
  };
  const result = await saveSettings(f.gateway, start.version, desired);
  assert.deepEqual(result.settings, desired);
  assert.deepEqual(
    f.raw().values.map((row) => row[0]),
    before.values.map((row) => row[0]),
  );
  assert.deepEqual(f.raw().values[1], ['future', 123]);
  assert.deepEqual(f.raw().values[7], ['anotherFuture', false]);
});
test('dates and equals-prefixed titles are written using literal stringValue, only in Value cells', () => {
  const f = fixture();
  const body = settingsWrite(f.raw(), { ...settings, tripName: '=not a formula' });
  assert.equal(body.requests.length, 5);
  for (const request of body.requests) {
    assert.ok('updateCells' in request);
    assert.equal(request.updateCells.start.columnIndex, 1);
    assert.equal(request.updateCells.fields, 'userEnteredValue');
  }
  const json = JSON.stringify(body);
  assert.ok(json.includes('"stringValue":"2026-11-01"'));
  assert.ok(json.includes('"stringValue":"=not a formula"'));
  assert.ok(!json.includes('formulaValue'));
});
test('invalid names, dates, colors and excessive date spans are rejected', () => {
  for (const patch of [
    { tripName: ' ' },
    { startDate: '2026-02-30' },
    { endDate: '2026-10-31' },
    { themeColor: 'red' },
    { endDate: '2099-01-01' },
  ])
    assert.throws(() => submittedSettings({ ...settings, ...patch }), ItineraryError);
  assert.equal(
    submittedSettings({ ...settings, subtitle: '', themeColor: '#294F6A' }).themeColor,
    '#294f6a',
  );
});
test('remote edits including unknown settings cause conflicts before writing', async () => {
  const f = fixture();
  const start = await loadSettings(f.gateway);
  const changed = structuredClone(f.raw());
  changed.values[1][1] = 456;
  f.replace(changed);
  await assert.rejects(
    saveSettings(f.gateway, start.version, { ...settings, tripName: 'Mine' }),
    (e: unknown) => e instanceof ItineraryError && e.status === 409,
  );
  assert.equal(f.writes(), 0);
});
test('revoked permissions prevent settings writes and retries after a lost response do not repeat writes', async () => {
  const f = fixture();
  const start = await loadSettings(f.gateway);
  const desired = { ...settings, tripName: 'Updated' };
  const first = await saveSettings(f.gateway, start.version, desired);
  const second = await saveSettings(f.gateway, start.version, desired);
  assert.deepEqual(second, first);
  assert.equal(f.writes(), 1);
  f.deny();
  await assert.rejects(
    saveSettings(f.gateway, first.version, settings),
    (e: unknown) => e instanceof ItineraryError && e.status === 403,
  );
  assert.equal(f.writes(), 1);
});
test('write failure or post-write divergence does not report sync success', async () => {
  const f = fixture();
  const start = await loadSettings(f.gateway);
  const desired = { ...settings, tripName: 'New' };
  f.gateway.write = async () => {
    throw new ItineraryError('network', 503);
  };
  await assert.rejects(saveSettings(f.gateway, start.version, desired), /network/);
  f.gateway.write = async () => {};
  await assert.rejects(
    saveSettings(f.gateway, start.version, desired),
    (e: unknown) => e instanceof ItineraryError && e.status === 409,
  );
});
test('formula and malformed settings are not silently overwritten; versions detect row moves', () => {
  const f = fixture();
  assert.throws(() => settingsFromRaw({ ...f.raw(), hasFormulas: true }), ItineraryError);
  const changed = structuredClone(f.raw());
  [changed.values[1], changed.values[2]] = [changed.values[2], changed.values[1]];
  assert.notEqual(settingsVersion(f.raw()), settingsVersion(changed));
  assert.throws(
    () => settingsWrite({ ...f.raw(), values: [['Key', 'Value']] }, settings),
    ItineraryError,
  );
});

test('Done adds a language setting to a legacy trip and later changes it without touching unknown keys', async () => {
  const f = fixture();
  const snapshot = await loadSettings(f.gateway);
  const first = await saveSettings(f.gateway, snapshot.version, { ...settings, language: 'en' });
  assert.equal(first.settings.language, 'en');
  assert.deepEqual(f.raw().values.at(-1), ['language', 'en']);
  assert.deepEqual(f.raw().values[1], ['future', 123]);
  const second = await saveSettings(f.gateway, first.version, { ...settings, language: 'zh-TW' });
  assert.equal(second.settings.language, 'zh-TW');
  assert.equal(f.raw().values.filter((row) => row[0] === 'language').length, 1);
  assert.equal(second.settings.tripName, settings.tripName);
});

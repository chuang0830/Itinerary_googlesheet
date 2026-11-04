import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CreationService,
  CreationError,
  GoogleTripError,
  type TripCreator,
} from '../lib/trip/creation';
import {
  HEADERS,
  parseCreateTrip,
  spreadsheetBody,
  TripInputError,
} from '../lib/trip/create-schema';
const input = {
  tripName: ' Thailand Trip ',
  subtitle: ' Bangkok & Chiang Mai ',
  startDate: '2027-10-19',
  endDate: '2027-10-27',
  themeColor: '#24513E',
  publicConsent: true,
};
const settings = parseCreateTrip(input);
const id = 'example_spreadsheet_id_123456789';
function fixture() {
  const service = new CreationService();
  let creates = 0;
  let publishes = 0;
  const provider: TripCreator = {
    async create() {
      creates++;
      return id;
    },
    async publish() {
      publishes++;
    },
  };
  return { service, provider, creates: () => creates, publishes: () => publishes };
}
test('requires explicit public consent and valid date boundaries, including leap days', () => {
  for (const patch of [
    { publicConsent: false },
    { startDate: '2027-02-29' },
    { endDate: '2027-10-18' },
    { themeColor: 'red' },
    { tripName: '  ' },
  ])
    assert.throws(() => parseCreateTrip({ ...input, ...patch }), TripInputError);
  assert.equal(
    parseCreateTrip({ ...input, startDate: '2028-02-29', endDate: '2028-02-29' }).startDate,
    '2028-02-29',
  );
  assert.equal(settings.tripName, 'Thailand Trip');
});
test('creates exactly four sheets, exact headers, and literal settings without itinerary IDs', () => {
  const body = spreadsheetBody({ ...settings, tripName: '=IMPORTXML("test")' });
  assert.deepEqual(
    body.sheets.map((sheet) => sheet.properties.title),
    Object.keys(HEADERS),
  );
  const settingsRows = body.sheets[0].data[0].rowData;
  assert.equal(settingsRows[1].values[1].userEnteredValue.stringValue, '=IMPORTXML("test")');
  assert.equal(settingsRows.length, 6);
  for (const sheet of body.sheets) {
    assert.deepEqual(
      sheet.data[0].rowData[0].values.map((cell) => cell.userEnteredValue.stringValue),
      HEADERS[sheet.properties.title as keyof typeof HEADERS],
    );
    if (sheet.properties.title !== 'Settings') assert.equal(sheet.data[0].rowData.length, 1);
  }
});
test('duplicate submissions reuse the same spreadsheet; input changes are rejected', async () => {
  const f = fixture();
  const first = await f.service.create('owner', 'key', settings, f.provider);
  assert.deepEqual(first, { state: 'ready', spreadsheetId: id, message: undefined });
  assert.deepEqual(await f.service.create('owner', 'key', settings, f.provider), first);
  assert.equal(f.creates(), 1);
  assert.equal(f.publishes(), 1);
  await assert.rejects(
    f.service.create('owner', 'key', { ...settings, subtitle: 'changed' }, f.provider),
    CreationError,
  );
});
test('concurrent submissions do not call Google create twice', async () => {
  const f = fixture();
  let finish!: (id: string) => void;
  f.provider.create = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = f.service.create('owner', 'key', settings, f.provider);
  assert.equal((await f.service.create('owner', 'key', settings, f.provider)).state, 'creating');
  finish(id);
  assert.equal((await pending).state, 'ready');
});
test('publish failure retains the spreadsheet and retries only permissions', async () => {
  const f = fixture();
  f.provider.publish = async () => {
    throw new GoogleTripError('permission');
  };
  const result = await f.service.create('owner', 'key', settings, f.provider);
  assert.equal(result.state, 'share_failed');
  assert.equal(result.spreadsheetId, id);
  assert.equal(
    (await f.service.create('owner', 'key', settings, f.provider)).state,
    'share_failed',
  );
  f.provider.publish = async () => {};
  assert.equal((await f.service.publish('owner', 'key', id, f.provider)).state, 'ready');
  assert.equal(f.creates(), 1);
});
test('another account or different spreadsheet cannot retry public sharing', async () => {
  const f = fixture();
  await f.service.create('owner', 'key', settings, f.provider);
  assert.throws(() => f.service.status('another-owner', 'key'), CreationError);
  await assert.rejects(f.service.publish('another-owner', 'key', id, f.provider), CreationError);
  await assert.rejects(
    f.service.publish('owner', 'key', 'another_spreadsheet_123456', f.provider),
    CreationError,
  );
});
test('uncertain creation failures cannot be retried automatically', async () => {
  const f = fixture();
  let count = 0;
  f.provider.create = async () => {
    count++;
    throw new GoogleTripError('unavailable', true);
  };
  assert.equal((await f.service.create('owner', 'key', settings, f.provider)).state, 'uncertain');
  assert.equal((await f.service.create('owner', 'key', settings, f.provider)).state, 'uncertain');
  assert.equal(count, 1);
  assert.equal(f.publishes(), 0);
});
test('a definite Google rejection is distinct from unknown network outcomes', async () => {
  const f = fixture();
  f.provider.create = async () => {
    throw new GoogleTripError('api_disabled');
  };
  const result = await f.service.create('owner', 'key', settings, f.provider);
  assert.equal(result.state, 'create_failed');
  assert.equal(result.spreadsheetId, undefined);
  assert.ok(result.message?.includes('API'));
  assert.equal(f.publishes(), 0);
});
test('malformed Google success cannot publish an arbitrary file', async () => {
  const f = fixture();
  f.provider.create = async () => 'bad/id';
  assert.equal((await f.service.create('owner', 'key', settings, f.provider)).state, 'uncertain');
  assert.equal(f.publishes(), 0);
});
test('expired operation metadata cannot authorize a later sharing request', async () => {
  let now = 0;
  const service = new CreationService(() => now);
  const f = fixture();
  await service.create('owner', 'key', settings, f.provider);
  now = 24 * 60 * 60 * 1000;
  assert.throws(() => service.status('owner', 'key'), CreationError);
  await assert.rejects(service.publish('owner', 'key', id, f.provider), CreationError);
});

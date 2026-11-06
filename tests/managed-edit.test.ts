import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HEADERS } from '../lib/trip/create-schema';
import { ItineraryError } from '../lib/trip/edit-schema';
import { managedRows, submittedManagedRows, type ManagedSheet } from '../lib/trip/managed-schema';
import { loadManaged, managedVersion, managedWrite, saveManaged } from '../lib/trip/managed-edit';
import { dailyData, parseTripSheets } from '../lib/trip/read';
import type { RawItinerary, ItineraryGateway } from '../lib/trip/itinerary-edit';
const stay = {
  Name: 'Hotel',
  City: 'Chiang Mai',
  CheckIn: '2026-11-15',
  CheckOut: '2026-11-18',
  MapURL: '',
};
const train = {
  Type: 'Train',
  From: 'bangkok',
  To: 'chiang mai',
  DepartureDate: '2026-11-15',
  DepartureTime: '10:00',
  ArrivalDate: '2026-11-15',
  ArrivalTime: '20:00',
  Carrier: '12',
  Number: '12',
};
function fixture(sheet: ManagedSheet) {
  let raw: RawItinerary = {
    sheetId: sheet === 'Accommodation' ? 2 : 3,
    rowCount: 100,
    values: [HEADERS[sheet]],
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
      const requests = (
        body as {
          requests: {
            updateCells?: { rows: { values: { userEnteredValue: { stringValue: string } }[] }[] };
          }[];
        }
      ).requests;
      raw = {
        ...raw,
        values: requests
          .find((r) => r.updateCells)!
          .updateCells!.rows.map((row) =>
            row.values.map((cell) => cell.userEnteredValue.stringValue),
          ),
      };
    },
  };
  return {
    gateway,
    raw: () => raw,
    replace: (next: RawItinerary) => {
      raw = next;
    },
    deny: () => {
      allowed = false;
    },
    writes: () => writes,
  };
}
test('accommodation create/update/delete preserve exact five columns and manual Done behavior', async () => {
  const f = fixture('Accommodation');
  const snapshot = await loadManaged('Accommodation', f.gateway);
  assert.equal(f.writes(), 0);
  const added = await saveManaged('Accommodation', f.gateway, snapshot.version, [
    stay,
    { ...stay, Name: 'Second Hotel' },
  ]);
  assert.equal(added.rows.length, 2);
  assert.equal(f.raw().values[1][2], '2026-11-15');
  const updated = await saveManaged('Accommodation', f.gateway, added.version, [
    { ...stay, Name: 'Updated' },
  ]);
  assert.equal((updated.rows[0] as typeof stay).Name, 'Updated');
  const deleted = await saveManaged('Accommodation', f.gateway, updated.version, []);
  assert.equal(deleted.rows.length, 0);
  assert.deepEqual(f.raw().values, [HEADERS.Accommodation]);
});
test('multiple transport records normalize type and keep dates/times as ISO text', async () => {
  const f = fixture('Transportation');
  const start = await loadManaged('Transportation', f.gateway);
  const result = await saveManaged('Transportation', f.gateway, start.version, [
    { ...train, Type: 'train' },
    { ...train, Type: 'bus', Number: 'B2' },
  ]);
  assert.equal(result.rows.length, 2);
  assert.equal((result.rows[0] as typeof train).Type, 'Train');
  assert.deepEqual(f.raw().values[1], Object.values(train));
});
test('invalid lodging date bounds, invalid calendar dates, and invalid map URLs fail before writing', async () => {
  const f = fixture('Accommodation');
  const start = await loadManaged('Accommodation', f.gateway);
  await assert.rejects(
    saveManaged('Accommodation', f.gateway, start.version, [{ ...stay, CheckOut: stay.CheckIn }]),
    ItineraryError,
  );
  assert.throws(
    () => submittedManagedRows('Accommodation', [{ ...stay, CheckIn: '2026-02-30' }]),
    ItineraryError,
  );
  assert.throws(
    () => submittedManagedRows('Accommodation', [{ ...stay, MapURL: 'javascript:alert(1)' }]),
    ItineraryError,
  );
  assert.equal(f.writes(), 0);
});
test('empty newly-added rows are not persisted but partially-filled rows require required fields', () => {
  assert.deepEqual(
    submittedManagedRows('Transportation', [
      { ...Object.fromEntries(HEADERS.Transportation.map((h) => [h, ''])), Type: 'Other' },
    ]),
    [],
  );
  assert.deepEqual(
    submittedManagedRows('Accommodation', [
      Object.fromEntries(HEADERS.Accommodation.map((h) => [h, ''])),
    ]),
    [],
  );
  assert.throws(
    () => submittedManagedRows('Transportation', [{ ...train, From: '' }]),
    ItineraryError,
  );
});
test('concurrent changes and revoked permissions prevent overwriting remote records', async () => {
  const f = fixture('Accommodation');
  const start = await loadManaged('Accommodation', f.gateway);
  f.replace({
    ...f.raw(),
    values: [HEADERS.Accommodation, Object.values({ ...stay, Name: 'Another editor' })],
  });
  await assert.rejects(
    saveManaged('Accommodation', f.gateway, start.version, [stay]),
    (e: unknown) => e instanceof ItineraryError && e.status === 409,
  );
  f.deny();
  await assert.rejects(
    saveManaged('Accommodation', f.gateway, start.version, [stay]),
    (e: unknown) => e instanceof ItineraryError && e.status === 403,
  );
  assert.equal(f.writes(), 0);
});
test('exact result after a lost response is confirmed without duplicate writes', async () => {
  const f = fixture('Transportation');
  const start = await loadManaged('Transportation', f.gateway);
  const first = await saveManaged('Transportation', f.gateway, start.version, [train]);
  const second = await saveManaged('Transportation', f.gateway, start.version, [train]);
  assert.deepEqual(second, first);
  assert.equal(f.writes(), 1);
});
test('write failure and post-write divergence never return a successful sync', async () => {
  const f = fixture('Transportation');
  const start = await loadManaged('Transportation', f.gateway);
  f.gateway.write = async () => {
    throw new ItineraryError('network', 503);
  };
  await assert.rejects(saveManaged('Transportation', f.gateway, start.version, [train]), /network/);
  f.gateway.write = async () => {};
  await assert.rejects(
    saveManaged('Transportation', f.gateway, start.version, [train]),
    (e: unknown) => e instanceof ItineraryError && e.status === 409,
  );
});
test('write ranges clear only managed columns, preserve formatting, and use literal stringValue', () => {
  for (const [sheet, row, width] of [
    ['Accommodation', stay, 5],
    ['Transportation', train, 9],
  ] as const) {
    const f = fixture(sheet);
    const body = managedWrite(
      sheet,
      { ...f.raw(), values: [HEADERS[sheet], [], [], []] },
      submittedManagedRows(sheet, [row]),
    ) as {
      requests: {
        updateCells: {
          range: { endColumnIndex: number; endRowIndex: number };
          fields: string;
          rows: unknown[];
        };
      }[];
    };
    const update = body.requests[0].updateCells;
    assert.equal(update.range.endColumnIndex, width);
    assert.equal(update.range.endRowIndex, 4);
    assert.equal(update.fields, 'userEnteredValue');
    assert.equal(update.rows.length, 2);
    assert.ok(JSON.stringify(update).includes('"stringValue":"2026-11-15"'));
  }
});
test('formula protection and table-specific revisions prevent unsafe sheet writes', async () => {
  const f = fixture('Transportation');
  f.replace({ ...f.raw(), hasFormulas: true });
  await assert.rejects(
    loadManaged('Transportation', f.gateway),
    (e: unknown) => e instanceof ItineraryError && e.status === 409,
  );
  assert.notEqual(
    managedVersion('Transportation', f.raw()),
    managedVersion('Accommodation', f.raw()),
  );
});
test('native Sheets dates normalize, and saved stays/overnight transport integrate with daily cards', () => {
  const serial = (Date.parse(stay.CheckIn) - Date.UTC(1899, 11, 30)) / 86_400_000;
  const native = managedRows('Transportation', [
    HEADERS.Transportation,
    ['train', 'bangkok', 'chiang mai', serial, 10 / 24, serial, 20 / 24, 12, 12, ''],
  ]);
  assert.deepEqual(native, [train]);
  const trip = parseTripSheets({
    Settings: [
      HEADERS.Settings,
      ['tripName', 'Trip'],
      ['subtitle', ''],
      ['startDate', stay.CheckIn],
      ['endDate', stay.CheckOut],
      ['themeColor', '#24513e'],
    ],
    Itinerary: [HEADERS.Itinerary],
    Accommodation: [HEADERS.Accommodation, Object.values(stay)],
    Transportation: [
      HEADERS.Transportation,
      Object.values({ ...train, ArrivalDate: '2026-11-16' }),
    ],
  });
  assert.equal(dailyData(trip, '2026-11-15').stays.length, 1);
  assert.equal(dailyData(trip, '2026-11-18').stays.length, 0);
  assert.equal(dailyData(trip, '2026-11-16').transport.length, 1);
});

test('legacy BookingURL is ignored and transportation writes never touch column J', () => {
  const raw: RawItinerary = {
    sheetId: 3,
    rowCount: 100,
    values: [
      [...HEADERS.Transportation, 'BookingURL'],
      [...Object.values(train), 'javascript:legacy-value'],
      ['', '', '', '', '', '', '', '', '', 'https://legacy.example/'],
    ],
  };
  const rows = managedRows('Transportation', raw.values);
  assert.deepEqual(rows, [train]);
  assert.ok(!('BookingURL' in rows[0]));
  const input = submittedManagedRows('Transportation', [{ ...train, BookingURL: 'ignored' }]);
  const body = managedWrite('Transportation', raw, input) as {
    requests: {
      updateCells: { range: { endColumnIndex: number }; rows: { values: unknown[] }[] };
    }[];
  };
  const update = body.requests[0].updateCells;
  assert.equal(update.range.endColumnIndex, 9);
  assert.ok(update.rows.every((row) => row.values.length === 9));
  assert.equal(raw.values[1][9], 'javascript:legacy-value');
  assert.equal(HEADERS.Transportation.length, 9);
  assert.ok(!HEADERS.Transportation.includes('BookingURL'));
});

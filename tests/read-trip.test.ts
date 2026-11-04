import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HEADERS } from '../lib/trip/create-schema';
import { dailyData, isoDate, parseTripSheets, tripDates, TripReadError } from '../lib/trip/read';
import { readPublicTrip } from '../lib/trip/read-http';
function sheets(): Record<keyof typeof HEADERS, unknown[][]> {
  return {
    Settings: [
      HEADERS.Settings,
      ['tripName', 'Taiwan Trip'],
      ['subtitle', 'A journey'],
      ['startDate', '2027-10-22'],
      ['endDate', '2027-10-24'],
      ['themeColor', '#24513e'],
    ],
    Itinerary: [
      HEADERS.Itinerary,
      ['2027-10-22', 'Massage', ''],
      ['2027-10-23', 'Temple', ''],
      ['2027-10-22', 'Dinner', ''],
      ['2027-10-22', 'Siam / MBK', 'https://maps.google.com/'],
    ],
    Accommodation: [HEADERS.Accommodation, ['Hotel', 'Chiang Mai', '2027-10-22', '2027-10-24', '']],
    Transportation: [
      HEADERS.Transportation,
      [
        'Flight',
        'Bangkok',
        'Chiang Mai',
        '2027-10-22',
        '18:35',
        '2027-10-22',
        '20:00',
        'Airline',
        'VZ116',
        '',
      ],
    ],
  };
}
function payload(data = sheets()) {
  return { valueRanges: Object.values(data).map((values) => ({ values })) };
}
const id = 'public_spreadsheet_test_123456789';
test('same-day plans preserve original interleaved sheet order without IDs', () => {
  const trip = parseTripSheets(sheets());
  assert.deepEqual(
    dailyData(trip, '2027-10-22').plans.map((row) => row.Activity),
    ['Massage', 'Dinner', 'Siam / MBK'],
  );
  assert.deepEqual(Object.keys(trip.itinerary[0]), ['Date', 'Activity', 'MapURL']);
});
test('date range is inclusive and handles month/year boundaries', () => {
  const settings = parseTripSheets(sheets()).settings;
  assert.deepEqual(tripDates({ ...settings, startDate: '2027-12-31', endDate: '2028-01-02' }), [
    '2027-12-31',
    '2028-01-01',
    '2028-01-02',
  ]);
  assert.deepEqual(tripDates({ ...settings, endDate: settings.startDate }), [settings.startDate]);
});
test('lodging includes check-in night and excludes check-out; empty days do not invent cities', () => {
  const trip = parseTripSheets(sheets());
  assert.equal(dailyData(trip, '2027-10-22').stays.length, 1);
  assert.equal(dailyData(trip, '2027-10-23').city, 'Chiang Mai');
  const empty = dailyData(trip, '2027-10-24');
  assert.equal(empty.stays.length, 0);
  assert.equal(empty.city, '');
  assert.deepEqual(empty.plans, []);
});
test('multiple and overnight transportation is shown on departure and arrival dates', () => {
  const data = sheets();
  data.Transportation.push([
    'Train',
    'A',
    'B',
    '2027-10-23',
    '22:00',
    '2027-10-24',
    '06:00',
    '',
    '',
    '',
  ]);
  data.Transportation.push([
    'Bus',
    'B',
    'C',
    '2027-10-24',
    '10:00',
    '2027-10-24',
    '11:00',
    '',
    '',
    '',
  ]);
  const trip = parseTripSheets(data);
  assert.equal(dailyData(trip, '2027-10-23').transport.length, 1);
  assert.equal(dailyData(trip, '2027-10-24').transport.length, 2);
});
test('native Sheets date serials and time fractions are converted without local timezone shifts', () => {
  const serial = (Date.parse('2027-10-22') - Date.UTC(1899, 11, 30)) / 86_400_000;
  assert.equal(isoDate(serial), '2027-10-22');
  const data = sheets();
  data.Itinerary[1][0] = serial;
  data.Transportation[1][4] = 0.5;
  const trip = parseTripSheets(data);
  assert.equal(trip.itinerary[0].Date, '2027-10-22');
  assert.equal(trip.transportation[0].DepartureTime, '12:00');
});
test('blank rows are ignored but malformed headers, duplicate settings, and impossible dates are rejected', () => {
  const blank = sheets();
  blank.Itinerary.push([], ['', '', '']);
  assert.equal(parseTripSheets(blank).itinerary.length, 4);
  const bad = sheets();
  bad.Itinerary = [['Date', 'Activity', 'Order']];
  assert.throws(() => parseTripSheets(bad), TripReadError);
  const duplicate = sheets();
  duplicate.Settings.push(['tripName', 'other']);
  assert.throws(() => parseTripSheets(duplicate), TripReadError);
  const invalid = sheets();
  invalid.Itinerary[1][0] = '2027-02-29';
  assert.throws(() => parseTripSheets(invalid), /Itinerary 第 2 列/);
});
test('unsafe map URLs are omitted while activity text and optional blank links are preserved', () => {
  const data = sheets();
  data.Itinerary[1][2] = 'javascript:alert(1)';
  data.Itinerary[2][2] = 'https://name:password@example.com';
  const trip = parseTripSheets(data);
  assert.equal(trip.itinerary[0].MapURL, '');
  assert.equal(trip.itinerary[1].MapURL, '');
  assert.equal(trip.itinerary[2].Activity, 'Dinner');
});
test('public reads send only app API key, no OAuth/cookies, with no-store and four explicit ranges', async () => {
  let calls = 0;
  const send: typeof fetch = async (url, init) => {
    calls++;
    const parsed = new URL(String(url));
    assert.equal(parsed.hostname, 'sheets.googleapis.com');
    assert.ok(parsed.pathname.includes(id));
    assert.equal(parsed.searchParams.getAll('ranges').length, 4);
    assert.ok(!parsed.searchParams.has('key'));
    assert.deepEqual(init?.headers, { 'X-Goog-Api-Key': 'app-read-key' });
    assert.equal(init?.credentials, 'omit');
    assert.equal(init?.cache, 'no-store');
    return Response.json(payload());
  };
  assert.equal((await readPublicTrip(id, 'app-read-key', send)).settings.tripName, 'Taiwan Trip');
  assert.equal(calls, 1);
});
test('private/not-found responses never trigger an OAuth fallback or leak upstream content', async () => {
  let calls = 0;
  const send: typeof fetch = async () => {
    calls++;
    return Response.json({ error: { message: 'private details' } }, { status: 403 });
  };
  await assert.rejects(
    readPublicTrip(id, 'key', send),
    (error: unknown) =>
      error instanceof TripReadError &&
      error.status === 403 &&
      !error.message.includes('private details'),
  );
  assert.equal(calls, 1);
});
test('missing API key and invalid spreadsheet IDs fail before any network call', async () => {
  const send: typeof fetch = async () => {
    throw new Error('Should not send');
  };
  await assert.rejects(
    readPublicTrip(id, undefined, send),
    (error: unknown) => error instanceof TripReadError && error.status === 503,
  );
  await assert.rejects(
    readPublicTrip('../private', 'key', send),
    (error: unknown) => error instanceof TripReadError && error.status === 400,
  );
});
test('each fresh read reflects updated settings and data instead of a process cache', async () => {
  const data = sheets();
  const send: typeof fetch = async () => Response.json(payload(data));
  assert.equal((await readPublicTrip(id, 'key', send)).settings.tripName, 'Taiwan Trip');
  data.Settings[1][1] = 'Updated';
  data.Itinerary.push(['2027-10-24', 'New plan', '']);
  const next = await readPublicTrip(id, 'key', send);
  assert.equal(next.settings.tripName, 'Updated');
  assert.equal(dailyData(next, '2027-10-24').plans[0].Activity, 'New plan');
});
test('malformed or oversized API responses fail clearly instead of showing a successful sync', async () => {
  await assert.rejects(
    readPublicTrip(id, 'key', async () => Response.json({ valueRanges: [] })),
    TripReadError,
  );
  await assert.rejects(
    readPublicTrip(id, 'key', async () => new Response('x'.repeat(2_000_001))),
    (error: unknown) => error instanceof TripReadError && error.status === 413,
  );
});

test('transport types accept case variations and native dates/times with numeric carrier fields', () => {
  const data = sheets();
  const serial = (Date.parse('2026-11-15') - Date.UTC(1899, 11, 30)) / 86_400_000;
  for (const type of ['train', ' TRAIN ', 'Train']) {
    data.Transportation[1] = [
      type,
      'bangkok',
      'chiang mai',
      serial,
      10 / 24,
      serial,
      20 / 24,
      12,
      12,
      '',
    ];
    const row = parseTripSheets(data).transportation[0];
    assert.equal(row.Type, 'Train');
    assert.equal(row.DepartureDate, '2026-11-15');
    assert.equal(row.DepartureTime, '10:00');
    assert.equal(row.ArrivalTime, '20:00');
    assert.equal(row.Carrier, '12');
  }
  data.Transportation[1][0] = 'unknown';
  assert.throws(() => parseTripSheets(data), /交通類型請填/);
});

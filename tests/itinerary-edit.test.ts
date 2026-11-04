import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HEADERS } from '../lib/trip/create-schema';
import { ItineraryError, submittedItinerary } from '../lib/trip/edit-schema';
import {
  itineraryVersion,
  itineraryWrite,
  loadEditable,
  readItinerary,
  saveItinerary,
  type ItineraryGateway,
  type RawItinerary,
} from '../lib/trip/itinerary-edit';
const a = { Date: '2027-10-22', Activity: 'Massage', MapURL: '' };
const b = { Date: '2027-10-23', Activity: 'Temple', MapURL: '' };
const c = { Date: '2027-10-22', Activity: 'Dinner', MapURL: '' };
function fixture() {
  let raw: RawItinerary = {
    sheetId: 1,
    rowCount: 100,
    values: [
      HEADERS.Itinerary,
      [a.Date, a.Activity, ''],
      [b.Date, b.Activity, ''],
      [c.Date, c.Activity, ''],
    ],
  };
  let allowed = true;
  let writes = 0;
  let body: unknown;
  const gateway: ItineraryGateway = {
    async canEdit() {
      return allowed;
    },
    async read() {
      return structuredClone(raw);
    },
    async write(value) {
      writes++;
      body = value;
      const update = (
        value as {
          requests: {
            updateCells?: { rows: { values: { userEnteredValue: { stringValue: string } }[] }[] };
          }[];
        }
      ).requests.find((request) => request.updateCells)?.updateCells;
      raw = {
        ...raw,
        values: update!.rows.map((row) =>
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
    body: () => body,
  };
}
test('editing snapshot preserves physical order and does not write anything', async () => {
  const f = fixture();
  const snapshot = await loadEditable(f.gateway);
  assert.deepEqual(snapshot.itinerary, [a, b, c]);
  assert.equal(f.writes(), 0);
  assert.equal(snapshot.version.length, 64);
});
test('Done sorts dates and keeps the chosen same-day order, including duplicates', async () => {
  const f = fixture();
  const snapshot = await loadEditable(f.gateway);
  const result = await saveItinerary(f.gateway, snapshot.version, [c, b, a, { ...a }]);
  assert.deepEqual(result.itinerary, [c, a, a, b]);
  assert.equal(f.writes(), 1);
  assert.deepEqual(f.raw().values[0], ['Date', 'Activity', 'MapURL']);
});
test('changed remote data is rejected before a write, including same-day row moves', async () => {
  const f = fixture();
  const snapshot = await loadEditable(f.gateway);
  f.replace({ ...f.raw(), values: [HEADERS.Itinerary, [a.Date, 'Another editor', '']] });
  await assert.rejects(
    saveItinerary(f.gateway, snapshot.version, [c, a, b]),
    (e: unknown) => e instanceof ItineraryError && e.status === 409,
  );
  assert.equal(f.writes(), 0);
});
test('permission removed between entering Edit and Done prevents writes', async () => {
  const f = fixture();
  const snapshot = await loadEditable(f.gateway);
  f.deny();
  await assert.rejects(
    saveItinerary(f.gateway, snapshot.version, [a]),
    (e: unknown) => e instanceof ItineraryError && e.status === 403,
  );
  assert.equal(f.writes(), 0);
});
test('deletion clears old trailing values in the same batch, without touching formatting or other columns', () => {
  const f = fixture();
  const body = itineraryWrite(f.raw(), [a]) as {
    requests: { updateCells: { range: Record<string, number>; rows: unknown[]; fields: string } }[];
  };
  const update = body.requests[0].updateCells;
  assert.equal(update.range.endRowIndex, 4);
  assert.equal(update.rows.length, 2);
  assert.equal(update.range.endColumnIndex, 3);
  assert.equal(update.fields, 'userEnteredValue');
});
test('adding beyond the grid appends rows before updating cells atomically', () => {
  const f = fixture();
  const body = itineraryWrite({ ...f.raw(), rowCount: 2 }, [a, b, c]) as {
    requests: Record<string, unknown>[];
  };
  assert.deepEqual(body.requests[0], {
    appendDimension: { sheetId: 1, dimension: 'ROWS', length: 2 },
  });
  assert.ok(body.requests[1].updateCells);
});
test('a lost success response can be retried without a second write', async () => {
  const f = fixture();
  const snapshot = await loadEditable(f.gateway);
  const first = await saveItinerary(f.gateway, snapshot.version, [a]);
  const second = await saveItinerary(f.gateway, snapshot.version, [a]);
  assert.deepEqual(second, first);
  assert.equal(f.writes(), 1);
});
test('write failure and post-write concurrent changes do not report a successful sync', async () => {
  const f = fixture();
  const snapshot = await loadEditable(f.gateway);
  f.gateway.write = async () => {
    throw new ItineraryError('network', 503);
  };
  await assert.rejects(saveItinerary(f.gateway, snapshot.version, [a]), /network/);
  f.gateway.write = async () => {
    f.replace({ ...f.raw(), values: [HEADERS.Itinerary, [a.Date, 'concurrent', '']] });
  };
  await assert.rejects(
    saveItinerary(f.gateway, snapshot.version, [a]),
    (e: unknown) => e instanceof ItineraryError && e.status === 409,
  );
});
test('empty drafts are omitted, URLs are validated, and literal equals signs are stored as text', () => {
  assert.deepEqual(submittedItinerary([{ Date: a.Date, Activity: '', MapURL: '' }]), []);
  assert.throws(
    () => submittedItinerary([{ ...a, MapURL: 'javascript:alert(1)' }]),
    ItineraryError,
  );
  const f = fixture();
  const row = { ...a, Activity: '=not a formula' };
  assert.equal(
    readItinerary({ ...f.raw(), values: [HEADERS.Itinerary, [row.Date, row.Activity, '']] })[0]
      .Activity,
    row.Activity,
  );
  assert.throws(() => readItinerary({ ...f.raw(), hasFormulas: true }), ItineraryError);
  assert.ok(JSON.stringify(itineraryWrite(f.raw(), [row])).includes('stringValue'));
});
test('revision includes cell content and physical order; trailing absent cells normalize equally', () => {
  const f = fixture();
  const original = f.raw();
  assert.equal(
    itineraryVersion(original),
    itineraryVersion({
      ...original,
      values: original.values.map((row) => row.slice(0, row[2] === '' ? 2 : 3)),
    }),
  );
  assert.notEqual(
    itineraryVersion(original),
    itineraryVersion({
      ...original,
      values: [original.values[0], original.values[2], original.values[1], original.values[3]],
    }),
  );
});

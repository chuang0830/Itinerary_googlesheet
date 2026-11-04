import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RedisCreationService } from '../lib/trip/redis-creation';
import { GoogleTripError } from '../lib/trip/creation';
const settings = {
  tripName: 'Test',
  subtitle: '',
  startDate: '2026-11-01',
  endDate: '2026-11-02',
  themeColor: '#24513e',
};
const id = 'a'.repeat(40);
function fixture() {
  const rows = new Map<string, string>();
  let now = 1000;
  const command = async (a: (string | number)[]) => {
    const key = String(a[1]);
    if (a[0] === 'GET') return rows.get(key) ?? null;
    if (a[0] === 'SET') {
      if (a.includes('NX') && rows.has(key)) return null;
      rows.set(key, String(a[2]));
      return 'OK';
    }
    if (a[0] === 'EVAL') {
      const k = String(a[3]);
      if (rows.get(k) !== a[4]) return 0;
      rows.set(k, String(a[5]));
      return 1;
    }
    throw new Error();
  };
  return {
    first: new RedisCreationService(command, () => now),
    second: new RedisCreationService(command, () => now),
    advance: () => {
      now += 90001;
    },
    rows,
  };
}
test('independent instances deduplicate create and preserve progress without trip data', async () => {
  const f = fixture();
  let calls = 0;
  const google = {
    async create() {
      calls++;
      return id;
    },
    async publish() {},
  };
  await Promise.all([
    f.first.create('owner', 'request', settings, google),
    f.second.create('owner', 'request', settings, google),
  ]);
  assert.equal(calls, 1);
  assert.equal((await f.second.status('owner', 'request')).state, 'ready');
  assert.ok(![...f.rows.values()].join('').includes('2026-11-01'));
  await assert.rejects(f.second.status('other', 'request'));
  await assert.rejects(
    f.first.create('owner', 'request', { ...settings, tripName: 'Changed' }, google),
  );
});
test('publish retries reuse existing spreadsheet across service instances', async () => {
  const f = fixture();
  let creates = 0,
    publishes = 0;
  const google = {
    async create() {
      creates++;
      return id;
    },
    async publish() {
      publishes++;
      if (publishes === 1) throw new Error();
    },
  };
  assert.equal((await f.first.create('owner', 'request', settings, google)).state, 'share_failed');
  assert.equal((await f.second.publish('owner', 'request', id, google)).state, 'ready');
  assert.equal(creates, 1);
  assert.equal(publishes, 2);
});
test('uncertain creation never retries Google and abandoned work reports uncertainty', async () => {
  const f = fixture();
  let calls = 0;
  const google = {
    async create() {
      calls++;
      throw new GoogleTripError('unavailable', true);
    },
    async publish() {},
  };
  assert.equal((await f.first.create('owner', 'request', settings, google)).state, 'uncertain');
  await f.second.create('owner', 'request', settings, google);
  assert.equal(calls, 1);
  const key = [...f.rows.keys()][0];
  const op = JSON.parse(f.rows.get(key)!);
  op.state = 'creating';
  f.rows.set(key, JSON.stringify(op));
  f.advance();
  assert.equal((await f.second.status('owner', 'request')).state, 'uncertain');
});

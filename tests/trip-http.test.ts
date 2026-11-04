import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tripHttpCreator } from '../lib/google/trip-http';
import { GoogleTripError } from '../lib/trip/creation';
const id = 'spreadsheet_http_test_1234567890';
const permission = { type: 'anyone', role: 'reader', allowFileDiscovery: false };
function scripted(responses: unknown[]) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const send: typeof fetch = async (url, init) => {
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-token');
    calls.push({ url: String(url), method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const value = responses.shift();
    if (value instanceof Error) throw value;
    return value instanceof Response ? value : Response.json(value);
  };
  return { calls, provider: tripHttpCreator(async () => 'test-token', send) };
}
test('public sharing is verified after creation and requests link-only reader permission', async () => {
  const f = scripted([{ permissions: [] }, { id: 'permission-id' }, { permissions: [permission] }]);
  await f.provider.publish(id);
  assert.deepEqual(f.calls.map(call => call.method), ['GET', 'POST', 'GET']);
  assert.deepEqual(f.calls[1].body, permission);
});
test('retry detects an already-public reader and does not create another permission', async () => {
  const f = scripted([{ permissions: [permission] }]); await f.provider.publish(id);
  assert.equal(f.calls.length, 1);
});
test('unverified sharing and externally changed public roles do not report success', async () => {
  const f = scripted([{ permissions: [] }, { id: 'permission-id' }, { permissions: [] }]);
  await assert.rejects(f.provider.publish(id), GoogleTripError);
  const g = scripted([{ permissions: [{ type: 'anyone', role: 'writer' }] }]);
  await assert.rejects(g.provider.publish(id), GoogleTripError);
  assert.equal(g.calls.length, 1);
});
test('permission lookup follows pagination before deciding whether to publish', async () => {
  const f = scripted([{ permissions: [], nextPageToken: 'next' }, { permissions: [permission] }]);
  await f.provider.publish(id); assert.ok(f.calls[1].url.includes('pageToken=next')); assert.equal(f.calls.length, 2);
});
test('create transport errors are marked uncertain while explicit Google rejection is safe to retry', async () => {
  const settings = { tripName: 'Test', subtitle: '', startDate: '2027-01-01', endDate: '2027-01-01', themeColor: '#24513e' };
  const f = scripted([new Error('transport failure')]);
  await assert.rejects(f.provider.create(settings), (error: unknown) => error instanceof GoogleTripError && error.uncertain);
  const g = scripted([Response.json({ error: { details: [{ reason: 'SERVICE_DISABLED' }] } }, { status: 403 })]);
  await assert.rejects(g.provider.create(settings), (error: unknown) => error instanceof GoogleTripError && !error.uncertain && error.code === 'api_disabled');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readTripEditors } from '../lib/trip/editors';
const id = 'a'.repeat(40);
test('users without verified file read access never trigger Google permission or token requests', async () => {
  let tokens = 0,
    requests = 0;
  await assert.rejects(
    readTripEditors(
      id,
      async () => false,
      async () => {
        tokens++;
        return 'secret';
      },
      async () => {
        requests++;
        return new Response();
      },
    ),
    { status: 403 },
  );
  assert.equal(tokens, 0);
  assert.equal(requests, 0);
});
test('paginates editors, excludes deleted/viewers, preserves groups and omits emails', async () => {
  let count = 0;
  const editors = await readTripEditors(
    id,
    async () => true,
    async () => 'private-token',
    async (url, options) => {
      const query = new URL(String(url));
      assert.equal(options?.cache, 'no-store');
      assert.equal(options?.redirect, 'error');
      assert.ok(query.search.includes('emailAddress'));
      assert.ok(query.search.includes('displayName'));
      count++;
      if (count === 1)
        return Response.json({
          permissions: [
            { id: 'reader', type: 'user', role: 'reader', displayName: 'Viewer' },
            {
              id: 'writer',
              type: 'user',
              role: 'writer',
              displayName: 'Editor',
              emailAddress: 'itinerary@example.com',
            },
            { id: 'deleted', type: 'user', role: 'writer', deleted: true },
          ],
          nextPageToken: 'page2',
        });
      assert.equal(query.searchParams.get('pageToken'), 'page2');
      return Response.json({
        permissions: [
          {
            id: 'owner',
            type: 'user',
            role: 'owner',
            emailAddress: 'eilleen@example.com',
            displayName: 'Owner Name',
          },
          { id: 'group', type: 'group', role: 'writer' },
          { id: 'writer', type: 'user', role: 'writer', emailAddress: 'itinerary@example.com' },
        ],
      });
    },
  );
  assert.equal(count, 2);
  assert.equal(editors.length, 3);
  assert.equal(editors[0].role, 'owner');
  assert.equal(editors[0].name, 'e');
  assert.equal(editors.find((e) => e.key === 'writer')?.name, 'i');
  assert.equal(editors.find((e) => e.key === 'group')?.name, 'Google 群組');
  assert.ok(!JSON.stringify(editors).includes('@'));
  assert.ok(!JSON.stringify(editors).includes('emailAddress'));
  assert.equal(editors[0].displayName, 'Owner Name');
});
test('permission errors and interrupted pagination never return a partial list', async () => {
  await assert.rejects(
    readTripEditors(
      id,
      async () => true,
      async () => 'token',
      async () => new Response('', { status: 403 }),
    ),
    { status: 403 },
  );
  await assert.rejects(
    readTripEditors(
      id,
      async () => true,
      async () => 'token',
      async () => Response.json({ permissions: [], nextPageToken: 'loop' }),
    ),
    { status: 503 },
  );
});

test('verified file viewers can read permitted editor names without granting write access', async () => {
  const editors = await readTripEditors(
    id,
    async () => true,
    async () => 'viewer-token',
    async (_url, options) => {
      assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer viewer-token');
      assert.equal(options?.method ?? 'GET', 'GET');
      return Response.json({
        permissions: [
          {
            id: 'owner',
            type: 'user',
            role: 'owner',
            displayName: 'Trip owner',
            emailAddress: 'owner@example.com',
          },
        ],
      });
    },
  );
  assert.equal(editors[0].displayName, 'Trip owner');
  assert.equal(editors[0].role, 'owner');
  assert.ok(!JSON.stringify(editors).includes('canEdit'));
});

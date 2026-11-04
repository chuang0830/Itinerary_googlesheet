import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkTripFileAccess, tripEntryDecision, tripSignInTarget } from '../lib/auth/trip-entry';
const id = 'a'.repeat(40);
test('only known trip paths qualify, not external URLs, auth routes or homepage', () => {
  assert.equal(tripSignInTarget('/'), null);
  assert.equal(tripSignInTarget('https://evil.example/' + id), null);
  assert.equal(tripSignInTarget('/api/auth/signout'), null);
  assert.equal(tripSignInTarget(`/${id}/unknown`), null);
  assert.deepEqual(tripSignInTarget(`/${id}/settings`), { id, path: `/${id}/settings` });
});
test('checks before choosing a file and skips picker for existing editors', async () => {
  const order: string[] = [];
  const decision = await tripEntryDecision(`/${id}`, false, async (file) => {
    order.push('checked');
    assert.equal(file, id);
    return 'needs_file';
  });
  assert.deepEqual(order, ['checked']);
  assert.equal(decision.selectFile, true);
  assert.equal(decision.id, id);
  const editor = await tripEntryDecision(`/${id}`, false, async () => 'editor');
  assert.equal(editor.selectFile, false);
  assert.equal(editor.path, `/${id}`);
});
test('known readers stay read-only and completed selections never loop into picker', async () => {
  const reader = await tripEntryDecision(`/${id}/settings`, false, async () => 'reader');
  assert.equal(reader.selectFile, false);
  assert.equal(reader.path, `/${id}/settings?accessNotice=readonly`);
  const failed = await tripEntryDecision(`/${id}`, true, async () => 'needs_file');
  assert.equal(failed.selectFile, false);
  assert.ok(failed.path.includes('accessNotice=unavailable'));
});
test('homepage login does not check or select an arbitrary trip', async () => {
  const decision = await tripEntryDecision('/', false, async () => {
    throw new Error('Unexpected');
  });
  assert.equal(decision.path, '/');
  assert.equal(decision.selectFile, false);
});
test('Google capability check uses current token and differentiates file access, read-only and service outage', async () => {
  for (const [status, expected] of [
    [403, 'needs_file'],
    [404, 'needs_file'],
  ] as const)
    assert.equal(
      await checkTripFileAccess(id, 'token', async () => new Response('', { status })),
      expected,
    );
  assert.equal(
    await checkTripFileAccess(id, 'token', async (_url, options) => {
      assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer token');
      assert.equal(options?.cache, 'no-store');
      assert.equal(options?.redirect, 'error');
      return Response.json({
        mimeType: 'application/vnd.google-apps.spreadsheet',
        capabilities: { canEdit: false },
      });
    }),
    'reader',
  );
  await assert.rejects(
    checkTripFileAccess(id, 'token', async () => new Response('', { status: 503 })),
    { code: 'temporarily_unavailable' },
  );
  await assert.rejects(
    checkTripFileAccess(id, 'token', async () => new Response('', { status: 401 })),
    { code: 'reauth_required' },
  );
});

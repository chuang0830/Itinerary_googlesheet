import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tripAccessState } from '../lib/trip/access-state';
test('signed-in users missing Google grant get authorization instead of another login prompt', () => {
  const state = tripAccessState(403, { code: 'google_grant_required', error: 'Grant required' });
  assert.equal(state.needsAuthorization, true);
  assert.equal(state.needsLogin, false);
  assert.equal(state.canEdit, false);
  assert.equal(state.error, 'Grant required');
});
test('file permissions and outages never request repeated sign-in', () => {
  for (const status of [403, 503]) {
    const state = tripAccessState(status, { error: 'Access unavailable' });
    assert.equal(state.needsLogin, false);
    assert.equal(state.needsAuthorization, false);
    assert.equal(state.canEdit, false);
    assert.equal(state.error, 'Access unavailable');
  }
  assert.equal(tripAccessState(401, {}).needsLogin, true);
  assert.equal(tripAccessState(200, { canEdit: true }).canEdit, true);
});

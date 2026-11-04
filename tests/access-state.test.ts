import assert from 'node:assert/strict';
import { test } from 'node:test';
import { READ_ONLY_NOTICE, tripAccessState } from '../lib/trip/access-state';
test('missing file authorization is not misreported as confirmed read-only', () => {
  const state = tripAccessState(403, { code: 'google_grant_required', error: 'Grant required' });
  assert.equal(state.needsAuthorization, true);
  assert.equal(state.needsLogin, false);
  assert.equal(state.canEdit, false);
  assert.notEqual(state.error, READ_ONLY_NOTICE);
});
test('file permissions and outages never request repeated sign-in', () => {
  for (const status of [403, 503]) {
    const state = tripAccessState(status, { error: 'Access unavailable' });
    assert.equal(state.needsLogin, false);
    assert.equal(state.needsAuthorization, false);
    assert.equal(state.canEdit, false);
    assert.equal(state.error, status === 403 ? READ_ONLY_NOTICE : 'Access unavailable');
  }
  assert.equal(tripAccessState(401, {}).needsLogin, true);
  assert.equal(tripAccessState(200, { canEdit: true }).canEdit, true);
});

test('confirmed viewers always receive the same read-only message', () => {
  const state = tripAccessState(200, { canEdit: false });
  assert.equal(state.error, READ_ONLY_NOTICE);
  assert.equal(state.canEdit, false);
  assert.equal(state.needsAuthorization, false);
  assert.equal(state.needsLogin, false);
});

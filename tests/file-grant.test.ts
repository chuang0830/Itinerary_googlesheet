import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AuthService,
  MemoryAuthStore,
  DRIVE_FILE_SCOPE,
  randomId,
  type GoogleProvider,
  type Session,
} from '../lib/auth/core';
const file = 'a'.repeat(40);
function fixture() {
  const store = new MemoryAuthStore();
  const sessionId = randomId();
  const session: Session = {
    subject: 'owner',
    user: { name: 'Test', email: 'test@example.com' },
    tokens: { accessToken: 'old', expiresAt: Date.now() + 3600000, scopes: [DRIVE_FILE_SCOPE] },
    expiresAt: Date.now() + 86400000,
    revision: 0,
  };
  store.saveSession(sessionId, session);
  let exchanges = 0;
  const provider: GoogleProvider = {
    async start() {
      throw new Error();
    },
    async finish() {
      throw new Error();
    },
    async refresh() {
      throw new Error();
    },
    async startFile(_state, subject, id) {
      assert.equal(subject, 'owner');
      assert.equal(id, file);
      return { url: 'https://accounts.google.com/', verifier: 'pkce' };
    },
    async finishFile(_code, verifier) {
      assert.equal(verifier, 'pkce');
      exchanges++;
      return {
        subject: 'owner',
        tokens: { accessToken: 'new', expiresAt: Date.now() + 3600000, scopes: [DRIVE_FILE_SCOPE] },
      };
    },
  };
  return {
    store,
    sessionId,
    session,
    provider,
    service: new AuthService(store, provider),
    exchanges: () => exchanges,
  };
}
test('file grant updates only bound session, preserves absolute expiry and consumes flow once', async () => {
  const f = fixture();
  const flow = await f.service.beginFile(f.sessionId, file);
  const input = {
    state: flow.id,
    cookie: flow.id,
    code: 'code',
    denied: false,
    previousSession: f.sessionId,
    pickedFileIds: file,
  };
  const result = await f.service.complete(input);
  assert.equal(result.id, f.sessionId);
  assert.equal(result.returnTo, `/${file}`);
  assert.equal(f.store.getSession(f.sessionId)?.tokens.accessToken, 'new');
  assert.equal(f.store.getSession(f.sessionId)?.expiresAt, f.session.expiresAt);
  await assert.rejects(f.service.complete(input));
  assert.equal(f.exchanges(), 1);
});
test('wrong file, missing selection or different browser session never exchange codes', async () => {
  for (const patch of [
    { pickedFileIds: 'b'.repeat(40) },
    { pickedFileIds: undefined },
    { previousSession: randomId() },
  ]) {
    const f = fixture();
    const flow = await f.service.beginFile(f.sessionId, file);
    await assert.rejects(
      f.service.complete({
        state: flow.id,
        cookie: flow.id,
        code: 'code',
        denied: false,
        previousSession: f.sessionId,
        pickedFileIds: file,
        ...patch,
      }),
    );
    assert.equal(f.exchanges(), 0);
    assert.equal(f.store.getSession(f.sessionId)?.tokens.accessToken, 'old');
  }
});
test('wrong Google account or logout cannot overwrite the original identity', async () => {
  const f = fixture();
  const flow = await f.service.beginFile(f.sessionId, file);
  f.provider.finishFile = async () => ({ subject: 'different-account', tokens: f.session.tokens });
  await assert.rejects(
    f.service.complete({
      state: flow.id,
      cookie: flow.id,
      code: 'code',
      denied: false,
      previousSession: f.sessionId,
      pickedFileIds: file,
    }),
  );
  assert.equal(f.store.getSession(f.sessionId)?.subject, 'owner');
  const second = await f.service.beginFile(f.sessionId, file);
  await f.service.logout(f.sessionId);
  await assert.rejects(
    f.service.complete({
      state: second.id,
      cookie: second.id,
      code: 'code',
      denied: false,
      previousSession: f.sessionId,
      pickedFileIds: file,
    }),
  );
  assert.equal(f.store.getSession(f.sessionId), null);
});

test('cancelled selection returns to original trip subpage and preserves the existing session', async () => {
  const f = fixture();
  const path = `/${file}/settings`;
  const flow = await f.service.beginFile(f.sessionId, file, path);
  await assert.rejects(
    f.service.complete({
      state: flow.id,
      cookie: flow.id,
      code: '',
      denied: true,
      previousSession: f.sessionId,
    }),
    (error: unknown) => {
      assert.equal((error as { returnTo: string }).returnTo, path);
      return true;
    },
  );
  assert.equal(f.exchanges(), 0);
  assert.equal(f.store.getSession(f.sessionId)?.tokens.accessToken, 'old');
});

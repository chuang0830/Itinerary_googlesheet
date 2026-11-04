import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AuthError, AuthService, DRIVE_FILE_SCOPE, FLOW_TTL_MS, GrantRevokedError, MemoryAuthStore,
  randomId, requireSameOrigin, safeReturnTo, SESSION_TTL_MS, type GoogleProvider, type Identity,
} from '../lib/auth/core';

function fixture() {
  let now = 1_000_000;
  const store = new MemoryAuthStore(() => now);
  const identity: Identity = { subject: 'google-subject', user: { name: 'Tester', email: 'test@example.com' },
    tokens: { accessToken: 'private-access', refreshToken: 'private-refresh', expiresAt: now + 3_600_000, scopes: [DRIVE_FILE_SCOPE] } };
  let exchanges = 0;
  const provider: GoogleProvider = {
    async start(state, nonce) { return { url: `https://accounts.google.com/?state=${state}&nonce=${nonce}`, verifier: 'private-verifier' }; },
    async finish(code, verifier, nonce) {
      exchanges++; assert.equal(code, 'valid-code'); assert.equal(verifier, 'private-verifier'); assert.equal(nonce.length, 43);
      return structuredClone(identity);
    },
    async refresh() { return { ...identity.tokens, accessToken: 'updated-access', expiresAt: now + 3_600_000 }; },
  };
  const service = new AuthService(store, provider, () => now);
  async function login(previousSession?: string) {
    const flow = await service.begin('/trip?day=1');
    return service.complete({ state: flow.id, cookie: flow.id, code: 'valid-code', denied: false, previousSession });
  }
  return { store, service, provider, identity, login, advance: (ms: number) => { now += ms; }, exchanges: () => exchanges };
}
const hasCode = (code: string) => (error: unknown) => error instanceof AuthError && error.code === code;

test('login binds state to the browser and consumes each flow only once', async () => {
  const f = fixture(); const flow = await f.service.begin('/trip');
  await assert.rejects(f.service.complete({ state: flow.id, cookie: randomId(), code: 'valid-code', denied: false }), hasCode('invalid_flow'));
  assert.equal(f.exchanges(), 0);
  await f.service.complete({ state: flow.id, cookie: flow.id, code: 'valid-code', denied: false });
  await assert.rejects(f.service.complete({ state: flow.id, cookie: flow.id, code: 'valid-code', denied: false }), hasCode('invalid_flow'));
  assert.equal(f.exchanges(), 1);
});
test('expired or denied login never exchanges a code or creates a session', async () => {
  const f = fixture(); const expired = await f.service.begin(); f.advance(FLOW_TTL_MS);
  await assert.rejects(f.service.complete({ state: expired.id, cookie: expired.id, code: 'valid-code', denied: false }), hasCode('invalid_flow'));
  const denied = await f.service.begin();
  await assert.rejects(f.service.complete({ state: denied.id, cookie: denied.id, code: 'valid-code', denied: true }), hasCode('login_failed'));
  assert.equal(f.exchanges(), 0);
});
test('failed code exchange consumes its flow, preventing replay', async () => {
  const f = fixture(); const flow = await f.service.begin();
  f.provider.finish = async () => { throw new AuthError('login_failed'); };
  await assert.rejects(f.service.complete({ state: flow.id, cookie: flow.id, code: 'valid-code', denied: false }), hasCode('login_failed'));
  await assert.rejects(f.service.complete({ state: flow.id, cookie: flow.id, code: 'valid-code', denied: false }), hasCode('invalid_flow'));
});
test('public session is an allowlist and cannot disclose or mutate stored tokens', async () => {
  const f = fixture(); const result = await f.login(); const session = (await f.service.publicSession(result.id))!;
  assert.deepEqual(session, { user: { name: 'Tester', email: 'test@example.com' }, googleAuthorized: true });
  const json = JSON.stringify(session); assert.ok(!json.includes('private-')); assert.ok(!json.includes('subject'));
  session.user.name = 'Changed'; assert.equal((await f.service.publicSession(result.id))?.user.name, 'Tester');
  assert.equal(result.returnTo, '/trip?day=1');
});
test('new sign-in rotates the session and invalidates the old identifier', async () => {
  const f = fixture(); const first = await f.login(); const second = await f.login(first.id);
  assert.notEqual(first.id, second.id); assert.equal((await f.service.publicSession(first.id)), null);
  assert.ok((await f.service.publicSession(second.id)));
});
test('logout and absolute expiry invalidate server sessions', async () => {
  const f = fixture(); const first = await f.login(); await f.service.logout(first.id);
  await assert.rejects(f.service.accessToken(first.id), hasCode('unauthenticated'));
  const second = await f.login(); f.advance(SESSION_TTL_MS);
  assert.equal((await f.service.publicSession(second.id)), null);
});
test('access tokens refresh on the server without extending session expiry', async () => {
  const f = fixture(); const session = await f.login(); const expiry = f.store.getSession(session.id)!.expiresAt;
  f.advance(3_550_000); assert.equal(await f.service.accessToken(session.id), 'updated-access');
  assert.equal(f.store.getSession(session.id)!.expiresAt, expiry);
  assert.equal(f.store.getSession(session.id)!.revision, 1);
});
test('revoked refresh grant invalidates the session; temporary failures preserve it', async () => {
  const f = fixture(); const session = await f.login(); f.advance(3_550_000);
  f.provider.refresh = async () => { throw new Error('network'); };
  await assert.rejects(f.service.accessToken(session.id), hasCode('temporarily_unavailable'));
  assert.ok((await f.service.publicSession(session.id)));
  f.provider.refresh = async () => { throw new GrantRevokedError(); };
  await assert.rejects(f.service.accessToken(session.id), hasCode('reauth_required'));
  assert.equal((await f.service.publicSession(session.id)), null);
});
test('an expiring grant without a refresh token requires reauthentication', async () => {
  const f = fixture(); delete f.identity.tokens.refreshToken;
  const session = await f.login(); f.advance(3_550_000);
  await assert.rejects(f.service.accessToken(session.id), hasCode('reauth_required'));
  assert.equal((await f.service.publicSession(session.id)), null);
});
test('a token refresh completing after logout cannot recreate the session', async () => {
  const f = fixture(); const session = await f.login(); f.advance(3_550_000);
  let finish!: () => void;
  f.provider.refresh = async () => {
    await new Promise<void>(resolve => { finish = resolve; });
    return { ...f.identity.tokens, accessToken: 'updated-access', expiresAt: 9_000_000 };
  };
  const pending = f.service.accessToken(session.id); await Promise.resolve(); await f.service.logout(session.id); finish();
  await assert.rejects(pending, hasCode('unauthenticated'));
  assert.equal((await f.service.publicSession(session.id)), null);
});
test('cross-site POSTs and missing origins are rejected', () => {
  const origin = 'http://localhost:3000';
  const cases: Record<string, string>[] = [{}, { origin: 'https://attacker.example' }, { origin, 'sec-fetch-site': 'cross-site' }];
  for (const headers of cases) {
    assert.throws(() => requireSameOrigin(new Request(`${origin}/api/auth/signout`, { method: 'POST', headers }), origin), hasCode('invalid_flow'));
  }
  assert.doesNotThrow(() => requireSameOrigin(new Request(`${origin}/api/auth/signout`, { method: 'POST', headers: { origin } }), origin));
});
test('post-login destinations cannot escape the site or invoke auth endpoints', () => {
  for (const value of ['https://attacker.example', '//attacker.example', '/\\attacker.example', '/\n/attacker', '/api/auth/signout']) assert.equal(safeReturnTo(value), '/');
  assert.equal(safeReturnTo('/trip?day=2#plans'), '/trip?day=2#plans');
});
test('the local store is bounded and expired flows free capacity', async () => {
  let now = 10; const store = new MemoryAuthStore(() => now, 1);
  const flow = { nonce: 'nonce', verifier: 'verifier', returnTo: '/', expiresAt: 20 };
  store.saveFlow('first', flow);
  assert.throws(() => store.saveFlow('second', flow), hasCode('temporarily_unavailable'));
  now = 20; store.saveFlow('second', { ...flow, expiresAt: 30 });
  assert.equal(store.takeFlow('first'), null); assert.ok(store.takeFlow('second')); assert.equal(store.takeFlow('second'), null);
});

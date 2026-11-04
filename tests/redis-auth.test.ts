import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RedisAuthStore, redisCommand } from '../lib/auth/redis-store';
import { AuthError, type Session } from '../lib/auth/core';

function fixture() {
  let now = 1000;
  const rows = new Map<string, string>();
  const ttls: number[] = [];
  const command = async (a: (string | number)[]) => {
    const key = String(a[1]);
    if (a[0] === 'SET') {
      rows.set(key, String(a[2]));
      ttls.push(Number(a[4]));
      return 'OK';
    }
    if (a[0] === 'GET') return rows.get(key) ?? null;
    if (a[0] === 'GETDEL') {
      const value = rows.get(key) ?? null;
      rows.delete(key);
      return value;
    }
    if (a[0] === 'DEL') return Number(rows.delete(key));
    if (a[0] === 'EVAL') {
      const k = String(a[3]);
      if (rows.get(k) !== a[4]) return 0;
      rows.set(k, String(a[5]));
      ttls.push(Number(a[6]));
      return 1;
    }
    throw new Error('Unexpected command');
  };
  const key = Buffer.alloc(32, 1);
  const store = new RedisAuthStore(command, key, 'test:', () => now);
  const second = new RedisAuthStore(command, key, 'test:', () => now);
  const session: Session = {
    subject: 'subject',
    user: { name: 'Test', email: 'test@example.com' },
    tokens: {
      accessToken: 'secret-access',
      refreshToken: 'secret-refresh',
      expiresAt: 9000,
      scopes: [],
    },
    expiresAt: 10000,
    revision: 0,
  };
  return {
    store,
    second,
    rows,
    ttls,
    session,
    advance: (n: number) => {
      now += n;
    },
  };
}
test('encrypted sessions survive independent store instances, with absolute TTL', async () => {
  const f = fixture();
  await f.store.saveSession('id', f.session);
  assert.equal(f.ttls[0], 9000);
  assert.deepEqual(await f.second.getSession('id'), f.session);
  assert.ok(![...f.rows.values()].join('').includes('secret-access'));
  f.advance(9000);
  assert.equal(await f.second.getSession('id'), null);
});
test('flows are consumed once across instances', async () => {
  const f = fixture();
  const flow = { nonce: 'nonce', verifier: 'verifier', returnTo: '/', expiresAt: 2000 };
  await f.store.saveFlow('id', flow);
  const results = await Promise.all([f.store.takeFlow('id'), f.second.takeFlow('id')]);
  assert.equal(results.filter(Boolean).length, 1);
});
test('refresh preserves expiry, rejects stale revisions and cannot restore logout', async () => {
  const f = fixture();
  await f.store.saveSession('id', f.session);
  f.advance(500);
  assert.equal(await f.second.replaceSession('id', 0, { ...f.session, revision: 1 }), true);
  assert.equal(f.ttls.at(-1), 8500);
  assert.equal(await f.store.replaceSession('id', 0, { ...f.session, revision: 1 }), false);
  await f.second.deleteSession('id');
  assert.equal(await f.store.replaceSession('id', 1, { ...f.session, revision: 2 }), false);
});
test('tampering or copying ciphertext to a different session fails closed', async () => {
  const f = fixture();
  await f.store.saveSession('a', f.session);
  f.rows.set('test:session:b', f.rows.get('test:session:a')!);
  await assert.rejects(f.store.getSession('b'), AuthError);
  f.rows.set('test:session:a', 'corrupted');
  await assert.rejects(f.store.getSession('a'), AuthError);
});
test('REST transport does not expose credentials in URLs and sanitizes service errors', async () => {
  const transport = redisCommand(
    'https://example.upstash.io',
    'private-token',
    async (url, options) => {
      assert.equal(String(url), 'https://example.upstash.io/');
      assert.equal(options?.redirect, 'error');
      assert.equal(options?.cache, 'no-store');
      assert.equal(JSON.parse(String(options?.body))[0], 'GET');
      return new Response(JSON.stringify({ error: 'private-token' }), { status: 200 });
    },
  );
  await assert.rejects(
    transport(['GET', 'key']),
    (e: unknown) => e instanceof AuthError && e.message === 'temporarily_unavailable',
  );
  assert.throws(() => redisCommand('http://example.upstash.io', 'token'));
});

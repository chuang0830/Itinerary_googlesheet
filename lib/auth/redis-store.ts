import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AuthError, type AuthStore, type LoginFlow, type Session } from './core';

type Command = (args: (string | number)[]) => Promise<unknown>;
// Both flows and tokens are encrypted before leaving this server. Bind ciphertext to its key.
export class RedisAuthStore implements AuthStore {
  constructor(
    private command: Command,
    private key: Buffer,
    private prefix = 'travel:auth:',
    private now = Date.now,
  ) {
    if (key.length !== 32) throw new Error('Invalid session encryption key');
  }
  private name(kind: string, id: string) {
    return `${this.prefix}${kind}:${id}`;
  }
  private seal(name: string, value: unknown) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(name));
    return Buffer.concat([
      iv,
      cipher.update(JSON.stringify(value)),
      cipher.final(),
      cipher.getAuthTag(),
    ]).toString('base64');
  }
  private open<T extends { expiresAt: number }>(name: string, raw: unknown): T | null {
    if (raw === null) return null;
    try {
      if (typeof raw !== 'string') throw new Error();
      const bytes = Buffer.from(raw, 'base64');
      const cipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, 12));
      cipher.setAAD(Buffer.from(name));
      cipher.setAuthTag(bytes.subarray(-16));
      const value = JSON.parse(
        Buffer.concat([cipher.update(bytes.subarray(12, -16)), cipher.final()]).toString(),
      ) as T;
      if (!Number.isFinite(value.expiresAt)) throw new Error();
      return value.expiresAt > this.now() ? value : null;
    } catch {
      throw new AuthError('temporarily_unavailable');
    }
  }
  private async save(name: string, value: { expiresAt: number }) {
    const ttl = value.expiresAt - this.now();
    if (ttl <= 0) throw new AuthError('temporarily_unavailable');
    if ((await this.command(['SET', name, this.seal(name, value), 'PX', ttl])) !== 'OK')
      throw new AuthError('temporarily_unavailable');
  }
  saveFlow(id: string, flow: LoginFlow) {
    return this.save(this.name('flow', id), flow);
  }
  async takeFlow(id: string) {
    const name = this.name('flow', id);
    return this.open<LoginFlow>(name, await this.command(['GETDEL', name]));
  }
  async deleteFlow(id: string) {
    await this.command(['DEL', this.name('flow', id)]);
  }
  saveSession(id: string, value: Session) {
    return this.save(this.name('session', id), value);
  }
  async getSession(id: string) {
    const name = this.name('session', id);
    return this.open<Session>(name, await this.command(['GET', name]));
  }
  async replaceSession(id: string, revision: number, value: Session) {
    const name = this.name('session', id);
    const raw = await this.command(['GET', name]);
    const current = this.open<Session>(name, raw);
    if (!current || current.revision !== revision) return false;
    const ttl = value.expiresAt - this.now();
    if (ttl <= 0) return false;
    // Compare encrypted bytes atomically: logout or another refresh cannot be overwritten.
    const script =
      "if redis.call('GET',KEYS[1]) == ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'PX',ARGV[3]); return 1 else return 0 end";
    return (
      (await this.command([
        'EVAL',
        script,
        1,
        name,
        raw as string,
        this.seal(name, value),
        ttl,
      ])) === 1
    );
  }
  async deleteSession(id: string) {
    await this.command(['DEL', this.name('session', id)]);
  }
}

export function redisCommand(url: string, token: string, fetcher: typeof fetch = fetch): Command {
  const endpoint = new URL(url);
  if (
    endpoint.protocol !== 'https:' ||
    !endpoint.hostname.endsWith('.upstash.io') ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== '/' ||
    endpoint.search ||
    endpoint.hash
  )
    throw new Error('Invalid Redis endpoint');
  return async (args) => {
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.error || !Object.hasOwn(data, 'result')) throw new Error();
      return data.result;
    } catch {
      throw new AuthError('temporarily_unavailable');
    }
  };
}

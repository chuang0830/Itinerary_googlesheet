import { randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const FLOW_TTL_MS = 10 * 60 * 1000;
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const GOOGLE_SCOPES = ['openid', 'email', 'profile', DRIVE_FILE_SCOPE];
export const randomId = () => randomBytes(32).toString('base64url');
export const validId = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value);

export type PublicUser = { name: string; email: string };
export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
};
export type Identity = { subject: string; user: PublicUser; tokens: GoogleTokens };
export type LoginFlow = { nonce: string; verifier: string; returnTo: string; expiresAt: number };
export type Session = Identity & { expiresAt: number; revision: number };
export type AuthCode =
  | 'invalid_flow'
  | 'login_failed'
  | 'unauthenticated'
  | 'reauth_required'
  | 'temporarily_unavailable';
export class AuthError extends Error {
  constructor(public readonly code: AuthCode) {
    super(code);
  }
}
export class GrantRevokedError extends Error {}

// Only relative, same-origin paths may be used after sign-in.
export function safeReturnTo(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return '/';
  try {
    const url = new URL(value, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid' || url.pathname.startsWith('/api/auth')) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
export function sameSecret(a: string, b: string): boolean {
  return validId(a) && validId(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export function requireSameOrigin(request: Request, origin: string): void {
  if (
    request.headers.get('origin') !== origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    throw new AuthError('invalid_flow');
  }
}

type MaybePromise<T> = T | Promise<T>;
export interface AuthStore {
  saveFlow(id: string, flow: LoginFlow): MaybePromise<void>;
  takeFlow(id: string): MaybePromise<LoginFlow | null>;
  deleteFlow(id: string): MaybePromise<void>;
  saveSession(id: string, session: Session): MaybePromise<void>;
  getSession(id: string): MaybePromise<Session | null>;
  replaceSession(id: string, expectedRevision: number, session: Session): MaybePromise<boolean>;
  deleteSession(id: string): MaybePromise<void>;
}

// Development only. One shared process-local store, with bounded, expiring entries.
export class MemoryAuthStore implements AuthStore {
  private flows = new Map<string, LoginFlow>();
  private sessions = new Map<string, Session>();
  constructor(
    private now: () => number = Date.now,
    private capacity = 1000,
  ) {}
  private prune() {
    for (const [id, value] of this.flows) if (value.expiresAt <= this.now()) this.flows.delete(id);
    for (const [id, value] of this.sessions)
      if (value.expiresAt <= this.now()) this.sessions.delete(id);
  }
  private assertCapacity(size: number) {
    if (size >= this.capacity) throw new AuthError('temporarily_unavailable');
  }
  saveFlow(id: string, flow: LoginFlow) {
    this.prune();
    this.assertCapacity(this.flows.size);
    this.flows.set(id, structuredClone(flow));
  }
  takeFlow(id: string) {
    this.prune();
    const flow = this.flows.get(id);
    this.flows.delete(id);
    return flow ? structuredClone(flow) : null;
  }
  deleteFlow(id: string) {
    this.flows.delete(id);
  }
  saveSession(id: string, session: Session) {
    this.prune();
    this.assertCapacity(this.sessions.size);
    this.sessions.set(id, structuredClone(session));
  }
  getSession(id: string) {
    this.prune();
    const session = this.sessions.get(id);
    return session ? structuredClone(session) : null;
  }
  replaceSession(id: string, expectedRevision: number, session: Session) {
    this.prune();
    if (this.sessions.get(id)?.revision !== expectedRevision) return false;
    this.sessions.set(id, structuredClone(session));
    return true;
  }
  deleteSession(id: string) {
    this.sessions.delete(id);
  }
}

export interface GoogleProvider {
  start(state: string, nonce: string): Promise<{ url: string; verifier: string }>;
  finish(code: string, verifier: string, nonce: string): Promise<Identity>;
  refresh(tokens: GoogleTokens): Promise<GoogleTokens>;
}

export class AuthService {
  constructor(
    private store: AuthStore,
    private google: GoogleProvider,
    private now: () => number = Date.now,
  ) {}
  async begin(returnTo?: string | null, previousFlow?: string) {
    if (previousFlow) await this.store.deleteFlow(previousFlow);
    const id = randomId();
    const nonce = randomId();
    const { url, verifier } = await this.google.start(id, nonce);
    await this.store.saveFlow(id, {
      nonce,
      verifier,
      returnTo: safeReturnTo(returnTo),
      expiresAt: this.now() + FLOW_TTL_MS,
    });
    return { id, url };
  }
  async complete({
    state,
    cookie,
    code,
    denied,
    previousSession,
  }: {
    state: string;
    cookie: string;
    code: string;
    denied: boolean;
    previousSession?: string;
  }) {
    if (!sameSecret(state, cookie)) throw new AuthError('invalid_flow');
    const flow = await this.store.takeFlow(state);
    if (!flow) throw new AuthError('invalid_flow');
    if (denied || !code || code.length > 4096) throw new AuthError('login_failed');
    const identity = await this.google.finish(code, flow.verifier, flow.nonce);
    if (!identity.tokens.accessToken || identity.tokens.expiresAt <= this.now())
      throw new AuthError('login_failed');
    const id = randomId();
    await this.store.saveSession(id, {
      ...identity,
      revision: 0,
      expiresAt: this.now() + SESSION_TTL_MS,
    });
    if (previousSession) await this.store.deleteSession(previousSession);
    return { id, returnTo: flow.returnTo };
  }
  async publicSession(id?: string) {
    const session = id && validId(id) ? await this.store.getSession(id) : null;
    if (!session) return null;
    return {
      user: session.user,
      googleAuthorized: session.tokens.scopes.includes(DRIVE_FILE_SCOPE),
    };
  }
  async subject(id?: string) {
    return id && validId(id) ? (await this.store.getSession(id))?.subject || null : null;
  }
  async logout(id?: string) {
    if (id && validId(id)) await this.store.deleteSession(id);
  }
  // Call only from server-side Google API helpers; never serialize this return value.
  async accessToken(id?: string): Promise<string> {
    if (!id || !validId(id)) throw new AuthError('unauthenticated');
    const session = await this.store.getSession(id);
    if (!session) throw new AuthError('unauthenticated');
    if (session.tokens.expiresAt > this.now() + 60_000) return session.tokens.accessToken;
    if (!session.tokens.refreshToken) {
      await this.store.deleteSession(id);
      throw new AuthError('reauth_required');
    }
    let tokens: GoogleTokens;
    try {
      tokens = await this.google.refresh(session.tokens);
    } catch (error) {
      if (error instanceof GrantRevokedError) {
        await this.store.deleteSession(id);
        throw new AuthError('reauth_required');
      }
      throw new AuthError('temporarily_unavailable');
    }
    if (!tokens.accessToken || tokens.expiresAt <= this.now())
      throw new AuthError('temporarily_unavailable');
    const saved = await this.store.replaceSession(id, session.revision, {
      ...session,
      tokens: { ...tokens, refreshToken: tokens.refreshToken || session.tokens.refreshToken },
      revision: session.revision + 1,
    });
    // A concurrent refresh must not restore a session removed by logout.
    const current = await this.store.getSession(id);
    if (!current) throw new AuthError('unauthenticated');
    if (!saved && current.tokens.expiresAt <= this.now() + 60_000)
      throw new AuthError('temporarily_unavailable');
    return current.tokens.accessToken;
  }
}

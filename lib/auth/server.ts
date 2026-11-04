import 'server-only';
import { cookies } from 'next/headers';
import { AuthError, AuthService, MemoryAuthStore } from './core';
import { authConfig } from './config';
import { googleProvider } from './google';
import { RedisAuthStore, redisCommand } from './redis-store';

export const SESSION_COOKIE = 'travel_session';
export const FLOW_COOKIE = 'travel_oauth_flow';
export const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
// All local dev route bundles use the same store. Restarting the process clears it.
const globals = globalThis as typeof globalThis & { travelLocalAuthStore?: MemoryAuthStore };
export function authService() {
  const config = authConfig();
  if (!config) throw new AuthError('temporarily_unavailable');
  const redisConfigured = [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN, process.env.SESSION_ENCRYPTION_KEY];
  if (redisConfigured.some(Boolean) && !redisConfigured.every(Boolean)) throw new AuthError('temporarily_unavailable');
  if (redisConfigured.every(Boolean)) {
    const store = new RedisAuthStore(redisCommand(process.env.UPSTASH_REDIS_REST_URL!, process.env.UPSTASH_REDIS_REST_TOKEN!), Buffer.from(process.env.SESSION_ENCRYPTION_KEY!, 'base64'));
    return new AuthService(store, googleProvider(config));
  }
  globals.travelLocalAuthStore ??= new MemoryAuthStore();
  return new AuthService(globals.travelLocalAuthStore, googleProvider(config));
}
export async function currentUser() {
  if (!authConfig()) return null;
  return authService().publicSession((await cookies()).get(SESSION_COOKIE)?.value);
}
// Google tokens can be obtained only inside server modules, using the current request's session.
export async function currentGoogleAccessToken() {
  return authService().accessToken((await cookies()).get(SESSION_COOKIE)?.value);
}
export const privateHeaders = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' };

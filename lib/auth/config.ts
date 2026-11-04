import 'server-only';

export type AuthConfig = { origin: string; clientId: string; clientSecret: string; callbackUrl: string };
export function authConfig(): AuthConfig | null {
  // A process-local token store is intentionally never enabled on Vercel or in production.
  if (process.env.NODE_ENV !== 'development' || process.env.VERCEL) return null;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const rawOrigin = process.env.AUTH_URL || 'http://localhost:3000';
  try {
    const url = new URL(rawOrigin);
    if (!clientId || !clientSecret || !['localhost', '127.0.0.1'].includes(url.hostname) ||
      url.protocol !== 'http:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return { origin: url.origin, clientId, clientSecret, callbackUrl: `${url.origin}/api/auth/callback` };
  } catch { return null; }
}

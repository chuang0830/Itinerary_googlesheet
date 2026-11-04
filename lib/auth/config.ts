import 'server-only';

export type AuthConfig = {
  origin: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};
export function authConfig(): AuthConfig | null {
  const local = process.env.NODE_ENV === 'development' && !process.env.VERCEL;
  const redisReady = Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN &&
      process.env.SESSION_ENCRYPTION_KEY &&
      Buffer.from(process.env.SESSION_ENCRYPTION_KEY, 'base64').length === 32,
  );
  if (!local && !redisReady) return null;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const rawOrigin = process.env.AUTH_URL || 'http://localhost:3000';
  try {
    const url = new URL(rawOrigin);
    if (
      !clientId ||
      !clientSecret ||
      (local
        ? !['localhost', '127.0.0.1'].includes(url.hostname) || url.protocol !== 'http:'
        : url.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname)) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    return {
      origin: url.origin,
      clientId,
      clientSecret,
      callbackUrl: `${url.origin}/api/auth/callback`,
    };
  } catch {
    return null;
  }
}

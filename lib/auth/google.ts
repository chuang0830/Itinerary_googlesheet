import 'server-only';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { AuthError, GOOGLE_SCOPES, GrantRevokedError, type GoogleProvider, type GoogleTokens } from './core';
import type { AuthConfig } from './config';

export function googleProvider(config: AuthConfig): GoogleProvider {
  const client = () => new OAuth2Client(config.clientId, config.clientSecret, config.callbackUrl);
  return {
    async start(state, nonce) {
      const oauth = client();
      const { codeVerifier, codeChallenge } = await oauth.generateCodeVerifierAsync();
      const url = oauth.generateAuthUrl({
        scope: GOOGLE_SCOPES, state, nonce, access_type: 'offline', prompt: 'consent select_account',
        code_challenge: codeChallenge, code_challenge_method: CodeChallengeMethod.S256,
        include_granted_scopes: true,
      });
      return { url, verifier: codeVerifier };
    },
    async finish(code, verifier, nonce) {
      try {
        const oauth = client();
        const { tokens } = await oauth.getToken({ code, codeVerifier: verifier, redirect_uri: config.callbackUrl });
        if (!tokens.id_token || !tokens.access_token || !tokens.expiry_date) throw new AuthError('login_failed');
        const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email || payload.email_verified !== true ||
          (payload as typeof payload & { nonce?: string }).nonce !== nonce) throw new AuthError('login_failed');
        const scopes = tokens.scope?.split(' ').filter(Boolean) || (await oauth.getTokenInfo(tokens.access_token)).scopes;
        return {
          subject: payload.sub,
          user: { name: payload.name || payload.email, email: payload.email },
          tokens: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token || undefined,
            expiresAt: tokens.expiry_date, scopes },
        };
      } catch { throw new AuthError('login_failed'); }
    },
    async refresh(previous: GoogleTokens) {
      const oauth = client();
      oauth.setCredentials({ refresh_token: previous.refreshToken });
      try {
        const { credentials } = await oauth.refreshAccessToken();
        if (!credentials.access_token || !credentials.expiry_date) throw new Error('Missing credentials');
        return { accessToken: credentials.access_token, refreshToken: credentials.refresh_token || previous.refreshToken,
          expiresAt: credentials.expiry_date, scopes: credentials.scope?.split(' ').filter(Boolean) || previous.scopes };
      } catch (error) {
        // Never log or return the upstream error: it can contain request credentials.
        const upstream = error as { response?: { data?: { error?: string } } };
        if (upstream.response?.data?.error === 'invalid_grant') throw new GrantRevokedError();
        throw new AuthError('temporarily_unavailable');
      }
    },
  };
}

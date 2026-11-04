import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/config';
import { continueTripSignIn } from '@/lib/auth/trip-entry-server';
import { tripSignInTarget } from '@/lib/auth/trip-entry';
import { AuthError, requireSameOrigin, FLOW_TTL_MS } from '@/lib/auth/core';
import {
  authService,
  FLOW_COOKIE,
  SESSION_COOKIE,
  cookieOptions,
  privateHeaders,
} from '@/lib/auth/server';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const config = authConfig();
  if (!config)
    return NextResponse.json(
      { error: '本機 Google 登入尚未設定，或目前不是本機開發環境。' },
      { status: 503, headers: privateHeaders },
    );
  try {
    requireSameOrigin(request, config.origin);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403, headers: privateHeaders },
    );
  }
  try {
    const form = await request.formData();
    const returnTo = form.get('returnTo');
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
    if (
      typeof returnTo === 'string' &&
      tripSignInTarget(returnTo) &&
      sessionId &&
      (await authService().subject(sessionId))
    ) {
      try {
        return await continueTripSignIn(sessionId, returnTo, config.origin);
      } catch (error) {
        if (
          !(error instanceof AuthError) ||
          !['unauthenticated', 'reauth_required'].includes(error.code)
        ) {
          const destination = new URL(returnTo, config.origin);
          destination.searchParams.set('accessNotice', 'check_failed');
          return NextResponse.redirect(destination, { status: 303, headers: privateHeaders });
        }
      }
    }
    const flow = await authService().begin(
      typeof returnTo === 'string' ? returnTo : '/',
      request.cookies.get(FLOW_COOKIE)?.value,
    );
    const response = NextResponse.redirect(flow.url, { status: 303, headers: privateHeaders });
    response.cookies.set(FLOW_COOKIE, flow.id, { ...cookieOptions, maxAge: FLOW_TTL_MS / 1000 });
    return response;
  } catch {
    return NextResponse.redirect(new URL('/?authError=unavailable', config.origin), {
      status: 303,
      headers: privateHeaders,
    });
  }
}

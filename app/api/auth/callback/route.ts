import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/config';
import { AuthError, SESSION_TTL_MS } from '@/lib/auth/core';
import {
  authService,
  FLOW_COOKIE,
  SESSION_COOKIE,
  cookieOptions,
  privateHeaders,
} from '@/lib/auth/server';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const config = authConfig();
  if (!config)
    return NextResponse.json(
      { error: 'Local authentication is not configured.' },
      { status: 503, headers: privateHeaders },
    );
  const query = request.nextUrl.searchParams;
  try {
    const result = await authService().complete({
      state: query.get('state') || '',
      cookie: request.cookies.get(FLOW_COOKIE)?.value || '',
      code: query.get('code') || '',
      denied: query.has('error'),
      pickedFileIds: query.get('picked_file_ids') || undefined,
      previousSession: request.cookies.get(SESSION_COOKIE)?.value,
    });
    const response = NextResponse.redirect(new URL(result.returnTo, config.origin), {
      status: 303,
      headers: privateHeaders,
    });
    response.cookies.set(SESSION_COOKIE, result.id, {
      ...cookieOptions,
      maxAge: SESSION_TTL_MS / 1000,
    });
    response.cookies.set(FLOW_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    const code =
      error instanceof AuthError && error.code === 'invalid_flow'
        ? 'expired'
        : query.has('error')
          ? 'denied'
          : 'failed';
    const response = NextResponse.redirect(new URL(`/?authError=${code}`, config.origin), {
      status: 303,
      headers: privateHeaders,
    });
    response.cookies.set(FLOW_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    return response;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/config';
import { continueTripSignIn } from '@/lib/auth/trip-entry-server';
import { AuthError, AuthReturnError, SESSION_TTL_MS } from '@/lib/auth/core';
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
  let completed: { id: string; returnTo: string } | undefined;
  try {
    const result = await authService().complete({
      state: query.get('state') || '',
      cookie: request.cookies.get(FLOW_COOKIE)?.value || '',
      code: query.get('code') || '',
      denied: query.has('error'),
      pickedFileIds: query.get('picked_file_ids') || undefined,
      previousSession: request.cookies.get(SESSION_COOKIE)?.value,
    });
    completed = result;
    const response = await continueTripSignIn(
      result.id,
      result.returnTo,
      config.origin,
      result.selectionCompleted,
    );
    response.cookies.set(SESSION_COOKIE, result.id, {
      ...cookieOptions,
      maxAge: SESSION_TTL_MS / 1000,
    });
    return response;
  } catch (error) {
    const code =
      error instanceof AuthError && error.code === 'invalid_flow'
        ? 'expired'
        : query.has('error')
          ? 'denied'
          : 'failed';
    const destination = new URL(
      completed?.returnTo || (error instanceof AuthReturnError ? error.returnTo : '/'),
      config.origin,
    );
    destination.searchParams.set(
      completed ? 'accessNotice' : 'authError',
      completed ? 'check_failed' : code,
    );
    const response = NextResponse.redirect(destination, { status: 303, headers: privateHeaders });
    if (completed)
      response.cookies.set(SESSION_COOKIE, completed.id, {
        ...cookieOptions,
        maxAge: SESSION_TTL_MS / 1000,
      });
    response.cookies.set(FLOW_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    return response;
  }
}

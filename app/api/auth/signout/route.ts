import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/config';
import { requireSameOrigin } from '@/lib/auth/core';
import { authService, SESSION_COOKIE, FLOW_COOKIE, cookieOptions, privateHeaders } from '@/lib/auth/server';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const config = authConfig();
  if (!config) return NextResponse.json({ error: 'Local authentication is not configured.' }, { status: 503, headers: privateHeaders });
  try { requireSameOrigin(request, config.origin); }
  catch { return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: privateHeaders }); }
  authService().logout(request.cookies.get(SESSION_COOKIE)?.value);
  const response = NextResponse.redirect(config.origin, { status: 303, headers: privateHeaders });
  response.cookies.set(SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(FLOW_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  return response;
}

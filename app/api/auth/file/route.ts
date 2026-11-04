import { NextRequest, NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/config';
import { requireSameOrigin, FLOW_TTL_MS } from '@/lib/auth/core';
import {
  authService,
  FLOW_COOKIE,
  SESSION_COOKIE,
  cookieOptions,
  privateHeaders,
} from '@/lib/auth/server';
import { validSpreadsheetId } from '@/lib/trip/create-schema';
import { publicTrip } from '@/lib/google/public-trip';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const config = authConfig();
  if (!config)
    return NextResponse.json(
      { error: '授權服務暫時無法使用。' },
      { status: 503, headers: privateHeaders },
    );
  try {
    requireSameOrigin(request, config.origin);
  } catch {
    return NextResponse.json({ error: '請從本站提交。' }, { status: 403, headers: privateHeaders });
  }
  try {
    const body = await request.formData();
    const id = body.get('spreadsheetId');
    if (typeof id !== 'string' || !validSpreadsheetId(id))
      return NextResponse.json(
        { error: '旅行網址格式不正確。' },
        { status: 400, headers: privateHeaders },
      );
    await publicTrip(id);
    const flow = await authService().beginFile(
      request.cookies.get(SESSION_COOKIE)?.value || '',
      id,
    );
    const response = NextResponse.redirect(flow.url, { status: 303, headers: privateHeaders });
    response.cookies.set(FLOW_COOKIE, flow.id, { ...cookieOptions, maxAge: FLOW_TTL_MS / 1000 });
    return response;
  } catch {
    return NextResponse.redirect(new URL('/?authError=file', config.origin), {
      status: 303,
      headers: privateHeaders,
    });
  }
}

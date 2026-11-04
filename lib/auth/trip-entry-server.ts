import 'server-only';
import { NextResponse } from 'next/server';
import { authService, FLOW_COOKIE, cookieOptions, privateHeaders } from './server';
import { FLOW_TTL_MS } from './core';
import { checkTripFileAccess, tripEntryDecision, tripSignInTarget } from './trip-entry';
import { publicTrip } from '@/lib/google/public-trip';

// Called only after an intentional sign-in/edit POST or successful OAuth callback.
// Page visits alone never initiate OAuth or grant file access.
export async function continueTripSignIn(
  sessionId: string,
  returnTo: string,
  origin: string,
  selectionCompleted = false,
) {
  const service = authService();
  const target = tripSignInTarget(returnTo);
  const decision = await tripEntryDecision(returnTo, selectionCompleted, async (id) => {
    await publicTrip(id);
    return checkTripFileAccess(id, await service.accessToken(sessionId));
  });
  if (decision.selectFile && target) {
    const flow = await service.beginFile(sessionId, target.id, decision.path);
    const response = NextResponse.redirect(flow.url, { status: 303, headers: privateHeaders });
    response.cookies.set(FLOW_COOKIE, flow.id, { ...cookieOptions, maxAge: FLOW_TTL_MS / 1000 });
    return response;
  }
  const response = NextResponse.redirect(new URL(decision.path, origin), {
    status: 303,
    headers: privateHeaders,
  });
  response.cookies.set(FLOW_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  return response;
}

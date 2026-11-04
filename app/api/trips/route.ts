import { NextRequest, NextResponse } from 'next/server';
import { privateHeaders } from '@/lib/auth/server';
import { googleTripCreator } from '@/lib/google/trip-creator';
import { parseCreateTrip } from '@/lib/trip/create-schema';
import { creationService, creationOwner, readCreationInput, requestKey, creationFailure } from '@/lib/trip/creation-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const owner = await creationOwner(request, true); const body = await readCreationInput(request);
    const result = await creationService().create(owner, requestKey(body.requestKey), parseCreateTrip(body), googleTripCreator());
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) { return creationFailure(error); }
}
export async function GET(request: NextRequest) {
  try {
    const owner = await creationOwner(request);
    return NextResponse.json(await creationService().status(owner, requestKey(request.nextUrl.searchParams.get('requestKey'))), { headers: privateHeaders });
  } catch (error) { return creationFailure(error); }
}

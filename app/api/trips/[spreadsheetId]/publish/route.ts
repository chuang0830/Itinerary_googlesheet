import { NextRequest, NextResponse } from 'next/server';
import { privateHeaders } from '@/lib/auth/server';
import { googleTripCreator } from '@/lib/google/trip-creator';
import { TripInputError, validSpreadsheetId } from '@/lib/trip/create-schema';
import { creationService, creationOwner, readCreationInput, requestKey, creationFailure } from '@/lib/trip/creation-server';
export const runtime = 'nodejs';
export async function POST(request: NextRequest, context: { params: Promise<{ spreadsheetId: string }> }) {
  try {
    const owner = await creationOwner(request, true); const { spreadsheetId } = await context.params;
    if (!validSpreadsheetId(spreadsheetId)) throw new TripInputError('試算表網址格式不正確。');
    const body = await readCreationInput(request);
    const result = await creationService().publish(owner, requestKey(body.requestKey), spreadsheetId, googleTripCreator());
    return NextResponse.json(result, { headers: privateHeaders });
  } catch (error) { return creationFailure(error); }
}

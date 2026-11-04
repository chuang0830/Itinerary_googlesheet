import { NextRequest, NextResponse } from 'next/server';
import { currentGoogleAccessToken } from '@/lib/auth/server';
import { itineraryGateway } from '@/lib/google/itinerary-gateway';
import { editableTrip, editFailure, editHeaders } from '@/lib/trip/edit-server';
import { readTripEditors } from '@/lib/trip/editors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ spreadsheetId: string }> },
) {
  try {
    const { spreadsheetId } = await context.params;
    await editableTrip(request, spreadsheetId);
    const editors = await readTripEditors(
      spreadsheetId,
      () => itineraryGateway(spreadsheetId).canView(),
      currentGoogleAccessToken,
    );
    return NextResponse.json({ editors }, { headers: editHeaders });
  } catch (error) {
    return editFailure(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { editableTrip, editFailure, editHeaders, withItineraryLock } from '@/lib/trip/edit-server';
import { itineraryGateway } from '@/lib/google/itinerary-gateway';
import { loadEditable, saveItinerary } from '@/lib/trip/itinerary-edit';
import { readCreationInput } from '@/lib/trip/creation-server';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ spreadsheetId: string }> }) {
  try { const { spreadsheetId } = await context.params; const trip = await editableTrip(request, spreadsheetId);
    const snapshot = await loadEditable(itineraryGateway(spreadsheetId));
    return NextResponse.json({ trip: { ...trip, itinerary: snapshot.itinerary }, version: snapshot.version }, { headers: editHeaders });
  } catch (error) { return editFailure(error); }
}
export async function PUT(request: NextRequest, context: { params: Promise<{ spreadsheetId: string }> }) {
  try {
    const { spreadsheetId } = await context.params; await editableTrip(request, spreadsheetId, true);
    const body = await readCreationInput(request, 2_000_000);
    const result = await withItineraryLock(spreadsheetId, () => saveItinerary(itineraryGateway(spreadsheetId), body.version, body.itinerary));
    return NextResponse.json(result, { headers: editHeaders });
  } catch (error) { return editFailure(error); }
}

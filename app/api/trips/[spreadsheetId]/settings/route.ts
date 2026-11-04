import { NextRequest, NextResponse } from 'next/server';
import { editableTrip, editFailure, editHeaders, withItineraryLock } from '@/lib/trip/edit-server';
import { sheetGateway } from '@/lib/google/itinerary-gateway';
import { loadSettings, saveSettings } from '@/lib/trip/settings-edit';
import { readCreationInput } from '@/lib/trip/creation-server';
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ spreadsheetId: string }> },
) {
  try {
    const { spreadsheetId } = await context.params;
    await editableTrip(request, spreadsheetId);
    return NextResponse.json(await loadSettings(sheetGateway(spreadsheetId, 'Settings')), {
      headers: editHeaders,
    });
  } catch (error) {
    return editFailure(error);
  }
}
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ spreadsheetId: string }> },
) {
  try {
    const { spreadsheetId } = await context.params;
    await editableTrip(request, spreadsheetId, true);
    const body = await readCreationInput(request);
    const result = await withItineraryLock(spreadsheetId, () =>
      saveSettings(sheetGateway(spreadsheetId, 'Settings'), body.version, body.settings),
    );
    return NextResponse.json(result, { headers: editHeaders });
  } catch (error) {
    return editFailure(error);
  }
}

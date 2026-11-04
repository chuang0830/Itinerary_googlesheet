import { NextRequest, NextResponse } from 'next/server';
import { editableTrip, editFailure, editHeaders, withItineraryLock } from '@/lib/trip/edit-server';
import { sheetGateway } from '@/lib/google/itinerary-gateway';
import { loadManaged, saveManaged } from '@/lib/trip/managed-edit';
import { readCreationInput } from '@/lib/trip/creation-server';
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ spreadsheetId: string }> },
) {
  try {
    const { spreadsheetId } = await context.params;
    await editableTrip(request, spreadsheetId);
    return NextResponse.json(
      await loadManaged('Transportation', sheetGateway(spreadsheetId, 'Transportation')),
      { headers: editHeaders },
    );
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
    const body = await readCreationInput(request, 2_000_000);
    const result = await withItineraryLock(spreadsheetId, () =>
      saveManaged(
        'Transportation',
        sheetGateway(spreadsheetId, 'Transportation'),
        body.version,
        body.rows,
      ),
    );
    return NextResponse.json(result, { headers: editHeaders });
  } catch (error) {
    return editFailure(error);
  }
}

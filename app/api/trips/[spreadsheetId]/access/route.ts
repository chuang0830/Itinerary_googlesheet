import { NextRequest, NextResponse } from 'next/server';
import { editableTrip, editFailure, editHeaders } from '@/lib/trip/edit-server';
import { itineraryGateway } from '@/lib/google/itinerary-gateway';
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ spreadsheetId: string }> },
) {
  try {
    const { spreadsheetId } = await context.params;
    await editableTrip(request, spreadsheetId);
    return NextResponse.json(
      { canEdit: await itineraryGateway(spreadsheetId).canEdit() },
      { headers: editHeaders },
    );
  } catch (error) {
    return editFailure(error);
  }
}

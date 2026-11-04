import { NextResponse } from 'next/server';
import { publicTrip } from '@/lib/google/public-trip';
import { TripReadError } from '@/lib/trip/read';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(
  _request: Request,
  context: { params: Promise<{ spreadsheetId: string }> },
) {
  const headers = { 'Cache-Control': 'no-store, private' };
  try {
    return NextResponse.json(await publicTrip((await context.params).spreadsheetId), { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof TripReadError ? error.message : '無法讀取旅行，請稍後重試。' },
      { status: error instanceof TripReadError ? error.status : 503, headers },
    );
  }
}

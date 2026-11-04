import { notFound } from 'next/navigation';
import { TripBoard } from '@/components/trip/trip-board';
import { validSpreadsheetId } from '@/lib/trip/create-schema';
import { publicTrip } from '@/lib/google/public-trip';
import { TripReadError, type TripData } from '@/lib/trip/read';
export const dynamic = 'force-dynamic';
export default async function TripPage({ params }: { params: Promise<{ spreadsheetId: string }> }) {
  const { spreadsheetId } = await params;
  if (!validSpreadsheetId(spreadsheetId)) notFound();
  let trip: TripData | null = null; let error = '';
  try { trip = await publicTrip(spreadsheetId); }
  catch (failure) { error = failure instanceof TripReadError ? failure.message : '目前無法讀取 Google Sheets，請稍後重試。'; }
  return <TripBoard key={spreadsheetId} spreadsheetId={spreadsheetId} initialTrip={trip} initialError={error} />;
}

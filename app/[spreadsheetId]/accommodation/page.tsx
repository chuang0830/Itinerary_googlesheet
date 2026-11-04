import { notFound } from 'next/navigation';
import { validSpreadsheetId } from '@/lib/trip/create-schema';
import { publicTrip } from '@/lib/google/public-trip';
import { TripReadError, type TripData } from '@/lib/trip/read';
import { ManagedPage } from '@/components/trip/managed-page';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ spreadsheetId: string }> }) {
  const { spreadsheetId } = await params; if (!validSpreadsheetId(spreadsheetId)) notFound();
  let trip: TripData | null = null; let error = '';
  try { trip = await publicTrip(spreadsheetId); } catch (e) { error = e instanceof TripReadError ? e.message : '目前無法讀取 Google Sheets。'; }
  return <ManagedPage key={`${spreadsheetId}-Accommodation`} spreadsheetId={spreadsheetId} sheet="Accommodation" initialTrip={trip} initialError={error} />;
}

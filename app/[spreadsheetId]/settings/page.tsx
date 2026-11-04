import { notFound } from 'next/navigation';
import { validSpreadsheetId } from '@/lib/trip/create-schema';
import { publicTrip } from '@/lib/google/public-trip';
import { TripReadError } from '@/lib/trip/read';
import type { TripSettings } from '@/lib/trip/types';
import { SettingsPage } from '@/components/trip/settings-page';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ spreadsheetId: string }> }) {
  const { spreadsheetId } = await params;
  if (!validSpreadsheetId(spreadsheetId)) notFound();
  let settings: TripSettings | null = null;
  let error = '';
  try {
    settings = (await publicTrip(spreadsheetId)).settings;
  } catch (e) {
    error = e instanceof TripReadError ? e.message : '目前無法讀取 Google Sheets。';
  }
  return (
    <SettingsPage
      key={spreadsheetId}
      spreadsheetId={spreadsheetId}
      initialSettings={settings}
      initialError={error}
    />
  );
}

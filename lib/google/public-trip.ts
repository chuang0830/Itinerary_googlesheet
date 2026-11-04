import 'server-only';
import { readPublicTrip } from '@/lib/trip/read-http';
// API key identifies this app; it cannot authorize access to private spreadsheets.
// Never fall back to a signed-in user's OAuth token for public views.
export function publicTrip(id: string) {
  return readPublicTrip(id, process.env.GOOGLE_SHEETS_API_KEY);
}

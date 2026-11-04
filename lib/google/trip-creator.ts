import 'server-only';
import { currentGoogleAccessToken } from '@/lib/auth/server';
import { tripHttpCreator } from './trip-http';
export function googleTripCreator() {
  return tripHttpCreator(currentGoogleAccessToken);
}

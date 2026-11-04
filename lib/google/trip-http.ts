import { AuthError } from '@/lib/auth/core';
import { spreadsheetBody } from '@/lib/trip/create-schema';
import { GoogleTripError, type TripCreator } from '@/lib/trip/creation';

// Fixed Google endpoints only. Never forward browser-provided URLs or log upstream errors.
function googleRequest(getToken: () => Promise<string>, send: typeof fetch) {
  return async function google<T>(
    url: string,
    method: 'GET' | 'POST',
    body?: unknown,
    creation = false,
  ): Promise<T> {
    let token: string;
    try {
      token = await getToken();
    } catch (error) {
      throw new GoogleTripError(
        error instanceof AuthError && error.code !== 'temporarily_unavailable'
          ? 'unauthenticated'
          : 'unavailable',
      );
    }
    let response: Response;
    try {
      response = await send(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      throw new GoogleTripError('unavailable', creation);
    }
    if (!response.ok) {
      let disabled = false;
      try {
        const detail = await response.json();
        disabled =
          detail.error?.details?.some(
            (item: { reason?: string }) => item.reason === 'SERVICE_DISABLED',
          ) === true;
      } catch {}
      throw new GoogleTripError(
        disabled
          ? 'api_disabled'
          : response.status === 401
            ? 'unauthenticated'
            : response.status === 403
              ? 'permission'
              : 'unavailable',
        creation && response.status >= 500,
      );
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new GoogleTripError('invalid_response', creation);
    }
  };
}
type Permission = { type: string; role: string; allowFileDiscovery?: boolean };
export function tripHttpCreator(
  getToken: () => Promise<string>,
  send: typeof fetch = fetch,
): TripCreator {
  const google = googleRequest(getToken, send);
  return {
    async create(settings) {
      const result = await google<{ spreadsheetId: string }>(
        'https://sheets.googleapis.com/v4/spreadsheets?fields=spreadsheetId',
        'POST',
        spreadsheetBody(settings),
        true,
      );
      return result.spreadsheetId;
    },
    async publish(id) {
      const base = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}/permissions`;
      async function permissions() {
        const all: Permission[] = [];
        let pageToken: string | undefined;
        do {
          const query = new URLSearchParams({
            fields: 'nextPageToken,permissions(type,role,allowFileDiscovery)',
            pageSize: '100',
          });
          if (pageToken) query.set('pageToken', pageToken);
          const result = await google<{ permissions?: Permission[]; nextPageToken?: string }>(
            `${base}?${query}`,
            'GET',
          );
          all.push(...(result.permissions || []));
          pageToken = result.nextPageToken;
        } while (pageToken);
        return all;
      }
      const isPublicReader = (items: Permission[]) =>
        items.some(
          (p) => p.type === 'anyone' && p.role === 'reader' && p.allowFileDiscovery !== true,
        );
      const existing = await permissions();
      if (isPublicReader(existing)) return;
      // Do not silently replace an unexpected public permission changed outside this workflow.
      if (existing.some((p) => p.type === 'anyone')) throw new GoogleTripError('permission');
      await google(`${base}?fields=id`, 'POST', {
        type: 'anyone',
        role: 'reader',
        allowFileDiscovery: false,
      });
      if (!isPublicReader(await permissions())) throw new GoogleTripError('invalid_response');
    },
  };
}

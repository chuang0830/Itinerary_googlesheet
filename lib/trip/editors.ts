import { ItineraryError } from './edit-schema';
import { validSpreadsheetId } from './create-schema';

export type TripEditor = {
  key: string;
  name: string;
  displayName: string;
  kind: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer';
};
type Permission = {
  id?: string;
  emailAddress?: string;
  displayName?: string;
  domain?: string;
  type?: string;
  role?: string;
  deleted?: boolean;
};
const editorRoles = new Set(['owner', 'organizer', 'fileOrganizer', 'writer']);
// Called only after verifying the current user's file read access. No email or avatar URL is returned.
export async function readTripEditors(
  id: string,
  authorize: () => Promise<boolean>,
  getToken: () => Promise<string>,
  send: typeof fetch = fetch,
): Promise<TripEditor[]> {
  if (!validSpreadsheetId(id)) throw new ItineraryError('旅行網址格式不正確。');
  if (!(await authorize()))
    throw new ItineraryError('請先登入並授權存取這份試算表，才能查看協作者名單。', 403);
  const token = await getToken();
  const editors = new Map<string, TripEditor>();
  const visited = new Set<string>();
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({
      pageSize: '100',
      supportsAllDrives: 'true',
      fields: 'nextPageToken,permissions(id,type,role,emailAddress,displayName,domain,deleted)',
    });
    if (pageToken) query.set('pageToken', pageToken);
    let response: Response;
    try {
      response = await send(
        `https://www.googleapis.com/drive/v3/files/${id}/permissions?${query}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
        },
      );
    } catch {
      throw new ItineraryError('暫時無法讀取編輯者名單，請重試。', 503);
    }
    if (!response.ok)
      throw new ItineraryError(
        '無法查看編輯者名單，請確認 Google 檔案權限。',
        response.status === 401
          ? 401
          : response.status === 403 || response.status === 404
            ? 403
            : 503,
      );
    const data = (await response.json()) as { permissions?: Permission[]; nextPageToken?: string };
    if (!Array.isArray(data.permissions))
      throw new ItineraryError('Google 回傳的編輯者名單格式不正確。', 503);
    for (const permission of data.permissions) {
      if (
        permission.deleted ||
        !permission.id ||
        !permission.role ||
        !editorRoles.has(permission.role) ||
        !['user', 'group', 'domain', 'anyone'].includes(permission.type || '')
      )
        continue;
      const kind = permission.type as TripEditor['kind'];
      const name =
        kind === 'anyone'
          ? '知道連結的人'
          : kind === 'domain'
            ? permission.domain || '網域成員'
            : kind === 'user'
              ? Array.from(permission.emailAddress?.trim().split('@')[0] || '')[0]?.toLowerCase() ||
                '?'
              : 'Google 群組';
      editors.set(permission.id, {
        key: permission.id,
        kind,
        role: permission.role as TripEditor['role'],
        name,
        displayName: permission.displayName?.trim() || name,
      });
    }
    pageToken = data.nextPageToken;
    if (pageToken && (visited.has(pageToken) || visited.size >= 100))
      throw new ItineraryError('名單尚未完整讀取，請重試。', 503);
    if (pageToken) visited.add(pageToken);
  } while (pageToken);
  return [...editors.values()].sort(
    (a, b) =>
      Number(b.role === 'owner') - Number(a.role === 'owner') || a.name.localeCompare(b.name),
  );
}

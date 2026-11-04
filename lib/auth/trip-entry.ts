import { AuthError, safeReturnTo } from './core';

export function tripSignInTarget(returnTo: string) {
  const path = safeReturnTo(returnTo);
  const pathname = new URL(path, 'https://local.invalid').pathname;
  const match = /^\/([A-Za-z0-9_-]{20,200})(?:\/(?:accommodation|transportation|settings))?$/.exec(
    pathname,
  );
  return match ? { id: match[1], path } : null;
}

export type FileAccess = 'editor' | 'reader' | 'needs_file';
export async function checkTripFileAccess(
  id: string,
  token: string,
  send: typeof fetch = fetch,
): Promise<FileAccess> {
  let response: Response;
  try {
    response = await send(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=mimeType,capabilities(canEdit)`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    throw new AuthError('temporarily_unavailable');
  }
  if (response.status === 401) throw new AuthError('reauth_required');
  if (response.status === 403 || response.status === 404) return 'needs_file';
  if (!response.ok) throw new AuthError('temporarily_unavailable');
  const data = await response.json();
  if (data.mimeType !== 'application/vnd.google-apps.spreadsheet')
    throw new AuthError('invalid_flow');
  return data.capabilities?.canEdit === true ? 'editor' : 'reader';
}

export async function tripEntryDecision(
  returnTo: string,
  selectionCompleted: boolean,
  check: (id: string) => Promise<FileAccess>,
) {
  const target = tripSignInTarget(returnTo);
  if (!target) return { path: safeReturnTo(returnTo), selectFile: false };
  const access = await check(target.id);
  const path = new URL(target.path, 'https://local.invalid');
  path.searchParams.delete('accessNotice');
  path.searchParams.delete('authError');
  const destination = `${path.pathname}${path.search}${path.hash}`;
  // Only confirmed editors continue to the file picker. Unknown access never grants entry.
  if (access === 'editor' && !selectionCompleted)
    return { path: destination, selectFile: true, id: target.id };
  if (access !== 'editor')
    path.searchParams.set(
      'accessNotice',
      access === 'reader' ? 'readonly' : selectionCompleted ? 'unavailable' : 'permission_unknown',
    );
  return { path: `${path.pathname}${path.search}${path.hash}`, selectFile: false };
}

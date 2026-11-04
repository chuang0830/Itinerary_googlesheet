export function tripAccessState(
  status: number,
  data: { canEdit?: boolean; code?: string; error?: string },
) {
  const needsAuthorization =
    status === 403 && ['google_grant_required', 'file_access_required'].includes(data.code || '');
  const needsLogin = status === 401;
  return {
    canEdit: status >= 200 && status < 300 && data.canEdit === true,
    needsLogin,
    needsAuthorization,
    error: needsLogin || status < 400 ? '' : data.error || '無法確認編輯權限，請稍後重新讀取。',
  };
}

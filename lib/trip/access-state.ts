export const READ_ONLY_NOTICE =
  '你已登入，目前這個 Google 帳號只有檢視權限。若需要編輯，請旅行擁有者在 Google Sheets 共用設定加入此帳號為編輯者。';

export function tripAccessState(
  status: number,
  data: { canEdit?: boolean; code?: string; error?: string },
) {
  const canEdit = status >= 200 && status < 300 && data.canEdit === true;
  const needsLogin = status === 401;
  const needsAuthorization =
    status === 403 && ['google_grant_required', 'file_access_required'].includes(data.code || '');
  const readOnly =
    (status >= 200 && status < 300 && !canEdit) ||
    (status === 403 && !needsAuthorization && data.code !== 'invalid_flow');
  return {
    canEdit,
    needsLogin,
    needsAuthorization,
    error: needsAuthorization
      ? '登入授權尚未完成，請完成登入以確認這份旅行的編輯權限。'
      : readOnly
        ? READ_ONLY_NOTICE
        : needsLogin || status < 400
          ? ''
          : data.error || '無法確認編輯權限，請稍後重新讀取。',
  };
}

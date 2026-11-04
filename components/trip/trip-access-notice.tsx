'use client';
import { useEffect, useState } from 'react';
export function TripAccessNotice() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const notice = query.get('accessNotice');
    const authError = query.get('authError');
    if (notice === 'readonly')
      setMessage(
        '你已登入，目前這個 Google 帳號只有檢視權限。若需要編輯，請旅行擁有者在 Google Sheets 共用設定加入此帳號為編輯者。',
      );
    else if (notice === 'unavailable')
      setMessage(
        '已完成選檔，但 Google 尚未允許存取這份試算表。請確認選取正確檔案與帳號；目前維持唯讀。',
      );
    else if (notice === 'check_failed')
      setMessage('Google 登入已完成，但暫時無法確認編輯權限。請稍後重新整理，登入狀態已保留。');
    else if (authError === 'denied')
      setMessage('你已取消 Google 授權，目前維持唯讀。若需要編輯，可再按 Edit。');
    else if (authError)
      setMessage(
        'Google 授權未完成，請確認使用相同帳號並選取這份旅行。目前維持唯讀，可再按 Edit 重試。',
      );
  }, []);
  return message ? (
    <aside className="auth-message" role="status">
      {message}
    </aside>
  ) : null;
}

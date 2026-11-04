import type { PublicUser } from '@/lib/auth/core';
const messages: Record<string, string> = {
  denied: '你已取消 Google 授權，可以隨時重新登入。',
  expired: '登入請求已過期或不符，請重新登入。',
  failed: 'Google 登入未完成，請重新嘗試。',
  unavailable: '登入暫時無法使用，請稍後重試。',
};
export function AuthPanel({
  configured,
  session,
  error,
}: {
  configured: boolean;
  session: { user: PublicUser; googleAuthorized: boolean } | null;
  error?: string;
}) {
  return (
    <section className="home-card mt-5">
      <h2>{session ? `你好，${session.user.name}` : '開始規劃你的旅行'}</h2>
      {error && messages[error] && (
        <p className="auth-message" role="alert">
          {messages[error]}
        </p>
      )}
      {session ? (
        <>
          <p>{session.user.email}</p>
          <p>
            {session.googleAuthorized
              ? '已登入 Google 並授權此應用程式建立的試算表。'
              : '已登入 Google，但試算表存取尚未授權。'}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {!session.googleAuthorized && (
              <form action="/api/auth/signin" method="post">
                <button className="button button-primary">重新授權 Google</button>
              </form>
            )}
            <form action="/api/auth/signout" method="post">
              <button className="button button-quiet">登出</button>
            </form>
            {session.googleAuthorized && (
              <a className="button button-primary" href="#create-trip">
                建立新旅行
              </a>
            )}
          </div>
        </>
      ) : (
        <>
          <p>登入 Google 後，建立專屬旅行試算表與分享網址。</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <form action="/api/auth/signin" method="post">
              <button className="button button-primary" disabled={!configured}>
                Google 登入
              </button>
            </form>
            <button className="button" disabled>
              建立新旅行（下一階段開放）
            </button>
          </div>
          {!configured && <p className="phase-note">Google 登入尚未啟用，請先完成網站環境設定。</p>}
        </>
      )}
      <p className="phase-note">登入狀態最長保留 24 小時。旅行資料儲存在 Google Sheets。</p>
    </section>
  );
}

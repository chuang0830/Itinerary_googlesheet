'use client';

export function CreateTripSignIn({ configured, error }: { configured: boolean; error?: string }) {
  return (
    <section aria-label="建立旅行登入">
      <p role="status" style={{ marginBottom: 10 }}>
        {!configured
          ? 'Google 登入尚未設定，請先完成網站環境設定。'
          : error
            ? 'Google 登入或授權未完成，請重試後建立新旅行。'
            : '請點選下方按鈕登入 Google，完成後將返回建立新旅行頁面。'}
      </p>
      <form action="/api/auth/signin" method="post">
        <input type="hidden" name="returnTo" value="/#create-trip" />
        <button className="button button-primary" disabled={!configured}>
          Google 登入並建立旅行
        </button>
      </form>
    </section>
  );
}

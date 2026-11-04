# Phase 2 — 本機 Google 登入

## 此階段的邊界

依使用者選擇，暫不加入 Redis / KV 或資料庫。只在 `npm run dev` 的本機環境啟用登入；正式環境及 Vercel 會停用記憶體 Session，不能當成正式版登入部署。

Google Token 只保存在 Node.js 程序記憶體，不進入瀏覽器 cookie、HTML、localStorage 或 Session API。瀏覽器只持有隨機的 Session ID；cookie 為 HttpOnly、SameSite=Lax、Path=/，本機 HTTP 不使用 Secure。未來正式 HTTPS 版必須使用 Secure cookie 及共用 Session 儲存。

Session 最長 24 小時、登入請求 10 分鐘；到期資料會在 store 操作時清理，程序重啟會全部清空。無任何旅行資料寫到 Session store。儲存最多各 1000 筆 Session / 登入請求，超過會拒絕新登入。

## Google Cloud 設定

1. 在自己的 Google Cloud 專案啟用 Google Sheets API 與 Google Drive API（後續建立旅行會使用）。
2. 在 Google Auth Platform 設定 Branding / Audience / Data Access。測試狀態下，將要登入的 Google 帳號加入 Test users。
3. 建立 OAuth client，類型選 **Web application**。
4. 加入 Authorized redirect URI：`http://localhost:3000/api/auth/callback`。路徑、port 與 `.env.local` 的 AUTH_URL 必須完全相同。
5. 將 `.env.example` 複製為 `.env.local`，只在該檔案填入自己的 Google Client ID 與 Client Secret。不要把 Secret 貼到聊天或加上 NEXT_PUBLIC_ 前綴；此檔案已被 gitignore 排除。
6. 執行 `npm run dev`，開啟 `http://localhost:3000`，點 Google 登入。更動環境變數後須重啟。

不需要將 Client Secret 提供給任何公開網站或放進原 Thailand_Itinerary 專案。若要改成 `127.0.0.1` 或不同 port，須同步調整 AUTH_URL、啟動參數及 Google 的 redirect URI。

## 授權範圍

目前請求 openid / email / profile / drive.file，採 Google authorization-code flow，附 state、PKCE S256、nonce；Google 官方函式庫負責 code exchange、ID token 簽章／issuer／audience／expiry 驗證，應用程式另核對 nonce 與 email_verified。

`drive.file` 讓後續階段可建立及操作應用程式有權存取的試算表，不等於自動取得朋友所有已分享試算表的存取授權。朋友直接以旅行網址進入的編輯流程仍需在 Phase 5 決定檔案授權方式，或明確採較廣 Sheets scope；本階段不擅自加入全 Drive 權限。

Google 支援逐項同意，可能只同意登入、未同意檔案存取，此時仍顯示登入但提示重新授權。應用程式不把「已登入」當成任意檔案的編輯權限。測試模式下 Refresh Token 可能有較短有效期，撤銷／過期時須重新登入。

## API

- `POST /api/auth/signin`：同源表單提交，建立短期 state／nonce／PKCE verifier，導向 Google。
- `GET /api/auth/callback`：驗證綁定此瀏覽器且未用過的 state；失敗不回傳 Google 原始錯誤。成功建立新隨機 Session 並使舊 Session 失效。
- `GET /api/auth/session`：只回傳姓名、email 與目前 drive.file 授權狀態，不回傳 Google subject、任何 Token、Client Secret 或 PKCE verifier。設定 no-store。
- `POST /api/auth/signout`：同源驗證後刪除 Session 及 cookie。登出只清除此網站的 Session，不替使用者撤銷整個 Google App 授權；可到 Google 帳號的第三方連線管理撤銷。
- `currentGoogleAccessToken()`：只能由伺服器端 Google API 模組呼叫，取目前使用者的 Token，接近到期時更新。撤銷授權則刪除 Session；網路暫時失敗保留 Session 供重試。尚無公開 Token endpoint。

登入／登出 POST 驗證 Origin，不接受 GET 改變 Session。OAuth 回呼為 GET，透過 state cookie 與一次性伺服器端紀錄防護。回跳路徑只允許站內相對路徑。Google 錯誤物件可能含憑證，不得直接記錄或回傳。

## 驗證

已提供純本機自動測試：state 綁定、過期、拒絕、重放、Session 輪替、公開資料白名單、到期、更新、撤銷、網路錯誤、登出與更新競態、跨站 POST、回跳網址限制。

需要自己的 OAuth client 才能進行實際登入驗證：

1. 登入成功顯示所選帳號；取消授權有清楚提示。
2. `/api/auth/session` 及瀏覽器開發工具看不到 Google Token。
3. 登出後 Session API 回傳 null，原 cookie 不再有效。
4. 重啟本機伺服器後需重新登入。
5. Google 撤銷授權後，下一次需要更新 Token 的 API 操作會要求重新登入。
6. 使用第二個帳號登入，不會沿用第一個帳號的授權。

建立旅行、Sheets 真實讀寫、編輯權限與手機拖曳不在本階段。

## 官方參考

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/identity/openid-connect/openid-connect
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://github.com/googleapis/google-cloud-node/tree/main/core/packages/google-auth-library-nodejs

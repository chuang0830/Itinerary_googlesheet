# Travel Planner

以 Thailand_Itinerary 為 UI 原型、Google Sheets 為唯一旅行資料來源的旅遊管理系統。

## 目前進度：Phase 7 設定與分享整合

- Phase 1：Next.js App Router、TypeScript、Tailwind CSS、基本路由與原 UI 拆分。
- Phase 2：Google OAuth 登入／登出、伺服器端記憶體 Session、Token 更新、安全防護與本機自動測試。
- 真實 Google 登入及 drive.file 授權已由使用者完成驗證。
- Phase 3：建立旅行表單、四表與 Settings 初始化、公開設定確認、失敗重試及 Spreadsheet ID 導向。詳見 [Phase 3 說明](docs/phase3-create-trip.md)。
- 使用者已實際建立旅行並進入 Spreadsheet ID 網址。
- Phase 4：公開讀取四表、日期切換、每日行程與資訊卡、主題色與重新讀取。詳見 [公開讀取設定](docs/phase4-public-itinerary.md)。
- 真實匿名讀取（無 Cookie）及瀏覽器日期切換已驗證成功，目前三個資料工作表為空；非空資料實測留待後續。
- Phase 5：同列行程新增／刪改、dnd-kit 拖曳、Done 儲存／Cancel 放棄、權限與衝突檢查。**依使用者最新要求，不自動儲存。**
- Phase 6：☰ 選單、住宿／交通 CRUD、Done／Cancel、YYYY-MM-DD 純文字日期及每日資訊卡整合。詳見 [Phase 6 說明](docs/phase6-accommodation-transportation.md)。
- Phase 7 Settings：名稱、副標題、日期與四主題色設定，Done／Cancel 與草稿預覽。詳見 [設定頁說明](docs/settings-page.md)。
- Phase 7 分享：主畫面 Share 整合分享視窗、複製主網址、系統分享與本機網址提醒。詳見 [分享說明](docs/sharing.md)。
- 尚未完成：正式 Session 儲存、部署及完整端對端驗收。

依使用者選擇，本階段不加入 Redis / KV 或資料庫。只在本機開發模式啟用登入；重啟伺服器即需重新登入，Vercel / production 停用這套記憶體 Session。Google Token 僅在伺服器端，瀏覽器只持隨機 Session ID。

保留原 UI 的字體、米色背景、綠色卡片及行程列樣式。沒有連接原 Thailand_Itinerary 正式站或試算表，也沒有以假資料顯示已同步。

## 開發

需要 Node.js 20.9 以上。

```sh
npm install
npm run dev
```

開啟 http://localhost:3000。Google 登入須先依 [本機 OAuth 設定指南](docs/google-oauth-setup.md) 設定 `.env.local`。請勿將 Client Secret 貼進聊天或提交至 Git。

```sh
npm test
npm run typecheck
npm run build
```

## 路由

- `/` 首頁與本機 Google 登入／登出
- `/{spreadsheetId}` 每日行程
- `/{spreadsheetId}/accommodation` 住宿
- `/{spreadsheetId}/transportation` 交通
- `/{spreadsheetId}/settings` 設定
- `/api/auth/signin`、`/api/auth/callback`、`/api/auth/signout`、`/api/auth/session`

旅行網址使用公開 Sheets API 讀取資料；需在伺服器設定 GOOGLE_SHEETS_API_KEY，公開查看不需要登入。

詳細分析、OAuth / API 限制及八階段測試計畫見 [架構文件](docs/architecture.md)。

## 驗證紀錄

69 項 OAuth、Session、建立流程、公開讀取、行程、住宿交通與設定寫入自動測試、TypeScript 檢查及 Webpack 正式建置通過。已以一次性假 OAuth 設定檢查本機 HTTP 導向、PKCE／nonce／scope 參數、HttpOnly cookie、取消授權、重放拒絕、跨站 POST 拒絕與登出；未向 Google 交換真實憑證。

已確認真實 Google 登入授權與 375px 手機預覽。尚未執行真實建立旅行、手機實機及旅行資料同步測試。預設 Turbopack 在此受限環境無法建立編譯通訊埠，開發與建置採 Webpack。

Phase 5 實際瀏覽器驗證：原帳號可進入 Edit；新增、輸入、鍵盤手把排序均未寫入 Sheets；Cancel 可還原。真實 Done 寫入、雙帳號權限及手機實機觸控仍待驗證。詳見 [行程編輯驗證紀錄](docs/phase5-itinerary-edit.md)。

## 使用者驗收更新

使用者已確認新增行程 Done 儲存、拖曳後 Sheets 列順序，以及 Cancel 不寫入均通過。多人帳號與撤銷權限仍待驗證。分享入口保留主畫面 Share，已移除選單分享項目。

上傳 GitHub 不代表已可正式部署：目前登入限本機；Vercel 前仍需處理正式 Session 與 OAuth 網址設定。`.env.local` 不可提交，部署時另設環境變數。

## 正式環境準備更新

已加入加密 Redis Session、Redis 建立請求進度、HTTPS 正式登入設定檢查，以及新加坡 Functions 區域。77 項自動測試與正式建置通過。真實 Redis 加密讀寫、清除已驗證；使用者已重新登入。尚未部署與驗證跨程序登入保存、第二帳號權限。最新部署步驟見 [Vercel 部署](docs/vercel-deployment.md)。此段取代前文僅限本機登入的舊狀態描述。

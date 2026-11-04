# Travel Planner — 架構與移植計畫

## 原始專案分析

參考來源：`/Users/cynthiachuang/Desktop/Thailand_Itinerary`，只讀取，不修改。

- React 18 + Vite 6；Vercel serverless API。
- `src/App.jsx` 集中資料讀取、每日頁面、表單、分享、Pointer 拖曳與儲存。
- `src/styles.css` 提供米色背景、綠色資訊卡片、760px 最大寬度及手機橫向日期列。
- `api/itinerary.js` 代理 Apps Script，使用共用編輯碼；Apps Script 以擁有者身分操作。
- 原工作表為 worksheet，欄位 Date / Location / Plan / link；不符合新四表結構。
- 原版按 Done 才送出、Cancel 還原；載入時按可選 index 排序。
- 飯店、航班、泰國城市及部分日期處理寫死；星期依陣列位置取得，需改為實際日曆日期。
- 本機 Vite proxy 指向原正式站，新專案不可沿用，避免改到原旅行。

## 可保留與必須替換

保留原 CSS 視覺、MapLinkIcon、日期按鈕、行程列、同列編輯欄位、拖曳手把與分享概念。抽成 TripHeader / DayPicker / DaySummary / PlanList / MapLinkIcon / SyncStatus。

替換 Google API 層、共用密碼、固定單一 API、硬編碼旅行資訊與 index 排序。依使用者最新決策保留原版 Done／Cancel：輸入、失焦及拖曳不寫入，Done 才批次儲存，Cancel 放棄所有未儲存變更。

## 目錄

app/：首頁、[spreadsheetId] 與住宿／交通／設定路由；後續加入 api/auth、api/trips。
components/：沿用視覺的可重用 UI。
lib/trip/：欄位型別、日期／排序工具；後續加入 validation、google、auth。

## OAuth 與 Session

使用成熟 OAuth 函式庫；Token 僅伺服器使用，每位使用者以自己的授權寫入。瀏覽器只持不透明 Session cookie（HttpOnly、Secure、SameSite）。不能把 Google Token 放進前端 Session JSON、localStorage 或 cookie payload。

需在 Phase 2 決定持久 Session 儲存：Vercel 無法靠程序記憶體可靠跨實例保留 Token。旅行資料仍只存在 Sheets；若完全排除伺服器端 Session 儲存，需接受重新登入的限制，且須先驗證部署可行性，不能以記憶體 store 宣稱正式可用。

最小 scope drive.file 並不自動涵蓋朋友透過連結進入的任意試算表。需評估額外選檔授權流程（同時遵守前端不持 Google Token 的要求），或 Sheets scope 配合必要 Drive scope 的方案及 Google OAuth 驗證。不可靜默改為廣泛 Drive 授權。

## Sheets / Drive 設計

一旅行一 Spreadsheet，Settings / Itinerary / Accommodation / Transportation 為唯一旅行資料來源。

公開讀取不帶使用者或擁有者 OAuth；無法公開取得的檔案直接拒絕，不以特權帳號補讀。驗證檔案格式。所有寫入在後端以目前使用者授權執行，Google 的實際回應為最終權限判斷。

建立四表與初始值，再設 anyone:reader；公開失敗時保留建立的 Spreadsheet ID，允許只重試權限步驟，不得誤報完成或再建一份。用短期伺服器流程狀態處理重試及驗證來源，不新增旅行資料表。

Itinerary 只有 Date / Activity / MapURL。畫面暫時識別值不持久化。讀取保留同日原始列序，寫入前重新讀取，比對工作表內容摘要，衝突回 409。依日期穩定排序後以單次 batchUpdate 更新受管理值範圍並清除舊尾列，保留格式。寫入成功後重讀確認；失敗保留本機草稿，權限錯誤停用編輯。

限制：Sheets batchUpdate 的原子性不涵蓋前面的讀取／比對。檢查後、寫入前直接修改 Sheets 仍有競態；內容摘要不能保證零覆寫。若要求完全防止並行遺失更新，現有核心限制下不能承諾，Phase 5 前須釐清可接受範圍。

公開頁與 API 不長期快取；日期切換、刷新、重新進入讀新資料，避免重新載入覆蓋未儲存草稿。只接受有效日期、限定交通類型、http(s) 連結，儲存文字不得當公式解讀。跨日交通顯示出發／抵達事件且標明日期，住宿 CheckIn <= 日期 < CheckOut。

## 階段與測試

1. Next.js + TypeScript + Tailwind；基本路由與 UI 拆分。無 Google API、無假同步。
2. Google OAuth、Session、安全授權；驗證登入、拒絕、到期、撤銷、Token 不出現在前端。
3. 建立旅行；驗證四表、公開權限失敗重試、不重複建立。
4. 實際公開讀取與 UI 移植；驗證空日、月份跨越、同日原始列序、重新讀取。
5. 行程 CRUD／dnd-kit／Done 手動儲存；驗證手機觸控、重複活動、穩定排序、尾列清除、409、403、斷網與重試。
6. 住宿／交通管理與資訊卡；驗證多筆、退房邊界、跨日與重疊住宿。
7. Settings／四主題／選單／分享；以擁有者、編輯者、訪客測試並驗證撤權及跨旅行隔離。
8. 手機實機、Google 正式 OAuth、Vercel 環境變數、部署與完整驗收。

## 參考文件

- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
- https://nextjs.org/docs/app/getting-started/installation
- https://tailwindcss.com/docs/installation/framework-guides/nextjs

## Phase 2 決策

使用者選擇先做本機登入，暫不加入 Redis / KV。使用 Google 官方 google-auth-library，登入憑證只在開發程序的記憶體；正式環境 fail closed。設定與限制見 google-oauth-setup.md。未改變 Google Sheets 作為唯一旅行資料來源的原則。

## Phase 3 進度

完成建立表單、四表與 Settings 初始化、公開權限設定與確認、按原帳號重試及 Spreadsheet ID 導向。登入與授權已實測；真實建立旅行尚待使用者提交驗證。操作中繼資料只存在本機程序記憶體，不是旅行資料庫；重啟後須先檢查 Drive 以免重複建立。詳見 phase3-create-trip.md。

## Phase 4 進度

公開資料使用伺服器 API Key 呼叫 Sheets values.batchGet；不使用 OAuth 代讀。原 UI 讀取 Settings 與三表資料、日期切換重新讀取，同日保留原始列序；跨旅行狀態隔離。40 項自動測試；真實匿名讀取待填入 API Key，詳見 phase4-public-itinerary.md。

Phase 4 真實驗證：公開旅行可不帶 Cookie 讀取四表，HTTP 200、no-store；瀏覽器真實旅行標題與日期切換成功。目前行程／住宿／交通為空，沒有替使用者寫入測試資料。

## Phase 5 最新儲存決策

使用者明確改為 Thailand_Itinerary 的 Done / Cancel，取代原規格的自動儲存。後端每次 Done 重新檢查 canEdit 與內容摘要，確認寫後結果。Google Sheets 無條件式讀取比對寫入交易，無法保證完全零競態；已向使用者說明。詳見 phase5-itinerary-edit.md。

## Phase 6 進度

加入 ☰ 選單與住宿／交通管理。維持 Done 儲存／Cancel 放棄，日期純文字 YYYY-MM-DD。各自工作表版本檢查與寫後確認，資訊卡依四表重新讀取。61 項測試；真實交通讀取及草稿取消、未登入寫入拒絕已驗證；真實修改 Done 與雙帳號仍待測。詳見 phase6-accommodation-transportation.md。

## Settings 頁進度

依使用者指定先完成網站設定頁，未擴大至完整 Phase 7 分享／部署。五設定值、四主題色草稿預覽、Done / Cancel、只更新既有 Value 格並保留未認識鍵。69 項自動測試；詳細限制與驗證見 settings-page.md。

## 分享整合

主畫面與四種旅行頁選單共用分享視窗，網址固定為 origin/{spreadsheetId}；提供複製、可用時的系統分享與 localhost 限制說明，不改變 Google 權限。詳見 sharing.md。

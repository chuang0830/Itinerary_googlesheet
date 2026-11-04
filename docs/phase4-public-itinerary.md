# Phase 4 — 公開讀取與每日行程

## 公開讀取設定

使用 Google Sheets API 的 values.batchGet 一次讀取四個指定工作表。伺服器需要一組標準 API Key 識別應用程式，不以使用者 OAuth 或擁有者帳號代讀。

1. 同一個 Google Cloud 專案 → API 和服務 → 憑證 → 建立憑證 → API 金鑰。
2. API 限制設為僅允許 Google Sheets API。
3. 使用標準 API Key，不綁定服務帳戶或額外 IAM 身分。
4. 在 `.env.local` 填入 `GOOGLE_SHEETS_API_KEY=...`。不使用 NEXT*PUBLIC*，不要貼到聊天或提交 Git。
5. 開發伺服器會重新載入環境變數；若未生效再重啟。重啟會清除本機登入 Session，但公開旅行檢視本身不需要登入。

API Key 只由伺服器以 X-Goog-Api-Key header 傳至 Google，不放入網址或前端。網站讀取請求不帶 Google OAuth 或 cookie，私人或不存在檔案會失敗，不會改用已登入者憑證重試。網站公開 API 只回傳已驗證的旅行內容。

伺服器端使用 API Key，不可套用僅供瀏覽器 JavaScript 使用的 HTTP referrer 限制；如需來源限制，應依部署環境設定伺服器出口 IP。第一版本機設定至少限制 API 為 Sheets API。

## 行程頁面

沿用 Thailand_Itinerary 的字體、米色背景、綠色卡片、日期橫向切換、行程列與地圖圖示。標題、副標題、日期範圍及主題色從 Settings 讀取，無寫死泰國城市、飯店、航班或活動。

- 日期範圍包含開始與結束日，以 UTC 日曆運算，星期不再依陣列索引猜測。
- 每日行程依該日期在 Sheets 中出現的列順序顯示，不依活動名稱、ID 或 Order 排序。
- 空白列略過；無活動的日期正常顯示空狀態。
- Accommodation 依 CheckIn <= date < CheckOut 篩選，支援多筆；Transportation 顯示出發日及抵達日事件，支援多筆與跨日。
- 城市優先取當晚住宿 City，否則用當日交通出發／抵達地；不足時留空。
- 有安全 http(s) MapURL 才顯示地圖連結。其他連結不執行、不顯示可點擊按鈕。文字由 React 正常跳脫。
- 沒有住宿及交通的日子不顯示空資訊卡片。
- 行程編輯將於 Phase 5、住宿交通管理於 Phase 6、完整選單設定於 Phase 7 實作。

## 重新讀取與隔離

SSR 旅行頁與公開 GET /api/trips/{spreadsheetId} 都不使用長期快取。日期切換、按重新讀取、重新載入網站均從 Google Sheets 讀新資料。日期快速切換時取消前次請求，避免較慢的舊回應蓋掉新資料。

不同 Spreadsheet ID 使用獨立頁面狀態，不沿用前一趟旅行。讀取失敗移除舊旅行內容並顯示錯誤及重試，不宣告同步成功。只讀狀態文案為「已讀取 Google Sheets」。

四表表頭及 Settings、真實日期、住宿日期、交通類型均驗證。直接輸入 Sheets 的原生日期／時間以 serial number 轉換；文字日期需 YYYY-MM-DD。資料格式錯誤會提示工作表及列號。回應超過 2MB 或旅行日期跨度超過 3660 天拒絕讀取，以免異常試算表耗盡伺服器／瀏覽器資源。

## 驗證狀態

40 項自動測試涵蓋前幾階段與本次公開讀取：同日交錯列順序、空日、跨年月、住宿退房邊界、跨日交通、原生日期時間、格式錯誤、安全連結、沒有 OAuth／cookie、私人檔案拒絕、資料更新與大小限制。

真實驗證已完成：以不帶 Cookie 的 HTTP 請求取得公開旅行（200、no-store），讀到 Settings 與三個空資料表；瀏覽器顯示真實標題、副標題、2026-11-01 至 2026-11-30 日期，切換至 11/02 後重新讀取成功。未修改試算表或加入測試活動；有活動時的原始列序、資訊卡與地圖連結以自動測試驗證，真實非空資料仍待後續測試。

## 官方文件

- https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet
- https://docs.cloud.google.com/docs/authentication/api-keys-use
- https://docs.cloud.google.com/docs/authentication/api-keys

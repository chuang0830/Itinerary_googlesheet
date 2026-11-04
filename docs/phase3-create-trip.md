# Phase 3 — 建立旅行

## 已實作

登入並取得 drive.file 授權後，首頁顯示建立旅行表單：旅行名稱、副標題、開始／結束日期及四種主題色。送出前必須勾選「任何知道連結的人都可檢視」的告知。

POST /api/trips 在後端使用目前使用者自己的 OAuth Token 呼叫 Sheets spreadsheets.create，一次建立 Settings / Itinerary / Accommodation / Transportation 及所有表頭，Settings 寫入五個設定。文字用 stringValue，不會將以 = 開頭的旅行名稱當成公式。空的三個資料工作表只有表頭。

建立成功後以 Drive permissions.create 設定 anyone / reader / allowFileDiscovery:false；再讀取權限確認，確認成功才回 ready 並導向 /{spreadsheetId}。目前旅行網址頁面僅提供開啟 Sheets，實際行程讀取在 Phase 4。

公開設定失敗會保留 Spreadsheet ID，提供 POST /api/trips/{spreadsheetId}/publish 重試。只允許原建立帳號透過同一建立請求重試，不能任意指定私人試算表來公開。若發現外部改過的其他 anyone 權限，不自動覆蓋或降權。

## 重複請求與失敗恢復

瀏覽器使用隨機 requestKey 識別一次提交，存於 sessionStorage，以便重新整理後透過 GET /api/trips?requestKey=... 查詢進度。它不是 Trip ID、不出現在旅行網址，也不是 Itinerary 的 ID / UUID / Order 欄位。

伺服器程序只保留短期操作中繼資料：帳號識別、requestKey、輸入雜湊、Spreadsheet ID、步驟與到期時間；不保留旅行內容副本。24 小時後清理，最多 1000 筆。相同請求不會重複建立，不同帳號無法讀取或重試對方的流程。

Sheets create 沒有本實作可用的條件式冪等建立交易。若網路中斷、逾時或 Google 5xx 導致不確定檔案是否已建立，系統標示 uncertain，停止自動重送；使用者先到 Google Drive 確認。若 Google 已明確拒絕請求（例如 API 未啟用），顯示 create_failed，可重新填寫並提交新請求。

本機伺服器重啟會清掉登入與操作狀態。若瀏覽器還留有未完成 requestKey，會提示先到 Drive 確認，不能把狀態遺失當成尚未建立。清除不確定的進度前會顯示重複建立風險提示。這些是第一版不使用外部儲存的限制。

## API 防護

所有寫入驗證同源 Origin、目前 Session 與 drive.file 授權。公開重試核對原帳號、操作紀錄及 Spreadsheet ID。JSON 限制為 8KB，驗證名稱長度、真實日曆日期、日期順序、色碼、Spreadsheet ID 與 requestKey。所有回應 no-store；不回傳 Google Token、Client Secret 或 Google 原始錯誤物件。

## 驗證紀錄

- 真實 Google 登入與 drive.file 授權：已由使用者完成並在畫面確認。
- 28 項自動測試：OAuth / Session、四表建立內容、字串寫入、日期、明確公開同意、重複／並行請求、權限重試、帳號隔離、未知結果處理，以及模擬 Google HTTP 權限確認／分頁／拒絕情境。
- 手機 375px 預覽：輸入框、主題色、公開說明與按鈕可用，無水平溢出；未進行實機測試。
- 真實建立 Google Spreadsheet 及公開權限設定：尚未執行，請由使用者填入測試旅行並提交驗證。

## 使用者測試

1. 開啟 http://localhost:3000 並登入，確認已授權應用程式建立的試算表。
2. 填寫測試旅行資料，選擇主題色。
3. 確認公開說明並點「建立旅行」。
4. 成功後網址應為 /{Spreadsheet ID}。開啟 Google Sheets 確認四個工作表及 Settings 值。
5. 在 Sheets 分享設定確認「知道連結的任何人／檢視者」。尚未實作匿名行程讀取，網站的公開行程頁驗收留待 Phase 4。
6. 若只公開設定失敗，使用「重試公開設定」，不要重新建立。

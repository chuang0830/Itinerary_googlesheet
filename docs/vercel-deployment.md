# Vercel 部署

程式已支援 HTTPS 正式網站與 Redis Session；未設定 Redis 時正式登入停用。vercel.json 將 Functions 區域設為 Singapore（sin1），對應目前 Upstash 區域。公開讀取不使用 OAuth。

## 匯入與設定

1. 在 Vercel 個人 Hobby 帳號匯入 GitHub 的 Itinerary_googlesheet。Framework 選 Next.js、Root Directory 維持專案根目錄、Build Command 使用 yarn build。不要開啟付費試用或增加付款方式。
2. 設定 Production 環境變數（不要放在 NEXT*PUBLIC*）：
   - AUTH_URL：正式固定 HTTPS 網址，不能填 localhost 或帶子路徑。
   - GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET：Google OAuth 網頁應用程式憑證。
   - GOOGLE_SHEETS_API_KEY：只開放 Sheets API 的伺服器讀取 Key。
   - UPSTASH_REDIS_REST_URL、UPSTASH_REDIS_REST_TOKEN：一般可寫 Token。
   - SESSION_ENCRYPTION_KEY：32 bytes 隨機金鑰的 Base64 字串，保持固定，不提交 Git。
3. Google Cloud → Google Auth Platform → Clients，將正式 AUTH_URL 加入網站來源，並新增完整回呼 AUTH_URL/api/auth/callback。保留 localhost 回呼以繼續本機開發。測試模式的其他帳號仍需加入 Test users。
4. Deploy。若先取得網站網址才設定 AUTH_URL，設定後須 Redeploy。首次部署期間登入尚不可用，不能視為全部驗收完成。
5. 驗證公開原旅行、登入、Done、登出及不同瀏覽器匿名查看。手機實機與第二帳號／撤權仍需驗收。

## 保存範圍與限制

Redis 只保存加密登入資料及 24 小時建立請求進度（內容摘要、狀態、Spreadsheet ID）；不保存旅行名稱、行程、住宿或交通。兩個獨立伺服器共用建立請求，NX 防止同一請求重複建立。Google 已處理但回應丟失的情況仍需使用者查看 Drive；不自動重建。進度到期後請先確認 Drive，不要盲目重新提交。

目前編輯的內容摘要衝突檢查保留；Google Sheets 不提供條件式 CAS，因此多人同時寫入仍存在先前說明的競態。本機鎖不構成跨 Vercel 實例的全域鎖。

本機與正式環境推薦分開資料庫／金鑰。若先共用 Free 資料庫與金鑰，兩邊會共用登入資料儲存但 Cookie 依網站隔離；不要另開超出免費額度的資源。金鑰變更後現有 Session 會失效。不要將連線值貼到聊天、文件或版本庫。

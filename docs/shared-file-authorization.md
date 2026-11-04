# 共用試算表授權補齊

Google Sheets 的 Editor 共用權限，與應用程式的 drive.file 檔案授權是兩層權限。朋友已登入並授權 drive.file，不代表應用程式能存取他被分享的每份檔案。

本次新增「授權這份旅行」：由伺服器產生 OAuth 授權 URL，只要求 drive.file，prompt=consent、include_granted_scopes=false、trigger_onepick=true，並用 file_ids 與 mimetypes 限定目標。Google 選檔後回到原有 /api/auth/callback，伺服器交換 code。Access Token 與 Refresh Token 不進入瀏覽器。

必要設定：在相同 Google Cloud 專案啟用 Google Picker API。原有 OAuth callback 不需新增。官方文件：https://developers.google.com/workspace/drive/picker/guides/desktop-mobile-picker

安全檢查：一次性 state／HttpOnly flow cookie、PKCE、原本 Session、picked_file_ids 必須完全符合、TokenInfo audience 與 Google subject 必須相符，否則拒絕保存新憑證。若 Google 未回傳可驗證的 subject，也拒絕。登入期限不延長。選檔本身不授予 Editor，返回後仍以 Google capabilities.canEdit 驗證，寫入仍使用該使用者 Token。

目前通過本機單元測試與建置，不代表真實 Picker 流程已通過驗收。需確認 web client 的 trigger_onepick 實際選檔回傳與 TokenInfo 主體欄位；若服務不支援或欄位缺少，不放寬帳號驗證、不改廣泛 Drive scope，須回報阻擋原因。

同時修正 403 缺少 Google grant／檔案存取的顯示，提供明確的授權按鈕；暫時無法使用的登入服務回 503，不再誤判 401。Google Picker API 啟用後部署此版本，再由實際協作者驗收。

## 最新本機流程（依使用者要求，待測試）

旅行頁登入 → Google 登入 → 後端確認 capabilities.canEdit：

1. Google 已確認可編輯：目前 Token 已可存取並編輯這份試算表，直接返回原旅行／管理子頁，不再重複要求選檔授權。
2. Google 已確認唯讀：不開啟選檔，直接返回旅行頁。
3. Google 回傳 403／404，尚無法確認檔案權限：在登入流程中啟動這份試算表的選檔授權，完成後重新檢查 capabilities.canEdit。確認為 false 才顯示唯讀提示；授權失敗不可當成確認唯讀。選檔完成後若仍無法確認，不再重複啟動選檔。

已確認編輯權限時不再啟動選檔，避免多餘的授權失敗；返回時清除舊權限提示，保留其他原路徑資訊。旅行頁也以目前確認的 canEdit 優先，不向已確認的編輯者顯示網址殘留的授權失敗訊息。登入後暫時無法確認權限會保留登入狀態。首頁登入因沒有指定旅行，不會任選一份檔案開始授權。

限制：drive.file 可能在首次單檔授權前不提供檔案 metadata。使用者已同意將必要選檔整合進登入流程，再確認編輯權限。不得擅自增加 scope 或借用擁有者憑證。

僅修改本機；未經使用者明確同意不得 commit、push 或部署。真實 Google 選檔、取消與朋友帳號仍待驗證。

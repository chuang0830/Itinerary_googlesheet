# 共用試算表授權補齊

Google Sheets 的 Editor 共用權限，與應用程式的 drive.file 檔案授權是兩層權限。朋友已登入並授權 drive.file，不代表應用程式能存取他被分享的每份檔案。

本次新增「授權這份旅行」：由伺服器產生 OAuth 授權 URL，只要求 drive.file，prompt=consent、include_granted_scopes=false、trigger_onepick=true，並用 file_ids 與 mimetypes 限定目標。Google 選檔後回到原有 /api/auth/callback，伺服器交換 code。Access Token 與 Refresh Token 不進入瀏覽器。

必要設定：在相同 Google Cloud 專案啟用 Google Picker API。原有 OAuth callback 不需新增。官方文件：https://developers.google.com/workspace/drive/picker/guides/desktop-mobile-picker

安全檢查：一次性 state／HttpOnly flow cookie、PKCE、原本 Session、picked_file_ids 必須完全符合、TokenInfo audience 與 Google subject 必須相符，否則拒絕保存新憑證。若 Google 未回傳可驗證的 subject，也拒絕。登入期限不延長。選檔本身不授予 Editor，返回後仍以 Google capabilities.canEdit 驗證，寫入仍使用該使用者 Token。

目前通過本機單元測試與建置，不代表真實 Picker 流程已通過驗收。需確認 web client 的 trigger_onepick 實際選檔回傳與 TokenInfo 主體欄位；若服務不支援或欄位缺少，不放寬帳號驗證、不改廣泛 Drive scope，須回報阻擋原因。

同時修正 403 缺少 Google grant／檔案存取的顯示，提供明確的授權按鈕；暫時無法使用的登入服務回 503，不再誤判 401。Google Picker API 啟用後部署此版本，再由實際協作者驗收。

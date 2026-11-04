# Redis Session 設定（免費方案）

此階段加入 Redis AuthStore，先在本機驗證。尚未解除 production 限制，也尚未部署。建立旅行流程的暫存進度目前仍在記憶體；正式部署前需一併處理。

1. 到 https://console.upstash.com/ 註冊／登入。
2. 建立 Redis database，選 Free。不要加入付款方式、不要選付費方案。若畫面要求付款，先停止。
3. 在資料庫的 REST API 區域，將 REST URL、一般 REST Token（不是 Readonly Token）自行填入 `.env.local`：

   ```dotenv
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=
   SESSION_ENCRYPTION_KEY=
   ```

4. SESSION_ENCRYPTION_KEY 需要隨機 32 bytes 的 Base64 字串。可由開發工具直接寫入本機檔案，勿貼到聊天，也不要提交 Git。部署時本機與正式環境應使用不同資料庫／加密金鑰。
5. 設定後須重新登入。驗證登入、登出、重啟後 Session 仍存在，再進行正式部署準備。

Redis 只保存 AES-256-GCM 加密的登入流程（10 分鐘）與 Session（24 小時），不存旅行資料。Google Token 不會送到前端。加密金鑰留在網站伺服器，不存 Redis；更換金鑰會使現有登入失效。

登入流程以 GETDEL 一次性取用；更新憑證以 Lua 比對密文後原子替換，避免復原已登出的 Session。Redis 失敗會拒絕操作，不退回不可靠的記憶體 Session。兩項 Redis 設定與加密金鑰必須全部提供；完全未設定時維持本機開發模式。

自動測試使用模擬傳輸，不代表已驗證真實 Upstash 服務。此階段未開通服務、未設定付款方式。

官方文件：https://upstash.com/docs/redis/features/restapi

import type { Metadata } from 'next';
import { TripHeader } from '@/components/trip/trip-header';

export const metadata: Metadata = {
  title: '隱私權政策 | Travel Planner',
  description: 'Travel Planner 如何使用 Google 帳號、試算表與登入資料。',
};

export default function PrivacyPage() {
  return (
    <main className="page-shell privacy-page">
      <TripHeader />
      <section className="intro">
        <div className="eyebrow">TRAVEL PLANNER · PRIVACY</div>
        <h1>隱私權政策</h1>
        <p>最後更新：2026 年 11 月 4 日</p>
      </section>
      <article className="home-card privacy-content">
        <p>
          Travel Planner 是以 Google Sheets
          管理及分享旅行的網站。本政策說明本服務處理哪些資料、用途、保存方式，以及你可以如何控制資料。
        </p>
        <section>
          <h2>我們使用的資料與用途</h2>
          <ul>
            <li>
              Google 帳號識別碼、名字與
              Email：用於辨識登入者、顯示登入資訊，以及確認建立旅行的使用者。
            </li>
            <li>
              Google OAuth 授權憑證：用於在伺服器端代表目前登入者呼叫 Google API，不會將 Access
              Token 或 Refresh Token 提供給瀏覽器。
            </li>
            <li>
              旅行試算表：讀取及更新
              Settings、Itinerary、Accommodation、Transportation，提供旅行資訊、排序、住宿、交通與設定功能。
            </li>
            <li>
              檔案權限與協作者資訊：確認目前帳號是否可以編輯，並向有編輯權限的使用者顯示協作者名字、角色及帳號首字。
            </li>
          </ul>
          <p>
            我們目前要求基本帳號資訊與 drive.file
            授權，存取經此應用程式建立或另行授權給本應用程式的檔案，不要求讀取你整個 Google
            Drive。具有 Sheets 共用權限並不自動等於已授權本應用程式存取。
          </p>
        </section>
        <section>
          <h2>公開旅行與共用權限</h2>
          <p>
            建立旅行前會請你確認：新試算表將設為「任何知道連結的人都可檢視」。知道網站或原始試算表連結的人不需登入即可讀取旅行內容。請勿放入護照、付款資訊、訂位密碼等敏感資料。
          </p>
          <p>
            編輯權限由 Google Sheets／Drive
            管理，網站的每次寫入使用目前登入者自己的授權。分享網站網址不會自動授予編輯權限。公開頁面不提供協作者名單給未登入或唯讀訪客。
          </p>
        </section>
        <section>
          <h2>資料保存與安全</h2>
          <p>
            旅行內容以你 Google Drive
            中的試算表為唯一持久資料來源，本服務不另建旅行內容資料庫。網站在處理請求及顯示畫面時仍會暫時處理旅行內容。
          </p>
          <p>
            正式環境使用 Upstash Redis 保存經 AES-256-GCM 加密的登入資料。登入狀態最長 24
            小時，登入流程資料最長 10
            分鐘；登出會刪除目前登入狀態。建立旅行的請求摘要、狀態及試算表識別碼會暫存最多 24
            小時，以避免重複建立及重試公開設定，不包含旅行內容。
          </p>
          <p>
            瀏覽器使用必要的登入
            Cookie，並可能在分頁儲存空間保存建立旅行的請求識別碼，以恢復建立進度。未按 Done
            的編輯草稿保留在頁面記憶體，不代表已寫入 Google Sheets。
          </p>
        </section>
        <section>
          <h2>服務供應商與資料分享</h2>
          <p>
            本服務使用 Google 提供登入、Sheets 與 Drive 功能；Vercel 提供網站及伺服器託管；Upstash
            提供上述暫存資料保存。供應商會為提供服務處理必要的資料，資料可能在你所在國家以外處理。託管服務可能處理
            IP、請求時間及錯誤等運作紀錄，其保存方式依供應商政策與服務設定而定。
          </p>
          <p>本服務不販售 Google 使用者資料，不將這些資料用於廣告、資料仲介或訓練通用 AI 模型。</p>
          <p>
            本服務對 Google API 及 Google Workspace 資料的使用與移轉，遵守{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            ，包括 Limited Use（有限使用）要求。
          </p>
        </section>
        <section>
          <h2>撤銷授權、刪除資料與聯絡</h2>
          <ul>
            <li>
              可使用網站「登出」刪除目前的登入狀態；其他已登入裝置需分別登出，或等待其登入狀態到期。
            </li>
            <li>
              可到{' '}
              <a
                href="https://myaccount.google.com/connections"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google 帳號的第三方連線設定
              </a>
              撤銷本服務授權。撤銷授權不會自動刪除試算表或取消其公開分享。
            </li>
            <li>
              旅行檔案由你在 Google Drive 刪除或在 Google Sheets 修改。可透過 Sheets
              共用設定移除編輯者或關閉連結公開；關閉公開後，本網站也無法繼續公開顯示該旅行。
            </li>
          </ul>
          <p>
            若要詢問資料使用方式或提出資料刪除請求，請聯絡服務管理者：
            <a href="mailto:eilleen50830@gmail.com">eilleen50830@gmail.com</a>。請勿在郵件中提供
            Google 密碼、OAuth Token 或其他密鑰。
          </p>
        </section>
        <section>
          <h2>政策更新</h2>
          <p>
            如資料處理方式變更，我們會更新此頁與更新日期；若涉及新的 Google
            授權範圍，會另行要求使用者授權。
          </p>
        </section>
      </article>
      <footer>
        <a href="/">← 返回首頁</a>
      </footer>
    </main>
  );
}

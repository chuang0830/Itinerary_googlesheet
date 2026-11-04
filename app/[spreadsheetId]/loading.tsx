import { TripHeader } from '@/components/trip/trip-header';
export default function LoadingTrip() {
  return (
    <main className="page-shell">
      <TripHeader />
      <section className="home-card" role="status">
        <h2>正在讀取旅行…</h2>
        <p>正在從 Google Sheets 取得最新資料。</p>
      </section>
    </main>
  );
}

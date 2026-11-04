import Link from 'next/link';
import { TripHeader } from './trip-header';
import { SyncStatus } from '@/components/shared/sync-status';
export function ConnectionPlaceholder({ title }: { title: string }) {
  return <main className="page-shell"><TripHeader />
    <section className="intro"><div className="eyebrow">TRAVEL PLANNER</div><h1>{title}</h1></section>
    <section className="home-card"><h2>Google Sheets 連線尚未啟用</h2>
      <p>完成 Google API 串接後，此頁才會讀取對應旅行的資料。</p>
      <Link className="button button-quiet inline-block mt-4" href="/">返回首頁</Link>
    </section><SyncStatus state="disconnected" />
  </main>;
}

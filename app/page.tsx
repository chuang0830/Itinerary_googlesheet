import { TripHeader } from '@/components/trip/trip-header';
import { SyncStatus } from '@/components/shared/sync-status';
import { CreateTripForm } from '@/components/trip/create-trip-form';
import { AuthPanel } from '@/components/auth/auth-panel';
import { authConfig } from '@/lib/auth/config';
import { currentUser } from '@/lib/auth/server';
export const dynamic = 'force-dynamic';
export default async function Home({ searchParams }: { searchParams: Promise<{ authError?: string }> }) {
  const [session, query] = await Promise.all([currentUser(), searchParams]);
  return <main className="page-shell">
    <TripHeader />
    <section className="intro" id="top">
      <div className="eyebrow">YOUR NEXT JOURNEY</div><h1>Travel Planner</h1>
      <p><strong>一趟旅行，一份 Google Sheets。</strong></p>
    </section>
    <AuthPanel configured={Boolean(authConfig())} session={session} error={query.authError} />
    {session?.googleAuthorized && <CreateTripForm />}
    <aside className="share-note"><span aria-hidden="true">↗</span><p><strong>關於公開分享</strong><br />建立旅行時，會將試算表設為任何知道連結的人都可檢視。請勿填入敏感資料。</p></aside>
    <SyncStatus state="disconnected" />
  </main>;
}

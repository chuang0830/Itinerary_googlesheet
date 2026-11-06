import { CreateTripPage } from '@/components/trip/create-trip-page';
import { authConfig } from '@/lib/auth/config';
import { currentUser } from '@/lib/auth/server';
export const dynamic = 'force-dynamic';
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const [session, query] = await Promise.all([currentUser(), searchParams]);
  return (
    <CreateTripPage
      authorized={Boolean(session?.googleAuthorized)}
      configured={Boolean(authConfig())}
      error={query.authError}
    />
  );
}

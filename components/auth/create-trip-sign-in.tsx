'use client';
import { useTripLanguage } from '@/components/trip/trip-language';

export function CreateTripSignIn({ configured, error }: { configured: boolean; error?: string }) {
  const { t } = useTripLanguage();
  return (
    <section aria-label={t('createTripSignInLabel')}>
      <p role="status" style={{ marginBottom: 10 }}>
        {!configured
          ? t('googleSignInNotConfigured')
          : error
            ? t('createTripSignInFailed')
            : t('createTripSignInHelp')}
      </p>
      <form action="/api/auth/signin" method="post">
        <input type="hidden" name="returnTo" value="/#create-trip" />
        <button className="button button-primary" disabled={!configured}>
          {t('googleSignInAndCreateTrip')}
        </button>
      </form>
    </section>
  );
}

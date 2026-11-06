'use client';

import { CreateTripForm } from './create-trip-form';
import { TripHeader } from './trip-header';
import { TripLanguageProvider, useTripLanguage } from './trip-language';

function CreateTripContent() {
  const { t } = useTripLanguage();
  return (
    <main className="page-shell">
      <TripHeader />
      <section className="intro" id="top">
        <div className="eyebrow">{t('nextJourney')}</div>
        <h1>Travel Planner</h1>
        <p>
          <strong>{t('tripTagline')}</strong>
        </p>
      </section>
      <CreateTripForm />
      <aside className="share-note">
        <span aria-hidden="true">↗</span>
        <p>
          <strong>{t('publicSharingTitle')}</strong>
          <br />
          {t('publicSharingDescription')}
        </p>
      </aside>
      <footer>
        <a href="/privacy">{t('privacyPolicy')}</a>
      </footer>
    </main>
  );
}

export function CreateTripPage() {
  return (
    <TripLanguageProvider>
      <CreateTripContent />
    </TripLanguageProvider>
  );
}

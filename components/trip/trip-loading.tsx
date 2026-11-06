'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { loadingTripLanguage } from '@/lib/trip/language-hint';
import { TripHeader } from './trip-header';
import { TripLanguageProvider, useTripLanguage, type TripLanguage } from './trip-language';

export function TripLoadingContent() {
  const { t } = useTripLanguage();
  return (
    <main className="page-shell">
      <TripHeader />
      <section className="home-card" role="status">
        <h2>{t('loadingTrip')}</h2>
        <p>{t('loadingTripDescription')}</p>
      </section>
    </main>
  );
}

export function TripLoading() {
  const { spreadsheetId } = useParams<{ spreadsheetId: string }>();
  const [language, setLanguage] = useState<TripLanguage>('en');
  useEffect(() => setLanguage(loadingTripLanguage(spreadsheetId)), [spreadsheetId]);
  return (
    <TripLanguageProvider language={language}>
      <TripLoadingContent />
    </TripLanguageProvider>
  );
}

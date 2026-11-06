'use client';
import { TripLanguageProvider, useTripLanguage } from '@/components/trip/trip-language';
import { TripHeader } from '@/components/trip/trip-header';

function PrivacyContent() {
  const { t, language, setLanguage } = useTripLanguage();
  return (
    <main className="page-shell privacy-page">
      <TripHeader>
        <button
          type="button"
          className="button language-switch"
          role="switch"
          aria-checked={language === 'en'}
          aria-label={t('privacyEnglishSwitch')}
          onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}
        >
          <span lang="zh-TW" className={language === 'zh-TW' ? 'is-selected' : ''}>
            中文
          </span>
          <span aria-hidden="true">/</span>
          <span lang="en" className={language === 'en' ? 'is-selected' : ''}>
            English
          </span>
        </button>
      </TripHeader>
      <section className="intro">
        <div className="eyebrow">{t('privacyEyebrow')}</div>
        <h1>{t('privacyPolicy')}</h1>
        <p>{t('privacyUpdated')}</p>
      </section>
      <article className="home-card privacy-content">
        <p>{t('privacyIntro')}</p>
        <section>
          <h2>{t('privacyDataTitle')}</h2>
          <ul>
            <li>{t('privacyAccountData')}</li>
            <li>{t('privacyOAuthData')}</li>
            <li>{t('privacyTripData')}</li>
            <li>{t('privacyCollaboratorData')}</li>
          </ul>
          <p>{t('privacyScopes')}</p>
        </section>
        <section>
          <h2>{t('privacyPublicTitle')}</h2>
          <p>{t('privacyPublicNotice')}</p>
          <p>{t('privacyPermissions')}</p>
        </section>
        <section>
          <h2>{t('privacyStorageTitle')}</h2>
          <p>{t('privacyTripStorage')}</p>
          <p>{t('privacySessionStorage')}</p>
          <p>{t('privacyBrowserStorage')}</p>
        </section>
        <section>
          <h2>{t('privacyProvidersTitle')}</h2>
          <p>{t('privacyProviders')}</p>
          <p>{t('privacyNoSale')}</p>
          <p>
            {t('privacyGooglePolicyPrefix')}{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            {t('privacyGooglePolicySuffix')}
          </p>
        </section>
        <section>
          <h2>{t('privacyControlTitle')}</h2>
          <ul>
            <li>{t('privacySignOut')}</li>
            <li>
              {t('privacyRevokePrefix')}{' '}
              <a
                href="https://myaccount.google.com/connections"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('privacyConnectionsLink')}
              </a>
              {t('privacyRevokeSuffix')}
            </li>
            <li>{t('privacyDeleteTrip')}</li>
          </ul>
          <p>
            {t('privacyContactPrefix')}
            <a href="mailto:eilleen50830@gmail.com">eilleen50830@gmail.com</a>
            {t('privacyContactSuffix')}
          </p>
        </section>
        <section>
          <h2>{t('privacyUpdatesTitle')}</h2>
          <p>{t('privacyUpdates')}</p>
        </section>
      </article>
      <footer>
        <a href="/">{t('privacyBackHome')}</a>
      </footer>
    </main>
  );
}

export function PrivacyPolicy() {
  return (
    <TripLanguageProvider language="en">
      <PrivacyContent />
    </TripLanguageProvider>
  );
}

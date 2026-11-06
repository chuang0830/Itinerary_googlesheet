'use client';
import { rememberTripLanguage } from '@/lib/trip/language-hint';
import { RefreshIcon } from '@/components/shared/refresh-icon';
import { useTripLanguage, TripLanguageProvider } from '@/components/trip/trip-language';
import { READ_ONLY_NOTICE } from '@/lib/trip/access-state';
import { AccountAvatar } from '@/components/auth/account-avatar';
import { TripAccessNotice } from './trip-access-notice';
import { tripAccessState } from '@/lib/trip/access-state';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { TripMenu } from './trip-menu';
import { THEMES } from '@/lib/trip/create-schema';
import type { TripSettings } from '@/lib/trip/types';
function SettingsPageContent({
  spreadsheetId,
  initialSettings,
  initialError,
}: {
  spreadsheetId: string;
  initialSettings: TripSettings | null;
  initialError: string;
}) {
  const { t, localizeMessage, setLanguage } = useTripLanguage();

  const [settings, setSettings] = useState(initialSettings);
  useEffect(() => {
    if (settings) rememberTripLanguage(spreadsheetId, settings.language);
  }, [spreadsheetId, settings]);
  const [draft, setDraft] = useState(initialSettings);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [needsAuthorization, setNeedsAuthorization] = useState(false);
  const [error, setError] = useState(initialError);
  const [status, setStatus] = useState(initialSettings ? '已讀取 Google Sheets' : '');
  const version = useRef('');
  const saving = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/trips/${spreadsheetId}/access`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!controller.signal.aborted) {
          const access = tripAccessState(response.status, data);
          setCanEdit(access.canEdit);
          setNeedsLogin(access.needsLogin);
          setNeedsAuthorization(access.needsAuthorization);
          if (access.error) setError(access.error);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [spreadsheetId]);
  useEffect(() => {
    if (!editing) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editing]);
  async function enter() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/trips/${spreadsheetId}/settings`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法進入編輯。');
      setSettings(data.settings);
      setDraft(data.settings);
      version.current = data.version;
      setBlocked(false);
      setEditing(true);
      setStatus('尚未儲存，Done 儲存／Cancel 放棄。');
    } catch (error) {
      setError(error instanceof Error ? error.message : '無法進入編輯。');
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/trips/${spreadsheetId}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法重新讀取。');
      setSettings(data.settings);
      setDraft(data.settings);
      setStatus('已讀取 Google Sheets');
    } catch (error) {
      setSettings(null);
      setDraft(null);
      setError(error instanceof Error ? error.message : '無法重新讀取。');
    } finally {
      setBusy(false);
    }
  }
  function cancel() {
    if (saving.current) return;
    setDraft(settings);
    setEditing(false);
    setBlocked(false);
    setError('');
    setStatus('已取消，未儲存設定已放棄。');
  }
  function change(key: keyof TripSettings, value: string) {
    setDraft((previous) => (previous ? { ...previous, [key]: value } : previous));
    setStatus('尚未儲存，請按 Done。');
  }
  async function done() {
    if (saving.current || blocked || !draft) return;
    saving.current = true;
    setBusy(true);
    setError('');
    setStatus('Saving…');
    try {
      const response = await fetch(`/api/trips/${spreadsheetId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: version.current, settings: draft }),
      });
      const data = await response.json();
      if (!response.ok) {
        if ([401, 403, 409].includes(response.status)) setBlocked(true);
        if ([401, 403].includes(response.status)) setCanEdit(false);
        throw new Error(data.error || 'Sync failed. Retry Done.');
      }
      setSettings(data.settings);
      setDraft(data.settings);
      version.current = data.version;
      setEditing(false);
      setStatus('Synced with Google Sheets');
    } catch (error) {
      setError(error instanceof Error ? error.message : '連線中斷，草稿仍保留。請重試 Done。');
      setStatus('Sync failed. Retry Done.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
      setStatus('設定草稿已複製。');
    } catch {
      setStatus('無法複製，請先保留畫面內容。');
    }
  }
  const shown = editing ? draft : settings;
  useEffect(() => setLanguage(shown?.language || 'zh-TW'), [shown?.language, setLanguage]);
  const theme = shown
    ? ({ '--green': shown.themeColor, '--soft': `${shown.themeColor}15` } as CSSProperties)
    : undefined;
  return (
    <main className="page-shell" style={theme}>
      <header className="topbar trip-topbar">
        <div className="topbar-left">
          <TripMenu
            spreadsheetId={spreadsheetId}
            disabled={editing || busy}
            tripName={settings?.tripName}
          />
          <a className="brand" href={`/${spreadsheetId}`}>
            {'TRAVEL'}
            <span>&nbsp;</span>
            {'PLANNER'}
          </a>
        </div>
        <div className="top-actions">
          {editing ? (
            <>
              <button className="button button-quiet" disabled={busy} onClick={cancel}>
                {t('cancel')}
              </button>
              <button
                className="button button-primary"
                disabled={busy || blocked}
                onClick={() => {
                  void done();
                }}
              >
                {t('done')}
              </button>
            </>
          ) : (
            <>
              {(needsLogin || needsAuthorization) && (
                <form action="/api/auth/signin" method="post">
                  <input type="hidden" name="returnTo" value={`/${spreadsheetId}/settings`} />
                  <button type="submit" className="button button-primary" disabled={busy}>
                    {needsLogin ? t('googleSignIn') : t('completeSignIn')}
                  </button>
                </form>
              )}
              {canEdit && settings && (
                <button
                  className="button button-primary"
                  disabled={busy}
                  onClick={() => {
                    void enter();
                  }}
                >
                  {t('edit')}
                </button>
              )}
              <button
                className="button refresh-button"
                aria-label={t('refresh')}
                title={t('refresh')}
                disabled={busy}
                onClick={() => {
                  void reload();
                }}
              >
                <RefreshIcon />
              </button>
            </>
          )}
          <AccountAvatar />
        </div>
      </header>
      {error === READ_ONLY_NOTICE && (
        <aside className="auth-message" role="status">
          {t('readOnlyNotice')}
        </aside>
      )}
      <TripAccessNotice canEdit={canEdit} />
      <section className="intro">
        <div className="eyebrow">{settings?.tripName || 'TRAVEL PLANNER'}</div>
        <h1>{t('settingsTitle')}</h1>
        <p>{t('updateTripDetailsAndThemeThenChooseDoneToApply')}</p>
      </section>
      {error && (error !== READ_ONLY_NOTICE || editing) && (
        <section className="auth-message" role="alert">
          {error !== READ_ONLY_NOTICE && <p>{localizeMessage(error)}</p>}
          {editing && (
            <>
              <button
                className="button"
                onClick={() => {
                  void copy();
                }}
              >
                {t('copyDraft')}
              </button>
              {blocked && (
                <button
                  className="button"
                  onClick={() => {
                    cancel();
                    void reload();
                  }}
                >
                  {t('discardDraftAndReload')}
                </button>
              )}
            </>
          )}
        </section>
      )}
      {shown && (
        <>
          <section className="home-card">
            <h2>{t('tripDetails')}</h2>
            <fieldset className="trip-fields" disabled={!editing || busy || blocked}>
              <label>
                {t('tripName')}
                <input
                  aria-label={t('tripName')}
                  maxLength={100}
                  value={shown.tripName}
                  onChange={(event) => change('tripName', event.target.value)}
                />
              </label>
              <label>
                {t('subtitle')}
                <input
                  aria-label={t('subtitle')}
                  maxLength={200}
                  value={shown.subtitle}
                  onChange={(event) => change('subtitle', event.target.value)}
                />
              </label>
              <div className="date-fields">
                <label>
                  {t('startDate')}
                  <input
                    aria-label={t('startDate')}
                    type="date"
                    value={shown.startDate}
                    onChange={(event) => change('startDate', event.target.value)}
                  />
                </label>
                <label>
                  {t('endDate')}
                  <input
                    aria-label={t('endDate')}
                    type="date"
                    value={shown.endDate}
                    onChange={(event) => change('endDate', event.target.value)}
                  />
                </label>
              </div>
              <fieldset className="theme-options">
                <legend>{t('languageLabel')}</legend>
                {(
                  [
                    { value: 'zh-TW', label: '繁體中文' },
                    { value: 'en', label: 'English' },
                  ] as const
                ).map((option) => (
                  <label className="theme-option" key={option.value}>
                    <input
                      type="radio"
                      name="language"
                      value={option.value}
                      checked={(shown.language || 'zh-TW') === option.value}
                      onChange={() => change('language', option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>
              <fieldset className="theme-options">
                <legend>{t('themeColor')}</legend>
                {THEMES.map((color) => (
                  <label className="theme-option" key={color.value}>
                    <input
                      type="radio"
                      name="themeColor"
                      value={color.value}
                      checked={shown.themeColor.toLowerCase() === color.value}
                      onChange={() => change('themeColor', color.value)}
                    />
                    <span className="theme-swatch" style={{ background: color.value }} />
                    {color.name}
                  </label>
                ))}
              </fieldset>
              {!THEMES.some((color) => color.value === shown.themeColor.toLowerCase()) && (
                <p>
                  {t('customColorPrefix')}
                  {shown.themeColor}
                  {t('customColorSuffix')}
                </p>
              )}
            </fieldset>
            <p>{t('dateRangeHelp')}</p>
          </section>
          <section className="day-summary settings-preview">
            <div className="summary-copy">
              <span className="summary-date">
                {editing ? t('draftPreviewUnsaved') : t('themePreview')}
              </span>
              <h2>{shown.tripName || t('tripName')}</h2>
              <p>{shown.subtitle}</p>
              <span className="summary-date">
                {shown.startDate} — {shown.endDate}
              </span>
            </div>
          </section>
        </>
      )}
      <p className="sync-status" role="status">
        {busy ? t('processing') : localizeMessage(status)}
      </p>
      <footer>
        <a href={`/${spreadsheetId}`}>{t('backToItinerary')}</a>
        <p>{t('doneToSaveCancelToDiscardChangesAreNotSavedAutomatically')}</p>
      </footer>
    </main>
  );
}

export function SettingsPage(props: Parameters<typeof SettingsPageContent>[0]) {
  return (
    <TripLanguageProvider language={props.initialSettings?.language}>
      <SettingsPageContent {...props} />
    </TripLanguageProvider>
  );
}

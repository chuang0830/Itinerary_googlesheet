'use client';
import { themeKeys } from '@/lib/trip/translations';
import { useTripLanguage } from '@/components/trip/trip-language';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { THEMES } from '@/lib/trip/create-schema';
import type { CreationResult } from '@/lib/trip/creation';
const STORAGE_KEY = 'travel-pending-creation';
const newKey = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
export function CreateTripForm() {
  const { t, localizeMessage, language, setLanguage } = useTripLanguage();

  const [operation, setOperation] = useState<CreationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [color, setColor] = useState<string>(THEMES[0].value);
  const [preview, setPreview] = useState({
    tripName: '',
    subtitle: '',
    startDate: '',
    endDate: '',
  });
  const [pendingKey, setPendingKey] = useState('');
  const submitting = useRef(false);
  const accept = useCallback((result: CreationResult) => {
    setOperation(result);
    if (result.state === 'ready' && result.spreadsheetId) {
      sessionStorage.removeItem(STORAGE_KEY);
      window.location.assign(`/${result.spreadsheetId}`);
    }
  }, []);
  const recover = useCallback(
    async (key: string) => {
      setError('');
      setBusy(true);
      try {
        const response = await fetch(`/api/trips?requestKey=${encodeURIComponent(key)}`, {
          cache: 'no-store',
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || '無法查詢建立進度。');
        accept(payload);
      } catch (error) {
        setError(error instanceof Error ? error.message : '無法查詢建立進度。');
      } finally {
        setBusy(false);
      }
    },
    [accept],
  );
  useEffect(() => {
    const key = sessionStorage.getItem(STORAGE_KEY);
    if (key) {
      setPendingKey(key);
      void recover(key);
    }
  }, [recover]);
  useEffect(() => {
    if (
      !pendingKey ||
      !operation ||
      !['creating', 'sharing'].includes(operation.state) ||
      busy ||
      error
    )
      return;
    const timer = window.setTimeout(() => {
      void recover(pendingKey);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [pendingKey, operation, busy, error, recover]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || pendingKey) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const key = newKey();
    setPendingKey(key);
    sessionStorage.setItem(STORAGE_KEY, key);
    setOperation({ state: 'creating' });
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          language,
          themeColor: color,
          publicConsent: values.publicConsent === 'on',
          requestKey: key,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        // Validation/auth failures happen before a Google creation request is sent.
        if ([400, 401, 403].includes(response.status)) {
          sessionStorage.removeItem(STORAGE_KEY);
          setPendingKey('');
          setOperation(null);
        }
        throw new Error(payload.error || '建立請求未完成，請查詢進度。');
      }
      accept(payload);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : '連線中斷，請先查詢建立進度，避免重複建立。',
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function retryPublish() {
    if (!operation?.spreadsheetId || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/trips/${operation.spreadsheetId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestKey: pendingKey }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '公開設定失敗。');
      accept(payload);
    } catch (error) {
      setError(error instanceof Error ? error.message : '公開設定失敗，請查詢進度後重試。');
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    sessionStorage.removeItem(STORAGE_KEY);
    setPendingKey('');
    setOperation(null);
    setError('');
  }
  return (
    <section
      className="create-trip"
      id="create-trip"
      style={{ '--green': color, '--soft': `${color}15` } as CSSProperties}
    >
      <div className="eyebrow">{t('newJourney')}</div>
      <h2>{t('createNewTrip')}</h2>
      <form
        onSubmit={submit}
        onChange={(event) => {
          const data = new FormData(event.currentTarget);
          setPreview({
            tripName: String(data.get('tripName') || ''),
            subtitle: String(data.get('subtitle') || ''),
            startDate: String(data.get('startDate') || ''),
            endDate: String(data.get('endDate') || ''),
          });
        }}
      >
        <fieldset disabled={busy || Boolean(pendingKey)} className="trip-fields">
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
                  checked={language === option.value}
                  onChange={() => setLanguage(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
          <label>
            {t('tripName')}
            <input
              name="tripName"
              required
              maxLength={100}
              placeholder={t('tripNamePlaceholder')}
            />
          </label>
          <label>
            {t('subtitle')}
            <input name="subtitle" maxLength={200} placeholder={t('subtitlePlaceholder')} />
          </label>
          <div className="date-fields">
            <label>
              {t('startDate')}
              <input name="startDate" type="date" required />
            </label>
            <label>
              {t('endDate')}
              <input name="endDate" type="date" required />
            </label>
          </div>
          <fieldset className="theme-options">
            <legend>{t('themeColor')}</legend>
            {THEMES.map((theme) => (
              <label key={theme.value} className="theme-option">
                <input
                  type="radio"
                  name="themeColor"
                  value={theme.value}
                  checked={color === theme.value}
                  onChange={() => setColor(theme.value)}
                />
                <span className="theme-swatch" style={{ background: theme.value }} />
                {t(themeKeys[theme.value])}
              </label>
            ))}
          </fieldset>
          <label className="public-consent">
            <input name="publicConsent" type="checkbox" required />
            <span>{t('publicSharingConsent')}</span>
          </label>
        </fieldset>
        {!pendingKey && (
          <button className="button button-primary create-submit" type="submit" disabled={busy}>
            {t('createTrip')}
          </button>
        )}
      </form>
      <section className="day-summary settings-preview" aria-label={t('liveTripPreview')}>
        <div className="summary-copy">
          <span className="summary-date">{t('newTripPreview')}</span>
          <h2>{preview.tripName || t('tripName')}</h2>
          <p>{preview.subtitle || t('tripSubtitle')}</p>
          <span className="summary-date">
            {preview.startDate || t('startDate')} — {preview.endDate || t('endDate')}
          </span>
        </div>
      </section>
      <div role="status" aria-live="polite">
        {busy && <p>{t('processingPleaseWait')}</p>}
        {operation?.state === 'creating' && <p>{t('creatingSpreadsheet')}</p>}
        {operation?.message && <p>{localizeMessage(operation.message)}</p>}
      </div>
      {error && (
        <p className="auth-message" role="alert">
          {localizeMessage(error)}
        </p>
      )}
      {pendingKey && (
        <div className="creation-actions">
          {operation?.state === 'share_failed' && (
            <button
              type="button"
              className="button button-primary"
              disabled={busy}
              onClick={retryPublish}
            >
              {t('retryPublicSharing')}
            </button>
          )}
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => {
              void recover(pendingKey);
            }}
          >
            {t('checkCreationProgress')}
          </button>
          {operation?.spreadsheetId && (
            <a
              className="button"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://docs.google.com/spreadsheets/d/${operation.spreadsheetId}/edit`}
            >
              {t('openTheCreatedGoogleSheet')}
            </a>
          )}
          {operation?.state === 'create_failed' && (
            <button type="button" className="button" disabled={busy} onClick={reset}>
              {t('startAgain')}
            </button>
          )}
          {(operation?.state === 'uncertain' || (!operation && error)) && (
            <>
              <a
                className="button"
                target="_blank"
                rel="noopener noreferrer"
                href="https://drive.google.com/drive/u/0/recent"
              >
                {t('checkGoogleDrive')}
              </a>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(t('clearCreationProgressConfirm'))) reset();
                }}
              >
                {t('clearLocalProgressAfterChecking')}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

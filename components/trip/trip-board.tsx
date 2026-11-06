'use client';
import { rememberTripLanguage } from '@/lib/trip/language-hint';
import { RefreshIcon } from '@/components/shared/refresh-icon';
import { useTripLanguage, TripLanguageProvider } from '@/components/trip/trip-language';
import { READ_ONLY_NOTICE } from '@/lib/trip/access-state';
import { AccountAvatar } from '@/components/auth/account-avatar';
import { TripAccessNotice } from './trip-access-notice';
import { TripMenu } from './trip-menu';
import { TripEditors } from './trip-editors';
import { ShareTrip } from './share-trip';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { DayPicker } from './day-picker';
import { DaySummary } from './day-summary';
import { EditPlanList } from '@/components/itinerary/edit-plan-list';
import { useItineraryEditor } from '@/components/itinerary/use-itinerary-editor';
import { PlanList } from '@/components/itinerary/plan-list';
import { dailyData, tripDates, type TripData } from '@/lib/trip/read';
function TripBoardContent({
  spreadsheetId,
  initialTrip,
  initialError,
}: {
  spreadsheetId: string;
  initialTrip: TripData | null;
  initialError: string;
}) {
  const { t, localizeMessage, setLanguage } = useTripLanguage();

  const [trip, setTrip] = useState(initialTrip);
  useEffect(() => {
    if (trip?.settings) rememberTripLanguage(spreadsheetId, trip?.settings.language);
  }, [spreadsheetId, trip?.settings]);
  useEffect(
    () => setLanguage(trip?.settings.language || 'zh-TW'),
    [trip?.settings.language, setLanguage],
  );
  const [selected, setSelected] = useState(initialTrip?.settings.startDate || '');
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    active.current?.abort();
    setLoading(false);
    setTrip(initialTrip);
    setError(initialError);
    setSelected((previous) =>
      initialTrip &&
      previous >= initialTrip.settings.startDate &&
      previous <= initialTrip.settings.endDate
        ? previous
        : initialTrip?.settings.startDate || '',
    );
  }, [initialTrip, initialError]);
  const dates = useMemo(() => (trip ? tripDates(trip.settings) : []), [trip]);
  const day = trip ? dailyData(trip, selected) : null;
  async function reload(date = selected) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/trips/${spreadsheetId}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '無法重新讀取 Google Sheets。');
      if (controller.signal.aborted) return;
      const next = payload as TripData;
      setTrip(next);
      setSelected(
        date >= next.settings.startDate && date <= next.settings.endDate
          ? date
          : next.settings.startDate,
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setTrip(null);
      setError(error instanceof Error ? error.message : '目前無法讀取 Google Sheets，請稍後再試。');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  const editor = useItineraryEditor(spreadsheetId, (next) => {
    active.current?.abort();
    setLoading(false);
    setTrip(next);
    setError('');
    setSelected((previous) =>
      previous >= next.settings.startDate && previous <= next.settings.endDate
        ? previous
        : next.settings.startDate,
    );
  });
  const shownTrip = trip && editor.editing ? { ...trip, itinerary: editor.draft } : trip;
  const settings = trip?.settings;
  const theme = settings
    ? ({ '--green': settings.themeColor, '--soft': `${settings.themeColor}15` } as CSSProperties)
    : undefined;
  return (
    <main className="page-shell" style={theme}>
      <header className="topbar trip-topbar">
        <div className="topbar-left">
          <TripMenu
            spreadsheetId={spreadsheetId}
            disabled={editor.editing || editor.busy}
            tripName={settings?.tripName}
          />
          <a className="brand" href="/">
            {'TRAVEL'}
            <span>&nbsp;</span>
            {'PLANNER'}
          </a>
        </div>
        <div className="top-actions">
          {editor.editing ? (
            <>
              <button
                className="button button-quiet"
                disabled={editor.busy}
                onClick={editor.cancel}
              >
                {t('cancel')}
              </button>
              <button
                className="button button-primary"
                disabled={editor.busy || editor.blocked}
                onClick={() => {
                  void editor.done();
                }}
              >
                {t('done')}
              </button>
            </>
          ) : (
            <>
              <ShareTrip spreadsheetId={spreadsheetId} tripName={settings?.tripName} />
              {(editor.needsLogin || editor.needsAuthorization) && trip && (
                <form action="/api/auth/signin" method="post">
                  <input type="hidden" name="returnTo" value={`/${spreadsheetId}`} />
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={loading || editor.busy}
                  >
                    {editor.needsLogin ? t('googleSignIn') : t('completeSignIn')}
                  </button>
                </form>
              )}
              {editor.canEdit && trip && (
                <button
                  className="button button-primary"
                  disabled={loading || editor.busy}
                  onClick={() => {
                    void editor.enter();
                  }}
                >
                  {t('edit')}
                </button>
              )}
              <button
                className="button refresh-button"
                aria-label={t('refresh')}
                title={t('refresh')}
                disabled={loading || editor.busy}
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
      {editor.error === READ_ONLY_NOTICE && (
        <aside className="auth-message" role="status">
          {t('readOnlyNotice')}
        </aside>
      )}
      <TripAccessNotice canEdit={editor.canEdit} />
      {settings && (
        <section className="intro" id="top">
          <div className="eyebrow">
            {t('tripBoardLabel')}
            {settings.startDate} — {settings.endDate}
          </div>
          <h1>{settings.tripName}</h1>
          {settings.subtitle && (
            <p>
              <strong>{settings.subtitle}</strong>
            </p>
          )}
          <TripEditors key={spreadsheetId} spreadsheetId={spreadsheetId} />
        </section>
      )}
      {error && (
        <section className="home-card" role="alert">
          <h2>{t('itineraryUnavailable')}</h2>
          <p>{localizeMessage(error)}</p>
          <button
            className="button button-primary"
            disabled={loading}
            onClick={() => {
              void reload();
            }}
          >
            {t('retryLoading')}
          </button>
        </section>
      )}
      {editor.error && (editor.error !== READ_ONLY_NOTICE || editor.editing) && (
        <section className="auth-message" role="alert">
          {editor.error !== READ_ONLY_NOTICE && <p>{localizeMessage(editor.error)}</p>}
          {editor.editing && (
            <>
              <button
                className="button"
                onClick={() => {
                  void editor.copy();
                }}
              >
                {t('copyDraft')}
              </button>
              {editor.blocked && (
                <button
                  className="button"
                  onClick={() => {
                    editor.cancel();
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
      {trip && day && (
        <>
          <DayPicker
            days={dates.map((date) => {
              const data = dailyData(shownTrip!, date);
              return { date, city: data.city, hasPlans: data.plans.length > 0 };
            })}
            selected={selected}
            onSelect={(date) => {
              if (editor.busy) return;
              setSelected(date);
              if (!editor.editing) void reload(date);
            }}
          />
          <DaySummary date={selected} stays={day.stays} transport={day.transport} />
          <div className="section-title">
            <h3>{t('todaysPlans')}</h3>
            <span role="status">
              {editor.editing
                ? t('editPlansHelp')
                : loading
                  ? t('refreshingGoogleSheets')
                  : `${selected} · ${t('loadedFromGoogleSheets')}`}
            </span>
          </div>
          {editor.editing ? (
            <EditPlanList
              rows={editor.draft.filter((row) => row.Date === selected)}
              disabled={editor.busy || editor.blocked}
              onChange={editor.change}
              onRemove={editor.remove}
              onReorder={editor.reorder}
              onAdd={() => editor.add(selected)}
            />
          ) : (
            <PlanList plans={day.plans} />
          )}
          <aside className="share-note">
            <span aria-hidden="true">💬</span>
            <p>
              <strong>{t('shareTrip')}</strong>
              <br />
              {t('tripSharingHelp')}
            </p>
          </aside>
        </>
      )}
      <div
        className={`sync-status ${trip && !loading && !editor.editing && !editor.error ? 'is-connected' : ''}`}
        role="status"
      >
        <span className="status-dot" />
        {localizeMessage(editor.status) ||
          (loading
            ? t('loading')
            : trip
              ? t('loadedFromGoogleSheets')
              : t('googleSheetsHasNotLoaded'))}
      </div>
      <footer>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
        >
          {t('openGoogleSheets')}
        </a>
        <p>{t('changesAreSavedOnlyWhenYouChooseDone')}</p>
      </footer>
    </main>
  );
}

export function TripBoard(props: Parameters<typeof TripBoardContent>[0]) {
  return (
    <TripLanguageProvider language={props.initialTrip?.settings.language}>
      <TripBoardContent {...props} />
    </TripLanguageProvider>
  );
}

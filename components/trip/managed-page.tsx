'use client';
import { transportTypeKeys, type TranslationKey } from '@/lib/trip/translations';
import { useTripLanguage, TripLanguageProvider } from '@/components/trip/trip-language';
import { READ_ONLY_NOTICE } from '@/lib/trip/access-state';
import { AccountAvatar } from '@/components/auth/account-avatar';
import { TripAccessNotice } from './trip-access-notice';
import { tripAccessState } from '@/lib/trip/access-state';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { TripMenu } from './trip-menu';
import { HEADERS } from '@/lib/trip/create-schema';
import {
  cellsForManagedRow,
  sheetSlug,
  type ManagedRow,
  type ManagedSheet,
} from '@/lib/trip/managed-schema';
import type { TripData } from '@/lib/trip/read';
const labels: Record<string, TranslationKey> = {
  Name: 'hotelName',
  City: 'city',
  CheckIn: 'checkIn',
  CheckOut: 'checkOut',
  MapURL: 'mapUrl',
  Type: 'transportType',
  From: 'departurePlace',
  To: 'destination',
  DepartureDate: 'departureDate',
  DepartureTime: 'departureTime',
  ArrivalDate: 'arrivalDate',
  ArrivalTime: 'arrivalTime',
  Carrier: 'carrier',
  Number: 'serviceNumber',
  BookingURL: 'bookingUrl',
};
type Draft = Record<string, string>;
function ManagedPageContent({
  spreadsheetId,
  sheet,
  initialTrip,
  initialError,
}: {
  spreadsheetId: string;
  sheet: ManagedSheet;
  initialTrip: TripData | null;
  initialError: string;
}) {
  const { t, localizeMessage, setLanguage } = useTripLanguage();

  const [trip, setTrip] = useState(initialTrip);
  useEffect(
    () => setLanguage(trip?.settings.language || 'zh-TW'),
    [trip?.settings.language, setLanguage],
  );
  const initialRows = initialTrip
    ? sheet === 'Accommodation'
      ? initialTrip.accommodation
      : initialTrip.transportation
    : [];
  const [rows, setRows] = useState<ManagedRow[]>(initialRows);
  const [draft, setDraft] = useState<Draft[]>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [needsAuthorization, setNeedsAuthorization] = useState(false);
  const [error, setError] = useState(initialError);
  const [status, setStatus] = useState(initialTrip ? '已讀取 Google Sheets' : '');
  const version = useRef('');
  const counter = useRef(0);
  const saving = useRef(false);
  const slug = sheetSlug(sheet);
  const title = sheet === 'Accommodation' ? 'accommodationTitle' : 'transportationTitle';
  const headers = HEADERS[sheet];
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
  function toDraft(data: ManagedRow[]) {
    return data.map((row) => ({
      ...Object.fromEntries(
        headers.map((column, i) => [column, cellsForManagedRow(sheet, row)[i]]),
      ),
      uiKey: `record-${counter.current++}`,
    }));
  }
  async function enter() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/trips/${spreadsheetId}/${slug}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法進入編輯。');
      setRows(data.rows);
      setDraft(toDraft(data.rows));
      version.current = data.version;
      setEditing(true);
      setBlocked(false);
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
      setTrip(data);
      setRows(sheet === 'Accommodation' ? data.accommodation : data.transportation);
      setStatus('已讀取 Google Sheets');
    } catch (error) {
      setTrip(null);
      setRows([]);
      setError(error instanceof Error ? error.message : '無法重新讀取。');
    } finally {
      setBusy(false);
    }
  }
  function cancel() {
    if (saving.current) return;
    setEditing(false);
    setDraft([]);
    setBlocked(false);
    setError('');
    setStatus('已取消，未儲存修改已放棄。');
  }
  function change(key: string, column: string, value: string) {
    setDraft((previous) =>
      previous.map((row) => (row.uiKey === key ? { ...row, [column]: value } : row)),
    );
    setStatus('尚未儲存，請按 Done。');
  }
  function add() {
    const row = {
      ...Object.fromEntries(headers.map((column) => [column, column === 'Type' ? 'Other' : ''])),
      uiKey: `record-${counter.current++}`,
    };
    setDraft((previous) => [...previous, row]);
    setStatus('尚未儲存，請按 Done。');
  }
  function remove(key: string) {
    setDraft((previous) => previous.filter((row) => row.uiKey !== key));
    setStatus('尚未儲存，請按 Done。');
  }
  async function done() {
    if (saving.current || blocked) return;
    saving.current = true;
    setBusy(true);
    setError('');
    setStatus('Saving…');
    try {
      const body = draft.map((row) =>
        Object.fromEntries(headers.map((column) => [column, row[column]])),
      );
      const response = await fetch(`/api/trips/${spreadsheetId}/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: version.current, rows: body }),
      });
      const data = await response.json();
      if (!response.ok) {
        if ([401, 403, 409].includes(response.status)) setBlocked(true);
        if ([401, 403].includes(response.status)) setCanEdit(false);
        throw new Error(data.error || '儲存失敗，請重試 Done。');
      }
      setRows(data.rows);
      version.current = data.version;
      setEditing(false);
      setDraft([]);
      setStatus('Synced with Google Sheets');
    } catch (error) {
      setError(error instanceof Error ? error.message : '連線失敗，草稿仍保留。請重試 Done。');
      setStatus('Sync failed. Retry Done.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        [
          headers.join('\t'),
          ...draft.map((row) => headers.map((column) => row[column]).join('\t')),
        ].join('\n'),
      );
      setStatus('草稿已複製。');
    } catch {
      setStatus('無法複製，請先保留畫面內容。');
    }
  }
  const theme = trip
    ? ({
        '--green': trip.settings.themeColor,
        '--soft': `${trip.settings.themeColor}15`,
      } as CSSProperties)
    : undefined;
  return (
    <main className="page-shell" style={theme}>
      <header className="topbar trip-topbar">
        <div className="topbar-left">
          <TripMenu
            spreadsheetId={spreadsheetId}
            disabled={editing || busy}
            tripName={trip?.settings.tripName}
          />
          <a className="brand" href={`/${spreadsheetId}`}>
            {'TRAVEL'}
            <span>✳</span>
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
                  <input type="hidden" name="returnTo" value={`/${spreadsheetId}/${slug}`} />
                  <button type="submit" className="button button-primary" disabled={busy}>
                    {needsLogin ? t('googleSignIn') : t('completeSignIn')}
                  </button>
                </form>
              )}
              {canEdit && trip && (
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
                className="button"
                disabled={busy}
                onClick={() => {
                  void reload();
                }}
              >
                {t('refresh')}
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
        <div className="eyebrow">{trip?.settings.tripName || 'TRAVEL PLANNER'}</div>
        <h1>{t(title)}</h1>
        <p>
          {sheet === 'Accommodation'
            ? t('checkInIncludesThatNightCheckOutDoesNot')
            : t('transportationHelp')}
        </p>
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
      {editing ? (
        <>
          <div className="managed-list">
            {draft.map((row, index) => (
              <section className="home-card managed-card" key={row.uiKey}>
                <div className="managed-card-heading">
                  <h2>
                    {sheet === 'Accommodation' ? t('accommodation') : t('transportation')}{' '}
                    {index + 1}
                  </h2>
                  <button
                    className="button"
                    disabled={busy || blocked}
                    onClick={() => remove(row.uiKey)}
                  >
                    {t('delete')}
                  </button>
                </div>
                <fieldset className="trip-fields managed-fields" disabled={busy || blocked}>
                  {headers.map((column) => (
                    <label key={column}>
                      {t(labels[column])}
                      {column === 'Type' ? (
                        <select
                          aria-label={`${t(labels[column])} ${index + 1}`}
                          value={row[column]}
                          onChange={(event) => change(row.uiKey, column, event.target.value)}
                        >
                          <option value="Flight">{t('flightOption')}</option>
                          <option value="Train">{t('trainOption')}</option>
                          <option value="Bus">{t('busOption')}</option>
                          <option value="Other">{t('otherOption')}</option>
                        </select>
                      ) : (
                        <input
                          aria-label={`${t(labels[column])} ${index + 1}`}
                          type={
                            column.endsWith('Date') || column === 'CheckIn' || column === 'CheckOut'
                              ? 'date'
                              : column.endsWith('Time')
                                ? 'time'
                                : column.endsWith('URL')
                                  ? 'url'
                                  : 'text'
                          }
                          value={row[column]}
                          maxLength={column.endsWith('URL') ? 2048 : 200}
                          onChange={(event) => change(row.uiKey, column, event.target.value)}
                        />
                      )}
                    </label>
                  ))}
                </fieldset>
              </section>
            ))}
          </div>
          <button className="add-plan" disabled={busy || blocked} onClick={add}>
            {t('add')} {sheet === 'Accommodation' ? t('addAccommodation') : t('addTransportation')}
          </button>
        </>
      ) : (
        <div className="managed-list">
          {trip && !rows.length && (
            <section className="home-card empty-state">
              {t('noRecordsPrefix')}
              {sheet === 'Accommodation' ? t('accommodation') : t('transportation')}
              {t('noRecordsSuffix')}
              {canEdit && t('chooseEditToAddARecord')}
            </section>
          )}
          {rows.map((row, index) => {
            const cells = cellsForManagedRow(sheet, row);
            return (
              <section className="home-card managed-card" key={index}>
                <h2>{sheet === 'Accommodation' ? cells[0] : `${cells[1]} → ${cells[2]}`}</h2>
                <dl className="managed-details">
                  {headers.map((column, i) =>
                    cells[i] ? (
                      <div key={column}>
                        <dt>{t(labels[column])}</dt>
                        <dd>
                          {column.endsWith('URL') ? (
                            <a href={cells[i]} target="_blank" rel="noopener noreferrer">
                              {t('openLink')}
                            </a>
                          ) : column === 'Type' ? (
                            t(transportTypeKeys[cells[i] as keyof typeof transportTypeKeys])
                          ) : (
                            cells[i]
                          )}
                        </dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              </section>
            );
          })}
        </div>
      )}
      <p className="sync-status" role="status">
        {busy ? t('processing') : localizeMessage(status)}
      </p>
      <footer>
        <a href={`/${spreadsheetId}`}>{t('backToItinerary')}</a>
        <p>{t('chooseDoneToSaveOrCancelToDiscardChanges')}</p>
      </footer>
    </main>
  );
}

export function ManagedPage(props: Parameters<typeof ManagedPageContent>[0]) {
  return (
    <TripLanguageProvider language={props.initialTrip?.settings.language}>
      <ManagedPageContent {...props} />
    </TripLanguageProvider>
  );
}

'use client';
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
const labels: Record<string, string> = {
  Name: '飯店名稱',
  City: '城市',
  CheckIn: '入住日期',
  CheckOut: '退房日期',
  MapURL: 'Google Maps 連結',
  Type: '交通類型',
  From: '出發地',
  To: '目的地',
  DepartureDate: '出發日期',
  DepartureTime: '出發時間',
  ArrivalDate: '抵達日期',
  ArrivalTime: '抵達時間',
  Carrier: '航空公司／交通業者',
  Number: '航班／車次',
  BookingURL: '訂票連結',
};
type Draft = Record<string, string>;
export function ManagedPage({
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
  const [trip, setTrip] = useState(initialTrip);
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
  const [error, setError] = useState(initialError);
  const [status, setStatus] = useState(initialTrip ? '已讀取 Google Sheets' : '');
  const version = useRef('');
  const counter = useRef(0);
  const saving = useRef(false);
  const slug = sheetSlug(sheet);
  const title = sheet === 'Accommodation' ? 'Accommodation · 住宿' : 'Transportation · 交通';
  const headers = HEADERS[sheet];
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/trips/${spreadsheetId}/access`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!controller.signal.aborted) {
          setCanEdit(response.ok && data.canEdit === true);
          setNeedsLogin(response.status === 401);
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
            TRAVEL <span>✳</span>　PLANNER
          </a>
        </div>
        <div className="top-actions">
          {editing ? (
            <>
              <button className="button button-quiet" disabled={busy} onClick={cancel}>
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={busy || blocked}
                onClick={() => {
                  void done();
                }}
              >
                Done
              </button>
            </>
          ) : (
            <>
              {canEdit && trip && (
                <button
                  className="button button-primary"
                  disabled={busy}
                  onClick={() => {
                    void enter();
                  }}
                >
                  Edit
                </button>
              )}
              <button
                className="button"
                disabled={busy}
                onClick={() => {
                  void reload();
                }}
              >
                重新讀取
              </button>
            </>
          )}
        </div>
      </header>
      <section className="intro">
        <div className="eyebrow">{trip?.settings.tripName || 'TRAVEL PLANNER'}</div>
        <h1>{title}</h1>
        <p>
          {sheet === 'Accommodation'
            ? '入住日包含當晚，退房日不包含當晚。'
            : '可新增多筆交通，出發與抵達日都會顯示在每日資訊卡。'}
        </p>
      </section>
      {needsLogin && !editing && (
        <form action="/api/auth/signin" method="post">
          <input type="hidden" name="returnTo" value={`/${spreadsheetId}/${slug}`} />
          <button className="button">登入 Google 以編輯</button>
        </form>
      )}
      {error && (
        <section className="auth-message" role="alert">
          <p>{error}</p>
          {editing && (
            <>
              <button
                className="button"
                onClick={() => {
                  void copy();
                }}
              >
                複製草稿
              </button>
              {blocked && (
                <button
                  className="button"
                  onClick={() => {
                    cancel();
                    void reload();
                  }}
                >
                  放棄草稿並重新載入
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
                    {sheet === 'Accommodation' ? '住宿' : '交通'} {index + 1}
                  </h2>
                  <button
                    className="button"
                    disabled={busy || blocked}
                    onClick={() => remove(row.uiKey)}
                  >
                    刪除
                  </button>
                </div>
                <fieldset className="trip-fields managed-fields" disabled={busy || blocked}>
                  {headers.map((column) => (
                    <label key={column}>
                      {labels[column]}
                      {column === 'Type' ? (
                        <select
                          aria-label={`${labels[column]} ${index + 1}`}
                          value={row[column]}
                          onChange={(event) => change(row.uiKey, column, event.target.value)}
                        >
                          <option value="Flight">✈ 飛機</option>
                          <option value="Train">🚆 火車</option>
                          <option value="Bus">🚌 巴士</option>
                          <option value="Other">其他</option>
                        </select>
                      ) : (
                        <input
                          aria-label={`${labels[column]} ${index + 1}`}
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
            ＋ Add{' '}
            {sheet === 'Accommodation' ? 'accommodation · 新增住宿' : 'transportation · 新增交通'}
          </button>
        </>
      ) : (
        <div className="managed-list">
          {trip && !rows.length && (
            <section className="home-card empty-state">
              目前沒有{sheet === 'Accommodation' ? '住宿' : '交通'}資料。
              {canEdit && '按 Edit 新增。'}
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
                        <dt>{labels[column]}</dt>
                        <dd>
                          {column.endsWith('URL') ? (
                            <a href={cells[i]} target="_blank" rel="noopener noreferrer">
                              開啟連結 ↗
                            </a>
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
        {busy ? '正在處理…' : status}
      </p>
      <footer>
        <a href={`/${spreadsheetId}`}>← 返回每日行程</a>
        <p>按 Done 才儲存；Cancel 放棄本次修改。</p>
      </footer>
    </main>
  );
}

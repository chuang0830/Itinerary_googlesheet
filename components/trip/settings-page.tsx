'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { TripMenu } from './trip-menu';
import { THEMES } from '@/lib/trip/create-schema';
import type { TripSettings } from '@/lib/trip/types';
export function SettingsPage({ spreadsheetId, initialSettings, initialError }: { spreadsheetId: string; initialSettings: TripSettings | null; initialError: string }) {
  const [settings, setSettings] = useState(initialSettings); const [draft, setDraft] = useState(initialSettings);
  const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false); const [blocked, setBlocked] = useState(false);
  const [canEdit, setCanEdit] = useState(false); const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState(initialError); const [status, setStatus] = useState(initialSettings ? '已讀取 Google Sheets' : '');
  const version = useRef(''); const saving = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/trips/${spreadsheetId}/access`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!controller.signal.aborted) { setCanEdit(response.ok && data.canEdit === true); setNeedsLogin(response.status === 401); }
    }).catch(() => {}); return () => controller.abort();
  }, [spreadsheetId]);
  useEffect(() => {
    if (!editing) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [editing]);
  async function enter() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/trips/${spreadsheetId}/settings`, { cache: 'no-store' }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法進入編輯。');
      setSettings(data.settings); setDraft(data.settings); version.current = data.version; setBlocked(false); setEditing(true); setStatus('尚未儲存，Done 儲存／Cancel 放棄。');
    } catch (error) { setError(error instanceof Error ? error.message : '無法進入編輯。'); }
    finally { setBusy(false); }
  }
  async function reload() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/trips/${spreadsheetId}`, { cache: 'no-store' }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || '無法重新讀取。');
      setSettings(data.settings); setDraft(data.settings); setStatus('已讀取 Google Sheets');
    } catch (error) { setSettings(null); setDraft(null); setError(error instanceof Error ? error.message : '無法重新讀取。'); }
    finally { setBusy(false); }
  }
  function cancel() { if (saving.current) return; setDraft(settings); setEditing(false); setBlocked(false); setError(''); setStatus('已取消，未儲存設定已放棄。'); }
  function change(key: keyof TripSettings, value: string) { setDraft(previous => previous ? { ...previous, [key]: value } : previous); setStatus('尚未儲存，請按 Done。'); }
  async function done() {
    if (saving.current || blocked || !draft) return;
    saving.current = true; setBusy(true); setError(''); setStatus('Saving…');
    try {
      const response = await fetch(`/api/trips/${spreadsheetId}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: version.current, settings: draft }) });
      const data = await response.json();
      if (!response.ok) {
        if ([401, 403, 409].includes(response.status)) setBlocked(true);
        if ([401, 403].includes(response.status)) setCanEdit(false);
        throw new Error(data.error || 'Sync failed. Retry Done.');
      }
      setSettings(data.settings); setDraft(data.settings); version.current = data.version; setEditing(false); setStatus('Synced with Google Sheets');
    } catch (error) { setError(error instanceof Error ? error.message : '連線中斷，草稿仍保留。請重試 Done。'); setStatus('Sync failed. Retry Done.'); }
    finally { saving.current = false; setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(JSON.stringify(draft, null, 2)); setStatus('設定草稿已複製。'); }
    catch { setStatus('無法複製，請先保留畫面內容。'); }
  }
  const shown = editing ? draft : settings;
  const theme = shown ? { '--green': shown.themeColor, '--soft': `${shown.themeColor}15` } as CSSProperties : undefined;
  return <main className="page-shell" style={theme}>
    <header className="topbar trip-topbar"><div className="topbar-left"><TripMenu spreadsheetId={spreadsheetId} disabled={editing || busy} tripName={settings?.tripName} /><a className="brand" href={`/${spreadsheetId}`}>TRAVEL <span>✳</span>　PLANNER</a></div>
      <div className="top-actions">{editing ? <><button className="button button-quiet" disabled={busy} onClick={cancel}>Cancel</button><button className="button button-primary" disabled={busy || blocked} onClick={() => { void done(); }}>Done</button></> : <>
        {canEdit && settings && <button className="button button-primary" disabled={busy} onClick={() => { void enter(); }}>Edit</button>}<button className="button" disabled={busy} onClick={() => { void reload(); }}>重新讀取</button></>}</div>
    </header>
    <section className="intro"><div className="eyebrow">{settings?.tripName || 'TRAVEL PLANNER'}</div><h1>Settings · 網站設定</h1><p>調整旅行資訊與主題色，按 Done 後套用。</p></section>
    {needsLogin && !editing && <form action="/api/auth/signin" method="post"><input type="hidden" name="returnTo" value={`/${spreadsheetId}/settings`} /><button className="button">登入 Google 以編輯</button></form>}
    {error && <section className="auth-message" role="alert"><p>{error}</p>{editing && <><button className="button" onClick={() => { void copy(); }}>複製草稿</button>{blocked && <button className="button" onClick={() => { cancel(); void reload(); }}>放棄草稿並重新載入</button>}</>}</section>}
    {shown && <>
      <section className="home-card"><h2>旅行資訊</h2><fieldset className="trip-fields" disabled={!editing || busy || blocked}>
        <label>旅行名稱<input aria-label="旅行名稱" maxLength={100} value={shown.tripName} onChange={event => change('tripName', event.target.value)} /></label>
        <label>副標題<input aria-label="副標題" maxLength={200} value={shown.subtitle} onChange={event => change('subtitle', event.target.value)} /></label>
        <div className="date-fields"><label>開始日期<input aria-label="開始日期" type="date" value={shown.startDate} onChange={event => change('startDate', event.target.value)} /></label><label>結束日期<input aria-label="結束日期" type="date" value={shown.endDate} onChange={event => change('endDate', event.target.value)} /></label></div>
        <fieldset className="theme-options"><legend>主題色</legend>{THEMES.map(color => <label className="theme-option" key={color.value}><input type="radio" name="themeColor" value={color.value} checked={shown.themeColor.toLowerCase() === color.value} onChange={() => change('themeColor', color.value)} /><span className="theme-swatch" style={{ background: color.value }} />{color.name}</label>)}</fieldset>
        {!THEMES.some(color => color.value === shown.themeColor.toLowerCase()) && <p>目前自訂色：{shown.themeColor}；可保留或選擇上方主題色。</p>}
      </fieldset><p>縮短日期範圍不會刪除原行程；範圍外的資料仍留在 Sheets，但不顯示於日期列。</p></section>
      <section className="day-summary settings-preview"><div className="summary-copy"><span className="summary-date">{editing ? '草稿預覽 · 尚未儲存' : '網站主題預覽'}</span><h2>{shown.tripName || '旅行名稱'}</h2><p>{shown.subtitle}</p><span className="summary-date">{shown.startDate} — {shown.endDate}</span></div></section>
    </>}
    <p className="sync-status" role="status">{busy ? '正在處理…' : status}</p>
    <footer><a href={`/${spreadsheetId}`}>← 返回每日行程</a><p>Done 儲存／Cancel 放棄，不自動儲存。</p></footer>
  </main>;
}

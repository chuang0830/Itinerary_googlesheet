'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { THEMES } from '@/lib/trip/create-schema';
import type { CreationResult } from '@/lib/trip/creation';
const STORAGE_KEY = 'travel-pending-creation';
const newKey = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
export function CreateTripForm() {
  const [operation, setOperation] = useState<CreationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [color, setColor] = useState<string>(THEMES[0].value);
  const [pendingKey, setPendingKey] = useState('');
  const submitting = useRef(false);
  const accept = useCallback((result: CreationResult) => {
    setOperation(result);
    if (result.state === 'ready' && result.spreadsheetId) {
      sessionStorage.removeItem(STORAGE_KEY);
      window.location.assign(`/${result.spreadsheetId}`);
    }
  }, []);
  const recover = useCallback(async (key: string) => {
    setError(''); setBusy(true);
    try {
      const response = await fetch(`/api/trips?requestKey=${encodeURIComponent(key)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '無法查詢建立進度。');
      accept(payload);
    } catch (error) { setError(error instanceof Error ? error.message : '無法查詢建立進度。'); }
    finally { setBusy(false); }
  }, [accept]);
  useEffect(() => {
    const key = sessionStorage.getItem(STORAGE_KEY);
    if (key) { setPendingKey(key); void recover(key); }
  }, [recover]);
  useEffect(() => {
    if (!pendingKey || !operation || !['creating', 'sharing'].includes(operation.state) || busy || error) return;
    const timer = window.setTimeout(() => { void recover(pendingKey); }, 2000);
    return () => window.clearTimeout(timer);
  }, [pendingKey, operation, busy, error, recover]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current || pendingKey) return;
    submitting.current = true; setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const key = newKey(); setPendingKey(key); sessionStorage.setItem(STORAGE_KEY, key);
    setOperation({ state: 'creating' });
    try {
      const response = await fetch('/api/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, themeColor: color, publicConsent: values.publicConsent === 'on', requestKey: key }) });
      const payload = await response.json();
      if (!response.ok) {
        // Validation/auth failures happen before a Google creation request is sent.
        if ([400, 401, 403].includes(response.status)) {
          sessionStorage.removeItem(STORAGE_KEY); setPendingKey(''); setOperation(null);
        }
        throw new Error(payload.error || '建立請求未完成，請查詢進度。');
      }
      accept(payload);
    } catch (error) { setError(error instanceof Error ? error.message : '連線中斷，請先查詢建立進度，避免重複建立。'); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function retryPublish() {
    if (!operation?.spreadsheetId || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/trips/${operation.spreadsheetId}/publish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestKey: pendingKey }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '公開設定失敗。');
      accept(payload);
    } catch (error) { setError(error instanceof Error ? error.message : '公開設定失敗，請查詢進度後重試。'); }
    finally { setBusy(false); }
  }
  function reset() {
    sessionStorage.removeItem(STORAGE_KEY); setPendingKey(''); setOperation(null); setError('');
  }
  return <section className="home-card create-trip" id="create-trip">
    <div className="eyebrow">A NEW JOURNEY</div><h2>建立新旅行</h2>
    <form onSubmit={submit}>
      <fieldset disabled={busy || Boolean(pendingKey)} className="trip-fields">
        <label>旅行名稱<input name="tripName" required maxLength={100} placeholder="例如：Thailand Trip" /></label>
        <label>副標題<input name="subtitle" maxLength={200} placeholder="例如：Bangkok & Chiang Mai" /></label>
        <div className="date-fields">
          <label>開始日期<input name="startDate" type="date" required /></label>
          <label>結束日期<input name="endDate" type="date" required /></label>
        </div>
        <fieldset className="theme-options"><legend>主題色</legend>{THEMES.map(theme => <label key={theme.value} className="theme-option">
          <input type="radio" name="themeColor" value={theme.value} checked={color === theme.value} onChange={() => setColor(theme.value)} />
          <span className="theme-swatch" style={{ background: theme.value }} />{theme.name}
        </label>)}</fieldset>
        <label className="public-consent"><input name="publicConsent" type="checkbox" required />
          <span>我了解：新試算表會設為「任何知道連結的人都可檢視」，原始 Google Sheets 內容也會公開給知道連結的人。請勿填入敏感資料。</span>
        </label>
      </fieldset>
      {!pendingKey && <button className="button button-primary create-submit" type="submit" disabled={busy}>建立旅行</button>}
    </form>
    <div role="status" aria-live="polite">
      {busy && <p>正在處理，請稍候…</p>}
      {operation?.state === 'creating' && <p>正在建立試算表…</p>}
      {operation?.message && <p>{operation.message}</p>}
    </div>
    {error && <p className="auth-message" role="alert">{error}</p>}
    {pendingKey && <div className="creation-actions">
      {operation?.state === 'share_failed' && <button type="button" className="button button-primary" disabled={busy} onClick={retryPublish}>重試公開設定</button>}
      <button type="button" className="button" disabled={busy} onClick={() => { void recover(pendingKey); }}>查詢建立進度</button>
      {operation?.spreadsheetId && <a className="button" target="_blank" rel="noopener noreferrer" href={`https://docs.google.com/spreadsheets/d/${operation.spreadsheetId}/edit`}>開啟已建立的 Google Sheets</a>}
      {operation?.state === 'create_failed' && <button type="button" className="button" disabled={busy} onClick={reset}>重新填寫並建立</button>}
      {(operation?.state === 'uncertain' || (!operation && error)) && <>
        <a className="button" target="_blank" rel="noopener noreferrer" href="https://drive.google.com/drive/u/0/recent">到 Google Drive 確認</a>
        <button type="button" className="button" disabled={busy} onClick={() => { if (window.confirm('請先確認 Google Drive 沒有已建立的試算表。清除進度後再次建立，可能產生重複檔案。確定清除？')) reset(); }}>確認後清除本機進度</button>
      </>}
    </div>}
  </section>;
}

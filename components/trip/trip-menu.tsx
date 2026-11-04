'use client';
import { useEffect, useRef, useState } from 'react';
export function TripMenu({ spreadsheetId, disabled = false }: { spreadsheetId: string; disabled?: boolean; tripName?: string }) {
  const [open, setOpen] = useState(false); const root = useRef<HTMLDivElement>(null); const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { setOpen(false); button.current?.focus(); } }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="trip-menu" ref={root}>
    <button type="button" ref={button} className="button menu-toggle" aria-label="旅行選單" aria-expanded={open} disabled={disabled} onClick={() => setOpen(value => !value)}>☰</button>
    {open && !disabled && <nav aria-label="Travel Planner" className="menu-panel">
      <strong>Travel Planner</strong>
      <a href={`/${spreadsheetId}`}>📅 Trip Itinerary · 每日行程</a>
      <a href={`/${spreadsheetId}/accommodation`}>🏨 Accommodation · 住宿</a>
      <a href={`/${spreadsheetId}/transportation`}>🚆 Transportation · 交通</a>
      <a href={`/${spreadsheetId}/settings`}>⚙️ Settings · 網站設定</a>
      <hr />
      <a target="_blank" rel="noopener noreferrer" href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}>📊 Open Google Sheets ↗</a>
    </nav>}
  </div>;
}

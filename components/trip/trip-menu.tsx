'use client';
import { useTripLanguage } from '@/components/trip/trip-language';
import { useEffect, useRef, useState } from 'react';
export function TripMenu({
  spreadsheetId,
  disabled = false,
}: {
  spreadsheetId: string;
  disabled?: boolean;
  tripName?: string;
}) {
  const { t } = useTripLanguage();

  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch('/api/auth/session', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => setSignedIn(Boolean(data.session)))
      .catch(() => {
        if (!controller.signal.aborted) setSignedIn(null);
      });
    return () => controller.abort();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div className="trip-menu" ref={root}>
      <button
        type="button"
        ref={button}
        className="button menu-toggle"
        aria-label={t('tripMenu')}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        ☰
      </button>
      {open && !disabled && (
        <nav aria-label={'Travel Planner'} className="menu-panel">
          <strong>{'Travel Planner'}</strong>
          <a href={`/${spreadsheetId}`}>{t('menuItinerary')}</a>
          <a href={`/${spreadsheetId}/accommodation`}>{t('menuAccommodation')}</a>
          <a href={`/${spreadsheetId}/transportation`}>{t('menuTransportation')}</a>
          <a href={`/${spreadsheetId}/settings`}>{t('menuSettings')}</a>
          <hr />
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
          >
            {t('menuGoogleSheets')}
          </a>
          <a href="/#create-trip">
            <span aria-hidden="true">🌍 </span>
            {t('createNewTrip')}
          </a>
          {signedIn === true && (
            <form action="/api/auth/signout" method="post">
              <input type="hidden" name="returnTo" value={`/${spreadsheetId}`} />
              <button type="submit" className="menu-action">
                <span aria-hidden="true">🚪</span>
                {t('signOut')}
              </button>
            </form>
          )}
        </nav>
      )}
    </div>
  );
}

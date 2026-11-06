'use client';
import { useTripLanguage } from '@/components/trip/trip-language';
import { useEffect, useId, useRef, useState } from 'react';
export function ShareTrip({
  spreadsheetId,
  tripName = 'Travel Planner',
  menu = false,
}: {
  spreadsheetId: string;
  tripName?: string;
  menu?: boolean;
}) {
  const { t, localizeMessage } = useTripLanguage();

  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [url, setUrl] = useState('');
  const [local, setLocal] = useState(false);
  const [nativeShare, setNativeShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    setNativeShare(typeof navigator.share === 'function');
  }, []);
  function open() {
    setUrl(`${window.location.origin}/${spreadsheetId}`);
    setLocal(['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname));
    setStatus('');
    dialog.current?.showModal();
  }
  async function copy() {
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      await navigator.clipboard.writeText(url);
      setStatus('已複製旅行網址。');
    } catch {
      setStatus('無法自動複製，請選取上方網址並手動複製。');
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      await navigator.share({ title: tripName, url });
      setStatus('已完成系統分享。');
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setStatus('無法開啟系統分享，請使用複製網址。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button type="button" className={menu ? 'menu-action' : 'button button-quiet'} onClick={open}>
        {menu ? t('menuShareTrip') : t('shareButton')}
      </button>
      <dialog ref={dialog} className="share-dialog" aria-labelledby={titleId}>
        <div className="share-dialog-heading">
          <h2 id={titleId}>{t('shareThisTrip')}</h2>
          <button
            type="button"
            className="button button-quiet"
            aria-label={t('closeSharingDialog')}
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <p>{t('shareDialogHelp')}</p>
        <label className="share-url-label">
          {t('tripUrl')}
          <input
            aria-label={t('tripUrl')}
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
        <div className="creation-actions">
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={() => {
              void copy();
            }}
          >
            {t('copyTripUrl')}
          </button>
          {nativeShare && (
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => {
                void share();
              }}
            >
              {t('shareWithAnotherApp')}
            </button>
          )}
        </div>
        <p className="share-result" role="status">
          {busy ? t('processing') : localizeMessage(status)}
        </p>
        {local && <p className="share-local-note">{t('localSharingWarning')}</p>}
      </dialog>
    </>
  );
}

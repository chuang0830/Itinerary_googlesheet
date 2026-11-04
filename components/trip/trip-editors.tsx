'use client';
import { useEffect, useState } from 'react';
import type { TripEditor } from '@/lib/trip/editors';

export function TripEditors({ spreadsheetId }: { spreadsheetId: string }) {
  const [editors, setEditors] = useState<TripEditor[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'private' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setEditors([]);
    setSignedIn(null);
    async function load() {
      try {
        const sessionResponse = await fetch('/api/auth/session', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!sessionResponse.ok) throw new Error();
        const { session } = await sessionResponse.json();
        if (controller.signal.aborted) return;
        setSignedIn(Boolean(session));
        if (!session) {
          setState('private');
          return;
        }
        const response = await fetch(`/api/trips/${spreadsheetId}/editors`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          setState('private');
          return;
        }
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) {
          setEditors(data.editors);
          setState('ready');
        }
      } catch {
        if (!controller.signal.aborted) setState('error');
      }
    }
    void load();
    return () => controller.abort();
  }, [spreadsheetId, attempt]);
  return (
    <div className="trip-editors">
      <div className="companions">
        {editors.slice(0, 5).map((editor) => (
          <span
            className="avatar"
            key={editor.key}
            title={editor.displayName}
            aria-label={editor.displayName}
          >
            {editor.kind === 'user' ? editor.name : '👥'}
          </span>
        ))}
        <span className="companions-label">
          {signedIn === false ? 'who is sharing trip board ?' : 'Shared trip board'}
        </span>
        {state === 'loading' && <span role="status">讀取中…</span>}
      </div>
      {state === 'ready' && (
        <details className="editors-details">
          <summary>{editors.length} 位／組可編輯成員</summary>
          <ul>
            {editors.map((editor) => (
              <li key={editor.key}>
                <span>{editor.displayName}</span>
                <small>
                  {editor.role === 'owner'
                    ? '擁有者'
                    : editor.kind === 'group'
                      ? '群組編輯權限'
                      : editor.kind === 'domain'
                        ? '網域編輯權限'
                        : '編輯者'}
                </small>
              </li>
            ))}
          </ul>
          {editors.some((editor) => editor.kind !== 'user') && (
            <p>群組與網域顯示授權對象，未展開其中的個別成員。</p>
          )}
          <button
            type="button"
            className="button button-quiet"
            onClick={() => setAttempt((value) => value + 1)}
          >
            更新名單
          </button>
        </details>
      )}
      {state === 'private' && (
        <p className="editors-note">
          登入並授權存取這份旅行後可查看成員；能否編輯仍依 Google Sheets 權限。
        </p>
      )}
      {state === 'error' && (
        <p className="editors-note" role="status">
          暫時無法讀取成員。
          <button
            type="button"
            className="editors-retry"
            onClick={() => setAttempt((value) => value + 1)}
          >
            重試
          </button>
        </p>
      )}
    </div>
  );
}

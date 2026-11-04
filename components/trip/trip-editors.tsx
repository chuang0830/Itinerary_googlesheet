'use client';
import { useEffect, useState } from 'react';
import type { TripEditor } from '@/lib/trip/editors';

export function TripEditors({ spreadsheetId }: { spreadsheetId: string }) {
  const [editors, setEditors] = useState<TripEditor[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'private' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [memberError, setMemberError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setMemberError('');
    setEditors([]);
    async function load() {
      try {
        const sessionResponse = await fetch('/api/auth/session', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!sessionResponse.ok) throw new Error();
        const { session } = await sessionResponse.json();
        if (controller.signal.aborted) return;
        if (!session) {
          setState('private');
          return;
        }
        const response = await fetch(`/api/trips/${spreadsheetId}/editors`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = await response.json();
        if (response.status === 401 || response.status === 403) {
          setMemberError(
            response.status === 403
              ? 'Google 未允許目前帳號讀取成員名單；你仍可查看公開行程。'
              : data.error || '登入狀態已失效；你仍可查看公開行程。',
          );
          setState('error');
          return;
        }
        if (!response.ok) {
          setMemberError(data.error || '目前帳號無法讀取成員資訊。');
          setState('error');
          return;
        }
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
          {state === 'ready' && editors.length > 0
            ? 'Shared trip board'
            : 'who is sharing trip board ?'}
        </span>
        {state === 'loading' && <span role="status">讀取中…</span>}
      </div>
      {state === 'error' && (
        <p className="editors-note" role="status">
          {memberError || '暫時無法讀取成員。'}
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

'use client';
import { tripAccessState } from '@/lib/trip/access-state';
import { useEffect, useRef, useState } from 'react';
import type { ItineraryRow } from '@/lib/trip/types';
import type { TripData } from '@/lib/trip/read';
import type { DraftPlan } from './edit-plan-list';
export function useItineraryEditor(id: string, onSnapshot: (trip: TripData) => void) {
  const [canEdit, setCanEdit] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [needsAuthorization, setNeedsAuthorization] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [draft, setDraft] = useState<DraftPlan[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const version = useRef('');
  const counter = useRef(0);
  const snapshot = useRef<TripData | null>(null);
  const saving = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/trips/${id}/access`, { cache: 'no-store', signal: controller.signal })
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
  }, [id]);
  useEffect(() => {
    if (!editing) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editing]);
  async function enter() {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch(`/api/trips/${id}/itinerary`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        if ([401, 403].includes(response.status)) setCanEdit(false);
        throw new Error(data.error || '無法進入編輯。');
      }
      const trip = data.trip as TripData;
      snapshot.current = trip;
      version.current = data.version;
      setDraft(trip.itinerary.map((row) => ({ ...row, uiKey: `draft-${counter.current++}` })));
      setBlocked(false);
      setEditing(true);
      onSnapshot(trip);
    } catch (error) {
      setError(error instanceof Error ? error.message : '無法進入編輯。');
    } finally {
      setBusy(false);
    }
  }
  function cancel() {
    if (saving.current) return;
    setDraft([]);
    setEditing(false);
    setError('');
    setBlocked(false);
    setStatus('已取消，未儲存修改已放棄。');
  }
  async function done() {
    if (saving.current || blocked) return;
    saving.current = true;
    setBusy(true);
    setError('');
    setStatus('Saving…');
    try {
      const itinerary = draft.map(({ Date, Activity, MapURL }) => ({ Date, Activity, MapURL }));
      const response = await fetch(`/api/trips/${id}/itinerary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: version.current, itinerary }),
      });
      const result = await response.json();
      if (!response.ok) {
        if ([401, 403, 409].includes(response.status)) setBlocked(true);
        if ([401, 403].includes(response.status)) setCanEdit(false);
        throw new Error(result.error || 'Sync failed. Retry Done.');
      }
      if (snapshot.current) onSnapshot({ ...snapshot.current, itinerary: result.itinerary });
      version.current = result.version;
      setEditing(false);
      setDraft([]);
      setStatus('Synced with Google Sheets');
    } catch (error) {
      setError(error instanceof Error ? error.message : '連線失敗。草稿仍保留，請重試 Done。');
      setStatus('Sync failed. Retry.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function change(key: string, patch: Partial<ItineraryRow>) {
    setDraft((rows) => rows.map((row) => (row.uiKey === key ? { ...row, ...patch } : row)));
    setStatus('尚未儲存，請按 Done。');
  }
  function remove(key: string) {
    setDraft((rows) => rows.filter((row) => row.uiKey !== key));
    setStatus('尚未儲存，請按 Done。');
  }
  function add(date: string) {
    setDraft((rows) => [
      ...rows,
      { Date: date, Activity: '', MapURL: '', uiKey: `draft-${counter.current++}` },
    ]);
    setStatus('尚未儲存，請按 Done。');
  }
  function reorder(from: string, to: string) {
    setDraft((previous) => {
      const rows = [...previous];
      const fromIndex = rows.findIndex((row) => row.uiKey === from);
      const toIndex = rows.findIndex((row) => row.uiKey === to);
      if (fromIndex < 0 || toIndex < 0 || rows[fromIndex].Date !== rows[toIndex].Date)
        return previous;
      const [row] = rows.splice(fromIndex, 1);
      rows.splice(toIndex, 0, row);
      return rows;
    });
    setStatus('尚未儲存，請按 Done。');
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        draft.map((row) => [row.Date, row.Activity, row.MapURL].join('\t')).join('\n'),
      );
      setStatus('草稿已複製。');
    } catch {
      setStatus('無法複製，請先保留畫面中的草稿內容。');
    }
  }
  return {
    canEdit,
    needsLogin,
    needsAuthorization,
    editing,
    busy,
    blocked,
    draft,
    error,
    status,
    enter,
    cancel,
    done,
    change,
    remove,
    add,
    reorder,
    copy,
  };
}

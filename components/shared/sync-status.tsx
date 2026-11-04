import type { SyncState } from '@/lib/trip/types';
const labels: Record<SyncState, string> = {
  disconnected: 'Google Sheets 尚未連線',
  saving: 'Saving…', synced: 'Synced with Google Sheets', error: 'Sync failed. Retry.',
};
export function SyncStatus({ state }: { state: SyncState }) {
  return <div className={`sync-status ${state === 'synced' ? 'is-connected' : ''}`} role="status">
    <span className="status-dot" />{labels[state]}
  </div>;
}

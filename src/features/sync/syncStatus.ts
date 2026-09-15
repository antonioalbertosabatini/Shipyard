import type { SyncState } from '@/data'

/** What the UI shows for the sync state; maps to `sync.status.<key>` in the locale files. */
export type SyncStatusKey = 'synced' | 'pending' | 'syncing' | 'offline' | 'error'

export function syncStatusKey(state: SyncState): SyncStatusKey {
  if (state.status === 'idle') return state.pending > 0 ? 'pending' : 'synced'
  return state.status
}

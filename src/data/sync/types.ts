export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncState {
  status: SyncStatus
  /** Local changes not uploaded yet. */
  pending: number
  lastSyncedAt?: string
  error?: string
}

/** Storage-agnostic handle on the sync engine, used by the React layer. */
export interface SyncController {
  getState(): SyncState
  /** Subscribes to state changes (compatible with `useSyncExternalStore`). */
  subscribe(listener: () => void): () => void
  /** Notifies when remote changes were written locally, so cached queries can be refreshed. */
  onRemoteChange(listener: () => void): () => void
  /** Starts syncing for `userId`; local data owned by another user is wiped first. */
  start(userId: string): Promise<void>
  stop(): void
  /** Schedules a debounced sync, e.g. after a local change. */
  requestSync(): void
  /** Syncs immediately; resolves to `true` on success. */
  syncNow(): Promise<boolean>
  /** Uploads pending changes; resolves to `true` when nothing is left to upload. */
  flush(): Promise<boolean>
  /** Stops syncing and deletes all local data (used on sign-out). */
  clearLocalData(): Promise<void>
}

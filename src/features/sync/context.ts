import { createContext, useCallback, useContext, useSyncExternalStore } from 'react'
import type { SyncController, SyncState } from '@/data'

export const SyncContext = createContext<SyncController | null>(null)

/** The sync engine, or `null` in local-only mode. */
export function useSyncController(): SyncController | null {
  return useContext(SyncContext)
}

const IDLE: SyncState = { status: 'idle', pending: 0 }

/** Live sync state, or `null` in local-only mode. */
export function useSyncState(): SyncState | null {
  const sync = useContext(SyncContext)
  const subscribe = useCallback(
    (listener: () => void) => sync?.subscribe(listener) ?? (() => {}),
    [sync],
  )
  const getSnapshot = useCallback(() => sync?.getState() ?? IDLE, [sync])
  const state = useSyncExternalStore(subscribe, getSnapshot)
  return sync ? state : null
}

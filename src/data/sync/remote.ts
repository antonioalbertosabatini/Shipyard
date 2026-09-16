import type { SyncTable } from '../dexie/db'
import type { DocItemRow, ProjectRow, Pulled, TaskRow } from './mappers'

export interface RowsByTable {
  projects: ProjectRow
  tasks: TaskRow
  docItems: DocItemRow
}

/** Server side of the sync, kept abstract so the engine can be tested without Supabase. */
export interface RemoteStore {
  /** Rows with `synced_at >= since` (all rows when `since` is undefined), ordered by `synced_at`, `id`. */
  pull<T extends SyncTable>(
    table: T,
    since: string | undefined,
    limit: number,
  ): Promise<Pulled<RowsByTable[T]>[]>
  /** Upserts rows; the server keeps whichever version has the newer `updated_at`. */
  push<T extends SyncTable>(table: T, rows: RowsByTable[T][]): Promise<void>
  /** Calls `onChange` when the user's data changes remotely; returns an unsubscribe function. */
  subscribe(userId: string, onChange: () => void): () => void
}

export class RemoteSyncError extends Error {
  readonly code: string | undefined

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'RemoteSyncError'
    this.code = code
  }
}

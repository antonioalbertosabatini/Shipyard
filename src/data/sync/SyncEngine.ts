import {
  PULL_OVERLAP_MS,
  PULL_PAGE_SIZE,
  PUSH_BATCH_SIZE,
  isNewer,
  toMillis,
  type Versioned,
} from '@/domain/sync'
import type { OutboxEntry, ShipyardDB, SyncTable } from '../dexie/db'
import {
  docItemToRow,
  projectToRow,
  rowToDocItem,
  rowToProject,
  rowToTask,
  taskToRow,
} from './mappers'
import type { RemoteStore, RowsByTable } from './remote'
import type { SyncController, SyncState } from './types'

const OWNER_KEY = 'ownerId'
const cursorKey = (table: SyncTable) => `pullCursor:${table}`
const outboxKey = (table: SyncTable, id: string): [SyncTable, string] => [table, id]

export interface SyncEngineOptions {
  /** Delay before syncing after a local change, so bursts of edits are pushed together. */
  debounceMs?: number
  /** Fallback polling in case realtime notifications are missed. */
  intervalMs?: number
  /** First retry delay after a failure; doubles up to `maxRetryMs`. */
  retryMs?: number
  maxRetryMs?: number
}

type IsCurrent = () => boolean

/**
 * Keeps the local IndexedDB copy in sync with a remote store:
 * pushes the outbox, then pulls rows changed since the last server cursor (last write wins).
 */
export class SyncEngine implements SyncController {
  private readonly db: ShipyardDB
  private readonly remote: RemoteStore
  private readonly options: Required<SyncEngineOptions>
  private state: SyncState = { status: 'idle', pending: 0 }
  private readonly stateListeners = new Set<() => void>()
  private readonly changeListeners = new Set<() => void>()
  private userId: string | null = null
  /** Bumped on start/stop so work belonging to a previous session is discarded. */
  private generation = 0
  private running: Promise<boolean> | null = null
  private rerun = false
  private retryDelay = 0
  private debounceTimer: ReturnType<typeof setTimeout> | undefined
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private teardown: (() => void)[] = []

  constructor(db: ShipyardDB, remote: RemoteStore, options: SyncEngineOptions = {}) {
    this.db = db
    this.remote = remote
    this.options = {
      debounceMs: 1000,
      intervalMs: 60_000,
      retryMs: 2000,
      maxRetryMs: 60_000,
      ...options,
    }
  }

  getState = (): SyncState => this.state

  subscribe = (listener: () => void) => {
    this.stateListeners.add(listener)
    return () => {
      this.stateListeners.delete(listener)
    }
  }

  onRemoteChange(listener: () => void) {
    this.changeListeners.add(listener)
    return () => {
      this.changeListeners.delete(listener)
    }
  }

  async start(userId: string) {
    if (this.userId === userId) return
    this.stop()
    const generation = this.generation
    await this.running

    const owner = await this.db.meta.get(OWNER_KEY)
    if (owner && owner.value !== userId) {
      await this.wipe()
      this.emitChange()
    }
    await this.db.meta.put({ key: OWNER_KEY, value: userId })
    if (generation !== this.generation) return

    this.userId = userId
    const interval = setInterval(() => void this.syncNow(), this.options.intervalMs)
    this.teardown = [
      () => clearInterval(interval),
      this.remote.subscribe(userId, () => this.requestSync()),
      listen(window, 'online', () => void this.syncNow()),
      listen(window, 'offline', () => this.setState({ status: 'offline' })),
      listen(document, 'visibilitychange', () => {
        if (document.visibilityState === 'visible') this.requestSync()
      }),
    ]
    await this.syncNow()
  }

  stop() {
    this.generation++
    this.userId = null
    for (const dispose of this.teardown) dispose()
    this.teardown = []
    clearTimeout(this.debounceTimer)
    clearTimeout(this.retryTimer)
    this.retryDelay = 0
    this.setState({ status: 'idle', lastSyncedAt: undefined, error: undefined })
  }

  requestSync() {
    void this.refreshPending()
    if (!this.userId) return
    clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => void this.syncNow(), this.options.debounceMs)
  }

  syncNow(): Promise<boolean> {
    if (!this.userId) return Promise.resolve(false)
    if (this.running) {
      // A change arrived mid-sync: run once more when the current pass ends.
      this.rerun = true
      return this.running
    }
    const run = this.runLoop().finally(() => {
      this.running = null
    })
    this.running = run
    return run
  }

  async flush() {
    clearTimeout(this.debounceTimer)
    await this.syncNow()
    return (await this.refreshPending()) === 0
  }

  async clearLocalData() {
    this.stop()
    await this.running
    await this.wipe()
    this.setState({ pending: 0 })
    this.emitChange()
  }

  private async runLoop(): Promise<boolean> {
    let ok: boolean
    do {
      this.rerun = false
      ok = await this.runOnce()
    } while (ok && this.rerun)
    return ok
  }

  private async runOnce(): Promise<boolean> {
    const generation = this.generation
    const isCurrent = () => generation === this.generation
    if (!this.userId) return false
    if (isOffline()) {
      await this.refreshPending()
      this.setState({ status: 'offline' })
      return false
    }

    clearTimeout(this.retryTimer)
    this.setState({ status: 'syncing' })
    try {
      await this.push(isCurrent)
      const changed = await this.pull(isCurrent)
      if (!isCurrent()) return false
      this.retryDelay = 0
      await this.refreshPending()
      this.setState({ status: 'idle', error: undefined, lastSyncedAt: new Date().toISOString() })
      if (changed) this.emitChange()
      return true
    } catch (error) {
      if (!isCurrent()) return false
      console.error('Sync failed', error)
      await this.refreshPending()
      this.setState({
        status: isOffline() ? 'offline' : 'error',
        error: error instanceof Error ? error.message : String(error),
      })
      this.scheduleRetry()
      return false
    }
  }

  private scheduleRetry() {
    const { retryMs, maxRetryMs } = this.options
    this.retryDelay = Math.min(this.retryDelay ? this.retryDelay * 2 : retryMs, maxRetryMs)
    clearTimeout(this.retryTimer)
    this.retryTimer = setTimeout(() => void this.syncNow(), this.retryDelay)
  }

  // Projects first: tasks and documentation items reference them through a foreign key.
  private async push(isCurrent: IsCurrent) {
    await this.pushTable(
      'projects',
      (ids) => this.db.projects.bulkGet(ids),
      projectToRow,
      isCurrent,
    )
    await this.pushTable('tasks', (ids) => this.db.tasks.bulkGet(ids), taskToRow, isCurrent)
    await this.pushTable(
      'docItems',
      (ids) => this.db.docItems.bulkGet(ids),
      docItemToRow,
      isCurrent,
    )
  }

  private async pushTable<T extends SyncTable, L extends { id: string; updatedAt: string }>(
    table: T,
    load: (ids: string[]) => Promise<(L | undefined)[]>,
    toRow: (row: L) => RowsByTable[T],
    isCurrent: IsCurrent,
  ) {
    const entries = (await this.db.outbox.toArray()).filter((entry) => entry.table === table)
    for (let start = 0; start < entries.length; start += PUSH_BATCH_SIZE) {
      if (!isCurrent()) return
      const batch = entries.slice(start, start + PUSH_BATCH_SIZE)
      const rows = (await load(batch.map((entry) => entry.id))).filter((row): row is L => !!row)
      await this.remote.push(table, rows.map(toRow))

      const pushed = new Map(rows.map((row) => [row.id, row.updatedAt]))
      await this.db.transaction('rw', this.db.outbox, async () => {
        const current = await this.db.outbox.bulkGet(
          batch.map((entry) => outboxKey(table, entry.id)),
        )
        // Entries re-queued during the upload refer to a newer version: keep them.
        const done = current.filter(
          (entry): entry is OutboxEntry =>
            !!entry && (!pushed.has(entry.id) || pushed.get(entry.id) === entry.updatedAt),
        )
        await this.db.outbox.bulkDelete(done.map((entry) => outboxKey(table, entry.id)))
      })
    }
  }

  private async pull(isCurrent: IsCurrent): Promise<boolean> {
    const { projects: p, tasks: t, docItems: d } = this.db
    const projects = await this.pullTable(
      'projects',
      rowToProject,
      (rows) =>
        this.apply(
          'projects',
          (ids) => p.bulkGet(ids),
          (won) => p.bulkPut(won),
          rows,
        ),
      isCurrent,
    )
    const tasks = await this.pullTable(
      'tasks',
      rowToTask,
      (rows) =>
        this.apply(
          'tasks',
          (ids) => t.bulkGet(ids),
          (won) => t.bulkPut(won),
          rows,
        ),
      isCurrent,
    )
    const docItems = await this.pullTable(
      'docItems',
      rowToDocItem,
      (rows) =>
        this.apply(
          'docItems',
          (ids) => d.bulkGet(ids),
          (won) => d.bulkPut(won),
          rows,
        ),
      isCurrent,
    )
    return projects || tasks || docItems
  }

  private async pullTable<T extends SyncTable, L>(
    table: T,
    fromRow: (row: RowsByTable[T]) => L | null,
    apply: (rows: L[]) => Promise<boolean>,
    isCurrent: IsCurrent,
  ): Promise<boolean> {
    const key = cursorKey(table)
    const cursor = (await this.db.meta.get(key))?.value
    let since = cursor ? new Date(toMillis(cursor) - PULL_OVERLAP_MS).toISOString() : undefined
    let latest = cursor
    let changed = false

    for (;;) {
      const page = await this.remote.pull(table, since, PULL_PAGE_SIZE)
      if (!isCurrent()) return false

      const rows: L[] = []
      for (const raw of page) {
        const row = fromRow(raw)
        if (row) rows.push(row)
        else console.warn(`Skipping invalid remote ${table} row`, raw.id)
      }
      if (rows.length && (await apply(rows))) changed = true

      const last = page.at(-1)
      if (!last) break
      if (!latest || toMillis(last.synced_at) >= toMillis(latest)) latest = last.synced_at
      // Keyset pagination on `synced_at` (inclusive, re-applying a row is harmless).
      if (page.length < PULL_PAGE_SIZE || last.synced_at === since) break
      since = last.synced_at
    }

    if (latest && latest !== cursor) await this.db.meta.put({ key, value: latest })
    return changed
  }

  /** Writes the pulled rows that win against the local copy. */
  private apply<T extends Versioned & { id: string }>(
    table: SyncTable,
    load: (ids: string[]) => Promise<(T | undefined)[]>,
    store: (rows: T[]) => Promise<unknown>,
    rows: T[],
  ): Promise<boolean> {
    return this.db.transaction('rw', table, this.db.outbox, async () => {
      const existing = await load(rows.map((row) => row.id))
      const winners = rows.filter((row, i) => isNewer(row, existing[i]))
      await store(winners)
      // Queued local versions are older than the winners: drop them.
      await this.db.outbox.bulkDelete(winners.map((row) => outboxKey(table, row.id)))
      return winners.length > 0
    })
  }

  private wipe() {
    const { projects, tasks, docItems, outbox, meta } = this.db
    return this.db.transaction('rw', [projects, tasks, docItems, outbox, meta], async () => {
      await Promise.all([
        projects.clear(),
        tasks.clear(),
        docItems.clear(),
        outbox.clear(),
        meta.clear(),
      ])
    })
  }

  private async refreshPending() {
    const pending = await this.db.outbox.count()
    if (pending !== this.state.pending) this.setState({ pending })
    return pending
  }

  private setState(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch }
    for (const listener of this.stateListeners) listener()
  }

  private emitChange() {
    for (const listener of this.changeListeners) listener()
  }
}

function listen(target: EventTarget, type: string, handler: () => void) {
  target.addEventListener(type, handler)
  return () => target.removeEventListener(type, handler)
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DocItemInput, TaskInput } from '@/domain/schemas'
import { toMillis } from '@/domain/sync'
import { createId } from '@/lib/id'
import { createDexieRepositories } from '..'
import { ShipyardDB, type SyncTable } from '../dexie/db'
import type { DocItemRow, ProjectRow, Pulled, TaskRow } from './mappers'
import type { RemoteStore, RowsByTable } from './remote'
import { SyncEngine } from './SyncEngine'

type Row = ProjectRow | TaskRow | DocItemRow
type AnyRow = Pulled<Row>

/** In-memory server that mirrors the `shipyard_sync_guard` trigger. */
class FakeRemote implements RemoteStore {
  readonly tables: Record<SyncTable, Map<string, AnyRow>> = {
    projects: new Map(),
    tasks: new Map(),
    docItems: new Map(),
  }
  failNextPush = false
  beforePush: (() => Promise<void>) | undefined
  private clock = Date.parse('2026-01-01T00:00:00.000Z')

  async pull<T extends SyncTable>(table: T, since: string | undefined, limit: number) {
    const rows = [...this.tables[table].values()]
      .filter((row) => !since || toMillis(row.synced_at) >= toMillis(since))
      .sort((a, b) => a.synced_at.localeCompare(b.synced_at) || a.id.localeCompare(b.id))
      .slice(0, limit)
    return JSON.parse(JSON.stringify(rows)) as Pulled<RowsByTable[T]>[]
  }

  async push<T extends SyncTable>(table: T, rows: RowsByTable[T][]) {
    if (this.failNextPush) {
      this.failNextPush = false
      throw new Error('Network down')
    }
    await this.beforePush?.()
    for (const row of rows) {
      const current = this.tables[table].get(row.id)
      if (current && toMillis(row.updated_at) <= toMillis(current.updated_at)) continue
      this.seed(table, row)
    }
  }

  subscribe() {
    return () => {}
  }

  seed(table: SyncTable, row: Row) {
    this.clock += 1
    this.tables[table].set(row.id, { ...row, synced_at: new Date(this.clock).toISOString() })
  }
}

const USER = 'user-1'
const projectInput = { name: 'Portfolio', color: '#6366f1' }
const taskInput: TaskInput = { title: 'Task', type: 'feature', status: 'todo', priority: 'medium' }
const docItemInput: DocItemInput = { type: 'command', content: 'npm run dev' }
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const engines: SyncEngine[] = []

function device(remote: FakeRemote) {
  const db = new ShipyardDB(`test-${createId()}`)
  // Long timers: tests drive syncs explicitly.
  const engine = new SyncEngine(db, remote, {
    debounceMs: 60_000,
    intervalMs: 3_600_000,
    retryMs: 60_000,
  })
  engines.push(engine)
  return { db, repos: createDexieRepositories(db), engine }
}

afterEach(() => {
  for (const engine of engines.splice(0)) engine.stop()
})

describe('SyncEngine', () => {
  it('uploads local data on start and empties the outbox', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const project = await a.repos.projects.create(projectInput)
    await a.repos.tasks.create(project.id, taskInput)

    await a.engine.start(USER)

    expect(remote.tables.projects.size).toBe(1)
    expect(remote.tables.tasks.size).toBe(1)
    expect(await a.db.outbox.count()).toBe(0)
    expect(a.engine.getState()).toMatchObject({ status: 'idle', pending: 0 })
    expect(a.engine.getState().lastSyncedAt).toBeDefined()
  })

  it('downloads remote data and notifies listeners', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const project = await a.repos.projects.create(projectInput)
    await a.repos.tasks.create(project.id, taskInput)
    await a.repos.docItems.create(project.id, docItemInput)
    await a.engine.start(USER)

    const b = device(remote)
    const onChange = vi.fn()
    b.engine.onRemoteChange(onChange)
    await b.engine.start(USER)

    expect(await b.repos.projects.list()).toEqual(await a.repos.projects.list())
    expect(await b.repos.tasks.listAll()).toEqual(await a.repos.tasks.listAll())
    expect(await b.repos.docItems.listByProject(project.id)).toEqual(
      await a.repos.docItems.listByProject(project.id),
    )
    expect(onChange).toHaveBeenCalled()
  })

  it('resolves concurrent edits with last write wins, whatever the sync order', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const b = device(remote)
    const { id } = await a.repos.projects.create(projectInput)
    await a.engine.start(USER)
    await b.engine.start(USER)

    await a.repos.projects.update(id, { ...projectInput, name: 'Older edit' })
    await sleep(5)
    await b.repos.projects.update(id, { ...projectInput, name: 'Newer edit' })

    // The newer edit reaches the server first; the older one must not overwrite it.
    await b.engine.syncNow()
    await a.engine.syncNow()
    await b.engine.syncNow()

    expect(remote.tables.projects.get(id)).toMatchObject({ name: 'Newer edit' })
    expect((await a.repos.projects.get(id))?.name).toBe('Newer edit')
    expect((await b.repos.projects.get(id))?.name).toBe('Newer edit')
    expect(await a.db.outbox.count()).toBe(0)
  })

  it('propagates deletions', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const b = device(remote)
    const project = await a.repos.projects.create(projectInput)
    await a.repos.tasks.create(project.id, taskInput)
    await a.repos.docItems.create(project.id, docItemInput)
    await a.engine.start(USER)
    await b.engine.start(USER)

    await a.repos.projects.remove(project.id)
    await a.engine.syncNow()
    await b.engine.syncNow()

    expect(await b.repos.projects.list()).toEqual([])
    expect(await b.repos.tasks.listAll()).toEqual([])
    expect(await b.repos.docItems.listByProject(project.id)).toEqual([])
  })

  it('keeps changes made while an upload is in flight', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const project = await a.repos.projects.create(projectInput)
    remote.beforePush = async () => {
      remote.beforePush = undefined
      await a.repos.projects.update(project.id, { ...projectInput, name: 'Edited during push' })
    }

    await a.engine.start(USER)
    expect(await a.db.outbox.count()).toBe(1)

    await a.engine.syncNow()
    expect(remote.tables.projects.get(project.id)).toMatchObject({ name: 'Edited during push' })
    expect(await a.db.outbox.count()).toBe(0)
  })

  it('reports failures and succeeds on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const remote = new FakeRemote()
    const a = device(remote)
    await a.repos.projects.create(projectInput)
    remote.failNextPush = true

    await a.engine.start(USER)
    expect(a.engine.getState()).toMatchObject({ status: 'error', pending: 1 })

    await expect(a.engine.flush()).resolves.toBe(true)
    expect(a.engine.getState().status).toBe('idle')
    expect(remote.tables.projects.size).toBe(1)
  })

  it('skips invalid remote rows without failing the sync', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const remote = new FakeRemote()
    const a = device(remote)
    await a.repos.projects.create(projectInput)
    await a.engine.start(USER)
    const [valid] = [...remote.tables.projects.values()]
    remote.seed('projects', { ...(valid as ProjectRow), id: 'broken', color: 'not-a-color' })

    const b = device(remote)
    await b.engine.start(USER)

    expect(b.engine.getState().status).toBe('idle')
    expect((await b.repos.projects.list()).map((p) => p.id)).toEqual([valid?.id])
  })

  it('wipes local data that belongs to another user', async () => {
    const a = device(new FakeRemote())
    await a.repos.projects.create(projectInput)
    await a.engine.start(USER)
    a.engine.stop()

    const other = new SyncEngine(a.db, new FakeRemote(), {
      debounceMs: 60_000,
      intervalMs: 3_600_000,
    })
    engines.push(other)
    await other.start('user-2')

    expect(await a.repos.projects.list()).toEqual([])
  })

  it('clears every local row on sign-out', async () => {
    const a = device(new FakeRemote())
    const project = await a.repos.projects.create(projectInput)
    await a.repos.docItems.create(project.id, docItemInput)
    await a.engine.start(USER)

    await a.engine.clearLocalData()

    expect(await a.db.projects.count()).toBe(0)
    expect(await a.db.docItems.count()).toBe(0)
    expect(await a.db.outbox.count()).toBe(0)
    expect(await a.db.meta.count()).toBe(0)
  })
})

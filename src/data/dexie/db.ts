import { Dexie, type EntityTable, type Table } from 'dexie'
import type { Project, Task } from '@/domain/schemas'

export type SyncTable = 'projects' | 'tasks'

/** A local change waiting to be pushed; `updatedAt` identifies the version that was queued. */
export interface OutboxEntry {
  table: SyncTable
  id: string
  updatedAt: string
}

/** Small key/value store for sync bookkeeping (owner, pull cursors). */
export interface MetaEntry {
  key: string
  value: string
}

export class ShipyardDB extends Dexie {
  projects!: EntityTable<Project, 'id'>
  tasks!: EntityTable<Task, 'id'>
  outbox!: Table<OutboxEntry, [SyncTable, string]>
  meta!: EntityTable<MetaEntry, 'key'>

  constructor(name = 'shipyard') {
    super(name)
    this.version(1).stores({
      projects: 'id, updatedAt',
      tasks: 'id, projectId, [projectId+status], updatedAt',
    })
    this.version(2)
      .stores({ outbox: '[table+id]', meta: 'key' })
      .upgrade(async (tx) => {
        // Queue pre-existing rows so they are uploaded on the first sign-in.
        const [projects, tasks] = await Promise.all([
          tx.table<Project>('projects').toArray(),
          tx.table<Task>('tasks').toArray(),
        ])
        await tx
          .table<OutboxEntry>('outbox')
          .bulkPut([...toOutbox('projects', projects), ...toOutbox('tasks', tasks)])
      })
  }
}

const toOutbox = (table: SyncTable, rows: { id: string; updatedAt: string }[]): OutboxEntry[] =>
  rows.map(({ id, updatedAt }) => ({ table, id, updatedAt }))

/** Queues rows for the next push. Call inside a transaction that includes `db.outbox`. */
export function markDirty(
  db: ShipyardDB,
  table: SyncTable,
  rows: { id: string; updatedAt: string }[],
) {
  return db.outbox.bulkPut(toOutbox(table, rows))
}

export const isAlive = <T extends { deletedAt?: string }>(row: T | undefined): row is T =>
  !!row && !row.deletedAt

/** Drops keys whose value is `undefined` so optional fields are really absent in storage. */
export function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}

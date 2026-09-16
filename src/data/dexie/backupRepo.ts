import { buildBackup } from '@/domain/backup'
import type { DocItem, Project, Task } from '@/domain/schemas'
import { isNewer, latestTimestamp, nextTimestamp } from '@/domain/sync'
import type { BackupRepository } from '../repositories'
import { compact, isAlive, markDirty, type ShipyardDB, type SyncTable } from './db'

interface BackupRow {
  id: string
  updatedAt: string
  deletedAt?: string
}

/** One synced table, behind concrete accessors: the import/export logic is written once. */
interface Rows<T extends BackupRow> {
  name: SyncTable
  all: () => Promise<T[]>
  byIds: (ids: string[]) => Promise<(T | undefined)[]>
  put: (rows: T[]) => Promise<unknown>
}

const tombstone = <T extends BackupRow>(row: T, timestamp: string): T => ({
  ...row,
  deletedAt: timestamp,
  updatedAt: timestamp,
})

export function createDexieBackupRepository(db: ShipyardDB): BackupRepository {
  const projects: Rows<Project> = {
    name: 'projects',
    all: () => db.projects.toArray(),
    byIds: (ids) => db.projects.bulkGet(ids),
    put: (rows) => db.projects.bulkPut(rows),
  }
  const tasks: Rows<Task> = {
    name: 'tasks',
    all: () => db.tasks.toArray(),
    byIds: (ids) => db.tasks.bulkGet(ids),
    put: (rows) => db.tasks.bulkPut(rows),
  }
  const docItems: Rows<DocItem> = {
    name: 'docItems',
    all: () => db.docItems.toArray(),
    byIds: (ids) => db.docItems.bulkGet(ids),
    put: (rows) => db.docItems.bulkPut(rows),
  }

  async function write<T extends BackupRow>(table: Rows<T>, rows: T[]) {
    const compacted = rows.map(compact)
    await table.put(compacted)
    await markDirty(db, table.name, compacted)
  }

  /** Writes the backup rows and tombstones the local rows the backup does not contain. */
  async function replaceAll<T extends BackupRow>(
    table: Rows<T>,
    local: T[],
    rows: T[],
    timestamp: string,
  ) {
    const ids = new Set(rows.map((row) => row.id))
    await write(table, [
      ...local
        .filter((row) => isAlive(row) && !ids.has(row.id))
        .map((row) => tombstone(row, timestamp)),
      ...rows.map((row) => ({ ...row, updatedAt: timestamp })),
    ])
  }

  /** Upserts the backup rows that are newer than the local copy; returns how many were written. */
  async function mergeInto<T extends BackupRow>(table: Rows<T>, rows: T[]) {
    const existing = await table.byIds(rows.map((row) => row.id))
    const winners = rows.filter((row, i) => isNewer(row, existing[i]))
    await write(table, winners)
    return winners.length
  }

  async function clear<T extends BackupRow>(table: Rows<T>, rows: T[], timestamp: string) {
    await write(
      table,
      rows.map((row) => tombstone(row, timestamp)),
    )
  }

  return {
    async exportAll() {
      const [allProjects, allTasks, allDocItems] = await Promise.all([
        projects.all(),
        tasks.all(),
        docItems.all(),
      ])
      const aliveProjects = allProjects.filter(isAlive)
      const projectIds = new Set(aliveProjects.map((p) => p.id))
      const ofAliveProject = <T extends BackupRow & { projectId: string }>(row: T) =>
        isAlive(row) && projectIds.has(row.projectId)
      return buildBackup(
        aliveProjects,
        allTasks.filter(ofAliveProject),
        allDocItems.filter(ofAliveProject),
      )
    },

    importAll(backup, mode) {
      return db.transaction('rw', db.projects, db.tasks, db.docItems, db.outbox, async () => {
        if (mode === 'replace') {
          const [localProjects, localTasks, localDocItems] = await Promise.all([
            projects.all(),
            tasks.all(),
            docItems.all(),
          ])
          // Newer than every known version, so the backup also wins on synced devices.
          const timestamp = nextTimestamp(
            latestTimestamp([
              ...localProjects,
              ...localTasks,
              ...localDocItems,
              ...backup.projects,
              ...backup.tasks,
              ...backup.docItems,
            ]),
          )
          await replaceAll(projects, localProjects, backup.projects, timestamp)
          await replaceAll(tasks, localTasks, backup.tasks, timestamp)
          await replaceAll(docItems, localDocItems, backup.docItems, timestamp)
          return {
            projects: backup.projects.length,
            tasks: backup.tasks.length,
            docItems: backup.docItems.length,
          }
        }

        // Merge: upsert by id, keeping whichever copy was modified last.
        return {
          projects: await mergeInto(projects, backup.projects),
          tasks: await mergeInto(tasks, backup.tasks),
          docItems: await mergeInto(docItems, backup.docItems),
        }
      })
    },

    clearAll() {
      return db.transaction('rw', db.projects, db.tasks, db.docItems, db.outbox, async () => {
        const [liveProjects, liveTasks, liveDocItems] = await Promise.all([
          projects.all().then((rows) => rows.filter(isAlive)),
          tasks.all().then((rows) => rows.filter(isAlive)),
          docItems.all().then((rows) => rows.filter(isAlive)),
        ])
        // Soft delete, so the reset also reaches synced devices.
        const timestamp = nextTimestamp(
          latestTimestamp([...liveProjects, ...liveTasks, ...liveDocItems]),
        )
        await clear(projects, liveProjects, timestamp)
        await clear(tasks, liveTasks, timestamp)
        await clear(docItems, liveDocItems, timestamp)
      })
    },
  }
}

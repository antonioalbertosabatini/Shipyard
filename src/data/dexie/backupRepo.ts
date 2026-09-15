import { buildBackup } from '@/domain/backup'
import type { Project, Task } from '@/domain/schemas'
import { isNewer, latestTimestamp, nextTimestamp } from '@/domain/sync'
import type { BackupRepository } from '../repositories'
import { compact, isAlive, markDirty, type ShipyardDB } from './db'

const tombstone = <T extends { updatedAt: string; deletedAt?: string }>(
  row: T,
  timestamp: string,
): T => ({
  ...row,
  deletedAt: timestamp,
  updatedAt: timestamp,
})

export function createDexieBackupRepository(db: ShipyardDB): BackupRepository {
  async function putProjects(rows: Project[]) {
    const compacted = rows.map(compact)
    await db.projects.bulkPut(compacted)
    await markDirty(db, 'projects', compacted)
  }

  async function putTasks(rows: Task[]) {
    const compacted = rows.map(compact)
    await db.tasks.bulkPut(compacted)
    await markDirty(db, 'tasks', compacted)
  }

  return {
    async exportAll() {
      const [projects, tasks] = await Promise.all([db.projects.toArray(), db.tasks.toArray()])
      const aliveProjects = projects.filter(isAlive)
      const projectIds = new Set(aliveProjects.map((p) => p.id))
      return buildBackup(
        aliveProjects,
        tasks.filter((t) => isAlive(t) && projectIds.has(t.projectId)),
      )
    },

    importAll(backup, mode) {
      return db.transaction('rw', db.projects, db.tasks, db.outbox, async () => {
        if (mode === 'replace') {
          const [projects, tasks] = await Promise.all([db.projects.toArray(), db.tasks.toArray()])
          // Newer than every known version, so the backup also wins on synced devices.
          const timestamp = nextTimestamp(
            latestTimestamp([...projects, ...tasks, ...backup.projects, ...backup.tasks]),
          )
          const projectIds = new Set(backup.projects.map((p) => p.id))
          const taskIds = new Set(backup.tasks.map((t) => t.id))
          await putProjects([
            ...projects
              .filter((p) => isAlive(p) && !projectIds.has(p.id))
              .map((p) => tombstone(p, timestamp)),
            ...backup.projects.map((p) => ({ ...p, updatedAt: timestamp })),
          ])
          await putTasks([
            ...tasks
              .filter((t) => isAlive(t) && !taskIds.has(t.id))
              .map((t) => tombstone(t, timestamp)),
            ...backup.tasks.map((t) => ({ ...t, updatedAt: timestamp })),
          ])
          return { projects: backup.projects.length, tasks: backup.tasks.length }
        }

        // Merge: upsert by id, keeping whichever copy was modified last.
        const [existingProjects, existingTasks] = await Promise.all([
          db.projects.bulkGet(backup.projects.map((p) => p.id)),
          db.tasks.bulkGet(backup.tasks.map((t) => t.id)),
        ])
        const projects = backup.projects.filter((p, i) => isNewer(p, existingProjects[i]))
        const tasks = backup.tasks.filter((t, i) => isNewer(t, existingTasks[i]))
        await putProjects(projects)
        await putTasks(tasks)
        return { projects: projects.length, tasks: tasks.length }
      })
    },

    clearAll() {
      return db.transaction('rw', db.projects, db.tasks, db.outbox, async () => {
        const [projects, tasks] = await Promise.all([
          db.projects.toArray().then((rows) => rows.filter(isAlive)),
          db.tasks.toArray().then((rows) => rows.filter(isAlive)),
        ])
        // Soft delete, so the reset also reaches synced devices.
        const timestamp = nextTimestamp(latestTimestamp([...projects, ...tasks]))
        await putProjects(projects.map((p) => tombstone(p, timestamp)))
        await putTasks(tasks.map((t) => tombstone(t, timestamp)))
      })
    },
  }
}

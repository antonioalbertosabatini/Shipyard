import { buildBackup } from '@/domain/backup'
import type { BackupRepository } from '../repositories'
import { compact, isAlive, type ShipyardDB } from './db'

export function createDexieBackupRepository(db: ShipyardDB): BackupRepository {
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
      return db.transaction('rw', db.projects, db.tasks, async () => {
        if (mode === 'replace') {
          await Promise.all([db.projects.clear(), db.tasks.clear()])
          await db.projects.bulkPut(backup.projects.map(compact))
          await db.tasks.bulkPut(backup.tasks.map(compact))
          return { projects: backup.projects.length, tasks: backup.tasks.length }
        }

        // Merge: upsert by id, keeping whichever copy was modified last.
        const [existingProjects, existingTasks] = await Promise.all([
          db.projects.bulkGet(backup.projects.map((p) => p.id)),
          db.tasks.bulkGet(backup.tasks.map((t) => t.id)),
        ])
        const projects = backup.projects.filter(
          (p, i) => !existingProjects[i] || existingProjects[i].updatedAt < p.updatedAt,
        )
        const tasks = backup.tasks.filter(
          (t, i) => !existingTasks[i] || existingTasks[i].updatedAt < t.updatedAt,
        )
        await db.projects.bulkPut(projects.map(compact))
        await db.tasks.bulkPut(tasks.map(compact))
        return { projects: projects.length, tasks: tasks.length }
      })
    },

    clearAll() {
      return db.transaction('rw', db.projects, db.tasks, async () => {
        await Promise.all([db.projects.clear(), db.tasks.clear()])
      })
    },
  }
}

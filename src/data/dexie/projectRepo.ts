import type { Project, ProjectInput } from '@/domain/schemas'
import { createId } from '@/lib/id'
import { EntityNotFoundError, type ProjectRepository } from '../repositories'
import { compact, isAlive, now, type ShipyardDB } from './db'

export function createDexieProjectRepository(db: ShipyardDB): ProjectRepository {
  async function getAlive(id: string): Promise<Project> {
    const project = await db.projects.get(id)
    if (!isAlive(project)) throw new EntityNotFoundError('Project', id)
    return project
  }

  async function save(project: Project): Promise<Project> {
    const row = compact(project)
    await db.projects.put(row)
    return row
  }

  return {
    async list() {
      const rows = await db.projects.toArray()
      return rows.filter(isAlive).sort((a, b) => a.name.localeCompare(b.name))
    },

    async get(id) {
      const project = await db.projects.get(id)
      return isAlive(project) ? project : undefined
    },

    async create(input: ProjectInput) {
      const timestamp = now()
      return save({ ...input, id: createId(), archived: false, createdAt: timestamp, updatedAt: timestamp })
    },

    update(id, input) {
      return db.transaction('rw', db.projects, async () => {
        const { name, description, color, repoUrl, liveUrl } = input
        const current = await getAlive(id)
        return save({ ...current, name, description, color, repoUrl, liveUrl, updatedAt: now() })
      })
    },

    setArchived(id, archived) {
      return db.transaction('rw', db.projects, async () => {
        const current = await getAlive(id)
        return save({ ...current, archived, updatedAt: now() })
      })
    },

    remove(id) {
      return db.transaction('rw', db.projects, db.tasks, async () => {
        const current = await getAlive(id)
        const timestamp = now()
        await db.projects.put({ ...current, deletedAt: timestamp, updatedAt: timestamp })
        await db.tasks
          .where('projectId')
          .equals(id)
          .modify((task) => {
            if (task.deletedAt) return
            task.deletedAt = timestamp
            task.updatedAt = timestamp
          })
      })
    },
  }
}

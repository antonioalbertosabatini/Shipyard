import type { Project, ProjectInput } from '@/domain/schemas'
import { nextTimestamp } from '@/domain/sync'
import { createId } from '@/lib/id'
import { EntityNotFoundError, type ProjectRepository } from '../repositories'
import { compact, isAlive, markDirty, type ShipyardDB } from './db'

export function createDexieProjectRepository(db: ShipyardDB): ProjectRepository {
  async function getAlive(id: string): Promise<Project> {
    const project = await db.projects.get(id)
    if (!isAlive(project)) throw new EntityNotFoundError('Project', id)
    return project
  }

  async function save(project: Project): Promise<Project> {
    const row = compact(project)
    await db.projects.put(row)
    await markDirty(db, 'projects', [row])
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

    create(input: ProjectInput) {
      return db.transaction('rw', db.projects, db.outbox, () => {
        const timestamp = nextTimestamp()
        return save({
          ...input,
          id: createId(),
          archived: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      })
    },

    update(id, input) {
      return db.transaction('rw', db.projects, db.outbox, async () => {
        const { name, description, color, repoUrl, liveUrl } = input
        const current = await getAlive(id)
        return save({
          ...current,
          name,
          description,
          color,
          repoUrl,
          liveUrl,
          updatedAt: nextTimestamp(current.updatedAt),
        })
      })
    },

    setArchived(id, archived) {
      return db.transaction('rw', db.projects, db.outbox, async () => {
        const current = await getAlive(id)
        return save({ ...current, archived, updatedAt: nextTimestamp(current.updatedAt) })
      })
    },

    remove(id) {
      return db.transaction('rw', db.projects, db.tasks, db.outbox, async () => {
        const current = await getAlive(id)
        const timestamp = nextTimestamp(current.updatedAt)
        await save({ ...current, deletedAt: timestamp, updatedAt: timestamp })
        const tasks = (await db.tasks.where('projectId').equals(id).toArray()).filter(isAlive)
        const deleted = tasks.map((task) => ({
          ...task,
          deletedAt: timestamp,
          updatedAt: nextTimestamp(task.updatedAt),
        }))
        await db.tasks.bulkPut(deleted)
        await markDirty(db, 'tasks', deleted)
      })
    },
  }
}

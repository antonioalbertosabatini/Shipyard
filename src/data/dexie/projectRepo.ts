import type { Project, ProjectInput } from '@/domain/schemas'
import { nextTimestamp } from '@/domain/sync'
import { createId } from '@/lib/id'
import { EntityNotFoundError, type ProjectRepository } from '../repositories'
import { compact, isAlive, markDirty, type ShipyardDB } from './db'

interface ProjectChild {
  updatedAt: string
  deletedAt?: string
}

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

  /** Tombstones the live rows of a child table, each after the version it replaces. */
  const tombstones = <T extends ProjectChild>(rows: T[], timestamp: string): T[] =>
    rows.filter(isAlive).map((row) => ({
      ...row,
      deletedAt: timestamp,
      updatedAt: nextTimestamp(row.updatedAt),
    }))

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
        const { name, description, color, icon, repoUrl, liveUrl } = input
        const current = await getAlive(id)
        return save({
          ...current,
          name,
          description,
          color,
          icon,
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
      return db.transaction('rw', db.projects, db.tasks, db.docItems, db.outbox, async () => {
        const current = await getAlive(id)
        const timestamp = nextTimestamp(current.updatedAt)
        await save({ ...current, deletedAt: timestamp, updatedAt: timestamp })

        const byProject = { projectId: id }
        const tasks = tombstones(await db.tasks.where(byProject).toArray(), timestamp)
        await db.tasks.bulkPut(tasks)
        await markDirty(db, 'tasks', tasks)

        const docItems = tombstones(await db.docItems.where(byProject).toArray(), timestamp)
        await db.docItems.bulkPut(docItems)
        await markDirty(db, 'docItems', docItems)
      })
    },
  }
}

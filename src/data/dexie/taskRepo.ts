import { ORDER_STEP, type TaskStatus } from '@/domain/constants'
import { sortByOrder } from '@/domain/order'
import type { Task } from '@/domain/schemas'
import { latestTimestamp, nextTimestamp } from '@/domain/sync'
import { applyMove, completedAtFor } from '@/domain/task'
import { createId } from '@/lib/id'
import { EntityNotFoundError, type TaskRepository } from '../repositories'
import { compact, isAlive, markDirty, type ShipyardDB } from './db'

export function createDexieTaskRepository(db: ShipyardDB): TaskRepository {
  async function getAlive(id: string): Promise<Task> {
    const task = await db.tasks.get(id)
    if (!isAlive(task)) throw new EntityNotFoundError('Task', id)
    return task
  }

  async function column(
    projectId: string,
    status: TaskStatus,
    excludeId?: string,
  ): Promise<Task[]> {
    const rows = await db.tasks.where('[projectId+status]').equals([projectId, status]).toArray()
    return sortByOrder(rows.filter((t) => isAlive(t) && t.id !== excludeId))
  }

  async function bottomOrder(
    projectId: string,
    status: TaskStatus,
    excludeId?: string,
  ): Promise<number> {
    const last = (await column(projectId, status, excludeId)).at(-1)
    return last ? last.order + ORDER_STEP : ORDER_STEP
  }

  async function save(task: Task): Promise<Task> {
    const row = compact(task)
    await db.tasks.put(row)
    await markDirty(db, 'tasks', [row])
    return row
  }

  return {
    async listAll() {
      const rows = await db.tasks.toArray()
      return sortByOrder(rows.filter(isAlive))
    },

    async listByProject(projectId) {
      const rows = await db.tasks.where('projectId').equals(projectId).toArray()
      return sortByOrder(rows.filter(isAlive))
    },

    async get(id) {
      const task = await db.tasks.get(id)
      return isAlive(task) ? task : undefined
    },

    create(projectId, input) {
      return db.transaction('rw', db.projects, db.tasks, db.outbox, async () => {
        const project = await db.projects.get(projectId)
        if (!isAlive(project)) throw new EntityNotFoundError('Project', projectId)
        const timestamp = nextTimestamp()
        return save({
          ...input,
          id: createId(),
          projectId,
          order: await bottomOrder(projectId, input.status),
          createdAt: timestamp,
          updatedAt: timestamp,
          completedAt: completedAtFor(undefined, input.status, timestamp),
        })
      })
    },

    update(id, input) {
      return db.transaction('rw', db.tasks, db.outbox, async () => {
        const current = await getAlive(id)
        const { title, description, type, status, priority, effort, icon, dueDate } = input
        const timestamp = nextTimestamp(current.updatedAt)
        const statusChanged = status !== current.status
        return save({
          ...current,
          title,
          description,
          type,
          status,
          priority,
          effort,
          icon,
          dueDate,
          order: statusChanged ? await bottomOrder(current.projectId, status, id) : current.order,
          completedAt: completedAtFor(current, status, timestamp),
          updatedAt: timestamp,
        })
      })
    },

    move(id, status, index) {
      return db.transaction('rw', db.tasks, db.outbox, async () => {
        const current = await getAlive(id)
        const input = [current, ...(await column(current.projectId, status, id))]
        // Newer than every row the move may touch (renumbering updates siblings too).
        const result = applyMove(input, id, status, index, nextTimestamp(latestTimestamp(input)))
        const changed = result.filter((task, i) => task !== input[i]).map(compact)
        await db.tasks.bulkPut(changed)
        await markDirty(db, 'tasks', changed)
        return changed.find((t) => t.id === id)!
      })
    },

    remove(id) {
      return db.transaction('rw', db.tasks, db.outbox, async () => {
        const current = await getAlive(id)
        const timestamp = nextTimestamp(current.updatedAt)
        await save({ ...current, deletedAt: timestamp, updatedAt: timestamp })
      })
    },
  }
}

import { ORDER_STEP } from '@/domain/constants'
import { applyReorder, sortByOrder } from '@/domain/order'
import type { DocItem } from '@/domain/schemas'
import { latestTimestamp, nextTimestamp } from '@/domain/sync'
import { createId } from '@/lib/id'
import { EntityNotFoundError, type DocItemRepository } from '../repositories'
import { compact, isAlive, markDirty, type ShipyardDB } from './db'

export function createDexieDocItemRepository(db: ShipyardDB): DocItemRepository {
  async function getAlive(id: string): Promise<DocItem> {
    const item = await db.docItems.get(id)
    if (!isAlive(item)) throw new EntityNotFoundError('DocItem', id)
    return item
  }

  async function list(projectId: string): Promise<DocItem[]> {
    const rows = await db.docItems.where('projectId').equals(projectId).toArray()
    return sortByOrder(rows.filter(isAlive))
  }

  async function save(item: DocItem): Promise<DocItem> {
    const row = compact(item)
    await db.docItems.put(row)
    await markDirty(db, 'docItems', [row])
    return row
  }

  return {
    listByProject: list,

    async get(id) {
      const item = await db.docItems.get(id)
      return isAlive(item) ? item : undefined
    },

    create(projectId, input) {
      return db.transaction('rw', db.projects, db.docItems, db.outbox, async () => {
        const project = await db.projects.get(projectId)
        if (!isAlive(project)) throw new EntityNotFoundError('Project', projectId)
        const timestamp = nextTimestamp()
        const last = (await list(projectId)).at(-1)
        return save({
          ...input,
          id: createId(),
          projectId,
          order: last ? last.order + ORDER_STEP : ORDER_STEP,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      })
    },

    update(id, input) {
      return db.transaction('rw', db.docItems, db.outbox, async () => {
        const current = await getAlive(id)
        const { type, content, description } = input
        return save({
          ...current,
          type,
          content,
          description,
          updatedAt: nextTimestamp(current.updatedAt),
        })
      })
    },

    move(id, index) {
      return db.transaction('rw', db.docItems, db.outbox, async () => {
        const current = await getAlive(id)
        const items = await list(current.projectId)
        // Newer than every row the move may touch (renumbering updates siblings too).
        const result = applyReorder(items, id, index, nextTimestamp(latestTimestamp(items)))
        const changed = result.filter((item, i) => item !== items[i]).map(compact)
        await db.docItems.bulkPut(changed)
        await markDirty(db, 'docItems', changed)
        return changed.find((item) => item.id === id)!
      })
    },

    remove(id) {
      return db.transaction('rw', db.docItems, db.outbox, async () => {
        const current = await getAlive(id)
        const timestamp = nextTimestamp(current.updatedAt)
        await save({ ...current, deletedAt: timestamp, updatedAt: timestamp })
      })
    },
  }
}

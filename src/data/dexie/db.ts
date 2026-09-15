import { Dexie, type EntityTable } from 'dexie'
import type { Project, Task } from '@/domain/schemas'

export class ShipyardDB extends Dexie {
  projects!: EntityTable<Project, 'id'>
  tasks!: EntityTable<Task, 'id'>

  constructor(name = 'shipyard') {
    super(name)
    this.version(1).stores({
      projects: 'id, updatedAt',
      tasks: 'id, projectId, [projectId+status], updatedAt',
    })
  }
}

export const now = () => new Date().toISOString()

export const isAlive = <T extends { deletedAt?: string }>(row: T | undefined): row is T =>
  !!row && !row.deletedAt

/** Drops keys whose value is `undefined` so optional fields are really absent in storage. */
export function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}

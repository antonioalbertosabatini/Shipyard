import { createDexieBackupRepository } from './dexie/backupRepo'
import { ShipyardDB } from './dexie/db'
import { createDexieProjectRepository } from './dexie/projectRepo'
import { createDexieTaskRepository } from './dexie/taskRepo'
import type { Repositories } from './repositories'

export type * from './repositories'
export { EntityNotFoundError } from './repositories'

/** Local-first storage backed by IndexedDB. */
export function createDexieRepositories(db = new ShipyardDB()): Repositories {
  return {
    projects: createDexieProjectRepository(db),
    tasks: createDexieTaskRepository(db),
    backup: createDexieBackupRepository(db),
  }
}

/** Single switch point for the storage backend (e.g. a remote API in the future). */
export function createRepositories(): Repositories {
  return createDexieRepositories()
}

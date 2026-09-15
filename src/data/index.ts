import type { SupabaseClient } from '@supabase/supabase-js'
import { createDexieBackupRepository } from './dexie/backupRepo'
import { ShipyardDB } from './dexie/db'
import { createDexieProjectRepository } from './dexie/projectRepo'
import { createDexieTaskRepository } from './dexie/taskRepo'
import type { Repositories } from './repositories'
import { SyncEngine } from './sync/SyncEngine'
import { createSupabaseRemote } from './sync/supabaseRemote'
import type { SyncController } from './sync/types'

export type * from './repositories'
export type * from './sync/types'
export { EntityNotFoundError } from './repositories'

/** Local-first storage backed by IndexedDB. */
export function createDexieRepositories(db = new ShipyardDB()): Repositories {
  return {
    projects: createDexieProjectRepository(db),
    tasks: createDexieTaskRepository(db),
    backup: createDexieBackupRepository(db),
  }
}

export interface DataLayer {
  repositories: Repositories
  /** `null` when no remote backend is configured (local-only mode). */
  sync: SyncController | null
}

/** Single switch point for storage: IndexedDB always, plus cloud sync when Supabase is configured. */
export function createDataLayer(supabase: SupabaseClient | null): DataLayer {
  const db = new ShipyardDB()
  return {
    repositories: createDexieRepositories(db),
    sync: supabase ? new SyncEngine(db, createSupabaseRemote(supabase)) : null,
  }
}

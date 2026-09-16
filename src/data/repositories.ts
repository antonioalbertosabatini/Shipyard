/**
 * Storage-agnostic data contracts. The UI only talks to these interfaces,
 * so the IndexedDB implementation can be swapped for a remote backend.
 */
import type { Backup, ImportMode, ImportResult } from '@/domain/backup'
import type { TaskStatus } from '@/domain/constants'
import type {
  DocItem,
  DocItemInput,
  Project,
  ProjectInput,
  Task,
  TaskInput,
} from '@/domain/schemas'

export interface ProjectRepository {
  list(): Promise<Project[]>
  get(id: string): Promise<Project | undefined>
  create(input: ProjectInput): Promise<Project>
  update(id: string, input: ProjectInput): Promise<Project>
  setArchived(id: string, archived: boolean): Promise<Project>
  /** Removes the project together with all of its tasks and documentation items. */
  remove(id: string): Promise<void>
}

export interface TaskRepository {
  listAll(): Promise<Task[]>
  listByProject(projectId: string): Promise<Task[]>
  get(id: string): Promise<Task | undefined>
  /** Creates the task at the bottom of its status column. */
  create(projectId: string, input: TaskInput): Promise<Task>
  /** Updates editable fields; a status change moves the task to the bottom of the new column. */
  update(id: string, input: TaskInput): Promise<Task>
  /** Moves the task to `status` at position `index` within that column. */
  move(id: string, status: TaskStatus, index: number): Promise<Task>
  remove(id: string): Promise<void>
}

/** Documentation items of a project: a flat, manually ordered list of links, commands and notes. */
export interface DocItemRepository {
  listByProject(projectId: string): Promise<DocItem[]>
  get(id: string): Promise<DocItem | undefined>
  /** Creates the item at the bottom of the project's list. */
  create(projectId: string, input: DocItemInput): Promise<DocItem>
  update(id: string, input: DocItemInput): Promise<DocItem>
  /** Moves the item to position `index`, counted without the moved item. */
  move(id: string, index: number): Promise<DocItem>
  remove(id: string): Promise<void>
}

export interface BackupRepository {
  exportAll(): Promise<Backup>
  /** `replace` stamps imported rows as the newest version so they win on synced devices too. */
  importAll(backup: Backup, mode: ImportMode): Promise<ImportResult>
  /** Soft-deletes every row, so the reset propagates through sync. */
  clearAll(): Promise<void>
}

export interface Repositories {
  projects: ProjectRepository
  tasks: TaskRepository
  docItems: DocItemRepository
  backup: BackupRepository
}

export class EntityNotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`)
    this.name = 'EntityNotFoundError'
  }
}

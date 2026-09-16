/** Conversions between local entities (camelCase, absent optionals) and Supabase rows (snake_case, nulls). */
import { projectSchema, taskSchema, type Project, type Task } from '@/domain/schemas'
import { normalizeTimestamp } from '@/domain/sync'
import { compact } from '../dexie/db'

/** Columns of `public.projects` written by clients (`user_id` and `synced_at` are set by the server). */
export interface ProjectRow {
  id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  repo_url: string | null
  live_url: string | null
  archived: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Columns of `public.tasks` written by clients. */
export interface TaskRow {
  id: string
  project_id: string
  title: string
  description: string | null
  type: string
  status: string
  priority: string
  effort: string | null
  icon: string | null
  due_date: string | null
  order: number
  created_at: string
  updated_at: string
  completed_at: string | null
  deleted_at: string | null
}

/** A row returned by a pull, carrying the server-assigned cursor. */
export type Pulled<T> = T & { synced_at: string }

const optionalTimestamp = (value: string | null) => (value ? normalizeTimestamp(value) : undefined)

export const projectToRow = (project: Project): ProjectRow => ({
  id: project.id,
  name: project.name,
  description: project.description ?? null,
  color: project.color,
  icon: project.icon ?? null,
  repo_url: project.repoUrl ?? null,
  live_url: project.liveUrl ?? null,
  archived: project.archived,
  created_at: project.createdAt,
  updated_at: project.updatedAt,
  deleted_at: project.deletedAt ?? null,
})

export const taskToRow = (task: Task): TaskRow => ({
  id: task.id,
  project_id: task.projectId,
  title: task.title,
  description: task.description ?? null,
  type: task.type,
  status: task.status,
  priority: task.priority,
  effort: task.effort ?? null,
  icon: task.icon ?? null,
  due_date: task.dueDate ?? null,
  order: task.order,
  created_at: task.createdAt,
  updated_at: task.updatedAt,
  completed_at: task.completedAt ?? null,
  deleted_at: task.deletedAt ?? null,
})

/** Remote row → local project, or `null` when the row fails validation. */
export function rowToProject(row: ProjectRow): Project | null {
  const result = projectSchema.safeParse(
    compact({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      color: row.color,
      icon: row.icon ?? undefined,
      repoUrl: row.repo_url ?? undefined,
      liveUrl: row.live_url ?? undefined,
      archived: row.archived,
      createdAt: normalizeTimestamp(row.created_at),
      updatedAt: normalizeTimestamp(row.updated_at),
      deletedAt: optionalTimestamp(row.deleted_at),
    }),
  )
  return result.success ? compact(result.data) : null
}

/** Remote row → local task, or `null` when the row fails validation. */
export function rowToTask(row: TaskRow): Task | null {
  const result = taskSchema.safeParse(
    compact({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description ?? undefined,
      type: row.type,
      status: row.status,
      priority: row.priority,
      effort: row.effort ?? undefined,
      icon: row.icon ?? undefined,
      dueDate: row.due_date ?? undefined,
      order: row.order,
      createdAt: normalizeTimestamp(row.created_at),
      updatedAt: normalizeTimestamp(row.updated_at),
      completedAt: optionalTimestamp(row.completed_at),
      deletedAt: optionalTimestamp(row.deleted_at),
    }),
  )
  return result.success ? compact(result.data) : null
}

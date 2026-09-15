import { z } from 'zod'
import { projectSchema, taskSchema, type Project, type Task } from './schemas'

export const BACKUP_VERSION = 1

export const backupSchema = z
  .object({
    app: z.literal('shipyard'),
    version: z.literal(BACKUP_VERSION),
    exportedAt: z.iso.datetime({ offset: true }),
    projects: z.array(projectSchema),
    tasks: z.array(taskSchema),
  })
  .superRefine((backup, ctx) => {
    const projectIds = new Set(backup.projects.map((p) => p.id))
    backup.tasks.forEach((task, index) => {
      if (!projectIds.has(task.projectId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['tasks', index, 'projectId'],
          message: `Task "${task.title}" references a project that is not in the backup`,
        })
      }
    })
  })

export type Backup = z.infer<typeof backupSchema>

export type ImportMode = 'replace' | 'merge'

export interface ImportResult {
  projects: number
  tasks: number
}

export function buildBackup(projects: Project[], tasks: Task[], now = new Date()): Backup {
  return {
    app: 'shipyard',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    projects,
    tasks,
  }
}

export type ParseBackupResult =
  | { success: true; data: Backup }
  | { success: false; error: string }

/** Parses and validates raw JSON text coming from a backup file. */
export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { success: false, error: 'The file is not valid JSON.' }
  }
  const result = backupSchema.safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue?.path.length ? ` (at ${issue.path.join('.')})` : ''
    return { success: false, error: `Invalid backup file: ${issue?.message ?? 'unknown error'}${where}` }
  }
  return { success: true, data: result.data }
}

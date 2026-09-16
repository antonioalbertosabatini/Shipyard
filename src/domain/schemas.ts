import { z } from 'zod'
import { TASK_EFFORTS, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from './constants'

const id = z.string().min(1)
const timestamp = z.iso.datetime({ offset: true })
/** Only web links: rejects `javascript:` and other schemes that would be unsafe in an `href`. */
export const webUrlSchema = z.url({ protocol: /^https?$/ })
/** Key into the icon registry. Not an enum: an unknown key must not invalidate a synced row. */
export const iconNameSchema = z.string().trim().min(1).max(40)

export const taskTypeSchema = z.enum(TASK_TYPES)
export const taskStatusSchema = z.enum(TASK_STATUSES)
export const taskPrioritySchema = z.enum(TASK_PRIORITIES)
export const taskEffortSchema = z.enum(TASK_EFFORTS)

/** Fields a user can edit on a project. */
export const projectInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  icon: iconNameSchema.optional(),
  repoUrl: webUrlSchema.optional(),
  liveUrl: webUrlSchema.optional(),
})

export const projectSchema = projectInputSchema.extend({
  id,
  archived: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp.optional(),
})

/** Fields a user can edit on a task. */
export const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10000).optional(),
  type: taskTypeSchema,
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  effort: taskEffortSchema.optional(),
  icon: iconNameSchema.optional(),
  /** Calendar date, `YYYY-MM-DD`. */
  dueDate: z.iso.date().optional(),
})

export const taskSchema = taskInputSchema.extend({
  id,
  projectId: id,
  order: z.number(),
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: timestamp.optional(),
  deletedAt: timestamp.optional(),
})

export type ProjectInput = z.infer<typeof projectInputSchema>
export type Project = z.infer<typeof projectSchema>
export type TaskInput = z.infer<typeof taskInputSchema>
export type Task = z.infer<typeof taskSchema>

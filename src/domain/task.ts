import type { TaskStatus } from './constants'
import { positionIn, sortByOrder } from './order'
import type { Task } from './schemas'

/**
 * Returns the `completedAt` value a task should have after moving to `status`.
 * Entering `done` stamps the time; leaving it clears the stamp.
 */
export function completedAtFor(
  task: Pick<Task, 'status' | 'completedAt'> | undefined,
  status: TaskStatus,
  now: string,
): string | undefined {
  if (status !== 'done') return undefined
  if (task?.status === 'done' && task.completedAt) return task.completedAt
  return now
}

/**
 * Moves a task to `status` at position `index` of that column (index counted without the task).
 * Returns a new array in the same order as `tasks`; only tasks that changed are new objects,
 * so callers can detect which rows to persist by reference.
 */
export function applyMove(
  tasks: Task[],
  taskId: string,
  status: TaskStatus,
  index: number,
  now: string,
): Task[] {
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return tasks

  const siblings = sortByOrder(
    tasks.filter((t) => t.projectId === task.projectId && t.status === status && t.id !== taskId),
  )
  const moved: Task = {
    ...task,
    status,
    completedAt: completedAtFor(task, status, now),
    updatedAt: now,
  }

  const replacements = positionIn(siblings, moved, index, now)
  return tasks.map((t) => replacements.get(t.id) ?? t)
}

export function isOverdue(task: Pick<Task, 'dueDate' | 'status'>, today: string): boolean {
  return !!task.dueDate && task.status !== 'done' && task.dueDate < today
}

import { ORDER_STEP, type TaskStatus } from './constants'
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

export function sortByOrder<T extends Pick<Task, 'order'>>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => a.order - b.order)
}

/** Minimum distance between neighbours before a column gets renumbered. */
const MIN_GAP = 1e-6

export const clampIndex = (index: number, length: number) => Math.max(0, Math.min(index, length))

export type OrderPlacement =
  | { kind: 'order'; order: number }
  /** Neighbours are too close: renumber the whole column. */
  | { kind: 'rebalance' }

/**
 * Computes the `order` for an item inserted at `index` into `siblings`
 * (already sorted, not containing the moved item).
 */
export function placeAt(siblings: Pick<Task, 'order'>[], index: number): OrderPlacement {
  const clamped = clampIndex(index, siblings.length)
  const before = siblings[clamped - 1]?.order
  const after = siblings[clamped]?.order

  if (before === undefined && after === undefined) return { kind: 'order', order: ORDER_STEP }
  if (before === undefined) return { kind: 'order', order: after! - ORDER_STEP }
  if (after === undefined) return { kind: 'order', order: before + ORDER_STEP }
  if (after - before < MIN_GAP) return { kind: 'rebalance' }
  return { kind: 'order', order: (before + after) / 2 }
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

  const replacements = new Map<string, Task>()
  const placement = placeAt(siblings, index)
  if (placement.kind === 'order') {
    replacements.set(taskId, { ...moved, order: placement.order })
  } else {
    const column = [...siblings]
    column.splice(clampIndex(index, siblings.length), 0, moved)
    column.forEach((t, i) => {
      const order = (i + 1) * ORDER_STEP
      if (t === moved || t.order !== order) replacements.set(t.id, { ...t, order, updatedAt: now })
    })
  }

  return tasks.map((t) => replacements.get(t.id) ?? t)
}

export function isOverdue(task: Pick<Task, 'dueDate' | 'status'>, today: string): boolean {
  return !!task.dueDate && task.status !== 'done' && task.dueDate < today
}

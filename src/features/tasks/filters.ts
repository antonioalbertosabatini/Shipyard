import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskType,
} from '@/domain/constants'
import type { Task } from '@/domain/schemas'

export interface TaskFilters {
  q: string
  type: TaskType | 'all'
  priority: TaskPriority | 'all'
}

export const hasActiveFilters = (filters: TaskFilters) =>
  filters.q.trim() !== '' || filters.type !== 'all' || filters.priority !== 'all'

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  if (!hasActiveFilters(filters)) return tasks
  const q = filters.q.trim().toLowerCase()
  return tasks.filter(
    (task) =>
      (filters.type === 'all' || task.type === filters.type) &&
      (filters.priority === 'all' || task.priority === filters.priority) &&
      (!q ||
        task.title.toLowerCase().includes(q) ||
        !!task.description?.toLowerCase().includes(q)),
  )
}

export type TaskSortKey = 'title' | 'status' | 'priority' | 'dueDate' | 'updatedAt'
export type SortDirection = 'asc' | 'desc'

const comparators: Record<TaskSortKey, (a: Task, b: Task) => number> = {
  title: (a, b) => a.title.localeCompare(b.title),
  status: (a, b) => TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status),
  priority: (a, b) => TASK_PRIORITIES.indexOf(a.priority) - TASK_PRIORITIES.indexOf(b.priority),
  dueDate: (a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''),
  updatedAt: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
}

export function sortTasks(tasks: Task[], key: TaskSortKey, direction: SortDirection): Task[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...tasks].sort((a, b) => {
    // Tasks without a due date always go last.
    if (key === 'dueDate' && !a.dueDate !== !b.dueDate) return a.dueDate ? -1 : 1
    return sign * comparators[key](a, b) || a.order - b.order
  })
}

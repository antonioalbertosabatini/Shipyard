export const TASK_TYPES = ['feature', 'bugfix', 'improvement', 'chore', 'other'] as const
export const TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'done'] as const
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
/** T-shirt sizes, from the smallest to the largest estimate. */
export const TASK_EFFORTS = ['xs', 's', 'm', 'l', 'xl'] as const

/** What a documentation item holds: a web link, a shell command or a plain note. */
export const DOC_ITEM_TYPES = ['link', 'command', 'info'] as const

export type TaskType = (typeof TASK_TYPES)[number]
export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export type TaskEffort = (typeof TASK_EFFORTS)[number]
export type DocItemType = (typeof DOC_ITEM_TYPES)[number]

export const PROJECT_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#a855f7',
  '#64748b',
] as const

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0]

/** Gap between consecutive task `order` values when (re)assigning positions. */
export const ORDER_STEP = 1000

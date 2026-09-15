import { arrayMove } from '@dnd-kit/sortable'
import { TASK_STATUSES, type TaskStatus } from '@/domain/constants'
import type { Task } from '@/domain/schemas'
import { sortByOrder } from '@/domain/task'

export type Columns = Record<TaskStatus, Task[]>

const isStatus = (id: string): id is TaskStatus => (TASK_STATUSES as readonly string[]).includes(id)

export function groupByStatus(tasks: Task[]): Columns {
  const columns = Object.fromEntries(TASK_STATUSES.map((s) => [s, [] as Task[]])) as Columns
  for (const task of sortByOrder(tasks)) columns[task.status].push(task)
  return columns
}

/** Resolves a droppable id (a task id or a column status) to its column. */
export function findColumn(columns: Columns, id: string): TaskStatus | undefined {
  if (isStatus(id)) return id
  return TASK_STATUSES.find((status) => columns[status].some((task) => task.id === id))
}

/**
 * While dragging over another column, moves the active card into it next to `overId`.
 * Returns the same object when nothing changes.
 */
export function moveToColumn(
  columns: Columns,
  activeId: string,
  overId: string,
  placeBelow: boolean,
): Columns {
  const from = findColumn(columns, activeId)
  const to = findColumn(columns, overId)
  if (!from || !to || from === to) return columns

  const task = columns[from].find((t) => t.id === activeId)!
  const target = columns[to]
  const overIndex = target.findIndex((t) => t.id === overId)
  const index = overIndex === -1 ? target.length : overIndex + (placeBelow ? 1 : 0)

  return {
    ...columns,
    [from]: columns[from].filter((t) => t.id !== activeId),
    [to]: [...target.slice(0, index), task, ...target.slice(index)],
  }
}

/** On drop, reorders the active card within its column. */
export function reorderInColumn(columns: Columns, activeId: string, overId: string): Columns {
  const status = findColumn(columns, activeId)
  if (!status || findColumn(columns, overId) !== status) return columns

  const items = columns[status]
  const from = items.findIndex((t) => t.id === activeId)
  const to = isStatus(overId) ? items.length - 1 : items.findIndex((t) => t.id === overId)
  if (to === -1 || from === to) return columns
  return { ...columns, [status]: arrayMove(items, from, to) }
}

/**
 * Translates the card's final position in the (possibly filtered) board into a move
 * against the full task list. Returns `null` when the task did not actually move.
 */
export function resolveMove(
  columns: Columns,
  activeId: string,
  allTasks: Task[],
): { status: TaskStatus; index: number } | null {
  const status = findColumn(columns, activeId)
  const original = allTasks.find((t) => t.id === activeId)
  if (!status || !original) return null

  const visible = columns[status]
  const position = visible.findIndex((t) => t.id === activeId)
  const siblings = sortByOrder(allTasks.filter((t) => t.status === status && t.id !== activeId))
  const indexOf = (id: string) => siblings.findIndex((t) => t.id === id)

  const previous = visible[position - 1]
  const next = visible[position + 1]
  const index = previous
    ? indexOf(previous.id) + 1
    : next
      ? Math.max(0, indexOf(next.id))
      : siblings.length

  if (original.status === status) {
    const currentIndex = sortByOrder(allTasks.filter((t) => t.status === status)).findIndex(
      (t) => t.id === activeId,
    )
    if (currentIndex === index) return null
  }
  return { status, index }
}

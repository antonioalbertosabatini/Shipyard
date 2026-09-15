import {
  TASK_STATUSES,
  TASK_TYPES,
  type TaskStatus,
  type TaskType,
} from '@/domain/constants'
import type { Project, Task } from '@/domain/schemas'
import { isOverdue } from '@/domain/task'
import { addDaysISO } from '@/lib/dates'

export const DUE_SOON_DAYS = 7

export interface ProjectStats {
  total: number
  done: number
  open: number
  /** Completion percentage, 0–100. */
  percent: number
  byStatus: Record<TaskStatus, number>
  byType: Record<TaskType, number>
  overdue: number
  /** Open tasks due within {@link DUE_SOON_DAYS} days (not overdue). */
  dueSoon: number
}

const zeroCounts = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>

export function computeProjectStats(tasks: Task[], today: string): ProjectStats {
  const soonLimit = addDaysISO(today, DUE_SOON_DAYS)
  const stats: ProjectStats = {
    total: tasks.length,
    done: 0,
    open: 0,
    percent: 0,
    byStatus: zeroCounts(TASK_STATUSES),
    byType: zeroCounts(TASK_TYPES),
    overdue: 0,
    dueSoon: 0,
  }

  for (const task of tasks) {
    stats.byStatus[task.status]++
    stats.byType[task.type]++
    if (task.status === 'done') {
      stats.done++
      continue
    }
    stats.open++
    if (isOverdue(task, today)) stats.overdue++
    else if (task.dueDate && task.dueDate <= soonLimit) stats.dueSoon++
  }

  stats.percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0
  return stats
}

export interface Overview {
  activeProjects: number
  openTasks: number
  inProgress: number
  overdue: number
  byProject: Map<string, ProjectStats>
}

export function computeOverview(projects: Project[], tasks: Task[], today: string): Overview {
  // Not using Map.groupBy: older iOS WebViews (Capacitor) lack it.
  const tasksByProject = new Map<string, Task[]>()
  for (const task of tasks) {
    const bucket = tasksByProject.get(task.projectId)
    if (bucket) bucket.push(task)
    else tasksByProject.set(task.projectId, [task])
  }
  const byProject = new Map(
    projects.map((p) => [p.id, computeProjectStats(tasksByProject.get(p.id) ?? [], today)]),
  )
  const active = projects.filter((p) => !p.archived).map((p) => byProject.get(p.id)!)
  const sum = (pick: (s: ProjectStats) => number) => active.reduce((acc, s) => acc + pick(s), 0)

  return {
    activeProjects: active.length,
    openTasks: sum((s) => s.open),
    inProgress: sum((s) => s.byStatus.in_progress),
    overdue: sum((s) => s.overdue),
    byProject,
  }
}

/** Open tasks of the given projects that are overdue or due soon, earliest first. */
export function upcomingDeadlines(
  tasks: Task[],
  projectIds: Set<string>,
  today: string,
  limit = 8,
): Task[] {
  const soonLimit = addDaysISO(today, DUE_SOON_DAYS)
  return tasks
    .filter(
      (t) =>
        t.status !== 'done' && !!t.dueDate && t.dueDate <= soonLimit && projectIds.has(t.projectId),
    )
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    .slice(0, limit)
}

import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { TaskEffort, TaskPriority, TaskStatus, TaskType } from '@/domain/constants'
import type { Task } from '@/domain/schemas'
import { isOverdue } from '@/domain/task'
import { formatDate, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import {
  TASK_EFFORT_STYLES,
  TASK_PRIORITY_STYLES,
  TASK_STATUS_STYLES,
  TASK_TYPE_STYLES,
} from './taskStyles'

export function TaskTypeBadge({ type, count }: { type: TaskType; count?: number }) {
  const { t } = useTranslation()
  const { icon: Icon, className } = TASK_TYPE_STYLES[type]
  return (
    <Badge variant="secondary" className={className}>
      <Icon data-icon="inline-start" />
      {t(`task.type.${type}`)}
      {count !== undefined && <span className="tabular-nums opacity-70">{count}</span>}
    </Badge>
  )
}

export function PriorityIcon({
  priority,
  withLabel = false,
}: {
  priority: TaskPriority
  withLabel?: boolean
}) {
  const { t } = useTranslation()
  const { icon: Icon, className } = TASK_PRIORITY_STYLES[priority]
  const label = t(`task.priority.${priority}`)
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)} title={label}>
      <Icon className="size-3.5" aria-hidden />
      <span className={withLabel ? 'text-foreground' : 'sr-only'}>{label}</span>
    </span>
  )
}

export function EffortBadge({
  effort,
  withLabel = false,
}: {
  effort: TaskEffort
  withLabel?: boolean
}) {
  const { t } = useTranslation()
  const { short, className } = TASK_EFFORT_STYLES[effort]
  const label = t(`task.effort.${effort}`)
  return (
    <Badge variant="secondary" className={cn('font-mono', className)} title={label}>
      {short}
      <span className={withLabel ? 'font-sans' : 'sr-only'}>{label}</span>
    </Badge>
  )
}

export function StatusLabel({
  status,
  iconOnly = false,
}: {
  status: TaskStatus
  iconOnly?: boolean
}) {
  const { t } = useTranslation()
  const { icon: Icon, className } = TASK_STATUS_STYLES[status]
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className={cn('size-4 shrink-0', className)} aria-hidden />
      <span className={iconOnly ? 'sr-only' : undefined}>{t(`task.status.${status}`)}</span>
    </span>
  )
}

export function DueDate({ task }: { task: Pick<Task, 'dueDate' | 'status'> }) {
  const { t, i18n } = useTranslation()
  if (!task.dueDate) return null
  const overdue = isOverdue(task, todayISO())
  const date = formatDate(task.dueDate, i18n.language)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
      )}
      title={t(overdue ? 'task.overdue' : 'task.due', { date })}
    >
      <CalendarDays className="size-3.5" aria-hidden />
      {date}
    </span>
  )
}

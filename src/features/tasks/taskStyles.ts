import {
  ArrowDown,
  ArrowUp,
  Bug,
  ChevronsUp,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  Minus,
  Shapes,
  Sparkles,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { TaskPriority, TaskStatus, TaskType } from '@/domain/constants'

interface Style {
  icon: LucideIcon
  className: string
}

export const TASK_TYPE_STYLES: Record<TaskType, Style> = {
  feature: { icon: Sparkles, className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  bugfix: { icon: Bug, className: 'bg-red-500/10 text-red-700 dark:text-red-300' },
  improvement: { icon: TrendingUp, className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  chore: { icon: Wrench, className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  other: { icon: Shapes, className: 'bg-muted text-muted-foreground' },
}

export const TASK_PRIORITY_STYLES: Record<TaskPriority, Style> = {
  low: { icon: ArrowDown, className: 'text-muted-foreground' },
  medium: { icon: Minus, className: 'text-sky-600 dark:text-sky-400' },
  high: { icon: ArrowUp, className: 'text-orange-600 dark:text-orange-400' },
  critical: { icon: ChevronsUp, className: 'text-red-600 dark:text-red-400' },
}

export const TASK_STATUS_STYLES: Record<TaskStatus, Style> = {
  backlog: { icon: CircleDashed, className: 'text-muted-foreground' },
  todo: { icon: Circle, className: 'text-sky-600 dark:text-sky-400' },
  in_progress: { icon: CircleDot, className: 'text-amber-600 dark:text-amber-400' },
  done: { icon: CircleCheck, className: 'text-emerald-600 dark:text-emerald-400' },
}

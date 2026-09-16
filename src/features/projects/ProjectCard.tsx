import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { EntityIcon } from '@/components/EntityIcon'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TASK_STATUSES, TASK_TYPES } from '@/domain/constants'
import type { Project } from '@/domain/schemas'
import type { ProjectStats } from '@/features/dashboard/stats'
import { StatusLabel, TaskTypeBadge } from '@/features/tasks/TaskBadges'
import { ProjectActionsMenu } from './ProjectActionsMenu'

export function ProjectCard({ project, stats }: { project: Project; stats: ProjectStats }) {
  const { t } = useTranslation()

  return (
    <Card className="relative pt-5 transition hover:ring-foreground/25">
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: project.color }} />
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          <EntityIcon
            name={project.icon}
            className="size-4.5 shrink-0"
            style={{ color: project.color }}
          />
          <Link
            to={`/projects/${project.id}`}
            className="truncate outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {project.name}
          </Link>
          {project.archived && <Badge variant="outline">{t('project.archivedBadge')}</Badge>}
        </CardTitle>
        {project.description && (
          <CardDescription className="line-clamp-2">{project.description}</CardDescription>
        )}
        <CardAction className="relative z-10">
          <ProjectActionsMenu project={project} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {stats.total
                ? t('project.progress', { done: stats.done, total: stats.total })
                : t('project.noTasks')}
            </span>
            <span className="font-medium text-foreground tabular-nums">{stats.percent}%</span>
          </div>
          <Progress value={stats.percent} className="h-1.5" />
        </div>

        <div className="grid grid-cols-4 gap-1 text-xs">
          {TASK_STATUSES.map((status) => (
            <div key={status} className="flex items-center gap-1 text-muted-foreground">
              <StatusLabel status={status} iconOnly />
              <span className="tabular-nums">{stats.byStatus[status]}</span>
            </div>
          ))}
        </div>

        {(stats.total > 0 || stats.overdue > 0 || stats.dueSoon > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {TASK_TYPES.filter((type) => stats.byType[type] > 0).map((type) => (
              <TaskTypeBadge key={type} type={type} count={stats.byType[type]} />
            ))}
            {stats.overdue > 0 && (
              <span className="ml-auto text-xs font-medium text-destructive">
                {t('dashboard.overdueCount', { count: stats.overdue })}
              </span>
            )}
            {stats.overdue === 0 && stats.dueSoon > 0 && (
              <span className="ml-auto text-xs text-amber-600 dark:text-amber-400">
                {t('dashboard.dueSoonCount', { count: stats.dueSoon })}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import {
  CalendarClock,
  CircleDot,
  FolderKanban,
  FolderPlus,
  ListTodo,
  Plus,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjects } from '@/features/projects/hooks'
import { ProjectCard } from '@/features/projects/ProjectCard'
import { ProjectFormDialog } from '@/features/projects/ProjectFormDialog'
import { useAllTasks } from '@/features/tasks/hooks'
import { DueDate, TaskTypeBadge } from '@/features/tasks/TaskBadges'
import { todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { computeOverview, upcomingDeadlines } from './stats'

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: LucideIcon
  tone?: string
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <span className={cn('flex size-9 items-center justify-center rounded-lg bg-muted', tone)}>
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-heading text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const { data: projects } = useProjects()
  const { data: tasks } = useAllTasks()

  const data = useMemo(() => {
    if (!projects || !tasks) return undefined
    const today = todayISO()
    const active = projects.filter((p) => !p.archived)
    return {
      active,
      overview: computeOverview(projects, tasks, today),
      deadlines: upcomingDeadlines(tasks, new Set(active.map((p) => p.id)), today),
      projectsById: new Map(projects.map((p) => [p.id, p])),
    }
  }, [projects, tasks])

  const newProjectButton = (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus data-icon="inline-start" />
      {t('project.new')}
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('nav.dashboard')}
        description={t('dashboard.description')}
        actions={data?.active.length ? newProjectButton : undefined}
      />

      {!data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : data.active.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderPlus />
            </EmptyMedia>
            <EmptyTitle>{t('project.empty.title')}</EmptyTitle>
            <EmptyDescription>{t('project.empty.description')}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newProjectButton}</EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label={t('dashboard.stats.activeProjects')}
              value={data.overview.activeProjects}
              icon={FolderKanban}
            />
            <StatTile
              label={t('dashboard.stats.openTasks')}
              value={data.overview.openTasks}
              icon={ListTodo}
              tone="text-sky-600 dark:text-sky-400"
            />
            <StatTile
              label={t('dashboard.stats.inProgress')}
              value={data.overview.inProgress}
              icon={CircleDot}
              tone="text-amber-600 dark:text-amber-400"
            />
            <StatTile
              label={t('dashboard.stats.overdue')}
              value={data.overview.overdue}
              icon={TriangleAlert}
              tone={data.overview.overdue ? 'text-destructive' : undefined}
            />
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-3">
            <section className="flex flex-col gap-3 xl:col-span-2">
              <h2 className="font-heading text-lg font-medium">{t('dashboard.projects')}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {data.active.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    stats={data.overview.byProject.get(project.id)!}
                  />
                ))}
              </div>
            </section>

            <Card className="xl:mt-10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="size-4" />
                  {t('dashboard.deadlines')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.deadlines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('dashboard.noDeadlines')}</p>
                ) : (
                  <ul className="-mx-2 flex flex-col">
                    {data.deadlines.map((task) => {
                      const project = data.projectsById.get(task.projectId)
                      return (
                        <li key={task.id}>
                          <Link
                            to={`/projects/${task.projectId}`}
                            className="flex flex-col gap-1 rounded-md px-2 py-2 hover:bg-muted"
                          >
                            <span className="truncate font-medium">{task.title}</span>
                            <span className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: project?.color }}
                              />
                              <span className="truncate">{project?.name}</span>
                              <span className="ml-auto flex shrink-0 items-center gap-2">
                                <TaskTypeBadge type={task.type} />
                                <DueDate task={task} />
                              </span>
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(project) => navigate(`/projects/${project.id}`)}
      />
    </div>
  )
}

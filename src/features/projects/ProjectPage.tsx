import { ArrowLeft, Columns3, GitBranch, Globe, List, ListTodo, Plus, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TaskStatus } from '@/domain/constants'
import type { Task } from '@/domain/schemas'
import { computeProjectStats } from '@/features/dashboard/stats'
import { filterTasks, hasActiveFilters } from '@/features/tasks/filters'
import { useProjectTasks } from '@/features/tasks/hooks'
import { KanbanBoard } from '@/features/tasks/KanbanBoard'
import { TaskFiltersBar } from '@/features/tasks/TaskFiltersBar'
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog'
import { TaskList } from '@/features/tasks/TaskList'
import { useProjectView } from '@/features/tasks/useProjectView'
import { todayISO } from '@/lib/dates'
import { useProject } from './hooks'
import { ProjectActionsMenu } from './ProjectActionsMenu'
import { ProjectGlyph } from './ProjectGlyph'

interface TaskDialogState {
  open: boolean
  task?: Task
  status?: TaskStatus
}

export function ProjectPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId = '' } = useParams()
  const projectQuery = useProject(projectId)
  const tasksQuery = useProjectTasks(projectId)
  const { view, filters, update } = useProjectView()
  const [taskDialog, setTaskDialog] = useState<TaskDialogState>({ open: false })

  const allTasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data])
  const visibleTasks = useMemo(() => filterTasks(allTasks, filters), [allTasks, filters])
  const stats = useMemo(() => computeProjectStats(allTasks, todayISO()), [allTasks])

  const openTask = (task: Task) => setTaskDialog({ open: true, task })
  const createTask = (status: TaskStatus = 'todo') => setTaskDialog({ open: true, status })

  if (projectQuery.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const project = projectQuery.data
  if (!project) {
    return (
      <Empty className="min-h-[60dvh]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>{t('project.notFoundTitle')}</EmptyTitle>
          <EmptyDescription>{t('project.notFoundDescription')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link to="/projects">{t('project.backToProjects')}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/projects">
            <ArrowLeft data-icon="inline-start" />
            {t('nav.projects')}
          </Link>
        </Button>

        <PageHeader
          leading={
            <ProjectGlyph project={project} className="mt-1 size-6" dotClassName="mt-2.5 size-3" />
          }
          title={
            <span className="flex flex-wrap items-center gap-2">
              {project.name}
              {project.archived && <Badge variant="outline">{t('project.archivedBadge')}</Badge>}
            </span>
          }
          description={project.description}
          actions={
            <>
              {project.repoUrl && (
                <Button variant="outline" asChild>
                  <a href={project.repoUrl} target="_blank" rel="noreferrer">
                    <GitBranch data-icon="inline-start" />
                    {t('project.repository')}
                  </a>
                </Button>
              )}
              {project.liveUrl && (
                <Button variant="outline" asChild>
                  <a href={project.liveUrl} target="_blank" rel="noreferrer">
                    <Globe data-icon="inline-start" />
                    {t('project.liveSite')}
                  </a>
                </Button>
              )}
              <Button onClick={() => createTask()}>
                <Plus data-icon="inline-start" />
                {t('task.new')}
              </Button>
              <ProjectActionsMenu project={project} onDelete={() => navigate('/projects')} />
            </>
          }
        />

        <div className="flex max-w-md flex-col gap-1.5">
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
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={view} onValueChange={(value) => update({ view: value as typeof view })}>
          <TabsList aria-label={t('task.view.label')}>
            <TabsTrigger value="board">
              <Columns3 />
              {t('task.view.board')}
            </TabsTrigger>
            <TabsTrigger value="list">
              <List />
              {t('task.view.list')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <TaskFiltersBar filters={filters} onChange={update} />
      </div>

      {tasksQuery.isPending ? (
        <Skeleton className="h-96" />
      ) : allTasks.length === 0 ? (
        <Empty className="border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListTodo />
            </EmptyMedia>
            <EmptyTitle>{t('task.empty.title')}</EmptyTitle>
            <EmptyDescription>{t('task.empty.description')}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => createTask()}>
              <Plus data-icon="inline-start" />
              {t('task.new')}
            </Button>
          </EmptyContent>
        </Empty>
      ) : view === 'list' && visibleTasks.length === 0 && hasActiveFilters(filters) ? (
        <Empty className="border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{t('task.noResults.title')}</EmptyTitle>
            <EmptyDescription>{t('task.noResults.description')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : view === 'board' ? (
        <KanbanBoard
          projectId={project.id}
          tasks={visibleTasks}
          allTasks={allTasks}
          onOpenTask={openTask}
          onCreateTask={createTask}
        />
      ) : (
        <TaskList tasks={visibleTasks} onOpenTask={openTask} />
      )}

      <TaskFormDialog
        projectId={project.id}
        open={taskDialog.open}
        onOpenChange={(open) => setTaskDialog((state) => ({ ...state, open }))}
        task={taskDialog.task}
        defaultStatus={taskDialog.status}
      />
    </div>
  )
}

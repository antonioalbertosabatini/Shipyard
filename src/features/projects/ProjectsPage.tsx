import { Archive, FolderPlus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { computeOverview } from '@/features/dashboard/stats'
import { useAllTasks } from '@/features/tasks/hooks'
import { todayISO } from '@/lib/dates'
import { useProjects } from './hooks'
import { ProjectCard } from './ProjectCard'
import { ProjectFormDialog } from './ProjectFormDialog'

type Filter = 'active' | 'archived'

export function ProjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('active')
  const [createOpen, setCreateOpen] = useState(false)
  const { data: projects } = useProjects()
  const { data: tasks } = useAllTasks()

  const overview = useMemo(
    () => (projects && tasks ? computeOverview(projects, tasks, todayISO()) : undefined),
    [projects, tasks],
  )
  const visible = projects?.filter((p) => p.archived === (filter === 'archived')) ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('nav.projects')}
        description={t('project.listDescription')}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            {t('project.new')}
          </Button>
        }
      />

      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        value={filter}
        onValueChange={(value) => value && setFilter(value as Filter)}
        aria-label={t('project.filter.label')}
      >
        <ToggleGroupItem value="active">{t('project.filter.active')}</ToggleGroupItem>
        <ToggleGroupItem value="archived">{t('project.filter.archived')}</ToggleGroupItem>
      </ToggleGroup>

      {!overview ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Empty className="border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">{filter === 'active' ? <FolderPlus /> : <Archive />}</EmptyMedia>
            <EmptyTitle>
              {t(filter === 'active' ? 'project.empty.title' : 'project.emptyArchived.title')}
            </EmptyTitle>
            <EmptyDescription>
              {t(
                filter === 'active'
                  ? 'project.empty.description'
                  : 'project.emptyArchived.description',
              )}
            </EmptyDescription>
          </EmptyHeader>
          {filter === 'active' && (
            <EmptyContent>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus data-icon="inline-start" />
                {t('project.new')}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              stats={overview.byProject.get(project.id)!}
            />
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(project) => navigate(`/projects/${project.id}`)}
      />
    </div>
  )
}

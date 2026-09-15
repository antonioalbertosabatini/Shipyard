import { Archive, ArchiveRestore, Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Project } from '@/domain/schemas'
import { useDeleteProject, useSetProjectArchived } from './hooks'
import { ProjectFormDialog } from './ProjectFormDialog'

const ignore = () => {}

export function ProjectActionsMenu({
  project,
  onDelete,
}: {
  project: Project
  /** Called right before deletion starts, e.g. to leave the project page. */
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const setArchived = useSetProjectArchived()
  const remove = useDeleteProject()

  const toggleArchived = () =>
    setArchived
      .mutateAsync({ id: project.id, archived: !project.archived })
      .then(() => toast.success(t(project.archived ? 'project.restored' : 'project.archived')))
      .catch(ignore)

  const confirmDelete = () => {
    onDelete?.()
    remove
      .mutateAsync(project.id)
      .then(() => toast.success(t('project.deleted')))
      .catch(ignore)
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('common.moreActions')}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            {t('common.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleArchived}>
            {project.archived ? <ArchiveRestore /> : <Archive />}
            {t(project.archived ? 'project.restore' : 'project.archive')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('project.deleteTitle', { name: project.name })}
        description={t('project.deleteDescription')}
        onConfirm={confirmDelete}
      />
    </>
  )
}

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { BookText, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import type { DocItem } from '@/domain/schemas'
import { DocItemCard } from './DocItemCard'
import { useMoveDocItem, useProjectDocItems } from './hooks'

export function DocList({
  projectId,
  onOpenItem,
  onCreate,
}: {
  projectId: string
  onOpenItem: (item: DocItem) => void
  onCreate: () => void
}) {
  const { t } = useTranslation()
  const query = useProjectDocItems(projectId)
  const move = useMoveDocItem(projectId)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Press and hold on touch, so the page can still be scrolled.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (query.isPending) return <Skeleton className="h-64" />

  const items = query.data ?? []
  if (items.length === 0) {
    return (
      <Empty className="border py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookText />
          </EmptyMedia>
          <EmptyTitle>{t('doc.empty.title')}</EmptyTitle>
          <EmptyDescription>{t('doc.empty.description')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onCreate}>
            <Plus data-icon="inline-start" />
            {t('doc.new')}
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    // The index of the item being passed is also the target position once the dragged item is out.
    const index = items.findIndex((item) => item.id === over.id)
    if (index >= 0) move(String(active.id), index)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <DocItemCard item={item} onEdit={() => onOpenItem(item)} />
            </li>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

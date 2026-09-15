import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { TASK_STATUSES, type TaskStatus } from '@/domain/constants'
import type { Task } from '@/domain/schemas'
import { cn } from '@/lib/utils'
import {
  groupByStatus,
  moveToColumn,
  reorderInColumn,
  resolveMove,
  type Columns,
} from './boardUtils'
import { useMoveTask } from './hooks'
import { SortableTaskCard, TaskCard } from './TaskCard'
import { TASK_STATUS_STYLES } from './taskStyles'

interface DragState {
  activeId: string
  columns: Columns
}

function KanbanColumn({
  status,
  tasks,
  onOpenTask,
  onCreate,
}: {
  status: TaskStatus
  tasks: Task[]
  onOpenTask: (task: Task) => void
  onCreate: () => void
}) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const { icon: Icon, className } = TASK_STATUS_STYLES[status]
  const label = t(`task.status.${status}`)

  return (
    <section
      aria-label={label}
      className="flex w-[82vw] max-w-80 shrink-0 snap-center flex-col rounded-xl bg-muted/60 md:w-auto md:max-w-none"
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Icon className={cn('size-4', className)} aria-hidden />
        <h2 className="text-sm font-medium">{label}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{tasks.length}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="ml-auto"
          onClick={onCreate}
          aria-label={t('task.addToColumn', { status: label })}
        >
          <Plus />
        </Button>
      </header>
      <SortableContext id={status} items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-32 flex-1 flex-col gap-2 rounded-b-xl px-2 pb-2 transition-colors md:min-h-[55dvh]',
            isOver && 'bg-muted',
          )}
        >
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
          {tasks.length === 0 && (
            <p className="flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              {t('task.emptyColumn')}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  )
}

export function KanbanBoard({
  projectId,
  tasks,
  allTasks,
  onOpenTask,
  onCreateTask,
}: {
  projectId: string
  /** Tasks shown on the board (after filters). */
  tasks: Task[]
  /** Every task of the project, used to compute the persisted position. */
  allTasks: Task[]
  onOpenTask: (task: Task) => void
  onCreateTask: (status: TaskStatus) => void
}) {
  const moveTask = useMoveTask(projectId)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // A short press-and-hold keeps horizontal/vertical scrolling usable on touch screens.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  // Columns are derived from props, except while dragging when we track the preview locally.
  const [drag, setDragState] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const setDrag = (next: DragState | null) => {
    dragRef.current = next
    setDragState(next)
  }

  const idleColumns = useMemo(() => groupByStatus(tasks), [tasks])
  const columns = drag?.columns ?? idleColumns
  const activeTask = drag ? tasks.find((task) => task.id === drag.activeId) : undefined

  const handleDragStart = ({ active }: DragStartEvent) =>
    setDrag({ activeId: String(active.id), columns: idleColumns })

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    const current = dragRef.current
    if (!current || !over) return
    const translated = active.rect.current.translated
    const placeBelow = !!translated && translated.top > over.rect.top + over.rect.height / 2
    const next = moveToColumn(current.columns, String(active.id), String(over.id), placeBelow)
    if (next !== current.columns) setDrag({ ...current, columns: next })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const current = dragRef.current
    setDrag(null)
    if (!current || !over) return
    const activeId = String(active.id)
    const finalColumns = reorderInColumn(current.columns, activeId, String(over.id))
    const move = resolveMove(finalColumns, activeId, allTasks)
    if (move) moveTask({ taskId: activeId, ...move })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDrag(null)}
    >
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columns[status]}
            onOpenTask={onOpenTask}
            onCreate={() => onCreateTask(status)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} className="rotate-2 cursor-grabbing shadow-lg" />}
      </DragOverlay>
    </DndContext>
  )
}

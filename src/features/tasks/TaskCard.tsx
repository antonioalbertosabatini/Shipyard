import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ComponentProps } from 'react'
import type { Task } from '@/domain/schemas'
import { cn } from '@/lib/utils'
import { DueDate, PriorityIcon, TaskTypeBadge } from './TaskBadges'

export function TaskCard({ task, className, ...props }: { task: Task } & ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg bg-card p-3 text-left text-sm shadow-xs ring-1 ring-foreground/10 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    >
      <p className="leading-snug font-medium break-words">{task.title}</p>
      <div className="flex flex-wrap items-center gap-2">
        <TaskTypeBadge type={task.type} />
        <PriorityIcon priority={task.priority} />
        <span className="ml-auto">
          <DueDate task={task} />
        </span>
      </div>
    </div>
  )
}

export function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  return (
    <TaskCard
      ref={setNodeRef}
      task={task}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'cursor-grab transition-shadow hover:ring-foreground/25 active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        listeners?.onKeyDown?.(event)
        if (event.key === 'Enter' && !isDragging) onOpen(task)
      }}
    />
  )
}

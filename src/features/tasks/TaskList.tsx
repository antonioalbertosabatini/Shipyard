import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Task } from '@/domain/schemas'
import { formatDate } from '@/lib/dates'
import { sortTasks, type SortDirection, type TaskSortKey } from './filters'
import { DueDate, PriorityIcon, StatusLabel, TaskTypeBadge } from './TaskBadges'

const COLUMNS: TaskSortKey[] = ['title', 'status', 'priority', 'dueDate', 'updatedAt']

export function TaskList({ tasks, onOpenTask }: { tasks: Task[]; onOpenTask: (task: Task) => void }) {
  const { t, i18n } = useTranslation()
  const [sort, setSort] = useState<{ key: TaskSortKey; direction: SortDirection }>({
    key: 'status',
    direction: 'asc',
  })
  const sorted = useMemo(() => sortTasks(tasks, sort.key, sort.direction), [tasks, sort])

  const toggleSort = (key: TaskSortKey) =>
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((key) => {
              const active = sort.key === key
              const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
              return (
                <TableHead
                  key={key}
                  aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className="first:pl-4"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {t(`task.columns.${key}`)}
                    <Icon className={active ? 'size-3.5' : 'size-3.5 opacity-40'} />
                  </button>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((task) => (
            <TableRow key={task.id} className="cursor-pointer" onClick={() => onOpenTask(task)}>
              <TableCell className="max-w-md pl-4">
                <div className="flex items-center gap-2">
                  <TaskTypeBadge type={task.type} />
                  <button
                    type="button"
                    className="truncate text-left font-medium hover:underline"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpenTask(task)
                    }}
                  >
                    {task.title}
                  </button>
                </div>
              </TableCell>
              <TableCell>
                <StatusLabel status={task.status} />
              </TableCell>
              <TableCell>
                <PriorityIcon priority={task.priority} withLabel />
              </TableCell>
              <TableCell>
                {task.dueDate ? <DueDate task={task} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(task.updatedAt, i18n.language)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

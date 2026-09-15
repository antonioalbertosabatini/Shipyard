import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TASK_PRIORITIES, TASK_TYPES } from '@/domain/constants'
import { hasActiveFilters, type TaskFilters } from './filters'
import { TASK_PRIORITY_STYLES, TASK_TYPE_STYLES } from './taskStyles'

export function TaskFiltersBar({
  filters,
  onChange,
}: {
  filters: TaskFilters
  onChange: (patch: Partial<Record<keyof TaskFilters, string>>) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-56">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={filters.q}
          onChange={(event) => onChange({ q: event.target.value })}
          placeholder={t('task.filters.search')}
          aria-label={t('task.filters.search')}
          className="pl-8"
        />
      </div>

      <Select value={filters.type} onValueChange={(type) => onChange({ type })}>
        <SelectTrigger aria-label={t('task.fields.type')} className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('task.filters.allTypes')}</SelectItem>
          {TASK_TYPES.map((type) => {
            const Icon = TASK_TYPE_STYLES[type].icon
            return (
              <SelectItem key={type} value={type}>
                <Icon />
                {t(`task.type.${type}`)}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(priority) => onChange({ priority })}>
        <SelectTrigger aria-label={t('task.fields.priority')} className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('task.filters.allPriorities')}</SelectItem>
          {TASK_PRIORITIES.map((priority) => {
            const { icon: Icon, className } = TASK_PRIORITY_STYLES[priority]
            return (
              <SelectItem key={priority} value={priority}>
                <Icon className={className} />
                {t(`task.priority.${priority}`)}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {hasActiveFilters(filters) && (
        <Button variant="ghost" onClick={() => onChange({ q: '', type: 'all', priority: 'all' })}>
          <X data-icon="inline-start" />
          {t('task.filters.clear')}
        </Button>
      )}
    </div>
  )
}

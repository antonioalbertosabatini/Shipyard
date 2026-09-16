import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { TASK_PRIORITIES, TASK_TYPES } from '@/domain/constants'
import type { TaskFilters } from './filters'

export type ProjectView = 'board' | 'list' | 'docs'

const VIEWS: readonly ProjectView[] = ['board', 'list', 'docs']

type ViewParams = Partial<{ view: ProjectView; q: string; type: string; priority: string }>

const pick = <T extends string>(value: string | null, allowed: readonly T[]): T | 'all' =>
  allowed.includes(value as T) ? (value as T) : 'all'

/** Board/list/docs view and task filters, kept in the URL so they survive reloads and links. */
export function useProjectView() {
  const [params, setParams] = useSearchParams()

  const requested = params.get('view') as ProjectView | null
  const view: ProjectView = requested && VIEWS.includes(requested) ? requested : 'board'
  const q = params.get('q') ?? ''
  const type = pick(params.get('type'), TASK_TYPES)
  const priority = pick(params.get('priority'), TASK_PRIORITIES)
  const filters = useMemo<TaskFilters>(() => ({ q, type, priority }), [q, type, priority])

  const update = useCallback(
    (patch: ViewParams) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          for (const [key, value] of Object.entries(patch)) {
            const isDefault = !value || value === 'all' || (key === 'view' && value === 'board')
            if (isDefault) next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  return { view, filters, update }
}

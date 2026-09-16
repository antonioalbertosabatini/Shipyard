import { describe, expect, it } from 'vitest'
import type { Task } from '@/domain/schemas'
import { sortTasks } from './filters'

const task = (id: string, effort?: Task['effort'], order = 1000): Task => ({
  id,
  projectId: 'p1',
  title: id,
  type: 'feature',
  status: 'todo',
  priority: 'medium',
  effort,
  order,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
})

const ids = (tasks: Task[]) => tasks.map((t) => t.id)

describe('sortTasks by effort', () => {
  const tasks = [task('none'), task('xl', 'xl'), task('xs', 'xs'), task('m', 'm')]

  it('orders from the smallest to the largest size', () => {
    expect(ids(sortTasks(tasks, 'effort', 'asc'))).toEqual(['xs', 'm', 'xl', 'none'])
  })

  it('keeps estimateless tasks last when reversed', () => {
    expect(ids(sortTasks(tasks, 'effort', 'desc'))).toEqual(['xl', 'm', 'xs', 'none'])
  })
})

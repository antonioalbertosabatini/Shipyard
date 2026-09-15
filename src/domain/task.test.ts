import { describe, expect, it } from 'vitest'
import { ORDER_STEP } from './constants'
import type { Task } from './schemas'
import { applyMove, completedAtFor, isOverdue, placeAt, sortByOrder } from './task'

const orders = (...values: number[]) => values.map((order) => ({ order }))

const makeTask = (id: string, status: Task['status'], order: number): Task => ({
  id,
  projectId: 'p1',
  title: id,
  type: 'feature',
  status,
  priority: 'medium',
  order,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
})

describe('applyMove', () => {
  const now = '2026-09-15T10:00:00.000Z'
  const titles = (tasks: Task[], status: Task['status']) =>
    sortByOrder(tasks.filter((t) => t.status === status)).map((t) => t.id)

  it('moves a task into another column at the given index', () => {
    const tasks = [makeTask('a', 'todo', 1000), makeTask('b', 'done', 1000), makeTask('c', 'done', 2000)]
    const result = applyMove(tasks, 'a', 'done', 1, now)
    expect(titles(result, 'done')).toEqual(['b', 'a', 'c'])
    expect(result[0]).toMatchObject({ status: 'done', completedAt: now, updatedAt: now })
    expect(result[1]).toBe(tasks[1])
  })

  it('renumbers the column when there is no room left', () => {
    const tasks = [makeTask('a', 'todo', 1), makeTask('b', 'todo', 1 + 1e-9), makeTask('c', 'backlog', 5)]
    const result = applyMove(tasks, 'c', 'todo', 1, now)
    expect(titles(result, 'todo')).toEqual(['a', 'c', 'b'])
    expect(result.map((t) => t.order)).toEqual([1000, 3000, 2000])
  })

  it('returns the same array for unknown tasks', () => {
    const tasks = [makeTask('a', 'todo', 1000)]
    expect(applyMove(tasks, 'nope', 'done', 0, now)).toBe(tasks)
  })
})

describe('placeAt', () => {
  it('starts an empty column at ORDER_STEP', () => {
    expect(placeAt([], 0)).toEqual({ kind: 'order', order: ORDER_STEP })
  })

  it('places before the first item', () => {
    expect(placeAt(orders(1000, 2000), 0)).toEqual({ kind: 'order', order: 0 })
  })

  it('places after the last item, clamping large indexes', () => {
    expect(placeAt(orders(1000, 2000), 99)).toEqual({ kind: 'order', order: 3000 })
  })

  it('places between neighbours', () => {
    expect(placeAt(orders(1000, 2000), 1)).toEqual({ kind: 'order', order: 1500 })
  })

  it('asks for a rebalance when neighbours are too close', () => {
    expect(placeAt(orders(1, 1 + 1e-9), 1)).toEqual({ kind: 'rebalance' })
  })
})

describe('completedAtFor', () => {
  const now = '2026-09-15T10:00:00.000Z'
  const earlier = '2026-09-01T10:00:00.000Z'

  it('stamps the time when entering done', () => {
    expect(completedAtFor({ status: 'todo' }, 'done', now)).toBe(now)
    expect(completedAtFor(undefined, 'done', now)).toBe(now)
  })

  it('keeps the original stamp when already done', () => {
    expect(completedAtFor({ status: 'done', completedAt: earlier }, 'done', now)).toBe(earlier)
  })

  it('clears the stamp when leaving done', () => {
    expect(completedAtFor({ status: 'done', completedAt: earlier }, 'todo', now)).toBeUndefined()
  })
})

describe('isOverdue', () => {
  it('is overdue only for open tasks with a past due date', () => {
    expect(isOverdue({ status: 'todo', dueDate: '2026-09-14' }, '2026-09-15')).toBe(true)
    expect(isOverdue({ status: 'todo', dueDate: '2026-09-15' }, '2026-09-15')).toBe(false)
    expect(isOverdue({ status: 'done', dueDate: '2026-09-01' }, '2026-09-15')).toBe(false)
    expect(isOverdue({ status: 'todo' }, '2026-09-15')).toBe(false)
  })
})

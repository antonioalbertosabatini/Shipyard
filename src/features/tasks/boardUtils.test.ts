import { describe, expect, it } from 'vitest'
import type { Task } from '@/domain/schemas'
import { groupByStatus, moveToColumn, reorderInColumn, resolveMove } from './boardUtils'

const task = (id: string, status: Task['status'], order: number): Task => ({
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

const ids = (tasks: Task[]) => tasks.map((t) => t.id)

const all = [
  task('a', 'todo', 1000),
  task('b', 'todo', 2000),
  task('c', 'todo', 3000),
  task('d', 'done', 1000),
]

describe('groupByStatus', () => {
  it('buckets tasks by status in order', () => {
    const columns = groupByStatus([all[2]!, all[0]!, all[3]!])
    expect(ids(columns.todo)).toEqual(['a', 'c'])
    expect(ids(columns.done)).toEqual(['d'])
    expect(columns.backlog).toEqual([])
  })
})

describe('moveToColumn', () => {
  it('moves a card next to the hovered card', () => {
    const columns = moveToColumn(groupByStatus(all), 'a', 'd', false)
    expect(ids(columns.todo)).toEqual(['b', 'c'])
    expect(ids(columns.done)).toEqual(['a', 'd'])
  })

  it('appends when hovering an empty column', () => {
    const columns = moveToColumn(groupByStatus(all), 'a', 'backlog', false)
    expect(ids(columns.backlog)).toEqual(['a'])
  })

  it('keeps the same object when staying in the column', () => {
    const columns = groupByStatus(all)
    expect(moveToColumn(columns, 'a', 'b', false)).toBe(columns)
  })
})

describe('reorderInColumn', () => {
  it('reorders within a column', () => {
    expect(ids(reorderInColumn(groupByStatus(all), 'a', 'c').todo)).toEqual(['b', 'c', 'a'])
  })
})

describe('resolveMove', () => {
  it('returns null when nothing moved', () => {
    expect(resolveMove(groupByStatus(all), 'b', all)).toBeNull()
  })

  it('computes the index for a reorder', () => {
    const columns = reorderInColumn(groupByStatus(all), 'a', 'c')
    expect(resolveMove(columns, 'a', all)).toEqual({ status: 'todo', index: 2 })
  })

  it('maps positions from a filtered board to the full column', () => {
    // Board shows only "a" and "c" in todo; "a" dropped below "c".
    const filtered = groupByStatus([all[0]!, all[2]!])
    const columns = reorderInColumn(filtered, 'a', 'c')
    expect(resolveMove(columns, 'a', all)).toEqual({ status: 'todo', index: 2 })
  })

  it('handles moves to another column', () => {
    const columns = moveToColumn(groupByStatus(all), 'c', 'd', true)
    expect(resolveMove(columns, 'c', all)).toEqual({ status: 'done', index: 1 })
  })
})

import { describe, expect, it } from 'vitest'
import type { Project, Task } from '@/domain/schemas'
import { computeOverview, computeProjectStats, upcomingDeadlines } from './stats'

const ts = '2026-09-01T00:00:00.000Z'
const today = '2026-09-15'

const project = (id: string, archived = false): Project => ({
  id,
  name: id,
  color: '#6366f1',
  archived,
  createdAt: ts,
  updatedAt: ts,
})

let seq = 0
const task = (overrides: Partial<Task>): Task => ({
  id: `t${++seq}`,
  projectId: 'p1',
  title: 'Task',
  type: 'feature',
  status: 'todo',
  priority: 'medium',
  order: seq,
  createdAt: ts,
  updatedAt: ts,
  ...overrides,
})

describe('computeProjectStats', () => {
  it('handles projects without tasks', () => {
    expect(computeProjectStats([], today)).toMatchObject({ total: 0, percent: 0 })
  })

  it('counts statuses, types, progress and deadlines', () => {
    const stats = computeProjectStats(
      [
        task({ status: 'done', type: 'bugfix', dueDate: '2026-09-01' }),
        task({ status: 'in_progress', dueDate: '2026-09-10' }),
        task({ status: 'todo', dueDate: '2026-09-20' }),
        task({ status: 'backlog', type: 'chore', dueDate: '2026-12-01' }),
      ],
      today,
    )
    expect(stats).toMatchObject({ total: 4, done: 1, open: 3, percent: 25, overdue: 1, dueSoon: 1 })
    expect(stats.byStatus).toEqual({ backlog: 1, todo: 1, in_progress: 1, done: 1 })
    expect(stats.byType).toMatchObject({ feature: 2, bugfix: 1, chore: 1, improvement: 0 })
  })
})

describe('computeOverview', () => {
  it('aggregates only active projects', () => {
    const overview = computeOverview(
      [project('p1'), project('p2', true)],
      [
        task({ projectId: 'p1', status: 'in_progress' }),
        task({ projectId: 'p2', status: 'in_progress', dueDate: '2026-01-01' }),
      ],
      today,
    )
    expect(overview).toMatchObject({ activeProjects: 1, openTasks: 1, inProgress: 1, overdue: 0 })
    expect(overview.byProject.get('p2')?.overdue).toBe(1)
  })
})

describe('upcomingDeadlines', () => {
  it('returns open, soon-due tasks of the given projects sorted by date', () => {
    const tasks = [
      task({ id: 'late', dueDate: '2026-09-03' }),
      task({ id: 'soon', dueDate: '2026-09-18' }),
      task({ id: 'far', dueDate: '2026-10-30' }),
      task({ id: 'closed', dueDate: '2026-09-16', status: 'done' }),
      task({ id: 'other', dueDate: '2026-09-16', projectId: 'p2' }),
    ]
    expect(upcomingDeadlines(tasks, new Set(['p1']), today).map((t) => t.id)).toEqual([
      'late',
      'soon',
    ])
  })
})

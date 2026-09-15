import { describe, expect, it } from 'vitest'
import type { Project, Task } from '@/domain/schemas'
import { projectToRow, rowToProject, rowToTask, taskToRow } from './mappers'

const project: Project = {
  id: 'p1',
  name: 'Portfolio',
  color: '#6366f1',
  archived: false,
  createdAt: '2026-09-15T10:00:00.000Z',
  updatedAt: '2026-09-15T11:00:00.000Z',
}

const task: Task = {
  id: 't1',
  projectId: 'p1',
  title: 'Fix menu',
  description: 'On mobile',
  type: 'bugfix',
  status: 'done',
  priority: 'high',
  dueDate: '2026-10-01',
  order: 1500.5,
  createdAt: '2026-09-15T10:00:00.000Z',
  updatedAt: '2026-09-15T11:00:00.000Z',
  completedAt: '2026-09-15T11:00:00.000Z',
}

describe('project mapping', () => {
  it('round-trips, storing absent optionals as null', () => {
    const row = projectToRow(project)
    expect(row).toMatchObject({
      description: null,
      repo_url: null,
      live_url: null,
      deleted_at: null,
    })
    expect(rowToProject(row)).toEqual(project)
  })

  it('normalizes timestamps returned by Postgres', () => {
    const mapped = rowToProject({
      ...projectToRow(project),
      updated_at: '2026-09-15T11:00:00.123456+00:00',
      deleted_at: '2026-09-15T14:00:00+02:00',
    })
    expect(mapped?.updatedAt).toBe('2026-09-15T11:00:00.123Z')
    expect(mapped?.deletedAt).toBe('2026-09-15T12:00:00.000Z')
  })

  it('rejects rows that fail validation', () => {
    expect(rowToProject({ ...projectToRow(project), color: 'red' })).toBeNull()
    expect(rowToProject({ ...projectToRow(project), repo_url: 'javascript:alert(1)' })).toBeNull()
  })
})

describe('task mapping', () => {
  it('round-trips all fields', () => {
    const row = taskToRow(task)
    expect(row).toMatchObject({ project_id: 'p1', due_date: '2026-10-01', order: 1500.5 })
    expect(rowToTask(row)).toEqual(task)
  })

  it('drops null optionals and rejects unknown enum values', () => {
    const minimal = rowToTask({
      ...taskToRow(task),
      description: null,
      due_date: null,
      completed_at: null,
    })
    expect(minimal).not.toHaveProperty('description')
    expect(minimal).not.toHaveProperty('dueDate')
    expect(rowToTask({ ...taskToRow(task), status: 'archived' })).toBeNull()
  })
})

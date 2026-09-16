import { describe, expect, it } from 'vitest'
import type { DocItem, Project, Task } from '@/domain/schemas'
import {
  docItemToRow,
  projectToRow,
  rowToDocItem,
  rowToProject,
  rowToTask,
  taskToRow,
} from './mappers'

const project: Project = {
  id: 'p1',
  name: 'Portfolio',
  color: '#6366f1',
  icon: 'rocket',
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
  effort: 'l',
  icon: 'bug',
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
      effort: null,
      icon: null,
    })
    expect(minimal).not.toHaveProperty('description')
    expect(minimal).not.toHaveProperty('dueDate')
    expect(minimal).not.toHaveProperty('effort')
    expect(minimal).not.toHaveProperty('icon')
    expect(rowToTask({ ...taskToRow(task), status: 'archived' })).toBeNull()
    expect(rowToTask({ ...taskToRow(task), effort: 'huge' })).toBeNull()
  })

  it('keeps rows whose icon is unknown to this client', () => {
    expect(rowToTask({ ...taskToRow(task), icon: 'from-the-future' })?.icon).toBe('from-the-future')
  })
})

describe('documentation item mapping', () => {
  const docItem: DocItem = {
    id: 'd1',
    projectId: 'p1',
    type: 'command',
    content: 'npm run dev',
    description: 'Starts the dev server',
    order: 1000,
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-09-15T11:00:00.000Z',
  }

  it('round-trips, storing absent optionals as null', () => {
    const row = docItemToRow(docItem)
    expect(row).toMatchObject({ project_id: 'p1', type: 'command', deleted_at: null })
    expect(rowToDocItem(row)).toEqual(docItem)

    const minimal = rowToDocItem({ ...row, description: null })
    expect(minimal).not.toHaveProperty('description')
  })

  it('rejects unknown types and links that are not safe URLs', () => {
    expect(rowToDocItem({ ...docItemToRow(docItem), type: 'secret' })).toBeNull()
    expect(
      rowToDocItem({ ...docItemToRow(docItem), type: 'link', content: 'javascript:alert(1)' }),
    ).toBeNull()
    expect(
      rowToDocItem({ ...docItemToRow(docItem), type: 'link', content: 'https://shipyard.dev' })
        ?.content,
    ).toBe('https://shipyard.dev')
  })
})

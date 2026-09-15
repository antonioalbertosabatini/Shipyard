import { beforeEach, describe, expect, it } from 'vitest'
import type { TaskInput } from '@/domain/schemas'
import { createId } from '@/lib/id'
import { createDexieRepositories } from '..'
import { EntityNotFoundError, type Repositories } from '../repositories'
import { ShipyardDB } from './db'

const projectInput = { name: 'Portfolio', color: '#6366f1' }
const taskInput = (overrides: Partial<TaskInput> = {}): TaskInput => ({
  title: 'Task',
  type: 'feature',
  status: 'todo',
  priority: 'medium',
  ...overrides,
})

let repos: Repositories

beforeEach(() => {
  repos = createDexieRepositories(new ShipyardDB(`test-${createId()}`))
})

describe('projects', () => {
  it('creates, updates, archives and lists projects', async () => {
    const created = await repos.projects.create(projectInput)
    expect(created).toMatchObject({ name: 'Portfolio', archived: false })

    const updated = await repos.projects.update(created.id, {
      ...projectInput,
      name: 'Blog',
      repoUrl: 'https://github.com/me/blog',
    })
    expect(updated.name).toBe('Blog')

    const cleared = await repos.projects.update(created.id, { ...projectInput, name: 'Blog' })
    expect(cleared).not.toHaveProperty('repoUrl')

    await repos.projects.setArchived(created.id, true)
    expect((await repos.projects.get(created.id))?.archived).toBe(true)
    expect(await repos.projects.list()).toHaveLength(1)
  })

  it('removes a project together with its tasks', async () => {
    const project = await repos.projects.create(projectInput)
    await repos.tasks.create(project.id, taskInput())

    await repos.projects.remove(project.id)

    expect(await repos.projects.list()).toEqual([])
    expect(await repos.tasks.listAll()).toEqual([])
    await expect(repos.projects.update(project.id, projectInput)).rejects.toBeInstanceOf(
      EntityNotFoundError,
    )
  })
})

describe('tasks', () => {
  it('refuses tasks for unknown projects', async () => {
    await expect(repos.tasks.create('missing', taskInput())).rejects.toBeInstanceOf(EntityNotFoundError)
  })

  it('appends new tasks to the bottom of their column', async () => {
    const { id } = await repos.projects.create(projectInput)
    const a = await repos.tasks.create(id, taskInput({ title: 'A' }))
    const b = await repos.tasks.create(id, taskInput({ title: 'B' }))
    expect(b.order).toBeGreaterThan(a.order)
  })

  it('tracks completedAt through status changes', async () => {
    const { id } = await repos.projects.create(projectInput)
    const task = await repos.tasks.create(id, taskInput())
    expect(task.completedAt).toBeUndefined()

    const done = await repos.tasks.move(task.id, 'done', 0)
    expect(done.completedAt).toBeDefined()

    const reopened = await repos.tasks.update(task.id, taskInput({ status: 'in_progress' }))
    expect(reopened.completedAt).toBeUndefined()
  })

  it('moves tasks within and across columns', async () => {
    const { id } = await repos.projects.create(projectInput)
    const a = await repos.tasks.create(id, taskInput({ title: 'A' }))
    const b = await repos.tasks.create(id, taskInput({ title: 'B' }))
    const c = await repos.tasks.create(id, taskInput({ title: 'C', status: 'backlog' }))

    await repos.tasks.move(b.id, 'todo', 0)
    await repos.tasks.move(c.id, 'todo', 1)

    const todo = (await repos.tasks.listByProject(id)).filter((t) => t.status === 'todo')
    expect(todo.map((t) => t.title)).toEqual(['B', 'C', 'A'])
    expect(a.id).toBe(todo[2]?.id)
  })

  it('renumbers a column when positions run out of precision', async () => {
    const { id } = await repos.projects.create(projectInput)
    const tasks = []
    for (const title of ['A', 'B', 'C']) tasks.push(await repos.tasks.create(id, taskInput({ title })))
    const [, , c] = tasks

    // Repeatedly insert C between the first two items until the gap collapses.
    for (let i = 0; i < 60; i++) {
      await repos.tasks.move(c!.id, 'todo', 1)
      const column = (await repos.tasks.listByProject(id)).filter((t) => t.title !== 'C')
      await repos.tasks.move(column[1]!.id, 'todo', 1)
    }

    const column = await repos.tasks.listByProject(id)
    const orders = column.map((t) => t.order)
    expect(new Set(orders).size).toBe(orders.length)
    expect(orders).toEqual([...orders].sort((x, y) => x - y))
  })
})

describe('backup', () => {
  it('exports and re-imports in replace mode', async () => {
    const project = await repos.projects.create(projectInput)
    await repos.tasks.create(project.id, taskInput({ dueDate: '2026-10-01' }))
    const backup = await repos.backup.exportAll()

    await repos.backup.clearAll()
    expect(await repos.projects.list()).toEqual([])

    await expect(repos.backup.importAll(backup, 'replace')).resolves.toEqual({ projects: 1, tasks: 1 })
    expect(await repos.backup.exportAll()).toMatchObject({
      projects: backup.projects,
      tasks: backup.tasks,
    })
  })

  it('merges keeping the most recently updated copy', async () => {
    const project = await repos.projects.create(projectInput)
    const backup = await repos.backup.exportAll()

    await new Promise((resolve) => setTimeout(resolve, 5))
    await repos.projects.update(project.id, { ...projectInput, name: 'Renamed' })
    const other = { ...backup.projects[0]!, id: 'imported', name: 'Imported' }

    const result = await repos.backup.importAll(
      { ...backup, projects: [...backup.projects, other] },
      'merge',
    )

    expect(result).toEqual({ projects: 1, tasks: 0 })
    expect((await repos.projects.list()).map((p) => p.name)).toEqual(['Imported', 'Renamed'])
  })
})

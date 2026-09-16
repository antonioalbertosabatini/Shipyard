import { describe, expect, it } from 'vitest'
import { buildBackup, parseBackup } from './backup'
import type { Project, Task } from './schemas'

const ts = '2026-09-15T10:00:00.000Z'

const project: Project = {
  id: 'p1',
  name: 'Portfolio',
  color: '#6366f1',
  archived: false,
  createdAt: ts,
  updatedAt: ts,
}

const task: Task = {
  id: 't1',
  projectId: 'p1',
  title: 'Fix header',
  type: 'bugfix',
  status: 'todo',
  priority: 'high',
  order: 1000,
  createdAt: ts,
  updatedAt: ts,
}

describe('parseBackup', () => {
  it('round-trips a valid backup', () => {
    const backup = buildBackup([project], [task], new Date(ts))
    const result = parseBackup(JSON.stringify(backup))
    expect(result).toEqual({ success: true, data: backup })
  })

  it('round-trips the optional effort and icons', () => {
    const backup = buildBackup(
      [{ ...project, icon: 'rocket' }],
      [{ ...task, effort: 'm', icon: 'bug' }],
      new Date(ts),
    )
    const result = parseBackup(JSON.stringify(backup))
    expect(result).toEqual({ success: true, data: backup })
  })

  it('rejects malformed JSON', () => {
    expect(parseBackup('{nope')).toEqual({ success: false, error: 'The file is not valid JSON.' })
  })

  it('rejects files from other apps', () => {
    const result = parseBackup(JSON.stringify({ app: 'other', version: 1 }))
    expect(result.success).toBe(false)
  })

  it('rejects tasks pointing to missing projects', () => {
    const backup = buildBackup([project], [{ ...task, projectId: 'ghost' }], new Date(ts))
    const result = parseBackup(JSON.stringify(backup))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('tasks.0.projectId')
  })
})

import { describe, expect, it } from 'vitest'
import { buildObsidianVault, slugifyNoteName } from './obsidianExport'
import type { DocItem, Project, Task } from './schemas'

const ts = '2026-09-15T10:00:00.000Z'
const exportedAt = new Date(ts)

const project = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'My App',
  color: '#6366f1',
  archived: false,
  createdAt: ts,
  updatedAt: ts,
  ...overrides,
})

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  projectId: 'p1',
  title: 'Add auth',
  type: 'feature',
  status: 'todo',
  priority: 'high',
  order: 1000,
  createdAt: ts,
  updatedAt: ts,
  ...overrides,
})

const docItem = (overrides: Partial<DocItem> = {}): DocItem => ({
  id: 'd1',
  projectId: 'p1',
  type: 'link',
  content: 'https://vercel.com/dashboard',
  order: 1000,
  createdAt: ts,
  updatedAt: ts,
  ...overrides,
})

const byPath = (files: { path: string; content: string }[]) =>
  Object.fromEntries(files.map((file) => [file.path, file.content]))

const wikilinkTargets = (content: string) =>
  [...content.matchAll(/\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/g)].map((match) => match[1])

describe('slugifyNoteName', () => {
  it.each([
    ['Add auth', 'Add-auth'],
    ['  Fix / header?  ', 'Fix-header'],
    ['Title: 1 # hash', 'Title-1-hash'],
    ['a[b]|c^d', 'a-b-c-d'],
    ['---', 'untitled'],
    ['', 'untitled'],
  ])('turns %j into %j', (title, slug) => {
    expect(slugifyNoteName(title, new Set())).toBe(slug)
  })

  it('disambiguates collisions in the same folder, case-insensitively', () => {
    const used = new Set<string>()
    expect(slugifyNoteName('API', used)).toBe('API')
    expect(slugifyNoteName('api', used)).toBe('api-2')
    expect(slugifyNoteName('API', used)).toBe('API-3')
  })
})

describe('buildObsidianVault', () => {
  it('always writes an index, even when there is nothing to export', () => {
    const files = buildObsidianVault([], [], [], exportedAt)
    expect(files.map((file) => file.path)).toEqual(['Shipyard.md'])
    expect(files[0]?.content).toContain('No projects in this export.')
    expect(files[0]?.content).toContain(`exported: "${ts}"`)
  })

  it('puts archived projects under Archive/ and active ones under Projects/', () => {
    const files = byPath(
      buildObsidianVault(
        [project({ id: 'old', name: 'Old App', archived: true }), project()],
        [],
        [],
        exportedAt,
      ),
    )
    expect(Object.keys(files).sort()).toEqual([
      'Archive/Old-App/Old-App.md',
      'Projects/My-App/My-App.md',
      'Shipyard.md',
    ])
    expect(files['Shipyard.md']).toContain('[[Projects/My-App/My-App|My App]]')
    expect(files['Shipyard.md']).toContain('[[Archive/Old-App/Old-App|Old App]]')
    expect(files['Projects/My-App/My-App.md']).toContain('archived: false')
    expect(files['Archive/Old-App/Old-App.md']).toContain('archived: true')
  })

  it('disambiguates project folders that share a name in the same root', () => {
    const files = buildObsidianVault(
      [project({ id: 'a', name: 'API' }), project({ id: 'b', name: 'API' })],
      [],
      [],
    )
    expect(files.map((file) => file.path)).toEqual(
      expect.arrayContaining(['Projects/API/API.md', 'Projects/API-2/API-2.md']),
    )
  })

  it('writes one task note per task and omits Tasks/ when a project has none', () => {
    const files = byPath(
      buildObsidianVault(
        [project(), project({ id: 'p2', name: 'Empty' })],
        [task()],
        [],
        exportedAt,
      ),
    )
    expect(files['Projects/My-App/Tasks/Add-auth.md']).toContain('kind: task')
    expect(files['Projects/Empty/Empty.md']).toContain('No tasks.')
    expect(Object.keys(files).some((path) => path.startsWith('Projects/Empty/Tasks/'))).toBe(false)
  })

  it('writes Docs.md only when the project has documentation items', () => {
    const files = byPath(
      buildObsidianVault(
        [project(), project({ id: 'p2', name: 'Tasks only' })],
        [task({ projectId: 'p2', title: 'Only task' })],
        [docItem({ description: 'Deployments' })],
        exportedAt,
      ),
    )
    expect(files['Projects/My-App/Docs.md']).toContain('# Documentation')
    expect(files['Projects/My-App/My-App.md']).toContain('[[Projects/My-App/Docs|Documentation]]')
    expect(files['Projects/Tasks-only/Docs.md']).toBeUndefined()
    expect(files['Projects/Tasks-only/Tasks-only.md']).not.toContain('## Documentation')
  })

  it('omits optional task fields and can be frontmatter-only besides the title', () => {
    const content = byPath(buildObsidianVault([project()], [task()], []))[
      'Projects/My-App/Tasks/Add-auth.md'
    ]
    expect(content).not.toContain('effort:')
    expect(content).not.toContain('icon:')
    expect(content).not.toContain('due:')
    expect(content).not.toContain('completed:')
    expect(content).toContain('order: 1000')
    expect(content).toMatch(/---\n[\s\S]+---\n\n# Add auth\n$/)
  })

  it('writes every optional task field when set, including completedAt only for done tasks', () => {
    const done = task({
      id: 'done',
      title: 'Shipped',
      status: 'done',
      effort: 'm',
      icon: 'bug',
      dueDate: '2026-09-20',
      completedAt: ts,
      order: 2000,
    })
    const openWithStamp = task({
      id: 'open',
      title: 'Still open',
      status: 'todo',
      completedAt: ts,
    })
    const files = byPath(buildObsidianVault([project()], [done, openWithStamp], []))
    expect(files['Projects/My-App/Tasks/Shipped.md']).toContain('effort: m')
    expect(files['Projects/My-App/Tasks/Shipped.md']).toContain('icon: bug')
    expect(files['Projects/My-App/Tasks/Shipped.md']).toContain('due: 2026-09-20')
    expect(files['Projects/My-App/Tasks/Shipped.md']).toContain(`completed: "${ts}"`)
    expect(files['Projects/My-App/Tasks/Still-open.md']).not.toContain('completed:')
  })

  it('groups tasks by status, preserves order, and checks off done items', () => {
    const files = byPath(
      buildObsidianVault(
        [project()],
        [
          task({ id: 'b', title: 'Later todo', status: 'todo', order: 2000 }),
          task({ id: 'a', title: 'First todo', status: 'todo', order: 1000 }),
          task({ id: 'd', title: 'Shipped', status: 'done', order: 1000, completedAt: ts }),
          task({ id: 'c', title: 'Doing', status: 'in_progress', order: 1000 }),
        ],
        [],
      ),
    )
    const list = files['Projects/My-App/My-App.md'] ?? ''
    expect(list).toContain('### To do')
    expect(list).toContain('### In progress')
    expect(list).toContain('### Done')
    expect(list).not.toContain('### Backlog')
    expect(list.indexOf('First todo')).toBeLessThan(list.indexOf('Later todo'))
    expect(list).toContain('- [ ] [[Projects/My-App/Tasks/Doing|Doing]]')
    expect(list).toContain('- [x] [[Projects/My-App/Tasks/Shipped|Shipped]]')
  })

  it('quotes YAML values that would break frontmatter, including titles', () => {
    const files = byPath(
      buildObsidianVault(
        [project({ name: 'Title: 1 # hash' })],
        [task({ title: 'Title: 1 # hash' })],
        [],
      ),
    )
    expect(files['Projects/Title-1-hash/Tasks/Title-1-hash.md']).toContain(
      'title: "Title: 1 # hash"',
    )
    expect(files['Projects/Title-1-hash/Title-1-hash.md']).toContain('color: "#6366f1"')
    expect(files['Projects/Title-1-hash/Title-1-hash.md']).toContain('title: "Title: 1 # hash"')
  })

  it('renders all documentation types, including commands that contain fences', () => {
    const files = byPath(
      buildObsidianVault(
        [project()],
        [],
        [
          docItem({ id: 'link-named', description: 'Deployments', order: 1000 }),
          docItem({
            id: 'link-bare',
            content: 'https://example.com/docs',
            order: 2000,
          }),
          docItem({
            id: 'cmd',
            type: 'command',
            content: 'echo ```nested```',
            description: 'Publish',
            order: 3000,
          }),
          docItem({
            id: 'cmd-bare',
            type: 'command',
            content: 'npm run deploy',
            order: 4000,
          }),
          docItem({
            id: 'info',
            type: 'info',
            content: 'Requires Node 22',
            description: 'Runtime',
            order: 5000,
          }),
          docItem({
            id: 'info-bare',
            type: 'info',
            content: 'Plain note',
            order: 6000,
          }),
        ],
      ),
    )
    const docs = files['Projects/My-App/Docs.md'] ?? ''
    expect(docs).toContain(
      '### Deployments\n\n[https://vercel.com/dashboard](https://vercel.com/dashboard)',
    )
    expect(docs).toContain(
      '### example.com\n\n[https://example.com/docs](https://example.com/docs)',
    )
    expect(docs).toContain('### Publish\n\n````bash\necho ```nested```\n````')
    expect(docs).toContain('### Command\n\n```bash\nnpm run deploy\n```')
    expect(docs).toContain('### Runtime\n\nRequires Node 22')
    expect(docs).toContain('### Note\n\nPlain note')
  })

  it('writes project URLs, color, icon and description when present', () => {
    const content = byPath(
      buildObsidianVault(
        [
          project({
            description: 'Personal site',
            icon: 'rocket',
            repoUrl: 'https://github.com/me/app',
            liveUrl: 'https://app.example',
          }),
        ],
        [],
        [],
      ),
    )['Projects/My-App/My-App.md']
    expect(content).toContain('icon: rocket')
    expect(content).toContain('repo_url: "https://github.com/me/app"')
    expect(content).toContain('live_url: "https://app.example"')
    expect(content).toContain('Personal site')
    expect(content).toContain('[Repository](https://github.com/me/app)')
    expect(content).toContain('[Live site](https://app.example)')
  })

  it('makes every wikilink point at a generated note', () => {
    const files = buildObsidianVault(
      [project(), project({ id: 'old', name: 'Old App', archived: true })],
      [task(), task({ id: 't2', title: 'Fix login', status: 'done', completedAt: ts })],
      [docItem({ description: 'Deployments' })],
    )
    const paths = new Set(files.map((file) => file.path))
    for (const file of files) {
      for (const target of wikilinkTargets(file.content)) {
        expect(paths.has(`${target}.md`)).toBe(true)
      }
    }
  })

  it('ignores tasks and docs whose project is not in the export', () => {
    const files = buildObsidianVault(
      [project()],
      [task({ projectId: 'ghost' })],
      [docItem({ projectId: 'ghost' })],
    )
    expect(files.map((file) => file.path)).toEqual(['Shipyard.md', 'Projects/My-App/My-App.md'])
  })
})

import { TASK_STATUSES, type TaskStatus } from './constants'
import { sortByOrder } from './order'
import type { DocItem, Project, Task } from './schemas'

export interface VaultFile {
  path: string
  content: string
}

const STATUS_HEADING: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
}

interface TaskFile {
  task: Task
  path: string
  wikilink: string
}

interface ProjectLayout {
  project: Project
  notePath: string
  noteWikilink: string
  taskFiles: TaskFile[]
  docs: DocItem[]
  docsWikilink?: string
}

type YamlValue = string | number | boolean

/** Turns a title into a unique filename stem for one folder. */
export function slugifyNoteName(title: string, used: Set<string>): string {
  const base =
    title
      .trim()
      .replace(/[/\\:*?"<>|#^[\]]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[.-]+|[.-]+$/g, '') || 'untitled'

  let slug = base
  let n = 2
  while (used.has(slug.toLowerCase())) {
    slug = `${base}-${n}`
    n += 1
  }
  used.add(slug.toLowerCase())
  return slug
}

/** Linked Markdown notes for an Obsidian vault (paths are relative to the vault root). */
export function buildObsidianVault(
  projects: Project[],
  tasks: Task[],
  docItems: DocItem[],
  exportedAt = new Date(),
): VaultFile[] {
  const layouts = layoutProjects(projects, tasks, docItems)
  const files: VaultFile[] = [{ path: 'Shipyard.md', content: renderIndex(layouts, exportedAt) }]

  for (const layout of layouts) {
    files.push({ path: layout.notePath, content: renderProjectNote(layout) })
    for (const taskFile of layout.taskFiles) {
      files.push({
        path: taskFile.path,
        content: renderTaskNote(taskFile.task, layout),
      })
    }
    if (layout.docsWikilink) {
      files.push({
        path: `${layout.docsWikilink}.md`,
        content: renderDocsNote(layout),
      })
    }
  }

  return files
}

function layoutProjects(projects: Project[], tasks: Task[], docItems: DocItem[]): ProjectLayout[] {
  const usedFolders = { Projects: new Set<string>(), Archive: new Set<string>() }
  const sorted = [...projects].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1
    return a.name.localeCompare(b.name)
  })

  return sorted.map((project) => {
    const root = project.archived ? 'Archive' : 'Projects'
    const folder = slugifyNoteName(project.name, usedFolders[root])
    const dir = `${root}/${folder}`
    const noteWikilink = `${dir}/${folder}`
    const usedTaskSlugs = new Set<string>()
    const taskFiles = sortByOrder(tasks.filter((task) => task.projectId === project.id)).map(
      (task) => {
        const slug = slugifyNoteName(task.title, usedTaskSlugs)
        const wikilink = `${dir}/Tasks/${slug}`
        return { task, path: `${wikilink}.md`, wikilink }
      },
    )
    const docs = sortByOrder(docItems.filter((item) => item.projectId === project.id))
    return {
      project,
      notePath: `${noteWikilink}.md`,
      noteWikilink,
      taskFiles,
      docs,
      docsWikilink: docs.length > 0 ? `${dir}/Docs` : undefined,
    }
  })
}

function renderIndex(layouts: ProjectLayout[], exportedAt: Date): string {
  const exported = exportedAt.toISOString()
  const active = layouts.filter((layout) => !layout.project.archived)
  const archived = layouts.filter((layout) => layout.project.archived)
  const body: string[] = [
    '# Shipyard',
    `Exported on ${exported}.`,
    'Open this folder as an Obsidian vault, or copy `Projects/` and `Archive/` into an existing one.',
  ]

  if (active.length === 0 && archived.length === 0) {
    body.push('No projects in this export.')
  }
  if (active.length > 0) {
    body.push(['## Projects', '', ...active.map((layout) => `- ${projectLink(layout)}`)].join('\n'))
  }
  if (archived.length > 0) {
    body.push(
      ['## Archive', '', ...archived.map((layout) => `- ${projectLink(layout)}`)].join('\n'),
    )
  }

  return note({ kind: 'index', exported }, ...body)
}

function renderProjectNote(layout: ProjectLayout): string {
  const { project } = layout
  return note(
    {
      kind: 'project',
      shipyard_id: project.id,
      title: project.name,
      archived: project.archived,
      color: project.color,
      icon: project.icon,
      repo_url: project.repoUrl,
      live_url: project.liveUrl,
      created: project.createdAt,
      updated: project.updatedAt,
    },
    `# ${project.name}`,
    project.description,
    project.repoUrl ? `[Repository](${project.repoUrl})` : undefined,
    project.liveUrl ? `[Live site](${project.liveUrl})` : undefined,
    renderTaskList(layout),
    layout.docsWikilink
      ? `## Documentation\n\n${wikilink(layout.docsWikilink, 'Documentation')}`
      : undefined,
  )
}

function renderTaskList(layout: ProjectLayout): string {
  if (layout.taskFiles.length === 0) return '## Tasks\n\nNo tasks.'

  const groups = TASK_STATUSES.flatMap((status) => {
    const items = layout.taskFiles.filter((file) => file.task.status === status)
    if (items.length === 0) return []
    const lines = items.map((file) => {
      const box = status === 'done' ? '- [x]' : '- [ ]'
      return `${box} ${wikilink(file.wikilink, file.task.title)}`
    })
    return [`### ${STATUS_HEADING[status]}\n\n${lines.join('\n')}`]
  })

  return `## Tasks\n\n${groups.join('\n\n')}`
}

function renderTaskNote(task: Task, layout: ProjectLayout): string {
  return note(
    {
      kind: 'task',
      shipyard_id: task.id,
      project: wikilink(layout.noteWikilink, layout.project.name),
      title: task.title,
      type: task.type,
      status: task.status,
      priority: task.priority,
      effort: task.effort,
      icon: task.icon,
      due: task.dueDate,
      completed: task.status === 'done' ? task.completedAt : undefined,
      order: task.order,
      created: task.createdAt,
      updated: task.updatedAt,
    },
    `# ${task.title}`,
    task.description,
  )
}

function renderDocsNote(layout: ProjectLayout): string {
  return note(
    {
      kind: 'docs',
      project: wikilink(layout.noteWikilink, layout.project.name),
    },
    '# Documentation',
    layout.docs.map(renderDocItem).join('\n\n'),
  )
}

function renderDocItem(item: DocItem): string {
  if (item.type === 'link') {
    const heading = item.description?.trim() || hostnameOf(item.content)
    return `### ${heading}\n\n[${item.content}](${item.content})`
  }
  if (item.type === 'command') {
    const heading = item.description?.trim() || 'Command'
    return `### ${heading}\n\n${codeFence(item.content, 'bash')}`
  }
  const heading = item.description?.trim() || 'Note'
  return `### ${heading}\n\n${item.content}`
}

function projectLink(layout: ProjectLayout): string {
  return wikilink(layout.noteWikilink, layout.project.name)
}

function wikilink(path: string, alias: string): string {
  const safeAlias = alias.replaceAll('|', ' ').replaceAll('[[', '').replaceAll(']]', '').trim()
  return `[[${path}|${safeAlias || path}]]`
}

function note(fields: Record<string, YamlValue | undefined>, ...blocks: Array<string | undefined>) {
  const body = blocks.filter((block): block is string => !!block).join('\n\n')
  return `${yamlFrontmatter(fields)}\n${body ? `\n${body}\n` : '\n'}`
}

function yamlFrontmatter(fields: Record<string, YamlValue | undefined>): string {
  const lines = Object.entries(fields).flatMap(([key, value]) =>
    value === undefined ? [] : [`${key}: ${formatYamlValue(key, value)}`],
  )
  return `---\n${lines.join('\n')}\n---`
}

function formatYamlValue(key: string, value: YamlValue): string {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (key === 'title' || key === 'project' || needsYamlQuotes(value)) return yamlQuote(value)
  return value
}

function needsYamlQuotes(value: string): boolean {
  if (value === '') return true
  if (/[\n\r:#&*!|>%@`'"{},[\]\\]/.test(value)) return true
  if (/^\s|\s$/.test(value)) return true
  if (/^(true|false|null|~|yes|no|on|off)$/i.test(value)) return true
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) return true
  return false
}

function yamlQuote(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n').replaceAll('\r', '\\r')}"`
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname || url
  } catch {
    return url
  }
}

function codeFence(content: string, language: string): string {
  const runs = content.match(/`+/g) ?? []
  const longest = runs.reduce((max, run) => Math.max(max, run.length), 0)
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return `${fence}${language}\n${content}\n${fence}`
}

export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    list: ['projects', 'list'] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: ['tasks', 'list'] as const,
    byProject: (projectId: string) => ['tasks', 'project', projectId] as const,
  },
  docItems: {
    all: ['docItems'] as const,
    byProject: (projectId: string) => ['docItems', 'project', projectId] as const,
  },
}

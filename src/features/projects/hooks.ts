import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '@/data/context'
import { queryKeys } from '@/data/queryKeys'
import type { ProjectInput } from '@/domain/schemas'

export function useProjects() {
  const { projects } = useRepositories()
  return useQuery({ queryKey: queryKeys.projects.list, queryFn: () => projects.list() })
}

export function useProject(id: string) {
  const { projects } = useRepositories()
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: async () => (await projects.get(id)) ?? null,
  })
}

export function useCreateProject() {
  const { projects } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectInput) => projects.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  })
}

export function useUpdateProject() {
  const { projects } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProjectInput }) => projects.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  })
}

export function useSetProjectArchived() {
  const { projects } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      projects.setArchived(id, archived),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  })
}

export function useDeleteProject() {
  const { projects } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projects.remove(id),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.docItems.all }),
      ]),
  })
}

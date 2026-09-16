import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useRepositories } from '@/data/context'
import { queryKeys } from '@/data/queryKeys'
import { applyReorder, sortByOrder } from '@/domain/order'
import type { DocItem, DocItemInput } from '@/domain/schemas'

export function useProjectDocItems(projectId: string) {
  const { docItems } = useRepositories()
  return useQuery({
    queryKey: queryKeys.docItems.byProject(projectId),
    queryFn: () => docItems.listByProject(projectId),
  })
}

function useInvalidateDocItems() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.docItems.all })
}

export function useCreateDocItem() {
  const { docItems } = useRepositories()
  const invalidate = useInvalidateDocItems()
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: DocItemInput }) =>
      docItems.create(projectId, input),
    onSuccess: invalidate,
  })
}

export function useUpdateDocItem() {
  const { docItems } = useRepositories()
  const invalidate = useInvalidateDocItems()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DocItemInput }) => docItems.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteDocItem() {
  const { docItems } = useRepositories()
  const invalidate = useInvalidateDocItems()
  return useMutation({
    mutationFn: (id: string) => docItems.remove(id),
    onSuccess: invalidate,
  })
}

/** Reorders an item with an optimistic cache update, so drag & drop feels instant. */
export function useMoveDocItem(projectId: string) {
  const { docItems } = useRepositories()
  const queryClient = useQueryClient()
  const { mutate } = useMutation({
    mutationFn: ({ id, index }: { id: string; index: number }) => docItems.move(id, index),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.docItems.all }),
  })

  return useCallback(
    (id: string, index: number) => {
      const key = queryKeys.docItems.byProject(projectId)
      void queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<DocItem[]>(key, (current) =>
        current ? sortByOrder(applyReorder(current, id, index, new Date().toISOString())) : current,
      )
      mutate({ id, index })
    },
    [queryClient, projectId, mutate],
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useRepositories } from '@/data/context'
import { queryKeys } from '@/data/queryKeys'
import type { TaskStatus } from '@/domain/constants'
import { sortByOrder } from '@/domain/order'
import type { Task, TaskInput } from '@/domain/schemas'
import { applyMove } from '@/domain/task'

export function useAllTasks() {
  const { tasks } = useRepositories()
  return useQuery({ queryKey: queryKeys.tasks.list, queryFn: () => tasks.listAll() })
}

export function useProjectTasks(projectId: string) {
  const { tasks } = useRepositories()
  return useQuery({
    queryKey: queryKeys.tasks.byProject(projectId),
    queryFn: () => tasks.listByProject(projectId),
  })
}

function useInvalidateTasks() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
}

export function useCreateTask() {
  const { tasks } = useRepositories()
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: TaskInput }) =>
      tasks.create(projectId, input),
    onSuccess: invalidate,
  })
}

export function useUpdateTask() {
  const { tasks } = useRepositories()
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskInput }) => tasks.update(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteTask() {
  const { tasks } = useRepositories()
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: (id: string) => tasks.remove(id),
    onSuccess: invalidate,
  })
}

export interface MoveTaskVariables {
  taskId: string
  status: TaskStatus
  /** Position in the target column, counted without the moved task. */
  index: number
}

/** Moves a task with an optimistic cache update, so drag & drop feels instant. */
export function useMoveTask(projectId: string) {
  const { tasks } = useRepositories()
  const queryClient = useQueryClient()
  const { mutate } = useMutation({
    mutationFn: ({ taskId, status, index }: MoveTaskVariables) => tasks.move(taskId, status, index),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
  })

  return useCallback(
    (variables: MoveTaskVariables) => {
      const key = queryKeys.tasks.byProject(projectId)
      void queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<Task[]>(key, (current) =>
        current
          ? sortByOrder(
              applyMove(
                current,
                variables.taskId,
                variables.status,
                variables.index,
                new Date().toISOString(),
              ),
            )
          : current,
      )
      mutate(variables)
    },
    [queryClient, projectId, mutate],
  )
}

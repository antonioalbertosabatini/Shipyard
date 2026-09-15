import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '@/data/context'
import type { Backup, ImportMode } from '@/domain/backup'

export function useExportBackup() {
  const { backup } = useRepositories()
  return useMutation({ mutationFn: () => backup.exportAll() })
}

export function useImportBackup() {
  const { backup } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ data, mode }: { data: Backup; mode: ImportMode }) =>
      backup.importAll(data, mode),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export function useClearData() {
  const { backup } = useRepositories()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => backup.clearAll(),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

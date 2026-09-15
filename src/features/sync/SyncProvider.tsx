import { useQueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import type { SyncController } from '@/data'
import { useAuth } from '@/features/auth/context'
import { SyncContext } from './context'

/** Runs the sync engine while a user is signed in and refreshes queries on remote changes. */
export function SyncProvider({
  sync,
  children,
}: {
  sync: SyncController | null
  children: ReactNode
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  useEffect(() => {
    if (!sync) return
    return sync.onRemoteChange(() => void queryClient.invalidateQueries())
  }, [sync, queryClient])

  useEffect(() => {
    if (!sync || !userId) return
    void sync.start(userId)
    return () => sync.stop()
  }, [sync, userId])

  return <SyncContext value={sync}>{children}</SyncContext>
}

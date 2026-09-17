import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Repositories, SyncController } from '@/data'
import { RepositoryProvider } from '@/data/RepositoryProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { SyncProvider } from '@/features/sync/SyncProvider'
import i18n from '@/i18n'
import { PwaUpdater } from './PwaUpdater'
import { ThemeProvider } from './ThemeProvider'

function createQueryClient(sync: SyncController | null) {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error) => {
        console.error(error)
        toast.error(i18n.t('errors.generic'))
      },
      // Every local write is queued in the outbox: schedule an upload.
      onSuccess: () => sync?.requestSync(),
    }),
    defaultOptions: {
      // Reads and writes always hit IndexedDB (sync runs in the background), so they work offline.
      queries: { networkMode: 'always', staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
      mutations: { networkMode: 'always' },
    },
  })
}

export function AppProviders({
  repositories,
  sync,
  supabase,
  children,
}: {
  repositories: Repositories
  sync: SyncController | null
  supabase: SupabaseClient | null
  children: ReactNode
}) {
  const [queryClient] = useState(() => createQueryClient(sync))

  return (
    <ThemeProvider>
      <RepositoryProvider repositories={repositories}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider client={supabase}>
            <SyncProvider sync={sync}>
              <TooltipProvider>
                {children}
                <Toaster position="top-center" richColors />
                <PwaUpdater />
              </TooltipProvider>
            </SyncProvider>
          </AuthProvider>
        </QueryClientProvider>
      </RepositoryProvider>
    </ThemeProvider>
  )
}

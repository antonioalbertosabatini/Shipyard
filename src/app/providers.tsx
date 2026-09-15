import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Repositories } from '@/data'
import { RepositoryProvider } from '@/data/RepositoryProvider'
import i18n from '@/i18n'
import { ThemeProvider } from './ThemeProvider'

function createQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error) => {
        console.error(error)
        toast.error(i18n.t('errors.generic'))
      },
    }),
    defaultOptions: {
      // Local storage works offline; revisit `networkMode` when a remote backend is added.
      queries: { networkMode: 'always', staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
      mutations: { networkMode: 'always' },
    },
  })
}

export function AppProviders({
  repositories,
  children,
}: {
  repositories: Repositories
  children: ReactNode
}) {
  const [queryClient] = useState(createQueryClient)

  return (
    <ThemeProvider>
      <RepositoryProvider repositories={repositories}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {children}
            <Toaster position="top-center" richColors />
          </TooltipProvider>
        </QueryClientProvider>
      </RepositoryProvider>
    </ThemeProvider>
  )
}

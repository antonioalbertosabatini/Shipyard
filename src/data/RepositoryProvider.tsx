import type { ReactNode } from 'react'
import { RepositoryContext } from './context'
import type { Repositories } from './repositories'

export function RepositoryProvider({
  repositories,
  children,
}: {
  repositories: Repositories
  children: ReactNode
}) {
  return <RepositoryContext value={repositories}>{children}</RepositoryContext>
}

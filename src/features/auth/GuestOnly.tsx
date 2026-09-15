import { Navigate, Outlet, useSearchParams } from 'react-router'
import { LoadingState } from '@/components/LoadingState'
import { useAuth } from './context'
import { safeRedirect } from './schemas'

/** Layout route for sign-in pages: signed-in users continue to `?redirect=` (or the dashboard). */
export function GuestOnly() {
  const { isReady, user } = useAuth()
  const [params] = useSearchParams()

  if (!isReady) return <LoadingState />
  if (user) return <Navigate to={safeRedirect(params.get('redirect'))} replace />
  return <Outlet />
}

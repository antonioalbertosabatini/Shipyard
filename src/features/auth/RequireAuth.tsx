import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingState } from '@/components/LoadingState'
import { useAuth } from './context'

/** Layout route that only renders its children for signed-in users. */
export function RequireAuth() {
  const { isConfigured, isReady, user } = useAuth()
  const location = useLocation()

  if (!isConfigured) return <Navigate to="/settings" replace />
  if (!isReady) return <LoadingState />
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  return <Outlet />
}

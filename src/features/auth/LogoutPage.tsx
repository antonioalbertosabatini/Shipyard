import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { useSyncController, useSyncState } from '@/features/sync/context'
import { AuthAlert } from './AuthAlert'
import { AuthCard } from './AuthCard'
import { useAuth } from './context'

type Phase = 'confirm' | 'working' | 'unsynced'

export function LogoutPage() {
  const { t } = useTranslation()
  const { isReady, user, signOut } = useAuth()
  const sync = useSyncController()
  const syncState = useSyncState()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('confirm')
  const pending = syncState?.pending ?? 0

  const signOutAndClear = async () => {
    await sync?.clearLocalData()
    await signOut()
    queryClient.clear()
    toast.success(t('auth.logout.done'))
    navigate('/login', { replace: true })
  }

  /** Uploads pending changes first; `force` skips that and discards them. */
  const handleSignOut = async (force: boolean) => {
    setPhase('working')
    if (!force && sync && !(await sync.flush())) {
      setPhase('unsynced')
      return
    }
    await signOutAndClear()
  }

  if (!isReady || phase === 'working') return <LoadingState />
  if (!user) return <Navigate to="/login" replace />

  const cancel = (
    <Link to="/account" className="underline-offset-4 hover:underline">
      {t('common.cancel')}
    </Link>
  )

  if (phase === 'unsynced') {
    return (
      <AuthCard title={t('auth.logout.unsyncedTitle')} footer={cancel}>
        <AuthAlert>{t('auth.logout.unsynced', { count: pending })}</AuthAlert>
        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={() => void handleSignOut(false)}>
            {t('auth.logout.retry')}
          </Button>
          <Button size="lg" variant="destructive" onClick={() => void handleSignOut(true)}>
            {t('auth.logout.force')}
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t('auth.logout.title')}
      description={t('auth.logout.description', { email: user.email })}
      footer={cancel}
    >
      {pending > 0 && (
        <AuthAlert variant="success">{t('auth.logout.pending', { count: pending })}</AuthAlert>
      )}
      <Button size="lg" className="w-full" onClick={() => void handleSignOut(false)}>
        <LogOut data-icon="inline-start" />
        {t('auth.logout.confirm')}
      </Button>
    </AuthCard>
  )
}

import { LogIn } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/features/auth/context'
import { useSyncState } from './context'
import { SyncStatusIcon } from './SyncStatusIcon'
import { syncStatusKey } from './syncStatus'

/** Account entry point with live sync status; hidden in local-only mode. */
export function SyncStatusIndicator({ variant }: { variant: 'sidebar' | 'header' }) {
  const { t } = useTranslation()
  const { isConfigured, isReady, user } = useAuth()
  const syncState = useSyncState()

  if (!isConfigured || !isReady) return null

  if (!user) {
    return (
      <Button
        asChild
        variant={variant === 'sidebar' ? 'outline' : 'ghost'}
        size="sm"
        className={variant === 'sidebar' ? 'w-full' : undefined}
      >
        <Link to="/login">
          <LogIn data-icon="inline-start" />
          {t('auth.login.action')}
        </Link>
      </Button>
    )
  }

  const status = syncState ? syncStatusKey(syncState) : 'synced'
  const label = t(`sync.status.${status}`)

  if (variant === 'header') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={`${t('auth.account.title')} · ${label}`}
          >
            <Link to="/account">
              <SyncStatusIcon status={status} className="size-5" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link
      to="/account"
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <SyncStatusIcon status={status} className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{user.email}</span>
        <span className="truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </Link>
  )
}

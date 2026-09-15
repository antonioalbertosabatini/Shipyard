import { CloudAlert, CloudCheck, CloudOff, CloudUpload, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SyncStatusKey } from './syncStatus'

const ICONS = {
  synced: CloudCheck,
  pending: CloudUpload,
  syncing: RefreshCw,
  offline: CloudOff,
  error: CloudAlert,
} as const

export function SyncStatusIcon({
  status,
  className,
}: {
  status: SyncStatusKey
  className?: string
}) {
  const Icon = ICONS[status]
  return (
    <Icon
      aria-hidden
      className={cn(
        className,
        status === 'syncing' && 'animate-spin',
        status === 'error' && 'text-destructive',
      )}
    />
  )
}

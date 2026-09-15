import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Inline message for form-level auth errors and confirmations. */
export function AuthAlert({
  variant = 'error',
  children,
}: {
  variant?: 'error' | 'success'
  children: ReactNode
}) {
  const Icon = variant === 'error' ? CircleAlert : CircleCheck
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-2 rounded-lg border px-3 py-2 text-sm',
        variant === 'error'
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}

import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  actions,
  leading,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  leading?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {leading}
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight break-words">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

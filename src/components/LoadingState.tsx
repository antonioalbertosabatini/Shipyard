import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function LoadingState({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <div role="status" className={cn('flex min-h-40 items-center justify-center', className)}>
      <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}

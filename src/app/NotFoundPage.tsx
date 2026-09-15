import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Empty className="min-h-[60dvh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Compass />
        </EmptyMedia>
        <EmptyTitle>{t('errors.notFoundTitle')}</EmptyTitle>
        <EmptyDescription>{t('errors.notFoundDescription')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link to="/">{t('errors.backToDashboard')}</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

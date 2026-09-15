import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { NotFoundPage } from './NotFoundPage'

export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  console.error(error)

  return (
    <Empty className="min-h-dvh">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>{t('errors.unexpectedTitle')}</EmptyTitle>
        <EmptyDescription>{t('errors.unexpectedDescription')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => window.location.reload()}>{t('errors.reload')}</Button>
      </EmptyContent>
    </Empty>
  )
}

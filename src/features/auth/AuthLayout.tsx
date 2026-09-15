import { CloudOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router'
import { Brand } from '@/components/Brand'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from './context'

function NotConfiguredCard() {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CloudOff className="mb-2 size-6 text-muted-foreground" aria-hidden />
        <CardTitle>
          <h1 className="font-heading text-xl font-semibold">{t('auth.notConfigured.title')}</h1>
        </CardTitle>
        <CardDescription>{t('auth.notConfigured.description')}</CardDescription>
      </CardHeader>
      <CardContent />
      <CardFooter className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="w-full sm:w-auto">
          <Link to="/">{t('auth.continueLocal')}</Link>
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to="/settings">{t('nav.settings')}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

/** Centered card layout for sign-in, sign-up and password pages. */
export function AuthLayout() {
  const { isConfigured } = useAuth()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 pt-[max(env(safe-area-inset-top),2rem)] pb-[max(env(safe-area-inset-bottom),2rem)]">
      <main className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex justify-center">
          <Brand />
        </div>
        {isConfigured ? <Outlet /> : <NotConfiguredCard />}
      </main>
    </div>
  )
}

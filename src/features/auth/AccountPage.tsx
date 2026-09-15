import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { LoaderCircle, LogOut, RefreshCw } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { SyncStatusIcon } from '@/features/sync/SyncStatusIcon'
import { useSyncController, useSyncState } from '@/features/sync/context'
import { syncStatusKey } from '@/features/sync/syncStatus'
import { formatDate } from '@/lib/dates'
import { AuthAlert } from './AuthAlert'
import type { AuthErrorKey } from './authErrors'
import { AuthField } from './AuthField'
import { useAuth } from './context'
import { passwordMismatch, passwordSchema, passwordsMatch } from './schemas'

const makeSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z.string().min(1, t('validation.required')),
      password: passwordSchema(t),
      confirmPassword: z.string(),
    })
    .refine(passwordsMatch, passwordMismatch(t))

type FormValues = z.infer<ReturnType<typeof makeSchema>>

function ChangePasswordForm() {
  const { t } = useTranslation()
  const { changePassword } = useAuth()
  const id = useId()
  const [error, setError] = useState<AuthErrorKey | null>(null)
  const schema = useMemo(() => makeSchema(t), [t])
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async ({ currentPassword, password }: FormValues) => {
    setError(null)
    const result = await changePassword(currentPassword, password)
    if (result.error) {
      setError(result.error)
      return
    }
    reset()
    toast.success(t('auth.account.passwordChanged'))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-sm flex-col gap-4">
      {error && <AuthAlert>{t(`auth.errors.${error}`)}</AuthAlert>}
      <FieldGroup>
        <AuthField
          id={`${id}-current`}
          label={t('auth.fields.currentPassword')}
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword}
          {...register('currentPassword')}
        />
        <AuthField
          id={`${id}-password`}
          label={t('auth.fields.newPassword')}
          type="password"
          autoComplete="new-password"
          error={errors.password}
          {...register('password')}
        />
        <AuthField
          id={`${id}-confirm`}
          label={t('auth.fields.confirmPassword')}
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword}
          {...register('confirmPassword')}
        />
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
            {t('auth.account.passwordSubmit')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-all sm:text-right">{children}</dd>
    </div>
  )
}

export function AccountPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const sync = useSyncController()
  const syncState = useSyncState()
  const [syncing, setSyncing] = useState(false)

  if (!user) return null
  const status = syncState ? syncStatusKey(syncState) : null

  const handleSyncNow = async () => {
    if (!sync) return
    setSyncing(true)
    const ok = await sync.syncNow()
    setSyncing(false)
    if (ok) toast.success(t('auth.account.synced'))
    else toast.error(t('auth.account.syncFailed'))
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={t('auth.account.title')}
        description={t('auth.account.description')}
        actions={
          <Button asChild variant="outline">
            <Link to="/logout">
              <LogOut data-icon="inline-start" />
              {t('auth.logout.action')}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('auth.account.profile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-3">
            <Detail label={t('auth.fields.email')}>{user.email}</Detail>
            <Detail label={t('auth.account.memberSince')}>
              {formatDate(user.created_at, i18n.language, { dateStyle: 'medium' })}
            </Detail>
          </dl>
        </CardContent>
      </Card>

      {syncState && status && (
        <Card>
          <CardHeader>
            <CardTitle>{t('auth.account.syncTitle')}</CardTitle>
            <CardDescription>{t('auth.account.syncDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="flex flex-col gap-3">
              <Detail label={t('auth.account.status')}>
                <span className="inline-flex items-center gap-1.5">
                  <SyncStatusIcon status={status} className="size-4" />
                  {t(`sync.status.${status}`)}
                </span>
              </Detail>
              <Detail label={t('auth.account.lastSynced')}>
                {syncState.lastSyncedAt
                  ? formatDate(syncState.lastSyncedAt, i18n.language, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : t('auth.account.never')}
              </Detail>
              <Detail label={t('auth.account.pending')}>{syncState.pending}</Detail>
            </dl>
            <div>
              <Button variant="outline" onClick={() => void handleSyncNow()} disabled={syncing}>
                <RefreshCw
                  data-icon="inline-start"
                  className={syncing ? 'animate-spin' : undefined}
                />
                {t('auth.account.syncNow')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('auth.account.passwordTitle')}</CardTitle>
          <CardDescription>{t('auth.account.passwordDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}

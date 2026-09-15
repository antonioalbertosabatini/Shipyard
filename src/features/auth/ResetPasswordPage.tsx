import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { z } from 'zod'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { AuthAlert } from './AuthAlert'
import { AuthCard } from './AuthCard'
import type { AuthErrorKey } from './authErrors'
import { AuthField } from './AuthField'
import { useAuth } from './context'
import { newPasswordSchema } from './schemas'

type FormValues = z.infer<ReturnType<typeof newPasswordSchema>>

/** Opened from the reset email: Supabase exchanges the link code for a session before this renders. */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { isReady, user, updatePassword } = useAuth()
  const navigate = useNavigate()
  const id = useId()
  const [error, setError] = useState<AuthErrorKey | null>(null)
  const schema = useMemo(() => newPasswordSchema(t), [t])
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = async ({ password }: FormValues) => {
    setError(null)
    const result = await updatePassword(password)
    if (result.error) {
      setError(result.error)
      return
    }
    toast.success(t('auth.reset.done'))
    navigate('/', { replace: true })
  }

  if (!isReady) return <LoadingState />

  if (!user) {
    return (
      <AuthCard
        title={t('auth.reset.invalidTitle')}
        description={t('auth.reset.invalidDescription')}
        footer={
          <Link to="/login" className="underline-offset-4 hover:underline">
            {t('auth.backToLogin')}
          </Link>
        }
      >
        <Button asChild size="lg" className="w-full">
          <Link to="/forgot-password">{t('auth.reset.requestNew')}</Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t('auth.reset.title')}
      description={t('auth.reset.description', { email: user.email })}
    >
      {error && <AuthAlert>{t(`auth.errors.${error}`)}</AuthAlert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
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
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
            {t('auth.reset.submit')}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}

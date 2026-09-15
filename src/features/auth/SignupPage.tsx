import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { LoaderCircle } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { AuthAlert } from './AuthAlert'
import { AuthCard } from './AuthCard'
import type { AuthErrorKey } from './authErrors'
import { AuthField } from './AuthField'
import { useAuth } from './context'
import { emailSchema, passwordMismatch, passwordSchema, passwordsMatch } from './schemas'

const makeSchema = (t: TFunction) =>
  z
    .object({ email: emailSchema(t), password: passwordSchema(t), confirmPassword: z.string() })
    .refine(passwordsMatch, passwordMismatch(t))

type FormValues = z.infer<ReturnType<typeof makeSchema>>

const linkClass = 'font-medium text-foreground underline-offset-4 hover:underline'

export function SignupPage() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const id = useId()
  const [params] = useSearchParams()
  const [error, setError] = useState<AuthErrorKey | null>(null)
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null)
  const schema = useMemo(() => makeSchema(t), [t])
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const redirect = params.get('redirect')
  const loginPath = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'

  // Without email confirmation the user is signed in and <GuestOnly> redirects.
  const onSubmit = async ({ email, password }: FormValues) => {
    setError(null)
    const result = await signUp(email, password)
    if (result.error) setError(result.error)
    else if (result.needsConfirmation) setConfirmationSentTo(email)
  }

  if (confirmationSentTo) {
    return (
      <AuthCard
        title={t('auth.signup.checkEmailTitle')}
        footer={
          <Link to={loginPath} className={linkClass}>
            {t('auth.backToLogin')}
          </Link>
        }
      >
        <AuthAlert variant="success">
          {t('auth.signup.checkEmail', { email: confirmationSentTo })}
        </AuthAlert>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t('auth.signup.title')}
      description={t('auth.signup.description')}
      footer={
        <p>
          {t('auth.signup.hasAccount')}{' '}
          <Link to={loginPath} className={linkClass}>
            {t('auth.login.action')}
          </Link>
        </p>
      }
    >
      {error && <AuthAlert>{t(`auth.errors.${error}`)}</AuthAlert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <AuthField
            id={`${id}-email`}
            label={t('auth.fields.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            error={errors.email}
            {...register('email')}
          />
          <AuthField
            id={`${id}-password`}
            label={t('auth.fields.password')}
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
            {t('auth.signup.submit')}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}

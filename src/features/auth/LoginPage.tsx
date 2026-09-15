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
import { emailSchema } from './schemas'

const makeSchema = (t: TFunction) =>
  z.object({ email: emailSchema(t), password: z.string().min(1, t('validation.required')) })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

const linkClass = 'font-medium text-foreground underline-offset-4 hover:underline'

export function LoginPage() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const id = useId()
  const [params] = useSearchParams()
  const [error, setError] = useState<AuthErrorKey | null>(null)
  const schema = useMemo(() => makeSchema(t), [t])
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const redirect = params.get('redirect')
  const signupPath = redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'

  // On success <GuestOnly> redirects as soon as the session is available.
  const onSubmit = async ({ email, password }: FormValues) => {
    setError(null)
    const result = await signIn(email, password)
    if (result.error) setError(result.error)
  }

  return (
    <AuthCard
      title={t('auth.login.title')}
      description={t('auth.login.description')}
      footer={
        <>
          <p>
            {t('auth.login.noAccount')}{' '}
            <Link to={signupPath} className={linkClass}>
              {t('auth.signup.link')}
            </Link>
          </p>
          <Link to="/" className="underline-offset-4 hover:underline">
            {t('auth.continueLocal')}
          </Link>
        </>
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
            autoComplete="current-password"
            error={errors.password}
            action={
              <Link
                to="/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                {t('auth.login.forgot')}
              </Link>
            }
            {...register('password')}
          />
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
            {t('auth.login.submit')}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}

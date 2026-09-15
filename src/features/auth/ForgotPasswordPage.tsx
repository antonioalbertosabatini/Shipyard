import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { LoaderCircle } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { AuthAlert } from './AuthAlert'
import { AuthCard } from './AuthCard'
import type { AuthErrorKey } from './authErrors'
import { AuthField } from './AuthField'
import { useAuth } from './context'
import { emailSchema } from './schemas'

const makeSchema = (t: TFunction) => z.object({ email: emailSchema(t) })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { requestPasswordReset } = useAuth()
  const id = useId()
  const [error, setError] = useState<AuthErrorKey | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const schema = useMemo(() => makeSchema(t), [t])
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } })

  // The confirmation never reveals whether an account exists for the address.
  const onSubmit = async ({ email }: FormValues) => {
    setError(null)
    const result = await requestPasswordReset(email)
    if (result.error) setError(result.error)
    else setSentTo(email)
  }

  const footer = (
    <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
      {t('auth.backToLogin')}
    </Link>
  )

  if (sentTo) {
    return (
      <AuthCard title={t('auth.forgot.title')} footer={footer}>
        <AuthAlert variant="success">{t('auth.forgot.sent', { email: sentTo })}</AuthAlert>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t('auth.forgot.title')}
      description={t('auth.forgot.description')}
      footer={footer}
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
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
            {t('auth.forgot.submit')}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}

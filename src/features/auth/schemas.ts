import type { TFunction } from 'i18next'
import { z } from 'zod'

export const PASSWORD_MIN_LENGTH = 8
/** bcrypt, used by Supabase Auth, ignores bytes beyond 72. */
export const PASSWORD_MAX_LENGTH = 72

export const emailSchema = (t: TFunction) =>
  z
    .string()
    .trim()
    .min(1, t('validation.required'))
    .pipe(z.email(t('auth.validation.email')))

export const passwordSchema = (t: TFunction) =>
  z
    .string()
    .min(PASSWORD_MIN_LENGTH, t('auth.validation.passwordTooShort', { min: PASSWORD_MIN_LENGTH }))
    .max(PASSWORD_MAX_LENGTH, t('validation.tooLong', { max: PASSWORD_MAX_LENGTH }))

export const passwordsMatch = (values: { password: string; confirmPassword: string }) =>
  values.password === values.confirmPassword

export const passwordMismatch = (t: TFunction) => ({
  message: t('auth.validation.passwordMismatch'),
  path: ['confirmPassword'],
})

/** A new password typed twice. */
export const newPasswordSchema = (t: TFunction) =>
  z
    .object({ password: passwordSchema(t), confirmPassword: z.string() })
    .refine(passwordsMatch, passwordMismatch(t))

/** Only same-app paths, to avoid open redirects through `?redirect=`. */
export function safeRedirect(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\'))
    return fallback
  return value
}

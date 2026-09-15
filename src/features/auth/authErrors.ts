/** Auth failures the UI can explain; each maps to `auth.errors.<key>` in the locale files. */
export type AuthErrorKey =
  | 'invalidCredentials'
  | 'wrongPassword'
  | 'emailNotConfirmed'
  | 'userExists'
  | 'weakPassword'
  | 'samePassword'
  | 'invalidEmail'
  | 'signupDisabled'
  | 'rateLimited'
  | 'linkExpired'
  | 'network'
  | 'generic'

const BY_CODE: Record<string, AuthErrorKey | undefined> = {
  invalid_credentials: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  user_already_exists: 'userExists',
  email_exists: 'userExists',
  weak_password: 'weakPassword',
  same_password: 'samePassword',
  email_address_invalid: 'invalidEmail',
  signup_disabled: 'signupDisabled',
  over_email_send_rate_limit: 'rateLimited',
  over_request_rate_limit: 'rateLimited',
  otp_expired: 'linkExpired',
  flow_state_expired: 'linkExpired',
  flow_state_not_found: 'linkExpired',
  bad_code_verifier: 'linkExpired',
  session_not_found: 'linkExpired',
  session_expired: 'linkExpired',
}

/** Maps a Supabase auth error (or any thrown value) to a translatable key. */
export function authErrorKey(error: unknown): AuthErrorKey {
  if (!error || typeof error !== 'object') return 'generic'
  const { code, name } = error as { code?: unknown; name?: unknown }
  if (typeof code === 'string') {
    const key = BY_CODE[code]
    if (key) return key
  }
  if (name === 'AuthRetryableFetchError' || error instanceof TypeError) return 'network'
  return 'generic'
}

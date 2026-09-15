import { describe, expect, it } from 'vitest'
import { authErrorKey } from './authErrors'
import { safeRedirect } from './schemas'

describe('authErrorKey', () => {
  it('maps Supabase error codes', () => {
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe('invalidCredentials')
    expect(authErrorKey({ code: 'user_already_exists' })).toBe('userExists')
    expect(authErrorKey({ code: 'otp_expired' })).toBe('linkExpired')
  })

  it('recognizes network failures', () => {
    expect(authErrorKey({ name: 'AuthRetryableFetchError' })).toBe('network')
    expect(authErrorKey(new TypeError('Failed to fetch'))).toBe('network')
  })

  it('falls back to a generic error', () => {
    expect(authErrorKey({ code: 'something_new' })).toBe('generic')
    expect(authErrorKey(undefined)).toBe('generic')
  })
})

describe('safeRedirect', () => {
  it('keeps same-app paths', () => {
    expect(safeRedirect('/projects/1?view=list')).toBe('/projects/1?view=list')
  })

  it('rejects external or malformed targets', () => {
    expect(safeRedirect('https://evil.example')).toBe('/')
    expect(safeRedirect('//evil.example')).toBe('/')
    expect(safeRedirect('/\\evil.example')).toBe('/')
    expect(safeRedirect(null, '/account')).toBe('/account')
  })
})

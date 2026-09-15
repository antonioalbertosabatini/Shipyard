import '@/i18n'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from './context'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { LoginPage } from './LoginPage'
import { ResetPasswordPage } from './ResetPasswordPage'
import { SignupPage } from './SignupPage'

function renderWithAuth(ui: ReactNode, overrides: Partial<AuthContextValue> = {}) {
  const auth: AuthContextValue = {
    isConfigured: true,
    isReady: true,
    user: null,
    signIn: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(async () => ({ error: null, needsConfirmation: false })),
    signOut: vi.fn(async () => {}),
    requestPasswordReset: vi.fn(async () => ({ error: null })),
    updatePassword: vi.fn(async () => ({ error: null })),
    changePassword: vi.fn(async () => ({ error: null })),
    ...overrides,
  }
  render(
    <AuthContext value={auth}>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthContext>,
  )
  return auth
}

describe('LoginPage', () => {
  it('signs in and shows translated errors', async () => {
    const user = userEvent.setup()
    const auth = renderWithAuth(<LoginPage />, {
      signIn: vi.fn(async () => ({ error: 'invalidCredentials' as const })),
    })

    await user.type(screen.getByLabelText('Email'), ' me@example.com ')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument()
    expect(auth.signIn).toHaveBeenCalledWith('me@example.com', 'secret')
  })

  it('validates the email before calling Supabase', async () => {
    const user = userEvent.setup()
    const auth = renderWithAuth(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(auth.signIn).not.toHaveBeenCalled()
  })
})

describe('SignupPage', () => {
  it('requires matching passwords', async () => {
    const user = userEvent.setup()
    const auth = renderWithAuth(<SignupPage />)

    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'password-1')
    await user.type(screen.getByLabelText('Confirm password'), 'password-2')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('asks to confirm the email when required', async () => {
    const user = userEvent.setup()
    renderWithAuth(<SignupPage />, {
      signUp: vi.fn(async () => ({ error: null, needsConfirmation: true })),
    })

    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'password-1')
    await user.type(screen.getByLabelText('Confirm password'), 'password-1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText(/sent a confirmation link to me@example.com/),
    ).toBeInTheDocument()
  })
})

describe('password recovery', () => {
  it('confirms that the reset email was requested', async () => {
    const user = userEvent.setup()
    const auth = renderWithAuth(<ForgotPasswordPage />)

    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText(/If an account exists for me@example.com/)).toBeInTheDocument()
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('me@example.com')
  })

  it('explains an invalid reset link when there is no recovery session', () => {
    renderWithAuth(<ResetPasswordPage />)
    expect(screen.getByText('Link expired or invalid')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })
})

import type { User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { AuthErrorKey } from './authErrors'

export interface AuthResult {
  error: AuthErrorKey | null
}

export interface SignUpResult extends AuthResult {
  /** True when Supabase requires the user to confirm the email before signing in. */
  needsConfirmation: boolean
}

export interface AuthContextValue {
  /** False in local-only mode (Supabase is not configured). */
  isConfigured: boolean
  /** True once the stored session (or a session from an email link) has been restored. */
  isReady: boolean
  user: User | null
  signIn(email: string, password: string): Promise<AuthResult>
  signUp(email: string, password: string): Promise<SignUpResult>
  /** Ends the session on this device only. */
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<AuthResult>
  /** Sets a new password for the current session (e.g. after a recovery link). */
  updatePassword(password: string): Promise<AuthResult>
  /** Verifies the current password before setting a new one. */
  changePassword(currentPassword: string, newPassword: string): Promise<AuthResult>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}

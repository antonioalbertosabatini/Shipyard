import type { SupabaseClient, User } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { authRedirectUrl } from '@/lib/supabase'
import { authErrorKey } from './authErrors'
import { AuthContext, type AuthContextValue, type AuthResult } from './context'

type Actions = Omit<AuthContextValue, 'isConfigured' | 'isReady' | 'user'>

function createActions(client: SupabaseClient | null): Actions {
  const run = async (
    action: (client: SupabaseClient) => Promise<{ error: unknown }>,
  ): Promise<AuthResult> => {
    if (!client) return { error: 'generic' }
    try {
      const { error } = await action(client)
      return { error: error ? authErrorKey(error) : null }
    } catch (error) {
      return { error: authErrorKey(error) }
    }
  }

  return {
    signIn: (email, password) => run((c) => c.auth.signInWithPassword({ email, password })),

    async signUp(email, password) {
      if (!client) return { error: 'generic', needsConfirmation: false }
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirectUrl('/login') },
        })
        if (error) return { error: authErrorKey(error), needsConfirmation: false }
        return { error: null, needsConfirmation: !data.session }
      } catch (error) {
        return { error: authErrorKey(error), needsConfirmation: false }
      }
    },

    async signOut() {
      // Local scope: works offline and keeps sessions on other devices.
      await client?.auth.signOut({ scope: 'local' }).catch(() => {})
    },

    requestPasswordReset: (email) =>
      run((c) =>
        c.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl('/reset-password') }),
      ),

    updatePassword: (password) => run((c) => c.auth.updateUser({ password })),

    async changePassword(currentPassword, newPassword) {
      const email = client && (await client.auth.getSession()).data.session?.user.email
      if (!email) return { error: 'generic' }
      const check = await run((c) =>
        c.auth.signInWithPassword({ email, password: currentPassword }),
      )
      if (check.error)
        return { error: check.error === 'invalidCredentials' ? 'wrongPassword' : check.error }
      return run((c) => c.auth.updateUser({ password: newPassword }))
    },
  }
}

export function AuthProvider({
  client,
  children,
}: {
  client: SupabaseClient | null
  children: ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [isReady, setReady] = useState(!client)
  const actions = useMemo(() => createActions(client), [client])

  useEffect(() => {
    if (!client) return
    // INITIAL_SESSION fires after the stored session and any `?code=` from an email link are processed.
    const { data } = client.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'INITIAL_SESSION') setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [client])

  const value = useMemo<AuthContextValue>(
    () => ({ ...actions, isConfigured: !!client, isReady, user }),
    [actions, client, isReady, user],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

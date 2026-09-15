import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Creates the Supabase client, or `null` when the environment is not configured (local-only mode). */
export function createSupabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, {
    auth: {
      // PKCE returns `?code=` in the query string, which also works with the hash router.
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

/** Absolute URL of an app route, used as redirect target in auth emails. */
export function authRedirectUrl(path: string): string {
  const base = (import.meta.env.VITE_AUTH_REDIRECT_URL?.trim() || window.location.origin).replace(
    /\/+$/,
    '',
  )
  return import.meta.env.VITE_ROUTER_MODE === 'hash' ? `${base}/#${path}` : `${base}${path}`
}

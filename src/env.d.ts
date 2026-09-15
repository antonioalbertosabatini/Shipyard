interface ImportMetaEnv {
  /** `hash` for file-based shells (Electron, Capacitor); defaults to browser history. */
  readonly VITE_ROUTER_MODE?: 'browser' | 'hash'
  /** Supabase project URL; cloud sync is disabled when missing. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase publishable (or legacy anon) key; cloud sync is disabled when missing. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Base URL for auth email links; defaults to the current origin. */
  readonly VITE_AUTH_REDIRECT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

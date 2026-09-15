interface ImportMetaEnv {
  /** `hash` for file-based shells (Electron, Capacitor); defaults to browser history. */
  readonly VITE_ROUTER_MODE?: 'browser' | 'hash'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

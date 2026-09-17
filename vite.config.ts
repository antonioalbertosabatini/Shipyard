import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Not needed in unit tests, and icon generation would slow them down.
    !process.env.VITEST &&
      VitePWA({
        registerType: 'prompt',
        pwaAssets: { config: true, overrideManifestIcons: true },
        manifest: {
          name: 'Shipyard',
          short_name: 'Shipyard',
          description: 'Project and task tracker for developers',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: 'index.html',
          // The main bundle is above the 2 MiB default.
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          cleanupOutdatedCaches: true,
        },
      }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import '@/i18n'
import './index.css'
import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'
import { createRepositories } from '@/data'

// Ask the browser not to evict IndexedDB data under storage pressure.
void navigator.storage?.persist?.()

const repositories = createRepositories()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders repositories={repositories}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)

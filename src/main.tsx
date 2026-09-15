import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import '@/i18n'
import './index.css'
import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'
import { createDataLayer } from '@/data'
import { createSupabaseClient } from '@/lib/supabase'

// Ask the browser not to evict IndexedDB data under storage pressure.
void navigator.storage?.persist?.()

const supabase = createSupabaseClient()
const { repositories, sync } = createDataLayer(supabase)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders repositories={repositories} sync={sync} supabase={supabase}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)

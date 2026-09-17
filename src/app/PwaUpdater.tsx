import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Re-check for a new deploy while the app stays open (installed PWAs rarely reload).
const UPDATE_CHECK_MS = 60 * 60 * 1000

/** Registers the service worker and offers a reload when a new version is deployed. */
export function PwaUpdater() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      setInterval(() => {
        if (registration.installing || !navigator.onLine) return
        // Fetch the worker script bypassing the HTTP cache, then let the browser compare it.
        void fetch(swUrl, { cache: 'no-store' })
          .then((response) => (response.ok ? registration.update() : undefined))
          .catch(() => {})
      }, UPDATE_CHECK_MS)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    toast.success(t('pwa.offlineReady'))
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady, t])

  useEffect(() => {
    if (!needRefresh) return
    // Prompt instead of reloading on its own, so an open form is never lost.
    toast.info(t('pwa.updateAvailable'), {
      id: 'pwa-update',
      duration: Infinity,
      action: { label: t('pwa.reload'), onClick: () => void updateServiceWorker(true) },
    })
  }, [needRefresh, updateServiceWorker, t])

  return null
}

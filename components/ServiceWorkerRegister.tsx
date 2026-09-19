'use client'

import { useEffect } from 'react'

// Registers the service worker for faster repeat launches (cached app shell).
// updateViaCache:'none' ensures the SW file itself is always checked fresh,
// so a new version is picked up promptly — never stuck on an old worker.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .catch((err) => {
          // SW is a progressive enhancement for caching, but push depends on it,
          // so make the failure visible rather than swallowing it silently.
          console.error('[sw] registration failed:', err)
        })
    }

    // React effects run after hydration, which on a warm cache frequently happens
    // AFTER window's load event has already fired. Listening for a load event that
    // has already passed means the callback never runs and the worker is never
    // registered - which silently breaks push for that visitor. So check first.
    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])
  return null
}

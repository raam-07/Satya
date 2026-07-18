'use client'

import { useEffect } from 'react'

// Registers the service worker for faster repeat launches (cached app shell).
// updateViaCache:'none' ensures the SW file itself is always checked fresh,
// so a new version is picked up promptly — never stuck on an old worker.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .catch(() => { /* SW is a progressive enhancement; ignore failures */ })
    }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])
  return null
}

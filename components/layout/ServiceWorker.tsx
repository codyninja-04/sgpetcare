'use client'

import { useEffect } from 'react'

/** Registers the worker so the app installs as a PWA and can receive reminder pushes. */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Not fatal. The app works without it, reminders just fall back to email.
    })
  }, [])
  return null
}

// Small on purpose. It lets the app install as a PWA and receive reminder
// pushes when the tab is closed. No offline caching of health records, since a
// stale vaccination date is worse than no page at all.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'SGPetCare', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'SGPetCare', {
      body: payload.body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: payload.tag || 'sgpetcare-reminder',
      data: { url: payload.url || '/pets' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/pets'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})

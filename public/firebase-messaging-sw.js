// SaveMe FCM Background Service Worker
/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const payload = event.data.json()
    const notification = payload.notification || payload.data || {}

    const title = notification.title || 'SaveMe - Asisten Finansial'
    const options = {
      body: notification.body || 'Cek jatah belanja harianmu hari ini!',
      icon: notification.icon || '/logo.svg',
      badge: '/logo.svg',
      vibrate: [200, 100, 200],
      tag: notification.tag || 'daily-spending-reminder',
      renotify: true,
      data: {
        url: notification.click_action || notification.url || '/daily',
        dateOfArrival: Date.now(),
      },
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch (err) {
    // Fallback if payload is plain text
    const text = event.data.text()
    const options = {
      body: text,
      icon: '/globe.svg',
      data: { url: '/daily' },
    }
    event.waitUntil(
      self.registration.showNotification('SaveMe Pengingat Harian', options)
    )
  }
})

// Handle Notification Click: Open / Focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/daily'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If an existing tab is open, focus it and navigate
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus()
            if ('navigate' in client) {
              client.navigate(targetUrl)
            }
            return
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})

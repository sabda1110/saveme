// SaveMe FCM Background Service Worker
/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const payload = event.data.json()
    const notification = payload.notification || {}
    const data = payload.data || {}

    const isGroupInvite = data.type === 'GROUP_INVITE' || notification.type === 'GROUP_INVITE'
    const defaultUrl = isGroupInvite ? '/savings' : '/daily'
    const targetUrl = data.url || notification.click_action || defaultUrl

    const title =
      notification.title ||
      (isGroupInvite
        ? '📩 Undangan Celengan Bersama Baru!'
        : 'SaveMe - Asisten Finansial')

    const body =
      notification.body ||
      (isGroupInvite
        ? 'Kamu diajak menabung bersama! Buka aplikasi untuk merespon undangan.'
        : 'Cek jatah belanja harianmu hari ini!')

    const tag = isGroupInvite
      ? `group-invite-${data.groupId || Date.now()}`
      : (notification.tag || 'daily-spending-reminder')

    const options = {
      body,
      icon: notification.icon || '/logo.svg',
      badge: '/logo.svg',
      vibrate: isGroupInvite ? [200, 100, 200, 100, 200] : [200, 100, 200],
      tag,
      renotify: true,
      requireInteraction: isGroupInvite, // Keep invite notification prominent until user interacts
      data: {
        url: targetUrl,
        type: data.type || (isGroupInvite ? 'GROUP_INVITE' : 'GENERAL'),
        groupId: data.groupId,
        dateOfArrival: Date.now(),
      },
    }

    event.waitUntil(
      (async () => {
        // 1. Show native OS / Desktop notification
        await self.registration.showNotification(title, options)

        // 2. Also notify any open client tabs to auto-refresh data immediately
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        for (const client of clients) {
          client.postMessage({
            type: 'SAVEME_BACKGROUND_NOTIFICATION',
            payload: { title, body, data: options.data },
          })
        }
      })()
    )
  } catch (err) {
    // Fallback if payload is plain text
    const text = event.data.text()
    const options = {
      body: text,
      icon: '/logo.svg',
      data: { url: '/savings' },
    }
    event.waitUntil(
      self.registration.showNotification('📩 Undangan Celengan Bersama', options)
    )
  }
})

// Handle Notification Click: Open / Focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/savings'

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
            client.postMessage({
              type: 'SAVEME_REFRESH_INVITES',
            })
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

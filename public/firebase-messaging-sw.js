// SaveMe FCM Background Service Worker
/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const payload = event.data.json()
    const notification = payload.notification || {}
    const data = payload.data || {}

    const isGroupEvent =
      data.type === 'GROUP_INVITE' ||
      data.type === 'GROUP_MEMBER_JOINED' ||
      data.type === 'GROUP_DISSOLVED' ||
      data.type === 'GROUP_DISSOLUTION_REQUEST' ||
      data.type === 'GROUP_DISSOLUTION_REJECTED' ||
      notification.type === 'GROUP_INVITE'

    const defaultUrl = isGroupEvent ? '/savings' : '/daily'
    const targetUrl = data.url || notification.click_action || defaultUrl

    let defaultTitle = 'SaveMe - Asisten Finansial'
    let defaultBody = 'Cek jatah belanja harianmu hari ini!'

    if (data.type === 'GROUP_INVITE') {
      defaultTitle = '📩 Undangan Celengan Bersama Baru!'
      defaultBody = 'Kamu diajak menabung bersama! Buka aplikasi untuk merespon undangan.'
    } else if (data.type === 'GROUP_MEMBER_JOINED') {
      defaultTitle = '🎉 Anggota Baru Bergabung!'
      defaultBody = 'Seseorang telah bergabung ke Celengan Bersama.'
    } else if (data.type === 'GROUP_DISSOLVED') {
      defaultTitle = '⚠️ Celengan Bersama Dibatalkan / Dibubarkan'
      defaultBody = 'Celengan bersama telah dibatalkan atau dibubarkan.'
    } else if (data.type === 'GROUP_DISSOLUTION_REQUEST') {
      defaultTitle = '🗳️ Pengajuan Pembubaran Celengan'
      defaultBody = 'Ada pengajuan pembubaran celengan bersama yang membutuhkan persetujuanmu.'
    }

    const title = notification.title || defaultTitle
    const body = notification.body || defaultBody

    const tag = isGroupEvent
      ? `group-${(data.type || 'event').toLowerCase()}-${data.groupId || Date.now()}`
      : (notification.tag || 'daily-spending-reminder')

    const options = {
      body,
      icon: notification.icon || '/logo.svg',
      badge: '/logo.svg',
      vibrate: isGroupEvent ? [200, 100, 200, 100, 200] : [200, 100, 200],
      tag,
      renotify: true,
      requireInteraction: isGroupEvent, // Keep group notification prominent until user interacts
      data: {
        url: targetUrl,
        type: data.type || (isGroupEvent ? 'GROUP_EVENT' : 'GENERAL'),
        groupId: data.groupId,
        dateOfArrival: Date.now(),
      },
    }

    event.waitUntil(
      (async () => {
        // 1. Show native OS / Desktop notification immediately (critical for iOS WebKit)
        try {
          await self.registration.showNotification(title, options)
        } catch (showErr) {
          console.warn('[SW] showNotification error:', showErr)
        }

        // 2. Also notify any open client tabs to auto-refresh data immediately
        try {
          const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          for (const client of clients) {
            client.postMessage({
              type: 'SAVEME_BACKGROUND_NOTIFICATION',
              payload: { title, body, data: options.data },
            })
          }
        } catch (clientErr) {
          // ignore
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

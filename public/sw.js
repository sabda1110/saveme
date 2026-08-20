const CACHE_NAME = 'saveme-cache-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/globe.svg',
  '/window.svg',
]

// 1. Install Event: Pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// 2. Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// 3. Fetch Event: Smart Offline Caching Strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Ignore non-GET requests or Firebase / external API calls (Firebase handles its own IndexedDB cache)
  if (
    event.request.method !== 'GET' ||
    url.origin.includes('firestore.googleapis.com') ||
    url.origin.includes('identitytoolkit.googleapis.com') ||
    url.origin.includes('generativelanguage.googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  // Navigation requests (HTML pages): Network-First, fallback to Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
          }
          return response
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request)
          if (cachedResponse) return cachedResponse
          const rootCached = await caches.match('/')
          if (rootCached) return rootCached
          return new Response('Offline - Silakan buka halaman saat online kembali', {
            headers: { 'Content-Type': 'text/plain' },
          })
        })
    )
    return
  }

  // Static Assets (_next/static, images, fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
          }
          return networkResponse
        })
        .catch(() => cachedResponse)

      return cachedResponse || fetchPromise
    })
  )
})

import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging'
import { app } from './config'

export type TimeZoneCode = 'WIB' | 'WITA' | 'WIT' | 'OTHER'

export interface UserTimeZoneInfo {
  timeZone: string
  zoneCode: TimeZoneCode
  zoneLabel: string
  offsetHours: number
}

/**
 * Detect user's local timezone and map to Indonesian zones (WIB/WITA/WIT)
 */
export function detectUserTimezone(): UserTimeZoneInfo {
  if (typeof window === 'undefined') {
    return {
      timeZone: 'Asia/Jakarta',
      zoneCode: 'WIB',
      zoneLabel: 'WIB (Waktu Indonesia Barat)',
      offsetHours: 7,
    }
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
  const offsetMinutes = -new Date().getTimezoneOffset()
  const offsetHours = Math.round(offsetMinutes / 60)

  let zoneCode: TimeZoneCode = 'WIB'
  let zoneLabel = 'WIB (Waktu Indonesia Barat - UTC+7)'

  if (
    offsetHours === 8 ||
    timeZone.includes('Makassar') ||
    timeZone.includes('Bali') ||
    timeZone.includes('Ujung_Pandang')
  ) {
    zoneCode = 'WITA'
    zoneLabel = 'WITA (Waktu Indonesia Tengah - UTC+8)'
  } else if (
    offsetHours === 9 ||
    timeZone.includes('Jayapura')
  ) {
    zoneCode = 'WIT'
    zoneLabel = 'WIT (Waktu Indonesia Timur - UTC+9)'
  } else if (offsetHours === 7 || timeZone.includes('Jakarta') || timeZone.includes('Pontianak')) {
    zoneCode = 'WIB'
    zoneLabel = 'WIB (Waktu Indonesia Barat - UTC+7)'
  } else {
    zoneCode = 'OTHER'
    zoneLabel = `${timeZone} (UTC${offsetHours >= 0 ? '+' : ''}${offsetHours})`
  }

  return {
    timeZone,
    zoneCode,
    zoneLabel,
    offsetHours,
  }
}

/**
 * Initialize FCM Messaging instance safely (guards against unsupported browser environments)
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null

  const supported = await isSupported().catch(() => false)
  if (!supported) {
    console.warn('[FCM] Firebase Messaging is not supported in this browser environment.')
    return null
  }

  try {
    return getMessaging(app)
  } catch (err) {
    console.warn('[FCM] Error initializing messaging instance:', err)
    return null
  }
}

/**
 * Request notification permission from the user's browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (err) {
    console.error('[FCM] Error requesting notification permission:', err)
    return 'denied'
  }
}

/**
 * Retrieve the FCM Device Registration Token
 */
export async function getFCMRegistrationToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  try {
    const messaging = await getMessagingInstance()
    if (!messaging) return null

    // Register Firebase Messaging Service Worker
    let swRegistration: ServiceWorkerRegistration | undefined
    if ('serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      })
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

    const currentToken = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: swRegistration,
    })

    if (currentToken) {
      return currentToken
    } else {
      console.warn('[FCM] No registration token available. Request permission to generate one.')
      return null
    }
  } catch (err) {
    console.error('[FCM] An error occurred while retrieving token:', err)
    return null
  }
}

/**
 * Foreground message listener (when app is active/in focus)
 */
export async function setupForegroundMessageListener(
  onMessageReceived: (payload: { title?: string; body?: string; url?: string }) => void
): Promise<(() => void) | null> {
  const messaging = await getMessagingInstance()
  if (!messaging) return null

  const unsubscribe = onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'SaveMe'
    const body = payload.notification?.body || ''
    const url = payload.data?.url || '/daily'
    onMessageReceived({ title, body, url })
  })

  return unsubscribe
}

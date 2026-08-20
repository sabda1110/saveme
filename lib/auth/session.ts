/**
 * SaveMe Session Manager
 * Enforces a strict 7-day Session TTL (Time-To-Live) for authenticated users.
 */

const SESSION_STORAGE_KEY = 'saveme_auth_session'
export const SESSION_DURATION_DAYS = 7
export const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000

export interface UserSessionData {
  uid: string
  loggedInAt: number
  expiresAt: number
}

/**
 * Initializes a new 7-day session for the authenticated user.
 */
export function initSession(uid: string): UserSessionData {
  if (typeof window === 'undefined') {
    return {
      uid,
      loggedInAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_MS,
    }
  }

  const now = Date.now()
  const sessionData: UserSessionData = {
    uid,
    loggedInAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  }

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData))
  } catch (err) {
    console.error('[session] Failed to save session to localStorage:', err)
  }

  return sessionData
}

/**
 * Validates if the current session for the given UID is active and within the 7-day window.
 */
export function isSessionValid(uid: string): boolean {
  if (typeof window === 'undefined') return true

  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) {
      // If user is logged into Firebase Auth but no session recorded (e.g. legacy session),
      // we initialize it once to grant the 7-day window.
      initSession(uid)
      return true
    }

    const session: UserSessionData = JSON.parse(raw)

    // Check if session belongs to current user
    if (session.uid !== uid) {
      initSession(uid)
      return true
    }

    // Check if 7 days have passed
    const now = Date.now()
    if (now >= session.expiresAt) {
      console.warn('[session] Session has expired (> 7 days). Auto-logging out.')
      return false
    }

    return true
  } catch (err) {
    console.error('[session] Error checking session validity:', err)
    return true
  }
}

/**
 * Clears the stored session on manual or automatic logout.
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch (err) {
    console.error('[session] Failed to clear session:', err)
  }
}

/**
 * Returns remaining session lifetime in days and hours.
 */
export function getSessionExpiryInfo(uid: string): {
  daysLeft: number
  hoursLeft: number
  isExpired: boolean
} {
  if (typeof window === 'undefined') {
    return { daysLeft: 7, hoursLeft: 0, isExpired: false }
  }

  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return { daysLeft: 7, hoursLeft: 0, isExpired: false }

    const session: UserSessionData = JSON.parse(raw)
    if (session.uid !== uid) return { daysLeft: 7, hoursLeft: 0, isExpired: false }

    const now = Date.now()
    const diff = session.expiresAt - now

    if (diff <= 0) {
      return { daysLeft: 0, hoursLeft: 0, isExpired: true }
    }

    const daysLeft = Math.floor(diff / (24 * 60 * 60 * 1000))
    const hoursLeft = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

    return { daysLeft, hoursLeft, isExpired: false }
  } catch {
    return { daysLeft: 7, hoursLeft: 0, isExpired: false }
  }
}

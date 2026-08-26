import { db } from '@/lib/firebase/config'
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import type { UserTimeZoneInfo } from '@/lib/firebase/messaging'

export interface UserNotificationSettings {
  enabled: boolean
  fcmToken?: string
  timeZone?: string
  zoneCode?: string
  preferredHour?: number // default: 7 (07:00 AM)
  updatedAt?: unknown
}

export const notificationService = {
  /**
   * Save user's FCM token and detected timezone to Firestore
   */
  async saveUserFcmToken(
    userId: string,
    fcmToken: string,
    timeZoneInfo: UserTimeZoneInfo
  ): Promise<void> {
    if (!userId) throw new Error('User ID is required')

    const userRef = doc(db, 'users', userId)
    const payload = {
      fcmToken,
      timeZone: timeZoneInfo.timeZone,
      zoneCode: timeZoneInfo.zoneCode,
      zoneOffsetHours: timeZoneInfo.offsetHours,
      notificationsEnabled: true,
      preferredNotificationHour: 7,
      notificationUpdatedAt: serverTimestamp(),
    }

    await setDoc(userRef, payload, { merge: true })

    // Also register to Topic on backend
    const topicName = `daily-reminder-${timeZoneInfo.zoneCode.toLowerCase()}`
    try {
      await this.subscribeToTopic(fcmToken, topicName)
    } catch (err) {
      console.warn('[notificationService] Failed to auto-subscribe topic:', err)
    }
  },

  /**
   * Update user notification enabled status or preferred hour
   */
  async updatePreferences(
    userId: string,
    enabled: boolean,
    preferredHour = 7
  ): Promise<void> {
    if (!userId) throw new Error('User ID is required')

    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      notificationsEnabled: enabled,
      preferredNotificationHour: preferredHour,
      notificationUpdatedAt: serverTimestamp(),
    })
  },

  /**
   * Get user notification preferences
   */
  async getSettings(userId: string): Promise<UserNotificationSettings> {
    if (!userId) return { enabled: false }

    const userRef = doc(db, 'users', userId)
    const snap = await getDoc(userRef)

    if (!snap.exists()) {
      return { enabled: false }
    }

    const data = snap.data()
    return {
      enabled: Boolean(data.notificationsEnabled),
      fcmToken: data.fcmToken,
      timeZone: data.timeZone,
      zoneCode: data.zoneCode,
      preferredHour: data.preferredNotificationHour ?? 7,
      updatedAt: data.notificationUpdatedAt,
    }
  },

  /**
   * Call backend route to subscribe FCM token to a specific topic
   */
  async subscribeToTopic(token: string, topic: string): Promise<boolean> {
    try {
      const res = await fetch('/api/notifications/subscribe-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, topic }),
      })
      const result = await res.json()
      return Boolean(result.success)
    } catch (err) {
      console.error('[notificationService] Error calling subscribe-topic API:', err)
      return false
    }
  },

  /**
   * Send an instant test push notification to user device
   */
  async sendTestPushNotification(
    userId: string,
    token: string,
    zoneCode = 'WIB'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/notifications/send-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token,
          zoneCode,
          isTest: true,
        }),
      })
      const result = await res.json()
      return result
    } catch (err) {
      console.error('[notificationService] Error sending test notification:', err)
      return {
        success: false,
        message: 'Gagal menghubungi server pengirim notifikasi.',
      }
    }
  },
}

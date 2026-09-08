'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { walletService } from '@/lib/services/wallet.firebase'

export interface DispatchNotificationOptions {
  userId: string
  userName?: string
  isSimulation?: boolean
}

export interface DispatchNotificationResult {
  success: boolean
  formattedLimit: string
  title: string
  body: string
}

/**
 * Dispatch morning briefing notification via ServiceWorker or Web Notification constructor.
 * Resolves safely without hanging on navigator.serviceWorker.ready.
 */
export async function dispatchMorningBriefingNotification({
  userId,
  userName,
  isSimulation = false,
}: DispatchNotificationOptions): Promise<DispatchNotificationResult> {
  // 1. Calculate live daily spending limit
  let dailyLimit = 50000
  try {
    const userWallets = await walletService.getUserWallets(userId)
    const operatingCash = userWallets
      .filter((w) => !w.isLocked && !w.isEarmarked)
      .reduce((sum, w) => sum + (Number(w.balance) || 0), 0)

    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysLeftInMonth = Math.max(1, lastDay - now.getDate() + 1)
    if (operatingCash > 0) {
      dailyLimit = Math.round(operatingCash / daysLeftInMonth)
    }
  } catch (err) {
    console.warn('[MorningBriefingAlarm] Error calculating daily limit:', err)
  }

  const formattedLimit = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(dailyLimit)

  const name = userName || 'Teman SaveMe'
  const title = isSimulation
    ? `🧪 Simulasi Jam 07:00 Pagi: Jatah Hari Ini ${formattedLimit}`
    : `🌅 Selamat Pagi, ${name}! Jatah Hari Ini: ${formattedLimit}`
  const body = `Batas belanja amanmu hari ini sebesar ${formattedLimit}. Gunakan dengan bijak agar tabungan akhir bulan tetap aman!`

  // 2. Dispatch via ServiceWorker registration with 800ms timeout race, or direct Notification constructor
  let dispatched = false

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
      ])

      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/logo.svg',
          badge: '/logo.svg',
          data: { url: '/daily' },
        })
        dispatched = true
      }
    } catch {
      // Fallback
    }
  }

  if (!dispatched && typeof window !== 'undefined' && 'Notification' in window) {
    try {
      new Notification(title, {
        body,
        icon: '/logo.svg',
      })
      dispatched = true
    } catch (err) {
      console.warn('[MorningBriefingAlarm] Direct notification constructor failed:', err)
    }
  }

  return {
    success: dispatched,
    formattedLimit,
    title,
    body,
  }
}

export function MorningBriefingAlarm() {
  const { user, userProfile } = useAuth()
  const isCheckingRef = useRef(false)

  useEffect(() => {
    if (!user?.uid) return

    async function checkAndTriggerMorningAlarm() {
      if (typeof window === 'undefined' || isCheckingRef.current) return
      isCheckingRef.current = true

      try {
        const now = new Date()
        const currentHour = now.getHours()

        // Only trigger at 07:00 or later
        if (currentHour < 7) return

        const todayStr = now.toISOString().split('T')[0]
        const storageKey = `saveme_morning_alert_${todayStr}_${user?.uid}`

        // Check if already fired today
        if (localStorage.getItem(storageKey)) return

        // Check notification permission
        if (!('Notification' in window) || Notification.permission !== 'granted') {
          return
        }

        // Dispatch briefing
        const result = await dispatchMorningBriefingNotification({
          userId: user!.uid,
          userName: userProfile?.name,
          isSimulation: false,
        })

        if (result.success) {
          localStorage.setItem(storageKey, 'true')
        }
      } catch (err) {
        console.warn('[MorningBriefingAlarm] Error triggering alarm:', err)
      } finally {
        isCheckingRef.current = false
      }
    }

    // 1. Initial check on mount
    checkAndTriggerMorningAlarm()

    // 2. Re-check on tab focus / visibility change (e.g. user opens browser in morning)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndTriggerMorningAlarm()
      }
    }

    window.addEventListener('focus', checkAndTriggerMorningAlarm)
    document.addEventListener('visibilitychange', handleVisibility)

    // 3. Periodic interval check every 30 seconds (if user leaves tab open before 07:00)
    const intervalId = setInterval(checkAndTriggerMorningAlarm, 30000)

    return () => {
      window.removeEventListener('focus', checkAndTriggerMorningAlarm)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(intervalId)
    }
  }, [user, userProfile])

  return null
}

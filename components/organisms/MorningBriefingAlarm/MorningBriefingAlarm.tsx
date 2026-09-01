'use client'

import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { walletService } from '@/lib/services/wallet.firebase'

export function MorningBriefingAlarm() {
  const { user, userProfile } = useAuth()

  useEffect(() => {
    if (!user?.uid) return

    async function checkAndTriggerMorningAlarm() {
      if (typeof window === 'undefined') return

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

      try {
        // Calculate user's live daily spending limit
        const userWallets = await walletService.getUserWallets(user!.uid)
        const operatingCash = userWallets
          .filter((w) => !w.isLocked && !w.isEarmarked)
          .reduce((sum, w) => sum + (Number(w.balance) || 0), 0)

        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const daysLeftInMonth = Math.max(1, lastDay - now.getDate() + 1)
        const dailyLimit = Math.round(operatingCash / daysLeftInMonth)

        const formattedLimit = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(dailyLimit)

        const userName = userProfile?.name || 'Teman SaveMe'
        const title = `🌅 Selamat Pagi, ${userName}! Jatah Hari Ini: ${formattedLimit}`
        const body = `Batas belanja amanmu hari ini sebesar ${formattedLimit}. Gunakan dengan bijak agar tabungan akhir bulan tetap aman!`

        // Show Notification via ServiceWorker or Notification Constructor
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready
            if (reg && reg.showNotification) {
              await reg.showNotification(title, {
                body,
                icon: '/logo.svg',
                badge: '/logo.svg',
                data: { url: '/daily' },
              })
              localStorage.setItem(storageKey, 'true')
              return
            }
          } catch {
            // Fallback to standard constructor
          }
        }

        try {
          new Notification(title, {
            body,
            icon: '/logo.svg',
          })
          localStorage.setItem(storageKey, 'true')
        } catch {
          // Ignore if mobile browser blocks constructor
        }
      } catch (err) {
        console.warn('[MorningBriefingAlarm] Error triggering alarm:', err)
      }
    }

    checkAndTriggerMorningAlarm()
  }, [user, userProfile])

  return null
}

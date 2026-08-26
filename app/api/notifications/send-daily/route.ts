import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, token, topic, zoneCode = 'WIB', isTest = false } = body

    // 1. Calculate Safe-to-Spend Daily Limit for user if userId provided
    let calculatedDailyLimit = 50000
    let userName = 'Teman SaveMe'

    if (userId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          userName = userData.name || 'Teman SaveMe'
        }

        // Query active non-locked & non-earmarked wallets
        const walletsSnap = await getDocs(
          query(collection(db, 'wallets'), where('userId', '==', userId))
        )

        let operatingCash = 0
        walletsSnap.forEach((docSnap) => {
          const w = docSnap.data()
          if (!w.isLocked && !w.isEarmarked) {
            operatingCash += Number(w.balance) || 0
          }
        })

        const now = new Date()
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const daysRemaining = Math.max(1, lastDayOfMonth - now.getDate() + 1)

        if (operatingCash > 0) {
          calculatedDailyLimit = Math.round(operatingCash / daysRemaining)
        }
      } catch (err) {
        console.warn('[send-daily] Error calculating user daily limit:', err)
      }
    }

    const formattedLimit = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(calculatedDailyLimit)

    const title = isTest
      ? `🧪 Uji Coba: Jatah Belanja ${formattedLimit}`
      : `🌅 Selamat Pagi, ${userName}! Jatah Hari Ini: ${formattedLimit}`

    const messageBody = isTest
      ? `Notifikasi SaveMe berhasil aktif! Batas belanja harian kamu saat ini adalah ${formattedLimit}.`
      : `Batas belanja amanmu hari ini sebesar ${formattedLimit}. Gunakan dengan bijak agar tabungan akhir bulan tetap aman!`

    const targetUrl = '/daily'

    // 2. Send via Google FCM HTTP API if Server Key is configured
    const fcmServerKey = process.env.FIREBASE_SERVER_KEY || process.env.FIREBASE_MESSAGING_SERVER_KEY
    let fcmResult = null

    if (fcmServerKey) {
      const fcmPayload: Record<string, unknown> = {
        notification: {
          title,
          body: messageBody,
          icon: '/globe.svg',
          click_action: targetUrl,
        },
        data: {
          url: targetUrl,
          zoneCode,
          timestamp: new Date().toISOString(),
        },
      }

      if (token) {
        fcmPayload.to = token
      } else if (topic) {
        fcmPayload.to = `/topics/${topic}`
      } else {
        fcmPayload.to = `/topics/daily-reminder-${zoneCode.toLowerCase()}`
      }

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${fcmServerKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmPayload),
      })

      fcmResult = await response.json().catch(() => null)
    }

    return NextResponse.json({
      success: true,
      message: `Notifikasi harian (${zoneCode}) berhasil diproses!`,
      notification: {
        title,
        body: messageBody,
        url: targetUrl,
        limitAmount: calculatedDailyLimit,
        formattedLimit,
      },
      fcmResult,
    })
  } catch (err: unknown) {
    console.error('[API send-daily] Error:', err)
    const errObj = err as { message?: string }
    return NextResponse.json(
      { success: false, error: errObj.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

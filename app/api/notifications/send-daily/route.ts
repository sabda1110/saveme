import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

/**
 * Common logic to calculate safe daily limit and dispatch notification
 */
async function processDailyNotification({
  userId,
  token,
  topic,
  zoneCode = 'WIB',
  isTest = false,
}: {
  userId?: string
  token?: string
  topic?: string
  zoneCode?: string
  isTest?: boolean
}) {
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

  // Send via Google FCM HTTP API if Server Key is configured
  const fcmServerKey = process.env.FIREBASE_SERVER_KEY || process.env.FIREBASE_MESSAGING_SERVER_KEY
  let fcmResult = null

  if (fcmServerKey) {
    const fcmPayload: Record<string, unknown> = {
      notification: {
        title,
        body: messageBody,
        icon: '/logo.svg',
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

  return {
    title,
    body: messageBody,
    url: targetUrl,
    limitAmount: calculatedDailyLimit,
    formattedLimit,
    fcmResult,
  }
}

/**
 * GET Handler — Triggered by Vercel Cron or Cloud Scheduler
 * Example: GET /api/notifications/send-daily?zoneCode=WIB
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const zoneCode = searchParams.get('zoneCode') || 'WIB'
    const secret = searchParams.get('secret')

    // Verify CRON_SECRET if configured in environment
    const authHeader = req.headers.get('Authorization')
    const expectedSecret = process.env.CRON_SECRET

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}` && secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized cron request' },
        { status: 401 }
      )
    }

    // 1. Query users with active notifications in Firestore
    const usersQuery = query(
      collection(db, 'users'),
      where('notificationsEnabled', '==', true)
    )
    const usersSnap = await getDocs(usersQuery)

    const dispatchResults: Array<{ userId: string; name: string; zone: string; result: unknown }> = []

    for (const docSnap of usersSnap.docs) {
      const userData = docSnap.data()
      const userZone = userData.zoneCode || 'WIB'

      // Match zoneCode or 'ALL'
      if (zoneCode === 'ALL' || userZone.toUpperCase() === zoneCode.toUpperCase()) {
        const userToken = userData.fcmToken
        if (userToken) {
          const res = await processDailyNotification({
            userId: docSnap.id,
            token: userToken,
            zoneCode: userZone,
            isTest: false,
          })
          dispatchResults.push({
            userId: docSnap.id,
            name: userData.name || 'Teman SaveMe',
            zone: userZone,
            result: res,
          })
        }
      }
    }

    // 2. Also broadcast to Topic for this zone as secondary fallback
    const targetTopic = `daily-reminder-${zoneCode.toLowerCase()}`
    const topicResult = await processDailyNotification({
      topic: targetTopic,
      zoneCode,
      isTest: false,
    })

    return NextResponse.json({
      success: true,
      mode: 'cron',
      zoneCode,
      totalUsersProcessed: dispatchResults.length,
      usersDispatched: dispatchResults,
      topicResult,
      message: `Cron job berhasil memproses notifikasi untuk ${dispatchResults.length} pengguna di zona waktu ${zoneCode}`,
      timestamp: new Date().toISOString(),
    })
  } catch (err: unknown) {
    console.error('[GET send-daily cron] Error:', err)
    const errObj = err as { message?: string }
    return NextResponse.json(
      { success: false, error: errObj.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST Handler — Triggered by client for instant test or specific personalized push
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, token, topic, zoneCode = 'WIB', isTest = false } = body

    const notificationResult = await processDailyNotification({
      userId,
      token,
      topic,
      zoneCode,
      isTest,
    })

    return NextResponse.json({
      success: true,
      message: `Notifikasi harian (${zoneCode}) berhasil diproses!`,
      notification: notificationResult,
    })
  } catch (err: unknown) {
    console.error('[POST send-daily] Error:', err)
    const errObj = err as { message?: string }
    return NextResponse.json(
      { success: false, error: errObj.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

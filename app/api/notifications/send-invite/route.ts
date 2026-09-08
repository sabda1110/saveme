import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { getAdminMessaging } from '@/lib/firebase/admin'
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      recipientUserId,
      inviterName = 'Teman',
      groupName = 'Celengan Bersama',
      targetAmount,
      groupId,
    } = body

    if (!recipientUserId) {
      return NextResponse.json(
        { success: false, error: 'recipientUserId is required' },
        { status: 400 }
      )
    }

    // 1. Fetch recipient profile from Firestore
    const userRef = doc(db, 'users', recipientUserId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Recipient user not found' },
        { status: 404 }
      )
    }

    const userData = userSnap.data()
    const recipientToken = userData.fcmToken

    const formattedTarget = targetAmount
      ? new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(targetAmount)
      : null

    const title = `📩 Undangan Celengan Bersama: ${groupName}`
    const messageBody = formattedTarget
      ? `${inviterName} mengundangmu menabung bersama untuk "${groupName}" dengan target ${formattedTarget}.`
      : `${inviterName} mengundangmu menabung bersama untuk "${groupName}".`

    const targetUrl = '/savings'

    // 2. Log in-app notification record in Firestore
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: recipientUserId,
        type: 'GROUP_INVITE',
        title,
        body: messageBody,
        data: {
          groupId,
          groupName,
          inviterName,
          url: targetUrl,
        },
        isRead: false,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.warn('[send-invite] Failed to write notification record:', err)
    }

    // 3. Dispatch FCM Push to recipient device token if configured
    let fcmDispatched = false
    const adminMessaging = getAdminMessaging()
    const fcmServerKey =
      process.env.FIREBASE_SERVER_KEY || process.env.FIREBASE_MESSAGING_SERVER_KEY

    if (recipientToken && !recipientToken.startsWith('web_token_')) {
      if (adminMessaging) {
        try {
          await adminMessaging.send({
            token: recipientToken,
            notification: {
              title,
              body: messageBody,
            },
            webpush: {
              headers: {
                Urgency: 'high',
                TTL: '86400',
              },
              notification: {
                title,
                body: messageBody,
                icon: '/logo.svg',
                badge: '/logo.svg',
              },
              fcmOptions: {
                link: targetUrl,
              },
            },
            data: {
              url: targetUrl,
              type: 'GROUP_INVITE',
              groupId: String(groupId || ''),
              timestamp: new Date().toISOString(),
            },
          })
          fcmDispatched = true
        } catch (err) {
          console.warn('[send-invite] FCM HTTP v1 push error:', err)
        }
      } else if (fcmServerKey) {
        try {
          const fcmPayload = {
            to: recipientToken,
            notification: {
              title,
              body: messageBody,
              icon: '/logo.svg',
              click_action: targetUrl,
            },
            data: {
              url: targetUrl,
              type: 'GROUP_INVITE',
              groupId: groupId || '',
              timestamp: new Date().toISOString(),
            },
          }

          const res = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              Authorization: `key=${fcmServerKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fcmPayload),
          })

          fcmDispatched = res.ok
        } catch (err) {
          console.warn('[send-invite] FCM direct push error:', err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      recipientUserId,
      fcmDispatched,
      hasToken: Boolean(recipientToken),
      title,
      body: messageBody,
    })
  } catch (err: unknown) {
    console.error('[POST /api/notifications/send-invite] Error:', err)
    const errObj = err as { message?: string }
    return NextResponse.json(
      { success: false, error: errObj.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase/config'
import { getAdminMessaging } from '@/lib/firebase/admin'
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'

export type GroupEventType =
  | 'GROUP_INVITE'
  | 'GROUP_MEMBER_JOINED'
  | 'GROUP_DISSOLVED'
  | 'GROUP_DISSOLUTION_REQUEST'
  | 'GROUP_DISSOLUTION_REJECTED'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      recipientUserIds,
      eventType = 'GROUP_MEMBER_JOINED',
      title,
      body: messageBody,
      groupId,
      groupName = 'Celengan Bersama',
      url = '/savings',
    } = body as {
      recipientUserIds: string[]
      eventType: GroupEventType
      title: string
      body: string
      groupId: string
      groupName?: string
      url?: string
    }

    if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'recipientUserIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!title || !messageBody || !groupId) {
      return NextResponse.json(
        { success: false, error: 'title, body, and groupId are required' },
        { status: 400 }
      )
    }

    const adminMessaging = getAdminMessaging()
    const fcmServerKey =
      process.env.FIREBASE_SERVER_KEY || process.env.FIREBASE_MESSAGING_SERVER_KEY

    // Process each recipient concurrently
    const results = await Promise.all(
      recipientUserIds.map(async (recipientUserId) => {
        try {
          // 1. Fetch user doc for FCM token
          const userRef = doc(db, 'users', recipientUserId)
          const userSnap = await getDoc(userRef)
          const userData = userSnap.exists() ? userSnap.data() : null
          const recipientToken = userData?.fcmToken as string | undefined

          // 2. Log in-app notification record in Firestore
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: recipientUserId,
              type: eventType,
              title,
              body: messageBody,
              data: {
                groupId,
                groupName,
                url,
              },
              isRead: false,
              createdAt: serverTimestamp(),
            })
          } catch (notifErr) {
            console.warn('[send-group-event] Failed to write in-app notification doc:', notifErr)
          }

          // 3. Dispatch FCM Push via FCM HTTP v1 (firebase-admin) or legacy fallback
          let fcmDispatched = false
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
                      link: url,
                    },
                  },
                  data: {
                    url,
                    type: eventType,
                    groupId: String(groupId),
                    groupName: String(groupName),
                    timestamp: new Date().toISOString(),
                  },
                })
                fcmDispatched = true
              } catch (fcmErr) {
                console.warn('[send-group-event] FCM HTTP v1 push error for user:', recipientUserId, fcmErr)
              }
            } else if (fcmServerKey) {
              try {
                const fcmPayload = {
                  to: recipientToken,
                  notification: {
                    title,
                    body: messageBody,
                    icon: '/logo.svg',
                    click_action: url,
                  },
                  data: {
                    url,
                    type: eventType,
                    groupId,
                    groupName,
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
              } catch (fcmErr) {
                console.warn('[send-group-event] FCM legacy push error for user:', recipientUserId, fcmErr)
              }
            }
          }

          return {
            userId: recipientUserId,
            hasToken: Boolean(recipientToken),
            fcmDispatched,
          }
        } catch (itemErr) {
          console.error('[send-group-event] Error processing recipient:', recipientUserId, itemErr)
          return {
            userId: recipientUserId,
            error: true,
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      eventType,
      groupId,
      title,
      dispatchedCount: results.length,
      results,
    })
  } catch (err: unknown) {
    console.error('[POST /api/notifications/send-group-event] Error:', err)
    const errObj = err as { message?: string }
    return NextResponse.json(
      { success: false, error: errObj.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

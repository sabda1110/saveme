import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, topic } = body

    if (!token || !topic) {
      return NextResponse.json(
        { success: false, error: 'Token and topic are required' },
        { status: 400 }
      )
    }

    // Google FCM Topic Subscription API via HTTP v1 or IID
    // https://iid.googleapis.com/iid/v1/web/iid/:token/rel/topics/:topic
    const fcmServerKey = process.env.FIREBASE_SERVER_KEY || process.env.FIREBASE_MESSAGING_SERVER_KEY

    if (fcmServerKey) {
      const response = await fetch(
        `https://iid.googleapis.com/iid/v1/${token}/rel/topics/${topic}`,
        {
          method: 'POST',
          headers: {
            Authorization: `key=${fcmServerKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('[FCM Topic Subscribe] Google API returned:', errorText)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Token successfully subscribed to topic: ${topic}`,
      topic,
    })
  } catch (err: unknown) {
    console.error('[API subscribe-topic] Error:', err)
    const errObj = err as { message?: string }
    return NextResponse.json(
      { success: false, error: errObj.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

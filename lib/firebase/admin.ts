import * as admin from 'firebase-admin'

/**
 * Initialize Firebase Admin SDK singleton instance.
 * Reuses existing instance across Next.js API requests.
 */
export function getAdminApp(): admin.app.App | null {
  if (admin.apps.length > 0) {
    return admin.apps[0]!
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.warn(
      '[firebase-admin] Missing FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, or FIREBASE_ADMIN_PRIVATE_KEY'
    )
    return null
  }

  // Ensure escaped newlines in .env are parsed correctly into real newlines
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n')

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  } catch (err) {
    console.error('[firebase-admin] Failed to initialize Firebase Admin SDK:', err)
    return null
  }
}

/**
 * Get the Firebase Admin Messaging service instance.
 */
export function getAdminMessaging(): admin.messaging.Messaging | null {
  const app = getAdminApp()
  if (!app) return null
  return admin.messaging(app)
}

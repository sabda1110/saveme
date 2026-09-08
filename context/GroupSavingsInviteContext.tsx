'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { db } from '@/lib/firebase/config'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

interface GroupSavingsInviteContextValue {
  pendingInvitesCount: number
}

const GroupSavingsInviteContext = createContext<GroupSavingsInviteContextValue>({
  pendingInvitesCount: 0,
})

export const useGroupSavingsInvites = () => useContext(GroupSavingsInviteContext)

export const GroupSavingsInviteProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0)
  const isFirstLoadRef = useRef(true)

  useEffect(() => {
    if (!user?.uid) {
      setPendingInvitesCount(0)
      isFirstLoadRef.current = true
      return
    }

    isFirstLoadRef.current = true

    // Real-time Firestore listener on user's pending group invites
    const q = query(
      collection(db, 'group_savings_members'),
      where('userId', '==', user.uid),
      where('status', '==', 'PENDING')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPendingInvitesCount(snapshot.size)

        // Only alert if changes occur AFTER initial snapshot load
        if (!isFirstLoadRef.current) {
          const addedChanges = snapshot.docChanges().filter((change) => change.type === 'added')

          if (addedChanges.length > 0) {
            const title = '📩 Undangan Celengan Bersama Baru!'
            const body =
              'Kamu diajak menabung bersama di Celengan Bersama! Buka aplikasi untuk melihat rincian.'

            // 1. Show native OS notification via ServiceWorker (works even when tab is background/minimized)
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready
                .then((reg) => {
                  if (reg && reg.showNotification) {
                    reg.showNotification(title, {
                      body,
                      icon: '/logo.svg',
                      badge: '/logo.svg',
                      tag: `group-invite-${Date.now()}`,
                      data: { url: '/savings', type: 'GROUP_INVITE' },
                    })
                  }
                })
                .catch(() => {
                  if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                      new Notification(title, { body, icon: '/logo.svg' })
                    } catch {
                      // ignore
                    }
                  }
                })
            } else if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(title, { body, icon: '/logo.svg' })
              } catch {
                // ignore
              }
            }

            // 2. Show in-app Toast if tab is visible
            toast.info('📩 Ada undangan Celengan Bersama baru! Cek menu Celengan Impian.')

            // 3. Dispatch global refresh event to update Dashboard & Savings without page reload
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('saveme:group-invites-updated'))
            }
          }
        }

        isFirstLoadRef.current = false
      },
      (err) => {
        console.warn('[GroupSavingsInviteContext] Snapshot listener error:', err)
      }
    )

    // Real-time Firestore listener on user's incoming in-app notifications
    let isNotifFirstLoad = true
    const notifQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('isRead', '==', false)
    )

    const unsubscribeNotifs = onSnapshot(
      notifQ,
      (snapshot) => {
        if (!isNotifFirstLoad) {
          const addedChanges = snapshot.docChanges().filter((change) => change.type === 'added')
          for (const change of addedChanges) {
            const data = change.doc.data()
            const type = data.type as string

            // If it's a group event notification
            if (
              type === 'GROUP_MEMBER_JOINED' ||
              type === 'GROUP_DISSOLVED' ||
              type === 'GROUP_DISSOLUTION_REQUEST' ||
              type === 'GROUP_DISSOLUTION_REJECTED'
            ) {
              const title = data.title || 'SaveMe'
              const body = data.body || ''

              // 1. Show toast if tab is visible
              if (type === 'GROUP_MEMBER_JOINED') {
                toast.success(body || title)
              } else if (type === 'GROUP_DISSOLVED') {
                toast.warning(body || title)
              } else if (type === 'GROUP_DISSOLUTION_REQUEST') {
                toast.info(body || title)
              } else if (type === 'GROUP_DISSOLUTION_REJECTED') {
                toast.info(body || title)
              }

              // 2. Dispatch global refresh event so Dashboard & Savings auto-fetch data
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('saveme:group-invites-updated'))
              }

              // 3. If tab is in background/minimized, trigger OS notification
              if (
                typeof document !== 'undefined' &&
                document.visibilityState === 'hidden' &&
                'Notification' in window &&
                Notification.permission === 'granted'
              ) {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.ready
                    .then((reg) => {
                      reg.showNotification(title, {
                        body,
                        icon: '/logo.svg',
                        badge: '/logo.svg',
                        tag: `group-${type.toLowerCase()}-${Date.now()}`,
                        data: { url: data.data?.url || '/savings' },
                      })
                    })
                    .catch(() => {
                      try {
                        new Notification(title, { body, icon: '/logo.svg' })
                      } catch {
                        // ignore
                      }
                    })
                } else {
                  try {
                    new Notification(title, { body, icon: '/logo.svg' })
                  } catch {
                    // ignore
                  }
                }
              }
            }
          }
        }
        isNotifFirstLoad = false
      },
      (err) => {
        console.warn('[GroupSavingsInviteContext] Notification listener error:', err)
      }
    )

    // Listen for Service Worker background messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (
        event.data?.type === 'SAVEME_REFRESH_INVITES' ||
        event.data?.type === 'SAVEME_BACKGROUND_NOTIFICATION'
      ) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('saveme:group-invites-updated'))
        }
      }
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    }

    return () => {
      unsubscribe()
      unsubscribeNotifs()
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
    }
  }, [user?.uid, toast])

  return (
    <GroupSavingsInviteContext.Provider value={{ pendingInvitesCount }}>
      {children}
    </GroupSavingsInviteContext.Provider>
  )
}

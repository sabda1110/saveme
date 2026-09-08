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

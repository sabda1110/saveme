'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { driver } from 'driver.js'
import type { Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { APP_TOURS } from '@/lib/constants/tours'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/lib/firebase/config'
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'

interface AppTourContextType {
  completedTours: string[]
  isTourCompleted: (tourId: string) => boolean
  markTourCompleted: (tourId: string) => Promise<void>
  resetAllTours: () => Promise<void>
  startTour: (tourId: string) => void
}

const AppTourContext = createContext<AppTourContextType | null>(null)

export function useAppTour() {
  const context = useContext(AppTourContext)
  if (!context) {
    throw new Error('useAppTour must be used within an AppTourProvider')
  }
  return context
}

export function AppTourProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth()
  const [completedTours, setCompletedTours] = useState<string[]>([])
  const driverRef = useRef<Driver | null>(null)
  const activeTourIdRef = useRef<string | null>(null)

  const storageKey = useMemo(() => {
    return user?.uid ? `saveme_completed_tours_${user.uid}` : null
  }, [user?.uid])

  useEffect(() => {
    if (!storageKey) return

    let localList: string[] = []
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        localList = JSON.parse(stored)
      }
    } catch {
      // ignore
    }

    const profileList = userProfile?.completedTours || []
    const merged = Array.from(new Set([...localList, ...profileList]))
    setCompletedTours(merged)
    try {
      localStorage.setItem(storageKey, JSON.stringify(merged))
    } catch {
      // ignore
    }
  }, [storageKey, userProfile?.completedTours])

  // Cleanup driver on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy()
      }
    }
  }, [])

  const markTourCompleted = useCallback(
    async (tourId: string) => {
      if (!tourId) return

      setCompletedTours((prev) => {
        if (prev.includes(tourId)) return prev
        const updated = [...prev, tourId]
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated))
          } catch {
            // ignore
          }
        }
        return updated
      })

      if (user?.uid) {
        try {
          const userRef = doc(db, 'users', user.uid)
          await updateDoc(userRef, {
            completedTours: arrayUnion(tourId),
            updatedAt: serverTimestamp(),
          })
        } catch (err) {
          console.error('[AppTourProvider] Error persisting completed tour:', err)
        }
      }
    },
    [user?.uid, storageKey]
  )

  const isTourCompleted = useCallback(
    (tourId: string) => {
      return completedTours.includes(tourId)
    },
    [completedTours]
  )

  const resetAllTours = useCallback(async () => {
    setCompletedTours([])
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // ignore
      }
    }
    if (user?.uid) {
      try {
        const userRef = doc(db, 'users', user.uid)
        await updateDoc(userRef, {
          completedTours: [],
          updatedAt: serverTimestamp(),
        })
      } catch (err) {
        console.error('[AppTourProvider] Error resetting tours in Firestore:', err)
      }
    }
  }, [user?.uid, storageKey])

  const startTour = useCallback(
    (tourId: string) => {
      const tourConfig = APP_TOURS.find((t) => t.tourId === tourId)
      if (!tourConfig) return

      // Destroy any existing driver instance
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy()
      }

      activeTourIdRef.current = tourId

      const isDark = document.documentElement.classList.contains('dark')

      const driverObj = driver({
        animate: true,
        smoothScroll: true,
        allowClose: true,
        allowScroll: false,
        overlayOpacity: 0.7,
        stagePadding: 10,
        stageRadius: 12,
        waitForElement: 2000,
        overlayColor: isDark ? '#0f1117' : '#0f172a',
        popoverClass: isDark ? 'saveme-tour-popover dark' : 'saveme-tour-popover',
        nextBtnText: 'Lanjut',
        prevBtnText: 'Sebelumnya',
        doneBtnText: 'Selesai',
        showProgress: true,
        progressText: '{{current}} dari {{total}}',
        steps: tourConfig.steps,
        onPopoverRender: (popoverDOM) => {
          let badge = popoverDOM.wrapper.querySelector('.saveme-tour-page-badge')
          if (!badge) {
            badge = document.createElement('div')
            badge.className = 'saveme-tour-page-badge'
            popoverDOM.wrapper.insertBefore(badge, popoverDOM.title)
          }
          badge.textContent = `Panduan ${tourConfig.pageName}`
        },
        onDestroyed: () => {
          const id = activeTourIdRef.current
          if (id) {
            markTourCompleted(id)
            activeTourIdRef.current = null
          }
          driverRef.current = null
        },
      })

      driverRef.current = driverObj
      driverObj.drive()
    },
    [markTourCompleted]
  )

  return (
    <AppTourContext.Provider
      value={{
        completedTours,
        isTourCompleted,
        markTourCompleted,
        resetAllTours,
        startTour,
      }}
    >
      {children}
    </AppTourContext.Provider>
  )
}

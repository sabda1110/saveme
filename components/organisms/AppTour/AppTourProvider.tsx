'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { NextStepProvider, NextStep, useNextStep } from 'nextstepjs'
import { APP_TOURS } from '@/lib/constants/tours'
import { CustomTourCard } from './CustomTourCard'
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

function AppTourInner({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth()
  const { startNextStep } = useNextStep()
  const [completedTours, setCompletedTours] = useState<string[]>([])

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
      startNextStep(tourId)
    },
    [startNextStep]
  )

  const handleTourFinish = useCallback(
    (tourName: string | null) => {
      if (tourName) {
        markTourCompleted(tourName)
      }
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
      <NextStep
        steps={APP_TOURS}
        cardComponent={CustomTourCard}
        onComplete={handleTourFinish}
        onSkip={(_step, tourName) => handleTourFinish(tourName)}
        disableConsoleLogs={process.env.NODE_ENV === 'production'}
        overlayZIndex={99999}
        shadowRgb="15, 23, 42"
        shadowOpacity="0.7"
      >
        {children}
      </NextStep>
    </AppTourContext.Provider>
  )
}

export function AppTourProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextStepProvider>
      <AppTourInner>{children}</AppTourInner>
    </NextStepProvider>
  )
}

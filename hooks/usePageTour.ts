'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useAppTour } from '@/components/organisms/AppTour'
import { usePinLock } from '@/context/PinLockContext'

interface UsePageTourOptions {
  delay?: number
  enabled?: boolean
}

export function usePageTour(tourId: string, options?: UsePageTourOptions) {
  const { user, userProfile, loading } = useAuth()
  const { isTourCompleted, startTour } = useAppTour()
  const { isPinLocked } = usePinLock()
  const isStartedRef = useRef(false)

  const isCompleted = isTourCompleted(tourId)
  const enabled = options?.enabled ?? true
  const delay = options?.delay ?? 600

  useEffect(() => {
    if (loading || !user || !enabled || isCompleted || isStartedRef.current || isPinLocked) {
      return
    }

    if (userProfile && userProfile.hasCompletedOnboarding === false) {
      return
    }

    const timer = setTimeout(() => {
      if (!isStartedRef.current && !isTourCompleted(tourId)) {
        isStartedRef.current = true
        startTour(tourId)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [loading, user, userProfile, enabled, isCompleted, isPinLocked, tourId, delay, startTour, isTourCompleted])

  return {
    isCompleted,
    startTour: () => {
      if (isPinLocked) return
      isStartedRef.current = true
      startTour(tourId)
    },
  }
}

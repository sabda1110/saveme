'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useAppTour } from '@/components/organisms/AppTour'

interface UsePageTourOptions {
  delay?: number
  enabled?: boolean
}

export function usePageTour(tourId: string, options?: UsePageTourOptions) {
  const { user, userProfile, loading } = useAuth()
  const { isTourCompleted, startTour } = useAppTour()
  const isStartedRef = useRef(false)

  const isCompleted = isTourCompleted(tourId)
  const enabled = options?.enabled ?? true
  const delay = options?.delay ?? 600

  useEffect(() => {
    if (loading || !user || !enabled || isCompleted || isStartedRef.current) {
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
  }, [loading, user, userProfile, enabled, isCompleted, tourId, delay, startTour, isTourCompleted])

  return {
    isCompleted,
    startTour: () => {
      isStartedRef.current = true
      startTour(tourId)
    },
  }
}

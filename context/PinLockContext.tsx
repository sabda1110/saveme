'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

interface PinLockContextType {
  isPinLocked: boolean
  unlockPin: () => void
  lockPin: () => void
}

const PinLockContext = createContext<PinLockContextType | null>(null)

export function usePinLock(): PinLockContextType {
  const context = useContext(PinLockContext)
  if (!context) {
    return {
      isPinLocked: false,
      unlockPin: () => {},
      lockPin: () => {},
    }
  }
  return context
}

export function PinLockProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth()
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('saveme_pin_unlocked') === 'true'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const unlocked = sessionStorage.getItem('saveme_pin_unlocked') === 'true'
    setIsUnlocked(unlocked)
  }, [])

  const unlockPin = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('saveme_pin_unlocked', 'true')
    }
    setIsUnlocked(true)
  }, [])

  const lockPin = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('saveme_pin_unlocked')
    }
    setIsUnlocked(false)
  }, [])

  const isPinConfigured = Boolean(user && userProfile?.isPinEnabled && userProfile?.appPin)
  const isPinLocked = Boolean(!loading && isPinConfigured && !isUnlocked)

  return (
    <PinLockContext.Provider
      value={{
        isPinLocked,
        unlockPin,
        lockPin,
      }}
    >
      {children}
    </PinLockContext.Provider>
  )
}

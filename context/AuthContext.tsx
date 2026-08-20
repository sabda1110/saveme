'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '@/lib/firebase/config'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { getUserProfile, logoutUser } from '@/lib/auth/firebase-auth'
import { isSessionValid, clearSession, getSessionExpiryInfo } from '@/lib/auth/session'
import type { UserProfile, UserRole } from '@/types'

interface SessionInfo {
  daysLeft: number
  hoursLeft: number
  isExpired: boolean
}

interface AuthContextType {
  user: FirebaseUser | null
  userProfile: UserProfile | null
  role: UserRole
  isAdmin: boolean
  isSuperAdmin: boolean
  loading: boolean
  sessionInfo: SessionInfo | null
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  role: 'USER',
  isAdmin: false,
  isSuperAdmin: false,
  loading: true,
  sessionInfo: null,
  logout: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (uid: string) => {
    const profile = await getUserProfile(uid)
    setUserProfile(profile)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Enforce 7-day session validity check
        const valid = isSessionValid(currentUser.uid)

        if (!valid) {
          console.warn('[auth] 7-day session expired. Logging user out automatically.')
          clearSession()
          await logoutUser()
          setUser(null)
          setUserProfile(null)
          setSessionInfo(null)
          setLoading(false)

          // Redirect to login with sessionExpired query parameter (replace history state)
          if (typeof window !== 'undefined') {
            window.location.replace('/login?sessionExpired=true')
          }
          return
        }

        setUser(currentUser)
        setSessionInfo(getSessionExpiryInfo(currentUser.uid))
        await fetchProfile(currentUser.uid)
      } else {
        clearSession()
        setUser(null)
        setUserProfile(null)
        setSessionInfo(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    clearSession()
    await logoutUser()
    setUser(null)
    setUserProfile(null)
    setSessionInfo(null)
  }

  const handleRefresh = async () => {
    if (user) {
      await fetchProfile(user.uid)
    }
  }

  const role: UserRole = userProfile?.role || 'USER'
  const isSuperAdmin = role === 'SUPER_ADMIN'
  const isAdmin = role === 'ADMIN' || isSuperAdmin

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        isAdmin,
        isSuperAdmin,
        loading,
        sessionInfo,
        logout: handleLogout,
        refreshProfile: handleRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

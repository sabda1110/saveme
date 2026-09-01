'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { verifyPin } from '@/lib/utils/pin'
import { BrandLogo } from '@/components/atoms/BrandLogo'
import {
  Lock,
  Unlock,
  AlertCircle,
  Delete,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function PinLockScreen() {
  const { user, userProfile, logout } = useAuth()
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [shake, setShake] = useState(false)
  const [failCount, setFailCount] = useState(0)
  const [cooldown, setCooldown] = useState(0)

  // Initialize lock status from sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const unlocked = sessionStorage.getItem('saveme_pin_unlocked') === 'true'
    setIsUnlocked(unlocked)
  }, [])

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleVerify = useCallback(
    async (enteredPin: string) => {
      if (!userProfile?.appPin || isVerifying || cooldown > 0) return

      setIsVerifying(true)
      setError(null)

      try {
        const isValid = await verifyPin(enteredPin, userProfile.appPin)
        if (isValid) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('saveme_pin_unlocked', 'true')
          }
          setIsUnlocked(true)
          setPin('')
          setFailCount(0)
        } else {
          setShake(true)
          setTimeout(() => setShake(false), 400)
          const newFails = failCount + 1
          setFailCount(newFails)
          setPin('')

          if (newFails >= 5) {
            setCooldown(30)
            setError('Terlalu banyak percobaan salah. Tunggu 30 detik.')
          } else {
            setError(`PIN salah! Sisa percobaan: ${5 - newFails}`)
          }
        }
      } catch (err) {
        console.error('[PinLockScreen] Error verifying pin:', err)
        setError('Terjadi kesalahan saat memverifikasi PIN')
        setPin('')
      } finally {
        setIsVerifying(false)
      }
    },
    [userProfile?.appPin, isVerifying, cooldown, failCount]
  )

  const handleDigit = useCallback(
    (digit: string) => {
      if (cooldown > 0 || isVerifying || pin.length >= 6) return
      setError(null)
      const nextPin = pin + digit
      setPin(nextPin)
      if (nextPin.length === 6) {
        handleVerify(nextPin)
      }
    },
    [cooldown, isVerifying, pin, handleVerify]
  )

  const handleDelete = useCallback(() => {
    if (cooldown > 0 || isVerifying) return
    setError(null)
    setPin((prev) => prev.slice(0, -1))
  }, [cooldown, isVerifying])

  // Keyboard physical listener
  useEffect(() => {
    if (isUnlocked || !userProfile?.isPinEnabled || !userProfile?.appPin) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key)
      } else if (e.key === 'Backspace') {
        handleDelete()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isUnlocked, userProfile?.isPinEnabled, userProfile?.appPin, handleDigit, handleDelete])

  // If user is not logged in or PIN is not enabled, do not block
  if (!user || !userProfile?.isPinEnabled || !userProfile?.appPin) {
    return null
  }

  // If unlocked in current session, render nothing
  if (isUnlocked) {
    return null
  }

  const userName = userProfile?.name || 'Teman SaveMe'

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0c0e14] text-white flex flex-col items-center justify-between p-6 sm:p-10 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col items-center gap-2 mt-4">
        <BrandLogo />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold mt-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SaveMe Security Lock</span>
        </div>
      </div>

      {/* Main Lock Area */}
      <div className="flex flex-col items-center max-w-xs w-full">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/10">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-lg font-bold text-white text-center">
          Selamat Datang, {userName}
        </h2>
        <p className="text-xs text-slate-400 text-center mt-1 mb-6">
          Masukkan 6-digit PIN untuk membuka aplikasi
        </p>

        {/* 6 Dots Indicator */}
        <div
          className={cn(
            'flex items-center justify-center gap-4 mb-6 transition-transform',
            shake && 'animate-shake'
          )}
        >
          {Array.from({ length: 6 }).map((_, idx) => {
            const isFilled = idx < pin.length
            return (
              <div
                key={idx}
                className={cn(
                  'w-4 h-4 rounded-full transition-all duration-150 border',
                  isFilled
                    ? 'bg-emerald-500 border-emerald-400 scale-125 shadow-md shadow-emerald-500/60'
                    : 'bg-[#181c28] border-slate-700'
                )}
              />
            )
          })}
        </div>

        {/* Error / Cooldown */}
        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-300 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {cooldown > 0 && (
          <div className="mb-4 text-xs font-semibold text-amber-400 animate-pulse">
            Terkunci: Coba lagi dalam {cooldown} detik
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3.5 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying || cooldown > 0}
              onClick={() => handleDigit(digit)}
              className="h-16 rounded-2xl bg-[#1a1e2c] hover:bg-[#252b3e] active:scale-95 text-xl font-bold text-white border border-slate-800/80 transition-all cursor-pointer shadow-sm flex items-center justify-center font-mono disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            disabled={isVerifying || cooldown > 0}
            onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl bg-[#1a1e2c] hover:bg-[#252b3e] active:scale-95 text-xl font-bold text-white border border-slate-800/80 transition-all cursor-pointer shadow-sm flex items-center justify-center font-mono disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={isVerifying || cooldown > 0 || pin.length === 0}
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-[#1a1e2c] hover:bg-rose-950/40 hover:text-rose-400 active:scale-95 text-slate-400 border border-slate-800/80 transition-all cursor-pointer shadow-sm flex items-center justify-center disabled:opacity-40"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Footer Emergency Reset */}
      <div className="flex items-center gap-4 mt-6">
        <button
          type="button"
          onClick={async () => {
            if (confirm('Lupa PIN? Anda akan dialihkan ke halaman login untuk masuk kembali menggunakan email & password.')) {
              sessionStorage.removeItem('saveme_pin_unlocked')
              await logout()
              window.location.replace('/login')
            }
          }}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-500" />
          <span>Lupa PIN? Masuk Ulang</span>
        </button>
      </div>
    </div>
  )
}

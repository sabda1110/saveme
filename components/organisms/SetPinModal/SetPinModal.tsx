'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  Delete,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { hashPin } from '@/lib/utils/pin'
import { updateUserProfile } from '@/lib/auth/firebase-auth'
import { cn } from '@/lib/utils/cn'

interface SetPinModalProps {
  isOpen: boolean
  userId: string
  hasExistingPin: boolean
  onClose: () => void
  onSuccess: () => void
}

export function SetPinModal({
  isOpen,
  userId,
  hasExistingPin,
  onClose,
  onSuccess,
}: SetPinModalProps) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep('enter')
      setPin('')
      setConfirmPin('')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const currentInput = step === 'enter' ? pin : confirmPin

  const handleKeyPress = (digit: string) => {
    setError(null)
    if (step === 'enter') {
      if (pin.length < 6) {
        const next = pin + digit
        setPin(next)
        if (next.length === 6) {
          setTimeout(() => {
            setStep('confirm')
          }, 200)
        }
      }
    } else {
      if (confirmPin.length < 6) {
        const next = confirmPin + digit
        setConfirmPin(next)
        if (next.length === 6) {
          handleVerifyAndSave(pin, next)
        }
      }
    }
  }

  const handleDelete = () => {
    setError(null)
    if (step === 'enter') {
      setPin((prev) => prev.slice(0, -1))
    } else {
      if (confirmPin.length === 0) {
        setStep('enter')
        setPin((prev) => prev.slice(0, -1))
      } else {
        setConfirmPin((prev) => prev.slice(0, -1))
      }
    }
  }

  const handleVerifyAndSave = async (firstPin: string, secondPin: string) => {
    if (firstPin !== secondPin) {
      setError('PIN konfirmasi tidak cocok. Silakan ulangi.')
      setConfirmPin('')
      return
    }

    setLoading(true)
    try {
      const hashed = await hashPin(firstPin)
      await updateUserProfile(userId, {
        appPin: hashed,
        isPinEnabled: true,
      })

      // Also set unlocked in current session
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('saveme_pin_unlocked', 'true')
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    } catch (err: unknown) {
      const errObj = err as { message?: string }
      setError(errObj.message || 'Gagal menyimpan PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3348] shadow-2xl p-6 flex flex-col items-center text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
          {hasExistingPin ? 'Ubah PIN 6-Digit' : 'Atur PIN Keamanan'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
          {step === 'enter'
            ? 'Masukkan 6 angka rahasia untuk mengunci aplikasi'
            : 'Ketik ulang 6 angka PIN untuk konfirmasi'}
        </p>

        {/* 6 Dots Indicator */}
        <div className="flex items-center justify-center gap-3.5 mb-6">
          {Array.from({ length: 6 }).map((_, idx) => {
            const isFilled = idx < currentInput.length
            return (
              <div
                key={idx}
                className={cn(
                  'w-4 h-4 rounded-full transition-all duration-200 border',
                  isFilled
                    ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-sm shadow-emerald-500/50'
                    : 'bg-slate-100 dark:bg-[#131620] border-slate-300 dark:border-slate-700'
                )}
              />
            )
          })}
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>PIN berhasil disimpan dan aktif!</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={loading}
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-slate-50 dark:bg-[#21263a] hover:bg-slate-100 dark:hover:bg-[#2d3348] active:scale-95 text-lg font-bold text-slate-800 dark:text-white border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer shadow-xs flex items-center justify-center font-mono"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            disabled={loading}
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-50 dark:bg-[#21263a] hover:bg-slate-100 dark:hover:bg-[#2d3348] active:scale-95 text-lg font-bold text-slate-800 dark:text-white border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer shadow-xs flex items-center justify-center font-mono"
          >
            0
          </button>
          <button
            type="button"
            disabled={loading || currentInput.length === 0}
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-50 dark:bg-[#21263a] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 active:scale-95 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer shadow-xs flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

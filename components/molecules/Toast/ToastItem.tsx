'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { ToastItem as ToastItemType } from '@/context/ToastContext'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ToastItemProps {
  toast: ToastItemType
  onDismiss: (id: string) => void
}

const typeConfig = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30',
    borderColor: 'border-emerald-500/30 dark:border-emerald-500/40',
    barColor: 'bg-emerald-500',
    defaultTitle: 'Berhasil',
    accentShadow: 'shadow-emerald-500/10 dark:shadow-emerald-500/5',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-500 dark:text-rose-400',
    iconBg: 'bg-rose-500/15 dark:bg-rose-500/20 border-rose-500/30',
    borderColor: 'border-rose-500/30 dark:border-rose-500/40',
    barColor: 'bg-rose-500',
    defaultTitle: 'Terjadi Kesalahan',
    accentShadow: 'shadow-rose-500/10 dark:shadow-rose-500/5',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500 dark:text-amber-400',
    iconBg: 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/30',
    borderColor: 'border-amber-500/30 dark:border-amber-500/40',
    barColor: 'bg-amber-500',
    defaultTitle: 'Perhatian',
    accentShadow: 'shadow-amber-500/10 dark:shadow-amber-500/5',
  },
  info: {
    icon: Info,
    iconColor: 'text-sky-500 dark:text-sky-400',
    iconBg: 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-500/30',
    borderColor: 'border-sky-500/30 dark:border-sky-500/40',
    barColor: 'bg-sky-500',
    defaultTitle: 'Pemberitahuan',
    accentShadow: 'shadow-sky-500/10 dark:shadow-sky-500/5',
  },
}

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [remainingTime, setRemainingTime] = useState(toast.duration)
  const [isPaused, setIsPaused] = useState(false)

  const config = typeConfig[toast.type] || typeConfig.info
  const IconComponent = config.icon

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(toast.id)
    }, 220)
  }, [onDismiss, toast.id])

  // Mount animation
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsVisible(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  // Auto-dismiss timer with pause-on-hover
  useEffect(() => {
    if (toast.duration <= 0 || isPaused) return

    startTimeRef.current = Date.now()

    timerRef.current = setTimeout(() => {
      handleClose()
    }, remainingTime)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.duration, isPaused, remainingTime, handleClose])

  const handleMouseEnter = () => {
    setIsPaused(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    const elapsed = Date.now() - startTimeRef.current
    setRemainingTime((prev) => Math.max(0, prev - elapsed))
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative overflow-hidden w-full max-w-sm sm:max-w-md pointer-events-auto select-none',
        'bg-white/95 dark:bg-[#1a1d27]/95 backdrop-blur-md',
        'border rounded-2xl shadow-xl transition-all duration-300 ease-out',
        config.borderColor,
        config.accentShadow,
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-12 opacity-0 scale-95'
      )}
      style={{
        transitionProperty: 'transform, opacity, scale, max-height',
      }}
    >
      <div className="flex items-start gap-3 p-3.5 sm:p-4">
        {/* Dynamic Icon Badge */}
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-xl border shrink-0 mt-0.5 shadow-xs',
            config.iconBg
          )}
        >
          <IconComponent className={cn('w-4.5 h-4.5', config.iconColor)} />
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {toast.title || config.defaultTitle}
            </h4>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words">
            {toast.message}
          </div>
        </div>

        {/* Manual Dismiss Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Tutup notifikasi"
          className="p-1 -mr-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#21263a] transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expiry Progress Bar */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
          <div
            className={cn('h-full opacity-60 transition-all ease-linear', config.barColor)}
            style={{
              animation: `toast-progress ${toast.duration}ms linear forwards`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          />
        </div>
      )}
    </div>
  )
}

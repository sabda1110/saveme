'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  title?: string
  duration?: number
}

export interface ToastItem {
  id: string
  type: ToastType
  title?: string
  message: React.ReactNode
  duration: number
  createdAt: number
}

interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (type: ToastType, message: React.ReactNode, options?: ToastOptions) => string
  dismissToast: (id: string) => void
  toast: {
    success: (message: React.ReactNode, options?: ToastOptions) => string
    error: (message: React.ReactNode, options?: ToastOptions) => string
    warning: (message: React.ReactNode, options?: ToastOptions) => string
    info: (message: React.ReactNode, options?: ToastOptions) => string
    dismiss: (id: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 4
const DEFAULT_DURATION = 4000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, message: React.ReactNode, options?: ToastOptions): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      const duration = options?.duration ?? DEFAULT_DURATION

      const newToast: ToastItem = {
        id,
        type,
        title: options?.title,
        message,
        duration,
        createdAt: Date.now(),
      }

      // Prepend newest toast to index 0 so it appears at the top of the stack,
      // shifting older toasts downwards. Keep maximum MAX_TOASTS active.
      setToasts((prev) => [newToast, ...prev.slice(0, MAX_TOASTS - 1)])

      return id
    },
    []
  )

  const toastHelpers = useMemo(
    () => ({
      success: (message: React.ReactNode, options?: ToastOptions) =>
        showToast('success', message, options),
      error: (message: React.ReactNode, options?: ToastOptions) =>
        showToast('error', message, options),
      warning: (message: React.ReactNode, options?: ToastOptions) =>
        showToast('warning', message, options),
      info: (message: React.ReactNode, options?: ToastOptions) =>
        showToast('info', message, options),
      dismiss: dismissToast,
    }),
    [showToast, dismissToast]
  )

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      toast: toastHelpers,
    }),
    [toasts, showToast, dismissToast, toastHelpers]
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

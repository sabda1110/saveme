'use client'

import React from 'react'
import { useNextStep } from 'nextstepjs'
import type { CardComponentProps } from 'nextstepjs'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react'

const TOUR_PAGE_NAMES: Record<string, string> = {
  dashboardTour: 'Dashboard',
  dailyTour: 'Jatah Harian',
  transactionsTour: 'Transaksi',
  walletsTour: 'Kantong',
  savingsTour: 'Celengan',
  billsTour: 'Tagihan',
  debtsTour: 'Hutang Piutang',
  reportsTour: 'Laporan',
  templatesTour: 'Template',
  payrollTour: 'Alokasi Gaji',
  profileTour: 'Profil',
}

export function CustomTourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CardComponentProps) {
  const { currentTour } = useNextStep()
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [shift, setShift] = React.useState({ x: 0, y: 0 })
  const shiftRef = React.useRef({ x: 0, y: 0 })
  shiftRef.current = shift

  const isLastStep = currentStep === totalSteps - 1
  const pageName = currentTour ? TOUR_PAGE_NAMES[currentTour] : null

  // Reset shift on step change
  React.useEffect(() => {
    setShift({ x: 0, y: 0 })
  }, [currentStep])

  // 2D Viewport auto-clamping & element scroll synchronization
  React.useEffect(() => {
    if (step.selector) {
      try {
        const el = document.querySelector(step.selector)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        }
      } catch {
        // ignore
      }
    }

    const checkBounds = () => {
      if (!cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      const viewW = window.innerWidth
      const viewH = window.innerHeight
      const margin = 16

      // Calculate unshifted screen coordinates
      const unshiftedRight = rect.right - shiftRef.current.x
      const unshiftedLeft = rect.left - shiftRef.current.x
      const unshiftedBottom = rect.bottom - shiftRef.current.y
      const unshiftedTop = rect.top - shiftRef.current.y

      let newShiftX = 0
      let newShiftY = 0

      // Horizontal boundary clamping
      if (unshiftedRight > viewW - margin) {
        newShiftX = -(unshiftedRight - (viewW - margin))
      } else if (unshiftedLeft < margin) {
        newShiftX = margin - unshiftedLeft
      }

      // Vertical boundary clamping
      if (unshiftedBottom > viewH - margin) {
        newShiftY = -(unshiftedBottom - (viewH - margin))
      } else if (unshiftedTop < margin) {
        newShiftY = margin - unshiftedTop
      }

      setShift({ x: newShiftX, y: newShiftY })
    }

    const timer = setTimeout(checkBounds, 60)
    const timer2 = setTimeout(checkBounds, 180)
    window.addEventListener('resize', checkBounds)
    window.addEventListener('scroll', checkBounds, true)

    return () => {
      clearTimeout(timer)
      clearTimeout(timer2)
      window.removeEventListener('resize', checkBounds)
      window.removeEventListener('scroll', checkBounds, true)
    }
  }, [currentStep, step.selector])

  return (
    <div
      ref={cardRef}
      style={{
        transform:
          shift.x !== 0 || shift.y !== 0
            ? `translate(${shift.x}px, ${shift.y}px)`
            : undefined,
        transition: 'transform 0.15s ease-out',
      }}
      className="relative w-[calc(100vw-32px)] max-w-sm sm:max-w-md min-w-[280px] max-h-[85vh] overflow-y-auto bg-white dark:bg-[#151822] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl z-50"
    >
      {arrow}

      {/* Header with Title Badges, Fast-Forward Action, and Close Button */}
      <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-white/8">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <Badge variant="brand" size="sm" className="font-bold text-[10px] sm:text-xs shrink-0">
            {pageName ? `Panduan ${pageName}` : 'Panduan Halaman'}
          </Badge>
          <Badge variant="neutral" size="sm" className="font-semibold text-[10px] sm:text-xs shrink-0">
            {currentStep + 1}/{totalSteps}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="glow"
            size="sm"
            onClick={nextStep}
            rightIcon={
              isLastStep ? (
                <Check className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )
            }
            className="text-[11px] font-bold py-1 px-2.5 h-7 shadow-xs"
          >
            {isLastStep ? 'Selesai' : 'Lanjut'}
          </Button>

          {skipTour && (
            <button
              type="button"
              onClick={skipTour}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Tutup panduan"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <h4 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
          {step.title}
        </h4>
        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1.5">
          {step.content}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-white/8">
        <div>
          {skipTour && !isLastStep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 sm:px-3"
            >
              Lewati
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={prevStep}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              className="text-xs px-2.5 sm:px-3"
            >
              Sebelumnya
            </Button>
          )}

          <Button
            variant="glow"
            size="sm"
            onClick={nextStep}
            rightIcon={
              isLastStep ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )
            }
            className="text-xs font-bold px-3 sm:px-4 shadow-sm"
          >
            {isLastStep ? 'Selesai' : 'Lanjut'}
          </Button>
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { cn } from '@/lib/utils/cn'

export interface PlaygroundSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  icon?: React.ReactNode
  color?: 'green' | 'red' | 'blue'
  formatAsCurrency?: boolean
  className?: string
}

export function PlaygroundSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  icon,
  color = 'green',
  formatAsCurrency = true,
  className,
}: PlaygroundSliderProps) {
  const formattedValue = formatAsCurrency
    ? new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(value)
    : `${value}%`

  const colorStyles = {
    green: 'text-green-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
  }

  return (
    <div className={cn('flex flex-col gap-2 p-4 rounded-xl bg-[#21263a]/50 border border-[#2d3348]', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-400">{icon}</span>}
          <span className="text-xs sm:text-sm font-medium text-slate-300">{label}</span>
        </div>
        <span className={cn('text-sm sm:text-base font-bold font-mono tabular-nums', colorStyles[color])}>
          {formattedValue}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-[#1a1d27] rounded-lg appearance-none cursor-pointer border border-[#2d3348]"
      />

      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
        <span>
          {formatAsCurrency
            ? new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0,
              }).format(min)
            : `${min}%`}
        </span>
        <span>
          {formatAsCurrency
            ? new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0,
              }).format(max)
            : `${max}%`}
        </span>
      </div>
    </div>
  )
}

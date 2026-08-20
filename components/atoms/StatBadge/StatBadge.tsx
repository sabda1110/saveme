import React from 'react'
import { cn } from '@/lib/utils/cn'

export interface StatBadgeProps {
  label: string
  value: string
  trend?: string
  trendType?: 'positive' | 'negative' | 'neutral'
  className?: string
  icon?: React.ReactNode
}

export function StatBadge({
  label,
  value,
  trend,
  trendType = 'positive',
  className,
  icon,
}: StatBadgeProps) {
  const trendColors = {
    positive: 'text-green-400 bg-green-500/10 border-green-500/20',
    negative: 'text-red-400 bg-red-500/10 border-red-500/20',
    neutral: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  }

  return (
    <div
      className={cn(
        'glass-card rounded-xl p-3 flex items-center gap-3 border border-[#2d3348]',
        className
      )}
    >
      {icon && (
        <div className="w-9 h-9 rounded-lg bg-[#21263a] flex items-center justify-center text-green-400 shrink-0">
          {icon}
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white tracking-tight tabular-nums font-mono">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                trendColors[trendType]
              )}
            >
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

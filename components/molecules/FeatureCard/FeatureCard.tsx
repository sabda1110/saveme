import React from 'react'
import { cn } from '@/lib/utils/cn'

export interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  className?: string
  children?: React.ReactNode
  gradient?: 'green' | 'blue' | 'purple' | 'amber'
}

export function FeatureCard({
  icon,
  title,
  description,
  badge,
  className,
  children,
  gradient = 'green',
}: FeatureCardProps) {
  const gradientAccents = {
    green: 'group-hover:border-green-500/40 group-hover:shadow-green-500/10',
    blue: 'group-hover:border-blue-500/40 group-hover:shadow-blue-500/10',
    purple: 'group-hover:border-purple-500/40 group-hover:shadow-purple-500/10',
    amber: 'group-hover:border-amber-500/40 group-hover:shadow-amber-500/10',
  }

  const iconBgAccents = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20 group-hover:bg-green-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:bg-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 group-hover:bg-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:bg-amber-500/20',
  }

  return (
    <div
      className={cn(
        'group relative bg-[#1a1d27]/90 rounded-2xl p-6 sm:p-8 border border-[#2d3348] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between overflow-hidden',
        gradientAccents[gradient],
        className
      )}
    >
      {/* Subtle ambient light on hover */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:opacity-100 opacity-30 transition-opacity duration-300" />

      <div>
        <div className="flex items-center justify-between mb-5">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center border transition-colors duration-200',
              iconBgAccents[gradient]
            )}
          >
            {icon}
          </div>
          {badge && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#21263a] text-slate-300 border border-[#2d3348]">
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-green-300 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed font-normal">
          {description}
        </p>
      </div>

      {children && <div className="mt-6 pt-4 border-t border-[#2d3348]/60">{children}</div>}
    </div>
  )
}

import React from 'react'

export interface LandingTemplateProps {
  navbar: React.ReactNode
  hero: React.ReactNode
  trust: React.ReactNode
  storytelling: React.ReactNode
  problem: React.ReactNode
  features: React.ReactNode
  showcase: React.ReactNode
  howItWorks: React.ReactNode
  benefits: React.ReactNode
  cta: React.ReactNode
  footer: React.ReactNode
}

export function LandingTemplate({
  navbar,
  hero,
  trust,
  storytelling,
  problem,
  features,
  showcase,
  howItWorks,
  benefits,
  cta,
  footer,
}: LandingTemplateProps) {
  return (
    <div className="relative min-h-screen bg-white dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100 flex flex-col overflow-x-hidden">
      {navbar}
      <main className="flex-1 flex flex-col">
        {hero}
        {trust}
        {storytelling}
        {problem}
        {features}
        {showcase}
        {howItWorks}
        {benefits}
        {cta}
      </main>
      {footer}
    </div>
  )
}

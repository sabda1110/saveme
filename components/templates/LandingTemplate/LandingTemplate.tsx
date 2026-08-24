import React from 'react'

export interface LandingTemplateProps {
  navbar: React.ReactNode
  hero: React.ReactNode
  playground: React.ReactNode
  bento: React.ReactNode
  preview: React.ReactNode
  security: React.ReactNode
  cta: React.ReactNode
  footer: React.ReactNode
}

export function LandingTemplate({
  navbar,
  hero,
  playground,
  bento,
  preview,
  security,
  cta,
  footer,
}: LandingTemplateProps) {
  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-[#f1f5f9] flex flex-col overflow-x-hidden bg-mesh-pattern transition-colors">
      {/* Background subtle grid pattern */}
      <div className="fixed inset-0 grid-bg-overlay pointer-events-none opacity-40 -z-10" />

      {navbar}

      <main className="flex-1 flex flex-col">
        {hero}
        {playground}
        {bento}
        {preview}
        {security}
        {cta}
      </main>

      {footer}
    </div>
  )
}

import React from 'react'

export interface AppTemplateProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function AppTemplate({ sidebar, children }: AppTemplateProps) {
  return (
    <div className="min-h-screen lg:h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-[#f1f5f9] flex flex-col lg:flex-row lg:overflow-hidden transition-colors">
      {/* Pinned Desktop Sidebar */}
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0 z-30">{sidebar}</div>

      {/* Main Content Area - Independently Scrollable on Desktop */}
      <main className="flex-1 flex flex-col min-w-0 lg:h-screen overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-28 lg:pb-12">{children}</div>
      </main>
    </div>
  )
}

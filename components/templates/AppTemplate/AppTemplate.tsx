import React from 'react'

export interface AppTemplateProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function AppTemplate({ sidebar, children }: AppTemplateProps) {
  return (
    <div className="min-h-screen bg-[#0f1117] text-[#f1f5f9] flex">
      {/* Fixed Sidebar */}
      <div className="hidden lg:block">{sidebar}</div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        <div className="p-4 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  )
}

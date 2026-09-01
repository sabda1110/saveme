'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { LandingTemplate } from '@/components/templates/LandingTemplate'
import { Navbar } from '@/components/organisms/Navbar'
import { HeroSection } from '@/components/organisms/HeroSection'
import { TrustStripSection } from '@/components/organisms/TrustStripSection'
import { ProblemSection } from '@/components/organisms/ProblemSection'
import { Storytelling3D } from '@/components/organisms/Storytelling3D'
import { BentoFeatures } from '@/components/organisms/BentoFeatures'
import { LiveDashboardPreview } from '@/components/organisms/LiveDashboardPreview'
import { HowItWorksSection } from '@/components/organisms/HowItWorksSection'
import { SecuritySection } from '@/components/organisms/SecuritySection'
import { CTASection } from '@/components/organisms/CTASection'
import { Footer } from '@/components/organisms/Footer'
import { BrandLogo } from '@/components/atoms/BrandLogo'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  // Fast pre-check: if session already exists, redirect immediately to prevent landing flash
  if (loading || user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <BrandLogo />
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Opening SaveMe...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <LandingTemplate
      navbar={<Navbar />}
      hero={<HeroSection />}
      trust={<TrustStripSection />}
      storytelling={<Storytelling3D />}
      problem={<ProblemSection />}
      features={<BentoFeatures />}
      showcase={<LiveDashboardPreview />}
      howItWorks={<HowItWorksSection />}
      benefits={<SecuritySection />}
      cta={<CTASection />}
      footer={<Footer />}
    />
  )
}

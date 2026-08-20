import { LandingTemplate } from '@/components/templates/LandingTemplate'
import { Navbar } from '@/components/organisms/Navbar'
import { HeroSection } from '@/components/organisms/HeroSection'
import { PlaygroundSection } from '@/components/organisms/PlaygroundSection'
import { BentoFeatures } from '@/components/organisms/BentoFeatures'
import { LiveDashboardPreview } from '@/components/organisms/LiveDashboardPreview'
import { SecuritySection } from '@/components/organisms/SecuritySection'
import { CTASection } from '@/components/organisms/CTASection'
import { Footer } from '@/components/organisms/Footer'

export default function HomePage() {
  return (
    <LandingTemplate
      navbar={<Navbar />}
      hero={<HeroSection />}
      playground={<PlaygroundSection />}
      bento={<BentoFeatures />}
      preview={<LiveDashboardPreview />}
      security={<SecuritySection />}
      cta={<CTASection />}
      footer={<Footer />}
    />
  )
}

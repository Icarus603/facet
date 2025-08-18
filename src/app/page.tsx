import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FacetLogo } from '@/components/ui/facet-logo'
import Link from 'next/link'
import { 
  Shield, 
  MessageCircle, 
  BarChart3, 
  Heart, 
  Clock, 
  Brain,
  Users,
  Check,
  ArrowRight,
  Sparkles,
  Lock,
  Award
} from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect authenticated users to chat
  if (user) {
    redirect('/chat/new')
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#FAF9F5'}}>
      {/* Header */}
      <header className="relative sticky top-0 z-50" style={{backgroundColor: '#FAF9F5'}}>
        <div className="w-full pl-2 pr-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center h-24">
              <FacetLogo className="h-24 w-24" />
              <span className="text-2xl text-facet-gradient facet-title-zapfino leading-relaxed m-0 pl-2 pr-12 pt-6 pb-2 -ml-2">FACET</span>
            </div>
            <div className="flex items-center gap-3 mr-4">
              <Link href="/auth/signin">
                <Button variant="default" size="lg">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="wine" size="lg">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">

        <section className="relative container mx-auto px-4 py-10">
          <div className="text-center max-w-5xl mx-auto">

            {/* Main Headline */}
            <h1 className="text-6xl lg:text-8xl meslo-font italic mb-8 text-center leading-tight">
              <span className="text-black">Your Personal Mental Health</span>
              <br />
              <span className="text-facet-gradient">Companion</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl lg:text-2xl text-gray-600 mb-12 leading-relaxed max-w-4xl mx-auto meslo-font italic">
              FACET provides 24/7 AI-powered mental health support with intelligent multi-agent conversations, crisis detection, and personalized guidance that evolves with your needs.
            </p>
            
            {/* CTA Button */}
            <div className="flex justify-center mb-16">
              <Link href="/auth/signup">
                <Button variant="facet" size="xl" className="min-w-[200px]">
                  <Sparkles className="h-5 w-5" />
                  Start Your Journey
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>

          </div>
        </section>

        {/* Features Section */}
        <section className="relative py-10" style={{backgroundColor: '#FAF9F5'}}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4 meslo-font italic">
                AI Mental Health Companion
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto meslo-font italic">
                AI-powered platform that combines multi-agent intelligence with therapeutic 
                frameworks to provide personalized mental wellness guidance.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* AI Therapy Card */}
              <div className="rounded-2xl p-8 shadow-sm border-0 text-black" style={{backgroundColor: '#A5C7E2'}}>
                <div className="bg-white/30 rounded-xl w-16 h-16 flex items-center justify-center mb-6">
                  <Brain className="h-8 w-8 text-black" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-black">AI Conversations</h3>
                <p className="text-black/90 mb-6 leading-relaxed">
                  Intelligent multi-agent system providing CBT/DBT inspired conversations 
                  with personalized wellness guidance tailored to your unique needs.
                </p>
                <ul className="space-y-2 text-sm text-black/80">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-black" />
                    CBT-inspired techniques
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-black" />
                    DBT-based coping strategies
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-black" />
                    Personalized wellness suggestions
                  </li>
                </ul>
              </div>
              
              {/* Crisis Support Card */}
              <div className="rounded-2xl p-8 shadow-sm border-0 text-black" style={{backgroundColor: '#D4B6BA'}}>
                <div className="bg-white/30 rounded-xl w-16 h-16 flex items-center justify-center mb-6">
                  <Heart className="h-8 w-8 text-black" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-black">Crisis Detection</h3>
                <p className="text-black/90 mb-6 leading-relaxed">
                  AI-powered crisis detection monitors conversations for risk indicators 
                  and provides emergency resources and guidance when concerning patterns are identified.
                </p>
                <ul className="space-y-2 text-sm text-black/80">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-black" />
                    Real-time risk assessment
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-black" />
                    Emergency resource guidance
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-black" />
                    Crisis response protocols
                  </li>
                </ul>
              </div>
              
              {/* Progress Tracking Card */}
              <div className="rounded-2xl p-8 shadow-sm border-0 text-black" style={{backgroundColor: '#BCD1CA'}}>
                <div className="bg-white/30 rounded-xl w-16 h-16 flex items-center justify-center mb-6">
                  <BarChart3 className="h-8 w-8 text-black" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-black">Progress Tracking</h3>
                <p className="text-black/90 mb-6 leading-relaxed">
                  Comprehensive mood tracking, goal setting, and therapeutic 
                  progress monitoring with detailed insights and analytics.
                </p>
                <ul className="space-y-2 text-sm text-black/80">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-black" />
                    Mood and emotion tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-black" />
                    Goal setting and monitoring
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-black" />
                    Progress analytics
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Security Section */}
        <section className="relative py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="rounded-3xl p-12 shadow-lg" style={{backgroundColor: '#CBCADB'}}>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Your Privacy is Our Foundation
                  </h2>
                  <p className="text-xl text-gray-600 leading-relaxed">
                    FACET prioritizes your privacy and security. Your mental health data 
                    is encrypted, stored securely, and never shared without your explicit consent.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mt-12">
                  <div className="text-center">
                    <div className="rounded-lg p-4 mb-4 inline-block shadow-sm" style={{backgroundColor: '#E5E4EF'}}>
                      <Lock className="h-6 w-6 text-gray-700" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">End-to-End Encryption</h4>
                    <p className="text-sm text-gray-600">Data encrypted in transit and at rest</p>
                  </div>
                  <div className="text-center">
                    <div className="rounded-lg p-4 mb-4 inline-block shadow-sm" style={{backgroundColor: '#E5E4EF'}}>
                      <Shield className="h-6 w-6 text-gray-700" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Privacy Focused</h4>
                    <p className="text-sm text-gray-600">Built with privacy-first principles</p>
                  </div>
                  <div className="text-center">
                    <div className="rounded-lg p-4 mb-4 inline-block shadow-sm" style={{backgroundColor: '#E5E4EF'}}>
                      <Users className="h-6 w-6 text-gray-700" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Your Control</h4>
                    <p className="text-sm text-gray-600">You own and control your data</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-20" style={{backgroundColor: '#FAF9F5'}}>
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-gray-900 mb-6 meslo-font italic">
                Ready to Begin Your Mental Health Journey?
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed meslo-font italic">
                Experience personalized AI mental health support that adapts to your needs 
                and helps you develop better coping strategies.
              </p>
              <div className="flex justify-center">
                <Link href="/auth/signup">
                  <Button variant="facet" size="xl" className="min-w-[200px]">
                    Start Free Today
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12" style={{backgroundColor: '#141413', color: '#FAF9F5'}}>
        <div className="max-w-7xl mx-auto pl-4 pr-4">
          <div className="grid grid-cols-3 gap-8">
            {/* Left side - Logo and Copyright */}
            <div className="flex flex-col justify-between h-full -ml-25">
              <FacetLogo className="h-20 w-20 -mt-12 -ml-6" />
              <div className="text-base" style={{color: '#FAF9F5'}}>
                © 2025 FACET
              </div>
            </div>
            
            {/* Center - Product Links */}
            <div className="-mt-8">
              <h4 className="font-semibold mb-4" style={{color: '#FAF9F5'}}>Product</h4>
              <ul className="space-y-2" style={{color: '#FAF9F5'}}>
                <li><Link href="/about" className="hover:text-gray-300 transition-colors">About FACET</Link></li>
                <li><Link href="/how-it-works" className="hover:text-gray-300 transition-colors">How It Works</Link></li>
              </ul>
            </div>
            
            {/* Right - Legal Links */}
            <div className="-mt-8">
              <h4 className="font-semibold mb-4" style={{color: '#FAF9F5'}}>Legal</h4>
              <ul className="space-y-2" style={{color: '#FAF9F5'}}>
                <li><Link href="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

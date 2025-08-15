import { FacetLogo } from '@/components/ui/facet-logo'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Brain, Heart, Shield, Users, Sparkles, BarChart3 } from 'lucide-react'

export default function AboutPage() {
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-black mb-6 meslo-font italic">
              About FACET
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed meslo-font italic">
              Advanced multi-agent AI system for personalized mental health support
            </p>
          </div>

          {/* What FACET Is Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
            <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic">What FACET Is</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              FACET is a multi-agent AI mental health platform that uses specialized AI agents working 
              in coordination. Instead of a single chatbot, the system employs a Smart Router, Emotion 
              Analyzer, Crisis Assessor, Therapeutic Advisor, and Memory Manager - each optimized for 
              specific aspects of mental health support.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              The platform integrates vector databases for persistent memory, real-time emotion analysis 
              using VAD models, crisis detection algorithms, and evidence-based therapeutic interventions 
              from CBT and DBT methodologies. It operates across four workflow modes: Light, Standard, 
              Crisis, and Deep - each optimized for different interaction types and urgency levels.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Built with Next.js, PostgreSQL, Pinecone vector database, and OpenAI APIs, FACET provides 
              24/7 mental health support with personalized therapeutic guidance that evolves based on 
              user patterns and preferences.
            </p>
          </div>

          {/* Why FACET Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
            <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic">Why FACET</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Mental health support shouldn't be one-size-fits-all. Traditional therapy is expensive, 
              hard to access, and often doesn't provide the 24/7 support people need. AI chatbots exist, 
              but most are simplistic and don't understand context or remember your journey.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              I built FACET to bridge this gap. By using multiple AI agents that specialize in different 
              aspects of mental health - emotion analysis, crisis assessment, therapeutic guidance, and 
              memory management - the system can provide more nuanced, context-aware support than a 
              single chatbot ever could.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              The goal isn't to replace human therapists, but to provide accessible, intelligent support 
              that can help people between sessions, during crisis moments, or when professional help 
              isn't immediately available. FACET remembers your patterns, learns from your responses, 
              and adapts its approach to what works best for you.
            </p>
          </div>

          {/* Creator Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
            <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic">Development Journey</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              FACET was created by Zetfung Liu as an exploration into AI-powered mental health technology. 
              This project serves as both a technical challenge and a demonstration of what's possible with 
              production-quality AI applications.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              The platform demonstrates advanced AI concepts while maintaining focus on reliability and 
              user experience. It showcases how modern AI can be applied thoughtfully to mental health support.
            </p>
            <div className="text-center">
              <a 
                href="https://github.com/Icarus603" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg facet-hover-fade font-medium"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
              </a>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <div className="flex justify-center gap-4">
              <Link href="/auth/signup">
                <Button variant="facet" size="xl">
                  <Sparkles className="h-5 w-5" />
                  Try FACET
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="xl" className="bg-black text-white facet-hover-fade">
                  Learn How It Works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
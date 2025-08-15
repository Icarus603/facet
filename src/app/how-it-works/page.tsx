import { FacetLogo } from '@/components/ui/facet-logo'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MessageCircle, Brain, Shield, BarChart3, Clock, Users, CheckCircle, ArrowRight } from 'lucide-react'

export default function HowItWorksPage() {
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
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-black mb-6 meslo-font italic">
              How FACET Works
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed meslo-font italic max-w-3xl mx-auto">
              Discover how our AI-powered multi-agent system provides personalized mental health support 
              tailored to your unique needs and circumstances.
            </p>
          </div>

          {/* Process Steps */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-3 meslo-font italic">Sign Up & Assessment</h3>
              <p className="text-gray-600 leading-relaxed">
                Create your account and complete our initial mental health assessment to help our AI understand your needs.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-3 meslo-font italic">AI Agent Matching</h3>
              <p className="text-gray-600 leading-relaxed">
                Our Smart Router analyzes your profile and connects you with the most appropriate AI agents.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-3 meslo-font italic">Continuous Support</h3>
              <p className="text-gray-600 leading-relaxed">
                Receive 24/7 personalized AI conversations with crisis detection and progress tracking.
              </p>
            </div>
          </div>

          {/* AI Agents Section */}
          <div className="mb-16">
            <h2 className="text-4xl font-bold text-center text-black mb-12 meslo-font italic">
              Meet Your AI Support System
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-facet-card-blue rounded-2xl shadow-lg p-8">
                <div className="flex items-center mb-4">
                  <div className="bg-white/30 rounded-xl w-16 h-16 flex items-center justify-center mb-6">
                    <Brain className="h-8 w-8 text-black" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-black mb-4">Smart Router</h3>
                <p className="text-black/90 leading-relaxed mb-4">
                  Intelligently directs your conversations to the most appropriate AI agent based on your current emotional state, topic, and needs.
                </p>
                <div className="bg-white/20 p-4 rounded-lg">
                  <p className="text-sm text-black/80"><strong>Response Time:</strong> &lt;1 second</p>
                </div>
              </div>

              <div className="bg-facet-card-green rounded-2xl shadow-lg p-8">
                <div className="flex items-center mb-4">
                  <div className="bg-white/30 rounded-xl w-16 h-16 flex items-center justify-center mb-6">
                    <MessageCircle className="h-8 w-8 text-black" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-black mb-4">Emotion Analyzer</h3>
                <p className="text-black/90 leading-relaxed mb-4">
                  Uses advanced VAD (Valence-Arousal-Dominance) models to detect and analyze your emotional state in real-time.
                </p>
                <div className="bg-white/20 p-4 rounded-lg">
                  <p className="text-sm text-black/80"><strong>Capabilities:</strong> Real-time mood detection, pattern recognition</p>
                </div>
              </div>

              <div className="bg-facet-card-pink rounded-2xl shadow-lg p-8">
                <div className="flex items-center mb-4">
                  <div className="bg-white/30 rounded-xl w-16 h-16 flex items-center justify-center mb-6">
                    <Shield className="h-8 w-8 text-black" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-black mb-4">Crisis Assessor</h3>
                <p className="text-black/90 leading-relaxed mb-4">
                  Continuously monitors for signs of crisis or distress, providing immediate resource guidance and emergency contact information when needed.
                </p>
                <div className="bg-white/20 p-4 rounded-lg">
                  <p className="text-sm text-black/80"><strong>Response Time:</strong> &lt;2 seconds for crisis detection</p>
                </div>
              </div>

              <div className="bg-facet-card-lavender rounded-2xl shadow-lg p-8">
                <div className="flex items-center mb-4">
                  <div className="bg-white/30 rounded-xl w-16 h-16 flex items-center justify-center mb-6">
                    <Users className="h-8 w-8 text-black" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-black mb-4">Wellness Advisor</h3>
                <p className="text-black/90 leading-relaxed mb-4">
                  Provides evidence-based CBT and DBT inspired techniques, personalized wellness exercises, and coping strategy suggestions.
                </p>
                <div className="bg-white/20 p-4 rounded-lg">
                  <p className="text-sm text-black/80"><strong>Methods:</strong> CBT, DBT, mindfulness, coping strategies</p>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Modes */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
            <h2 className="text-3xl font-bold text-black mb-8 meslo-font italic text-center">
              Adaptive Response Modes
            </h2>
            
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <Clock className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h4 className="font-bold text-black mb-2">Light Mode</h4>
                <p className="text-sm text-gray-600 mb-2">&lt;1 second</p>
                <p className="text-xs text-gray-500">Quick responses, basic interactions</p>
              </div>

              <div className="text-center">
                <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h4 className="font-bold text-black mb-2">Standard Mode</h4>
                <p className="text-sm text-gray-600 mb-2">&lt;3 seconds</p>
                <p className="text-xs text-gray-500">Wellness conversations, guidance</p>
              </div>

              <div className="text-center">
                <Shield className="h-8 w-8 text-red-600 mx-auto mb-3" />
                <h4 className="font-bold text-black mb-2">Crisis Mode</h4>
                <p className="text-sm text-gray-600 mb-2">&lt;2 seconds</p>
                <p className="text-xs text-gray-500">Emergency detection, immediate help</p>
              </div>

              <div className="text-center">
                <Brain className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <h4 className="font-bold text-black mb-2">Deep Mode</h4>
                <p className="text-sm text-gray-600 mb-2">&lt;8 seconds</p>
                <p className="text-xs text-gray-500">Complex analysis, wellness planning</p>
              </div>
            </div>
          </div>

          {/* Security & Privacy */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
            <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic">Privacy & Security</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3 mt-1" />
                <div>
                  <h4 className="font-bold text-black mb-2">Privacy Focused</h4>
                  <p className="text-sm text-gray-600">Built with privacy-first principles and secure practices</p>
                </div>
              </div>

              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3 mt-1" />
                <div>
                  <h4 className="font-bold text-black mb-2">End-to-End Encryption</h4>
                  <p className="text-sm text-gray-600">All data encrypted in transit and at rest</p>
                </div>
              </div>

              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3 mt-1" />
                <div>
                  <h4 className="font-bold text-black mb-2">Your Data Control</h4>
                  <p className="text-sm text-gray-600">You own and control all your mental health data</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-black mb-6 meslo-font italic">
              Ready to Experience FACET?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Experience personalized AI mental health support that adapts to your needs.
            </p>
            <Link href="/auth/signup">
              <Button variant="facet" size="xl">
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
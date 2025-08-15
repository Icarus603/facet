'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Mark onboarding as completed
      const { error } = await supabase
        .from('user_mental_health_profiles')
        .upsert({
          user_id: user.id,
          initial_assessment_completed: true,
          primary_concerns: ['General Wellness'],
          therapy_experience: 'Getting started',
          medication_status: 'Not specified',
          support_network_strength: 5,
          current_stressors: [],
          coping_strategies: [],
          therapeutic_goals: ['Improve mental wellness']
        })

      if (error) {
        console.error('Error saving profile:', error)
        alert('There was an error. Please try again.')
        return
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Error during onboarding:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to FACET</h1>
          <p className="text-gray-600">Your AI-powered mental health companion</p>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="font-semibold text-blue-900">🧠 Smart AI Therapy</div>
            <div className="text-sm text-blue-700">Multi-agent system with personalized care</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="font-semibold text-green-900">🛡️ Crisis Support</div>
            <div className="text-sm text-green-700">24/7 monitoring and immediate help</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="font-semibold text-purple-900">📊 Progress Tracking</div>
            <div className="text-sm text-purple-700">Monitor your mental wellness journey</div>
          </div>
        </div>

        <button
          onClick={handleComplete}
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {isSubmitting ? 'Setting up...' : 'Get Started'}
        </button>
        
        <p className="text-sm text-gray-500 mt-4">
          You can complete a detailed assessment later
        </p>
      </div>
    </div>
  )
}
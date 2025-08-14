'use client'

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FacetLogo } from '@/components/ui/facet-logo'

const culturalOptions = [
  'African', 'African American', 'Arab/Middle Eastern', 'Asian', 'Caribbean',
  'Central Asian', 'East Asian', 'European', 'Hispanic/Latino', 'Indigenous',
  'Jewish', 'Native American', 'Pacific Islander', 'South Asian', 'Southeast Asian',
  'Mixed/Multiracial', 'Other'
]

const languageOptions = [
  'English', 'Spanish', 'Mandarin', 'Hindi', 'Arabic', 'Portuguese', 'Russian',
  'Japanese', 'French', 'German', 'Korean', 'Vietnamese', 'Italian', 'Turkish',
  'Thai', 'Dutch', 'Swedish', 'Polish', 'Other'
]

const generationOptions = [
  'First generation (immigrant)', 'Second generation (child of immigrants)',
  'Third generation or higher', 'Mixed generational background'
]

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    primaryCulture: '',
    secondaryCultures: [] as string[],
    languagePreferences: [] as string[],
    religiousSpiritualBackground: '',
    generationalStatus: '',
    therapeuticGoals: '',
    culturalValues: '',
  })

  const router = useRouter()
  const supabase = createClient()

  const handleArrayToggle = (field: 'secondaryCultures' | 'languagePreferences', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/signin')
        return
      }

      // Create cultural profile
      const { error: profileError } = await supabase
        .from('user_cultural_profiles')
        .insert({
          user_id: session.user.id,
          primary_culture: formData.primaryCulture,
          secondary_cultures: formData.secondaryCultures,
          language_preferences: formData.languagePreferences,
          religious_spiritual_background: formData.religiousSpiritualBackground,
          generational_status: formData.generationalStatus,
          cultural_values: {
            therapeutic_goals: formData.therapeuticGoals,
            cultural_values: formData.culturalValues,
          }
        })

      if (profileError) {
        setError('Failed to save cultural profile. Please try again.')
        return
      }

      // Update user profile to mark onboarding as complete
      const { error: updateError } = await supabase
        .from('users')
        .update({
          profile: {
            role: 'user',
            onboarding_completed: true,
          }
        })
        .eq('id', session.user.id)

      if (updateError) {
        setError('Failed to complete onboarding. Please try again.')
        return
      }

      router.push('/dashboard')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">What is your primary cultural background?</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {culturalOptions.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, primaryCulture: option }))}
              className={`p-2 text-sm border rounded-md text-left transition-colors ${
                formData.primaryCulture === option
                  ? 'bg-facet-blue text-white border-facet-blue'
                  : 'border-gray-200 hover:border-facet-blue'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">
          Secondary cultural influences (select all that apply)
        </Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {culturalOptions.filter(opt => opt !== formData.primaryCulture).map(option => (
            <button
              key={option}
              type="button"
              onClick={() => handleArrayToggle('secondaryCultures', option)}
              className={`p-2 text-sm border rounded-md text-left transition-colors ${
                formData.secondaryCultures.includes(option)
                  ? 'bg-facet-teal text-white border-facet-teal'
                  : 'border-gray-200 hover:border-facet-teal'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">
          Language preferences (select all that apply)
        </Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {languageOptions.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => handleArrayToggle('languagePreferences', option)}
              className={`p-2 text-sm border rounded-md text-left transition-colors ${
                formData.languagePreferences.includes(option)
                  ? 'bg-facet-wine text-white border-facet-wine'
                  : 'border-gray-200 hover:border-facet-wine'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">Generational status</Label>
        <div className="space-y-2 mt-2">
          {generationOptions.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, generationalStatus: option }))}
              className={`w-full p-3 text-sm border rounded-md text-left transition-colors ${
                formData.generationalStatus === option
                  ? 'bg-facet-navy text-white border-facet-navy'
                  : 'border-gray-200 hover:border-facet-navy'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="religious">Religious or spiritual background (optional)</Label>
        <Input
          id="religious"
          placeholder="e.g., Buddhist, Christian, Muslim, Secular, etc."
          value={formData.religiousSpiritualBackground}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            religiousSpiritualBackground: e.target.value 
          }))}
        />
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="goals" className="text-base font-semibold">
          What are your main therapeutic goals?
        </Label>
        <textarea
          id="goals"
          className="w-full p-3 border rounded-md min-h-[100px] resize-none"
          placeholder="e.g., Managing anxiety, improving relationships, processing grief, cultural identity exploration..."
          value={formData.therapeuticGoals}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            therapeuticGoals: e.target.value 
          }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="values" className="text-base font-semibold">
          What cultural values or principles are important to you? (optional)
        </Label>
        <textarea
          id="values"
          className="w-full p-3 border rounded-md min-h-[100px] resize-none"
          placeholder="e.g., Family honor, collective wellbeing, individual autonomy, spiritual connection..."
          value={formData.culturalValues}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            culturalValues: e.target.value 
          }))}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-facet-chat py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* FACET Logo Header */}
        <div className="text-center mb-8">
          <FacetLogo size={80} className="mx-auto mb-4" />
          <h1 className="facet-title text-3xl font-normal mb-2">Welcome to FACET</h1>
          <p className="text-gray-600">Let's personalize your therapeutic experience</p>
        </div>

        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-gray-900">
              Cultural Profile Setup - Step {step} of 3
            </CardTitle>
            <CardDescription className="text-center">
              Help us understand your cultural background for personalized therapy
            </CardDescription>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-6">
              <div 
                className="bg-facet-gradient h-3 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="flex justify-between pt-6">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={loading}
                >
                  Previous
                </Button>
              )}
              
              {step < 3 ? (
                <Button
                  className="facet-button-primary ml-auto"
                  onClick={() => setStep(step + 1)}
                  disabled={loading || (step === 1 && !formData.primaryCulture)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  className="facet-button-primary ml-auto"
                  onClick={handleSubmit}
                  disabled={loading || !formData.therapeuticGoals.trim()}
                >
                  {loading ? 'Completing Setup...' : 'Complete Setup'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
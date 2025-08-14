'use client'

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

function AuthCallbackContent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setError('Authentication failed. Please try again.')
          return
        }

        if (data.session) {
          // Create user profile if doesn't exist
          const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.session.user.id)
            .single()

          if (userError && userError.code === 'PGRST116') {
            // User doesn't exist, create profile
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.session.user.id,
                email: data.session.user.email!,
                profile: {
                  role: 'user',
                  onboarding_completed: false,
                },
              })

            if (insertError) {
              console.error('Error creating user profile:', insertError)
              setError('Failed to create user profile. Please try again.')
              return
            }
          }

          // Redirect to intended destination or onboarding
          const redirectedFrom = searchParams.get('redirectedFrom')
          const { data: userProfile } = await supabase
            .from('users')
            .select('profile')
            .eq('id', data.session.user.id)
            .single()

          if (!userProfile?.profile?.onboarding_completed) {
            router.push('/onboarding')
          } else {
            router.push(redirectedFrom || '/dashboard')
          }
        } else {
          router.push('/auth/signin')
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [supabase, router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-therapy-calm/20 to-therapy-peaceful/20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Authenticating...</CardTitle>
            <CardDescription className="text-center">
              Please wait while we sign you in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-therapy-calm"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-therapy-calm/20 to-therapy-peaceful/20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <button 
                onClick={() => router.push('/auth/signin')}
                className="text-therapy-calm hover:underline"
              >
                Return to Sign In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default function AuthCallback() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-therapy-calm/20 to-therapy-peaceful/20">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Loading...</CardTitle>
              <CardDescription className="text-center">
                Please wait while we process your authentication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-therapy-calm"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
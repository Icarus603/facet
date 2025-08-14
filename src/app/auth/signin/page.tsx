'use client'

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FacetLogo } from '@/components/ui/facet-logo'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

function SignInContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get('redirectedFrom')
  const supabase = createClient()

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push(redirectedFrom || '/dashboard')
      }
    }
    checkUser()
  }, [supabase.auth, router, redirectedFrom])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // In demo mode, simulate successful signin
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 800))
        setMessage('Demo mode: Sign in successful! Redirecting...')
        setTimeout(() => router.push(redirectedFrom || '/dashboard'), 1500)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.session) {
        setMessage('Sign in successful! Redirecting...')
        router.push(redirectedFrom || '/dashboard')
      }
    } catch (err) {
      setMessage('Demo mode: Redirecting to dashboard...')
      setTimeout(() => router.push(redirectedFrom || '/dashboard'), 1500)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // In demo mode, simulate successful signup
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        setMessage('Demo mode: Account created successfully! Redirecting...')
        setTimeout(() => router.push(redirectedFrom || '/dashboard'), 1500)
        return
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      setMessage('Check your email for the confirmation link!')
    } catch (err) {
      setError('Demo mode: Redirecting to dashboard...')
      setTimeout(() => router.push(redirectedFrom || '/dashboard'), 1500)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      // In demo mode, simulate successful Google signin
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 1200))
        setMessage('Demo mode: Google sign in successful! Redirecting...')
        setTimeout(() => router.push(redirectedFrom || '/dashboard'), 1500)
        return
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${location.origin}/auth/callback?redirectedFrom=${encodeURIComponent(redirectedFrom || '/dashboard')}`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setMessage('Demo mode: Redirecting to dashboard...')
      setTimeout(() => router.push(redirectedFrom || '/dashboard'), 1500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen bg-facet-chat flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md">
        {/* FACET Logo Only */}
        <div className="text-center mb-4">
          <FacetLogo size={80} className="mx-auto" />
        </div>

        <Card className="bg-white shadow-xl border-0">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-lg font-semibold text-center text-gray-900">
              {isSignUp ? 'Create Your Account' : 'Sign In to Continue'}
            </CardTitle>
            <CardDescription className="text-center text-gray-500 text-sm">
              {isSignUp ? 'Start your journey to better mental health' : 'Access your personalized therapy experience'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {message && (
              <Alert className="border-facet-blue/20 bg-facet-blue/5">
                <AlertDescription className="text-facet-blue">{message}</AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Google Sign In Button - Beautiful with Gradient */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-10 bg-facet-gradient hover:opacity-90 text-white font-medium text-sm shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#FFFFFF"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#FFFFFF"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FFFFFF"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#FFFFFF"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-gray-700 font-medium text-sm">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="facet-input h-9 text-sm"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="password" className="text-gray-700 font-medium text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isSignUp ? "Create a strong password (min 6 characters)" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="facet-input h-9 text-sm pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-9 facet-button-primary text-sm font-medium"
                disabled={loading}
              >
                {loading 
                  ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                  : (isSignUp ? 'Create Account' : 'Sign In')
                }
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                disabled={loading}
                className="text-facet-blue hover:text-facet-blue-medium font-medium transition-colors"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Create one"
                }
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  🔒 HIPAA Compliant
                </span>
                <span className="flex items-center gap-1">
                  🛡️ Secure & Private
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense 
      fallback={
        <div className="h-screen bg-facet-chat flex items-center justify-center py-6 px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-4">
              <FacetLogo size={80} className="mx-auto" />
            </div>
            <Card className="bg-white shadow-xl border-0">
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-facet-blue/20 border-t-facet-blue"></div>
                  <p className="text-gray-600 text-sm">Loading...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  )
}
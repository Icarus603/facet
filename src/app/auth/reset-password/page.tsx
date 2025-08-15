'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { FacetLogo } from '@/components/ui/facet-logo'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validToken, setValidToken] = useState(false)
  
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    // Check if we have the required tokens from the email link
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    
    if (accessToken && refreshToken) {
      setValidToken(true)
      // Set the session with the tokens from the URL
      const supabase = createClient()
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
    } else {
      setError('Invalid or expired reset link. Please request a new password reset.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    const supabase = createClient()
    
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      // Redirect to signin after a short delay
      setTimeout(() => {
        router.push('/auth/signin?message=Password updated successfully')
      }, 3000)
    }
    
    setLoading(false)
  }

  if (success) {
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
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center px-4" style={{minHeight: 'calc(100vh - 200px)'}}>
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="meslo-font text-4xl font-bold text-green-600 mb-4" style={{fontStyle: 'italic'}}>
                Password Updated!
              </h1>
              <p className="text-gray-600 text-lg">
                Your password has been successfully updated.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-700 text-sm">
                  You'll be redirected to sign in with your new password in a few seconds.
                </p>
              </div>

              <Link href="/auth/signin">
                <Button variant="facet" className="w-full">
                  Continue to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!validToken) {
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
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center px-4" style={{minHeight: 'calc(100vh - 200px)'}}>
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="meslo-font text-4xl font-bold text-black mb-4" style={{fontStyle: 'italic'}}>
                Link Expired
              </h1>
              <p className="text-gray-600 text-lg">
                This reset link is no longer valid
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-6">
                <p className="text-gray-700 leading-relaxed">
                  Password reset links expire after 1 hour for security. 
                  No worries - just request a new one below.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <Link href="/auth/forgot-password">
                    <Button variant="facet" className="w-full h-12">
                      Get New Reset Link
                    </Button>
                  </Link>
                </div>
                
                <div>
                  <Link href="/auth/signin">
                    <Button className="w-full h-12 bg-black text-white facet-hover-fade">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-start justify-center px-4 pt-2" style={{minHeight: 'calc(100vh - 200px)'}}>
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <h1 className="meslo-font text-4xl font-bold text-black mb-4" style={{fontStyle: 'italic'}}>
              Create new password
            </h1>
            <p className="text-gray-600">
              Enter your new password below.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password (8+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                className="h-12 border-gray-300 focus:border-black focus:ring-black"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 border-gray-300 focus:border-black focus:ring-black"
              />
            </div>

            <Button
              type="submit"
              variant="facet"
              className="w-full h-12 text-base"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? 'Updating password...' : 'Update password'}
            </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
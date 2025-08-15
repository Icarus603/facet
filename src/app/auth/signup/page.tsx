'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { FacetLogo } from '@/components/ui/facet-logo'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signUp } = useAuth()
  const router = useRouter()

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

    const { data, error } = await signUp(email, password, {
      display_name: displayName || undefined,
    })
    
    if (error) {
      setError(error.message)
    } else if (data?.user && !data?.session) {
      // Email confirmation required
      setError('Please check your email and click the confirmation link to complete your account setup.')
    } else {
      // Successfully signed up - useAuth hook will handle redirect automatically
      console.log('Signup successful, waiting for auth state change...')
    }
    
    setLoading(false)
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
              Create your account
            </h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-gray-700 font-medium">Display Name (Optional)</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="How would you like to be called?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                className="h-12 border-gray-300 focus:border-black focus:ring-black"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12 border-gray-300 focus:border-black focus:ring-black"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
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
              <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 border-gray-300 focus:border-black focus:ring-black"
              />
            </div>
            
            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
              By creating an account, you agree to our{' '}
              <Link href="/privacy-policy" className="text-black underline hover:text-gray-700">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/terms" className="text-black underline hover:text-gray-700">
                Terms of Service
              </Link>
              . Your mental health data is encrypted and private.
            </div>

            <Button
              type="submit"
              variant="facet"
              className="w-full h-12 text-base"
              disabled={loading || !email || !password || !confirmPassword}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            
            <p className="text-center text-gray-600">
              Already have an account?{' '}
              <Link
                href="/auth/signin"
                className="text-black hover:text-gray-700 underline font-medium"
              >
                Sign in
              </Link>
            </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
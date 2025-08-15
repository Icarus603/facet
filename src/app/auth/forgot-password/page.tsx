'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { FacetLogo } from '@/components/ui/facet-logo'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    
    setLoading(false)
  }

  if (sent) {
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
              <h1 className="meslo-font text-4xl font-bold text-green-600 mb-4" style={{fontStyle: 'italic'}}>
                Check your email
              </h1>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-700 text-sm">
                  If an account with email <strong>{email}</strong> exists, we've sent you a password reset link.
                </p>
              </div>
              
              <p className="text-gray-600 text-sm mb-6">
                Check your email and click the reset link to create a new password. 
                The link will expire in 1 hour for security reasons.
              </p>

              <div className="space-y-4">
                <div>
                  <Link href="/auth/signin">
                    <Button className="w-full bg-black text-white facet-hover-fade">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
                
                <div>
                  <Button 
                    variant="ghost" 
                    className="w-full text-gray-600"
                    onClick={() => setSent(false)}
                  >
                    Try different email
                  </Button>
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
              Reset your password
            </h1>
            <p className="text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
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

            <Button
              type="submit"
              variant="facet"
              className="w-full h-12 text-base"
              disabled={loading || !email}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
            
            <div className="mt-4">
              <Link href="/auth/signin">
                <Button className="w-full bg-black text-white facet-hover-fade">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
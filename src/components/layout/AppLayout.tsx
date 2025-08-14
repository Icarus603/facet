"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MainNavigation } from '@/components/navigation'
import type { User } from '@supabase/supabase-js'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-therapy-calm/10 to-therapy-peaceful/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-therapy-growth mx-auto mb-4"></div>
          <p className="text-gray-600">Loading FACET...</p>
        </div>
      </div>
    )
  }

  // Redirect to signin if not authenticated
  if (!user) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Navigation */}
      <MainNavigation />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:pl-72">
        {/* Mobile padding for bottom nav */}
        <main className="flex-1 pb-16 lg:pb-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
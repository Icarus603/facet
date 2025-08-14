'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreativeExpressionTools } from '@/components/creative'
import { FacetLogo } from '@/components/ui/facet-logo'
import { SidebarLayout } from '@/components/layout/sidebar-layout'
import { 
  SparklesIcon
} from '@heroicons/react/24/outline'

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic'

export default function CreativePage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/signin')
        return
      }
      
      setSession(session)
      setLoading(false)
    }

    getSession()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-facet-blue/20 border-t-facet-blue"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const sessionId = searchParams.get('session_id') || undefined

  return (
    <SidebarLayout>
      <div className="flex-1 px-8 py-8 bg-facet-chat overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Creative Tools Component */}
          <CreativeExpressionTools
            sessionId={sessionId}
            userId={session.user.id}
            onAgentFeedback={(feedback) => {
              // Handle agent feedback - could integrate with chat system
              console.log('Agent feedback received:', feedback)
            }}
          />
        </div>
      </div>
    </SidebarLayout>
  )
}
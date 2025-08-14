'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SidebarLayout } from '@/components/layout/sidebar-layout'
import SessionHistoryVisualization from '@/components/analytics/SessionHistoryVisualization'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClockIcon, FilterIcon } from '@heroicons/react/24/outline'

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic'

interface TherapySession {
  id: string
  user_id: string
  session_type: string
  primary_concern?: string
  cultural_context?: any
  session_goals: string[]
  status: string
  started_at: string
  ended_at?: string
  duration_minutes?: number
  satisfaction_rating?: number
  cultural_relevance_rating?: number
  crisis_detected: boolean
  agent_coordination_summary?: any
}

interface SessionStats {
  totalSessions: number
  averageDuration: number
  averageSatisfaction: number
  crisisCount: number
  completedSessions: number
}

export default function SessionsPage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [therapySessions, setTherapySessions] = useState<TherapySession[]>([])
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    averageDuration: 0,
    averageSatisfaction: 0,
    crisisCount: 0,
    completedSessions: 0
  })
  const [filterPeriod, setFilterPeriod] = useState('all') // all, week, month, quarter
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/signin')
        return
      }
      
      setSession(session)
      await loadSessionHistory(session.user.id)
      setLoading(false)
    }

    getSession()
  }, [supabase, router])

  const loadSessionHistory = async (userId: string) => {
    try {
      // Get all therapy sessions for user
      const { data: sessions, error } = await supabase
        .from('therapy_sessions')
        .select(`
          *,
          therapy_interactions (
            id,
            interaction_type,
            agent_type,
            timestamp
          )
        `)
        .eq('user_id', userId)
        .order('started_at', { ascending: false })

      if (error) {
        console.error('Error loading sessions:', error)
        return
      }

      setTherapySessions(sessions || [])
      
      // Calculate stats
      if (sessions) {
        const completed = sessions.filter(s => s.status === 'completed')
        const withDuration = sessions.filter(s => s.duration_minutes)
        const withRating = sessions.filter(s => s.satisfaction_rating)
        const crises = sessions.filter(s => s.crisis_detected)

        setStats({
          totalSessions: sessions.length,
          averageDuration: withDuration.length > 0 
            ? Math.round(withDuration.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / withDuration.length)
            : 0,
          averageSatisfaction: withRating.length > 0
            ? Math.round((withRating.reduce((sum, s) => sum + (s.satisfaction_rating || 0), 0) / withRating.length) * 10) / 10
            : 0,
          crisisCount: crises.length,
          completedSessions: completed.length
        })
      }
    } catch (error) {
      console.error('Error loading session history:', error)
    }
  }

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

  // Transform sessions for visualization component
  const sessionData = therapySessions.map(s => ({
    id: s.id,
    date: new Date(s.started_at),
    duration: s.duration_minutes || 0,
    agentTypes: s.agent_coordination_summary?.agents || ['therapy_coordinator'],
    satisfactionRating: s.satisfaction_rating || 0,
    culturalContentUsed: s.cultural_context ? Object.keys(s.cultural_context).length : 0,
    crisisDetected: s.crisis_detected,
    sessionGoals: s.session_goals,
    status: s.status,
    primaryConcern: s.primary_concern
  }))

  return (
    <SidebarLayout>
      <div className="flex-1 px-8 py-8 bg-facet-chat overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <ClockIcon className="w-8 h-8 text-facet-blue" />
              <h1 className="text-3xl font-semibold text-gray-900">Session History</h1>
            </div>
            <p className="text-gray-600">
              Detailed view of your therapy sessions with agent coordination and progress tracking
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-facet-blue">{stats.totalSessions}</div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-facet-wine">{stats.averageDuration}m</div>
                <div className="text-sm text-gray-600">Avg Duration</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-facet-teal">{stats.averageSatisfaction}/5</div>
                <div className="text-sm text-gray-600">Satisfaction</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.crisisCount}</div>
                <div className="text-sm text-gray-600">Crisis Events</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <FilterIcon className="w-5 h-5 text-gray-500" />
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All Time' },
                { key: 'week', label: 'Last Week' },
                { key: 'month', label: 'Last Month' },
                { key: 'quarter', label: 'Last 3 Months' }
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  variant={filterPeriod === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterPeriod(key)}
                  className={filterPeriod === key ? "bg-facet-blue hover:bg-facet-blue/90" : ""}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Session History Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Session Timeline & Analytics</CardTitle>
              <CardDescription>
                Interactive timeline showing agent involvement, cultural content usage, and session outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionData.length > 0 ? (
                <SessionHistoryVisualization
                  sessions={sessionData}
                  userId={session.user.id}
                  filterPeriod={filterPeriod}
                  onSessionClick={(sessionId) => {
                    // Navigate to session detail or open modal
                    console.log('Session clicked:', sessionId)
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <ClockIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sessions Yet</h3>
                  <p className="text-gray-600 mb-6">Start your first therapy session to see your history here</p>
                  <Button 
                    onClick={() => router.push('/chat')}
                    className="bg-facet-blue hover:bg-facet-blue/90"
                  >
                    Start Therapy Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp, Calendar, Heart, Brain } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProgressPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [progressData, setProgressData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadProgressData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/signin')
          return
        }
        setUser(user)

        // Load user's progress data
        const { data: sessions } = await supabase
          .from('therapy_sessions')
          .select(`
            *,
            conversation_messages(count)
          `)
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })

        // Calculate progress metrics
        const totalSessions = sessions?.length || 0
        const thisWeekSessions = sessions?.filter(session => {
          const sessionDate = new Date(session.started_at)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return sessionDate >= weekAgo
        }).length || 0

        const averageSessionLength = sessions?.reduce((acc, session) => {
          if (session.ended_at) {
            const duration = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
            return acc + duration
          }
          return acc
        }, 0) || 0

        setProgressData({
          totalSessions,
          thisWeekSessions,
          averageSessionLength: Math.round(averageSessionLength / (sessions?.length || 1) / 1000 / 60) || 0, // in minutes
          sessions: sessions?.slice(0, 10) || [] // last 10 sessions
        })

      } catch (error) {
        console.error('Error loading progress data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProgressData()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading progress data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#FAF9F5'}}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/chat/recents">
            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-black meslo-font italic">
              Your Progress
            </h1>
            <p className="text-gray-600 mt-1 meslo-font">
              Track your mental health journey with FACET
            </p>
          </div>
        </div>

        {/* Progress Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-facet-card-blue rounded-lg">
                <Brain className="h-6 w-6 text-black" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black meslo-font">Total Sessions</h3>
                <p className="text-2xl font-bold text-facet-blue meslo-font">{progressData?.totalSessions || 0}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 meslo-font">
              Conversations with FACET since you started
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-facet-card-green rounded-lg">
                <Calendar className="h-6 w-6 text-black" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black meslo-font">This Week</h3>
                <p className="text-2xl font-bold text-green-600 meslo-font">{progressData?.thisWeekSessions || 0}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 meslo-font">
              Sessions completed in the last 7 days
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-facet-card-pink rounded-lg">
                <TrendingUp className="h-6 w-6 text-black" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black meslo-font">Avg. Length</h3>
                <p className="text-2xl font-bold text-facet-wine meslo-font">{progressData?.averageSessionLength || 0}min</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 meslo-font">
              Average session duration
            </p>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-black meslo-font">Recent Sessions</h2>
            <Link href="/chat/recents">
              <Button variant="outline" size="sm" className="meslo-font">
                View all conversations
              </Button>
            </Link>
          </div>

          {progressData?.sessions?.length > 0 ? (
            <div className="space-y-4">
              {progressData.sessions.map((session: any, index: number) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-facet-gradient rounded-full flex items-center justify-center text-white font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-medium text-black">
                        {session.session_summary || `Session ${index + 1}`}
                      </h3>
                      <p className="text-sm text-gray-600 meslo-font">
                        {new Date(session.started_at).toLocaleDateString()} • 
                        {session.workflow_mode} mode
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {session.conversation_messages?.[0]?.count || 0} messages
                    </div>
                    {session.emotional_context?.primary_emotion && (
                      <div className="text-xs text-gray-400 capitalize">
                        {session.emotional_context.primary_emotion}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No sessions yet</h3>
              <p className="text-gray-500 mb-4">
                Start your first conversation to begin tracking your progress
              </p>
              <Link href="/chat/new">
                <Button className="bg-facet-gradient text-white">
                  Start your first conversation
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Insights Section */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-xl font-semibold text-black mb-4">Your Journey</h2>
          <div className="space-y-4">
            <div className="p-4 bg-facet-card-lavender rounded-lg">
              <h3 className="font-semibold text-black mb-2">Keep up the momentum!</h3>
              <p className="text-black/80">
                Regular conversations with FACET can help you build better mental health habits and coping strategies.
                {progressData?.thisWeekSessions > 0 
                  ? ` You've had ${progressData.thisWeekSessions} session${progressData.thisWeekSessions > 1 ? 's' : ''} this week - that's excellent!`
                  : ' Consider starting a conversation when you have time to check in with yourself.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
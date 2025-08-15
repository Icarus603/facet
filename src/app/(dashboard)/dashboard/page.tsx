import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { EmotionalHealthOverview } from '@/components/dashboard/emotional-health-overview'
import { ProgressSummary } from '@/components/dashboard/progress-summary'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { RecentSessions } from '@/components/dashboard/recent-sessions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Fetch user profile and recent data
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: mentalHealthProfile } = await supabase
    .from('user_mental_health_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const { data: recentSessions } = await supabase
    .from('therapy_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(5)

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader 
        user={profile} 
        mentalHealthProfile={mentalHealthProfile}
      />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Quick Actions */}
        <QuickActions />
        
        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Emotional Health */}
          <div className="lg:col-span-2 space-y-6">
            <EmotionalHealthOverview userId={user.id} />
            <RecentSessions sessions={recentSessions || []} />
          </div>
          
          {/* Right Column - Progress & Goals */}
          <div className="space-y-6">
            <ProgressSummary userId={user.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
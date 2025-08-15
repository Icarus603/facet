import { createClient } from '@/lib/supabase/server'
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

  const displayName = profile?.display_name || 'Friend'
  const currentHour = new Date().getHours()
  
  let greeting = 'Good morning'
  if (currentHour >= 12 && currentHour < 17) {
    greeting = 'Good afternoon'
  } else if (currentHour >= 17) {
    greeting = 'Good evening'
  }

  return (
    <div className="flex h-screen" style={{backgroundColor: '#FAF9F5'}}>
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto" style={{backgroundColor: '#FAF9F5'}}>
        <div className="max-w-6xl mx-auto p-8">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="meslo-font text-4xl font-bold text-black mb-4" style={{fontStyle: 'italic'}}>
              {greeting}, {displayName}
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              How are you feeling today? I'm here to support you.
            </p>
          </div>
          
          {/* Quick Actions */}
          <QuickActions />
          
          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
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
    </div>
  )
}
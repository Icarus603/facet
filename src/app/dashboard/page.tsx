'use client';

import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FacetLogo } from '@/components/ui/facet-logo'
import { ProgressCharts } from '@/components/dashboard/progress-charts'
import { SidebarLayout } from '@/components/layout/sidebar-layout'
import { 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  HeartIcon,
  ChartBarIcon,
  PaintBrushIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        window.location.href = '/auth/signin';
        return;
      }

      setSession(session);

      // Skip heavy database queries for now to speed up page loading
      // These can be loaded separately with suspense/lazy loading
      const userProfile = null;
      const recentSessions = [];

      setUserProfile(userProfile);
      setRecentSessions(recentSessions || []);
      setLoading(false);
    };

    getSession();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-facet-blue/20 border-t-facet-blue"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const culturalProfile = userProfile?.user_cultural_profiles?.[0]

  return (
    <SidebarLayout recentSessions={recentSessions}>
      <div className="flex-1 px-8 py-8 bg-facet-chat overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Quick Actions */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-facet-blue" />
                  Start Therapy Session
                </CardTitle>
                <CardDescription>
                  Begin a new culturally-aware therapy session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/chat">
                    <Button className="facet-button-primary w-full">
                      <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                      Start New Session
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full border-facet-wine text-facet-wine hover:bg-facet-wine hover:text-white">
                    <HeartIcon className="w-4 h-4 mr-2" />
                    Crisis Support
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cultural Profile Summary */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <UserCircleIcon className="w-5 h-5 text-facet-wine" />
                  Your Cultural Profile
                </CardTitle>
                <CardDescription>
                  Cultural background and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                {culturalProfile ? (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Primary Culture:</span>{' '}
                      <span className="text-facet-blue">{culturalProfile.primary_culture}</span>
                    </div>
                    {culturalProfile.language_preferences?.length > 0 && (
                      <div>
                        <span className="font-medium">Languages:</span>{' '}
                        <span className="text-facet-teal">
                          {culturalProfile.language_preferences.slice(0, 2).join(', ')}
                          {culturalProfile.language_preferences.length > 2 && '...'}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Status:</span>{' '}
                      <span className="text-facet-wine">{culturalProfile.generational_status}</span>
                    </div>
                    <Link href="/onboarding">
                      <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto text-facet-blue hover:text-facet-blue-medium">
                        Edit Profile →
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p>Complete your cultural profile to get started</p>
                    <Link href="/onboarding">
                      <Button variant="outline" size="sm" className="mt-2 border-facet-blue text-facet-blue hover:bg-facet-blue hover:text-white">
                        Complete Profile
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Overview */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <ChartBarIcon className="w-5 h-5 text-facet-teal" />
                  Your Progress
                </CardTitle>
                <CardDescription>
                  Therapy journey insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Total Sessions:</span>
                    <span className="font-medium text-facet-blue">{recentSessions?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subscription:</span>
                    <span className="font-medium capitalize text-facet-teal">
                      {userProfile?.subscription_tier || 'Free'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cultural Integration:</span>
                    <span className="font-medium text-facet-wine">Active</span>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto text-facet-blue hover:text-facet-blue-medium">
                    View Details →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sessions */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <ClockIcon className="w-5 h-5 text-facet-navy" />
                Recent Sessions
              </CardTitle>
              <CardDescription>
                Your recent therapy sessions and outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions && recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <div 
                      key={session.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-facet-blue transition-colors"
                    >
                      <div>
                        <p className="font-medium capitalize text-gray-900">
                          {session.session_type?.replace('_', ' ') || 'General Session'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(session.started_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          session.status === 'completed' 
                            ? 'bg-facet-teal/10 text-facet-teal border border-facet-teal/20'
                            : 'bg-facet-wine/10 text-facet-wine border border-facet-wine/20'
                        }`}>
                          {session.status}
                        </span>
                        {session.satisfaction_rating && (
                          <span className="text-sm text-facet-blue">
                            ⭐ {session.satisfaction_rating}/5
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <FacetLogo size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-gray-600">No therapy sessions yet</p>
                  <p className="text-sm text-gray-500 mb-4">Start your first session to begin your journey</p>
                  <Link href="/chat">
                    <Button className="facet-button-primary">
                      <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                      Start Your First Session
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Visualization Charts */}
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Progress Journey</h2>
            <ProgressCharts />
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
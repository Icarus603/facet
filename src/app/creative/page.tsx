import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CreativeExpressionTools } from '@/components/creative'
import { FacetLogo } from '@/components/ui/facet-logo'
import { 
  ChatBubbleLeftRightIcon,
  PaintBrushIcon,
  ClockIcon,
  HeartIcon,
  ChartBarIcon,
  UserCircleIcon,
  BookOpenIcon,
  CameraIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

// Force dynamic rendering to avoid build-time errors
export const dynamic = 'force-dynamic'

interface CreativePageProps {
  searchParams: { session_id?: string }
}

export default async function CreativePage({ searchParams }: CreativePageProps) {
  const supabase = createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/auth/signin')
  }

  const sessionId = searchParams.session_id

  return (
    <div className="flex h-screen bg-facet-chat">
      {/* Left Sidebar - FACET Style matching /chat */}
      <div className="w-80 bg-facet-sidebar border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FacetLogo size={32} showGlow={false} />
            <h2 className="facet-title text-2xl font-normal">FACET</h2>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-4">
          <div className="space-y-1">
            <Link href="/chat" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Start Therapy</span>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <ChartBarIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Dashboard</span>
            </Link>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-facet-wine text-white">
              <PaintBrushIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Creative Tools</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <ClockIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Session History</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <HeartIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Progress</span>
            </div>
          </div>

          {/* Creative Tools Quick Access */}
          <div className="mt-6">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quick Tools
            </div>
            <div className="space-y-1">
              <div className="px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-2">
                  <BookOpenIcon className="w-4 h-4 text-facet-blue" />
                  <span className="text-sm text-gray-700">Journal</span>
                </div>
              </div>
              <div className="px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-2">
                  <HeartIcon className="w-4 h-4 text-facet-wine" />
                  <span className="text-sm text-gray-700">Mood Map</span>
                </div>
              </div>
              <div className="px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-2">
                  <PaintBrushIcon className="w-4 h-4 text-facet-teal" />
                  <span className="text-sm text-gray-700">Art Canvas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <UserCircleIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.user.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Creative Session
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Claude Style Layout */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 px-8 py-8 bg-facet-chat overflow-auto">
          <div className="max-w-4xl mx-auto">
            {/* Welcome Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <FacetLogo size={64} />
                <SparklesIcon className="w-8 h-8 text-facet-wine ml-2" />
              </div>
              <h1 className="facet-title text-4xl font-normal mb-2">
                Creative Expression Tools
              </h1>
              <p className="text-gray-600 text-lg">
                Express yourself through journaling, mood tracking, and art therapy
              </p>
            </div>

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
      </div>
    </div>
  )
}
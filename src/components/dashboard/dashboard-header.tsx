import { Button } from '@/components/ui/button'
import { MessageCircle, Shield } from 'lucide-react'
import Link from 'next/link'

interface DashboardHeaderProps {
  user: any
  mentalHealthProfile: any
}

export function DashboardHeader({ user, mentalHealthProfile }: DashboardHeaderProps) {
  const displayName = user?.display_name || 'Friend'
  const currentHour = new Date().getHours()
  
  let greeting = 'Good morning'
  if (currentHour >= 12 && currentHour < 17) {
    greeting = 'Good afternoon'
  } else if (currentHour >= 17) {
    greeting = 'Good evening'
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {displayName}
          </h1>
          <p className="text-gray-600 mt-1">
            How are you feeling today? I'm here to support you.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Quick Crisis Access */}
          <Link href="/crisis">
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              <Shield className="h-4 w-4 mr-2" />
              Crisis Support
            </Button>
          </Link>
          
          {/* Start Therapy Session */}
          <Link href="/chat">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <MessageCircle className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
import { Button } from '@/components/ui/button'
import { MessageCircle, Shield, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import { FacetLogo } from '@/components/ui/facet-logo'

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
    <>
      {/* FACET Standard Header */}
      <header className="relative sticky top-0 z-50" style={{backgroundColor: '#FAF9F5'}}>
        <div className="w-full pl-2 pr-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center h-24">
              <FacetLogo className="h-24 w-24" />
              <span className="text-2xl text-facet-gradient facet-title-zapfino leading-relaxed m-0 pl-2 pr-12 pt-6 pb-2 -ml-2">FACET</span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Quick Crisis Access */}
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                <Shield className="h-4 w-4 mr-2" />
                Crisis
              </Button>
              
              {/* Start Chat Session */}
              <Link href="/chat">
                <Button variant="facet">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Start Chat
                </Button>
              </Link>
              
              {/* Settings */}
              <Button variant="outline" className="border-gray-300">
                <Settings className="h-4 w-4" />
              </Button>
              
              {/* Sign Out */}
              <Button variant="outline" className="border-gray-300">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <div className="text-center">
          <h1 className="meslo-font text-4xl font-bold text-black mb-4" style={{fontStyle: 'italic'}}>
            {greeting}, {displayName}
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            How are you feeling today? I'm here to support you.
          </p>
        </div>
      </div>
    </>
  )
}
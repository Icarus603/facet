'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FacetLogo } from '@/components/ui/facet-logo'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  MessageCircle, 
  BarChart3, 
  Target, 
  User, 
  Settings,
  Shield,
  LogOut,
  Home
} from 'lucide-react'

interface SidebarItem {
  icon: any
  label: string
  href: string
  isActive?: boolean
  variant?: 'default' | 'crisis'
}

export function AppSidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  const sidebarItems: SidebarItem[] = [
    {
      icon: Home,
      label: 'Dashboard',
      href: '/dashboard',
    },
    {
      icon: MessageCircle,
      label: 'Chat Therapy',
      href: '/chat',
    },
    {
      icon: BarChart3,
      label: 'Progress',
      href: '/progress',
    },
    {
      icon: Target,
      label: 'Goals',
      href: '/goals',
    },
    {
      icon: User,
      label: 'Profile',
      href: '/profile',
    },
    {
      icon: Settings,
      label: 'Settings',
      href: '/settings',
    },
  ]

  const crisisItem: SidebarItem = {
    icon: Shield,
    label: 'Crisis Support',
    href: '/crisis',
    variant: 'crisis'
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r border-gray-200" style={{backgroundColor: '#FAF9F5'}}>
      {/* Logo and Branding */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-200">
        <FacetLogo className="h-10 w-10" />
        <div>
          <span className="text-xl text-facet-gradient facet-title-zapfino">FACET</span>
          <p className="text-xs text-gray-600 mt-1">Multi-Agent AI</p>
        </div>
      </div>

      {/* Crisis Support Button */}
      <div className="p-4">
        <Link href={crisisItem.href}>
          <Button 
            variant="crisis" 
            className="w-full justify-start gap-3 h-12"
          >
            <crisisItem.icon className="h-5 w-5" />
            {crisisItem.label}
          </Button>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-2">
        <ul className="space-y-2">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href
            
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      "w-full p-3 rounded-xl text-left transition-all duration-200 hover:shadow-sm border group cursor-pointer",
                      isActive
                        ? "bg-white shadow-md border-gray-200 text-gray-900"
                        : "border-transparent hover:border-gray-200 hover:bg-white/50 text-gray-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        isActive 
                          ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white" 
                          : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium text-sm",
                          isActive ? "text-gray-900" : "text-gray-700"
                        )}>
                          {item.label}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Actions */}
      <div className="p-4 border-t border-gray-200">
        <div
          onClick={handleSignOut}
          className="w-full p-3 rounded-xl text-left transition-all duration-200 hover:shadow-sm border border-transparent hover:border-gray-200 hover:bg-white/50 text-gray-700 cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-gray-200 transition-colors">
              <LogOut className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-700">
                Sign Out
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
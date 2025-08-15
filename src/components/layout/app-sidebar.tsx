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
    <div className="flex h-screen w-64 flex-col bg-gray-50 border-r border-gray-200">
      {/* Logo and Branding */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-200">
        <FacetLogo className="h-8 w-8" />
        <div>
          <h1 className="font-bold text-lg text-gray-900">FACET</h1>
          <p className="text-xs text-gray-500">Mental Health Support</p>
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
        <ul className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href
            
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-10",
                      isActive && "bg-blue-50 text-blue-700 border border-blue-200"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Actions */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-gray-600 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
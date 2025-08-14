"use client"

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DiamondLogo } from '@/components/ui/diamond-logo'
import {
  MessageCircle,
  BarChart3,
  Palette,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Activity,
  Sparkles
} from 'lucide-react'

interface NavigationItem {
  href: string
  label: string
  icon: React.ComponentType<any>
  description: string
}

const navigationItems: NavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
    description: 'Overview and quick actions'
  },
  {
    href: '/chat',
    label: 'Therapy Chat',
    icon: MessageCircle,
    description: 'Start therapy session'
  },
  {
    href: '/creative',
    label: 'Creative Tools',
    icon: Palette,
    description: 'Journal, mood tracking, art'
  },
  {
    href: '/progress',
    label: 'Progress',
    icon: BarChart3,
    description: 'Track your therapeutic journey'
  },
  {
    href: '/insights',
    label: 'Insights',
    icon: Sparkles,
    description: 'AI-generated insights and patterns'
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: User,
    description: 'Personal and cultural settings'
  }
]

export default function MainNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/auth/signin')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const isActive = (href: string) => {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center h-16 flex-shrink-0 px-6 bg-gradient-to-r from-therapy-growth to-therapy-calm">
            <DiamondLogo className="w-8 h-8 text-white" />
            <span className="ml-3 text-xl font-bold text-white">FACET</span>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                      active
                        ? 'bg-therapy-growth/10 text-therapy-growth border border-therapy-growth/20'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      active ? 'text-therapy-growth' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    </div>
                  </a>
                )
              })}
            </nav>

            {/* Settings & Logout */}
            <div className="border-t border-gray-200 p-4 space-y-2">
              <a
                href="/settings"
                className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Settings className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                Settings
              </a>
              
              <Button
                variant="ghost"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                <LogOut className="mr-3 h-5 w-5" />
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <div className="flex items-center">
            <DiamondLogo className="w-8 h-8 text-therapy-growth" />
            <span className="ml-3 text-xl font-bold text-gray-900">FACET</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="p-2"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={toggleMobileMenu} />
            
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileMenu}
                  className="p-2 text-white"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>

              {/* Mobile Navigation Content */}
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <nav className="px-4 space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={toggleMobileMenu}
                        className={`group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors ${
                          active
                            ? 'bg-therapy-growth/10 text-therapy-growth border border-therapy-growth/20'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`mr-4 flex-shrink-0 h-6 w-6 ${
                          active ? 'text-therapy-growth' : 'text-gray-400 group-hover:text-gray-500'
                        }`} />
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                      </a>
                    )
                  })}
                </nav>
              </div>

              {/* Mobile Settings & Logout */}
              <div className="border-t border-gray-200 p-4 space-y-1">
                <a
                  href="/settings"
                  onClick={toggleMobileMenu}
                  className="group flex items-center px-3 py-2 text-base font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  <Settings className="mr-4 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  Settings
                </a>
                
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <LogOut className="mr-4 h-6 w-6" />
                  {isLoggingOut ? 'Signing out...' : 'Sign out'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation (Alternative) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 gap-1">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-3 px-1 transition-colors ${
                  active
                    ? 'text-therapy-growth bg-therapy-growth/5'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </a>
            )
          })}
        </div>
      </div>
    </>
  )
}
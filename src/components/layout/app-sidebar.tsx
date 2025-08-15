'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FacetLogo } from '@/components/ui/facet-logo'
import { useAuth } from '@/lib/hooks/useAuth'
import { 
  MessageCircle,
  BarChart3,
  Target,
  Settings,
  Home
} from 'lucide-react'

export function AppSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  useEffect(() => {
    // Small delay to ensure DOM is fully rendered before enabling transitions
    setTimeout(() => setIsInitialized(true), 50)
  }, [])

  const getButtonColor = (path: string) => {
    return pathname === path ? 'var(--facet-wine-primary)' : 'var(--facet-blue-primary)'
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="flex h-screen bg-claude-chat">
      {/* Left Sidebar - FACET Style */}
      <div 
        className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-claude-sidebar border-r border-gray-200 flex flex-col overflow-hidden ${isInitialized ? 'transition-all duration-300 ease-in-out' : ''}`}
        style={{ borderRadius: 0 }}
      >
        {/* Sidebar Header */}
        <div style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '8px', paddingBottom: '8px' }}>
          <div className="flex items-center h-16">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:scale-110 transition-all duration-200 hover:drop-shadow-lg flex-shrink-0"
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              style={{ marginLeft: '-8px' }}
            >
              <FacetLogo className="h-16 w-16" />
            </button>
            <span className={`text-xl text-facet-gradient facet-title-zapfino leading-relaxed m-0 pl-1 pr-8 pt-5 pb-1 ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>FACET</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="pt-2 space-y-3" style={{ paddingLeft: '8px', paddingRight: '8px' }}>
          <div className="relative h-10">
            <Link href="/chat">
              <button 
                className={`absolute top-0 h-10 text-white rounded-lg hover:opacity-90 ${isInitialized ? 'transition-all duration-300' : ''}`}
                style={{ 
                  backgroundColor: getButtonColor('/chat'),
                  left: '4px',
                  width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
                }}
                title="Chat Therapy"
              >
              </button>
            </Link>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Chat Therapy</span>
          </div>

          <div className="relative h-10">
            <Link href="/dashboard">
              <button 
                className={`absolute top-0 h-10 text-white rounded-lg hover:opacity-90 ${isInitialized ? 'transition-all duration-300' : ''}`}
                style={{ 
                  backgroundColor: getButtonColor('/dashboard'),
                  left: '4px',
                  width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
                }}
                title="Dashboard"
              >
              </button>
            </Link>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Dashboard</span>
          </div>

          <div className="relative h-10">
            <Link href="/progress">
              <button 
                className={`absolute top-0 h-10 text-white rounded-lg hover:opacity-90 ${isInitialized ? 'transition-all duration-300' : ''}`}
                style={{ 
                  backgroundColor: getButtonColor('/progress'),
                  left: '4px',
                  width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
                }}
                title="Progress"
              >
              </button>
            </Link>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Progress</span>
          </div>

          <div className="relative h-10">
            <Link href="/goals">
              <button 
                className={`absolute top-0 h-10 text-white rounded-lg hover:opacity-90 ${isInitialized ? 'transition-all duration-300' : ''}`}
                style={{ 
                  backgroundColor: getButtonColor('/goals'),
                  left: '4px',
                  width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
                }}
                title="Goals"
              >
              </button>
            </Link>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Goals</span>
          </div>

          <div className="relative h-10">
            <Link href="/settings">
              <button 
                className={`absolute top-0 h-10 text-white rounded-lg hover:opacity-90 ${isInitialized ? 'transition-all duration-300' : ''}`}
                style={{ 
                  backgroundColor: getButtonColor('/settings'),
                  left: '4px',
                  width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
                }}
                title="Settings"
              >
              </button>
            </Link>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Settings</span>
          </div>
        </div>

        {/* Spacer to push user profile to bottom */}
        <div className="flex-1"></div>

        {/* User Profile */}
        <div style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '16px', paddingBottom: '16px' }}>
          <div className="relative h-10">
            <div className="absolute top-0 w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center" style={{ left: '4px' }}>
              <span className="text-sm font-medium text-gray-600">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className={`absolute top-0 left-14 flex-1 min-w-0 ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <p className="text-sm font-medium text-gray-900 truncate whitespace-nowrap">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate whitespace-nowrap">
                Ready to help
              </p>
            </div>
          </div>
          
          {/* Sign Out Button - only visible when expanded */}
          {sidebarOpen && (
            <div className="mt-3">
              <button
                onClick={handleSignOut}
                className="w-full text-left text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FacetLogo } from '@/components/ui/facet-logo'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSidebar } from '@/lib/hooks/useSidebar'
import { 
  MessageCircle,
  Settings,
  LogOut,
  User,
  ChevronUp,
  HelpCircle,
  Shield,
  Plus
} from 'lucide-react'

export function AppSidebar() {
  const { sidebarOpen, setSidebarOpen, isInitialized } = useSidebar()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])


  const getButtonColor = (path: string) => {
    return pathname === path ? 'var(--facet-wine-primary)' : 'var(--facet-blue-primary)'
  }

  const handleSignOut = async () => {
    setUserMenuOpen(false)
    await signOut()
  }

  return (
    <div 
      className={`fixed left-0 top-0 h-full ${sidebarOpen ? 'w-80' : 'w-16'} bg-claude-sidebar border-r border-gray-200 flex flex-col overflow-hidden z-40 ${isInitialized ? 'transition-all duration-300 ease-in-out' : ''}`}
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
            <span className={`text-xl text-facet-gradient facet-title-zapfino leading-relaxed m-0 pl-2 pr-8 pt-6 pb-2 ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>FACET</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="pt-2 space-y-3" style={{ paddingLeft: '8px', paddingRight: '8px' }}>
          <div className="relative h-10">
            <Link href="/chat/new">
              <button 
                className={`absolute top-0 h-10 text-white rounded-lg hover:opacity-90 ${isInitialized ? 'transition-all duration-300' : ''}`}
                style={{ 
                  backgroundColor: getButtonColor('/chat/new'),
                  left: '4px',
                  width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
                }}
                title="New Chat"
              >
              </button>
            </Link>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>New Chat</span>
          </div>

          <div className="relative h-10">
            <Link href="/chat">
              <button 
                className={`absolute top-0 h-10 text-white rounded-lg hover:opacity-90 ${isInitialized ? 'transition-all duration-300' : ''}`}
                style={{ 
                  backgroundColor: getButtonColor('/chat'),
                  left: '4px',
                  width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
                }}
                title="Chats"
              >
              </button>
            </Link>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Chats</span>
          </div>

        </div>

        {/* Spacer to push user profile to bottom */}
        <div className="flex-1"></div>

        {/* User Profile */}
        <div ref={userMenuRef} className="relative" style={{ paddingLeft: '8px', paddingRight: '8px', paddingBottom: '16px' }}>
          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div 
              className="absolute bottom-16 bg-white border border-gray-200 rounded-xl shadow-xl py-3 z-50 transform transition-all duration-200 ease-out scale-100 opacity-100"
              style={{ 
                left: sidebarOpen ? '8px' : '-180px',
                width: sidebarOpen ? 'calc(100% - 16px)' : '240px',
                minWidth: '240px'
              }}
            >
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email || 'user@facet.ai'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-500">Mental Health Plan</span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Link href="/settings">
                  <button 
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                </Link>
                
                <button 
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  onClick={() => {
                    setUserMenuOpen(false)
                    // Add help functionality here
                  }}
                >
                  <HelpCircle className="h-4 w-4" />
                  Get Help
                </button>

                <button 
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  onClick={() => {
                    setUserMenuOpen(false)
                    // Add crisis support functionality here
                  }}
                >
                  <Shield className="h-4 w-4" />
                  Crisis Support
                </button>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-100 pt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
          )}
          
          {/* User Avatar Button - Fixed Height */}
          <button 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full h-12 flex items-center rounded-lg px-1 transition-all duration-200 hover:scale-[1.02]"
            style={{ 
              backgroundColor: userMenuOpen ? '#F0EEE6' : 'transparent',
              ':hover': { backgroundColor: '#F0EEE6' }
            }}
            onMouseEnter={(e) => {
              if (!userMenuOpen) {
                e.currentTarget.style.backgroundColor = '#F0EEE6'
              }
            }}
            onMouseLeave={(e) => {
              if (!userMenuOpen) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
            title="User Menu"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ 
              marginLeft: '3px',
              background: 'linear-gradient(135deg, var(--facet-wine-primary), var(--facet-blue-primary))'
            }}>
              <span className="text-sm font-medium text-white">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className={`flex-1 min-w-0 ml-3 ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    Ready to help
                  </p>
                </div>
                <ChevronUp className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </button>
        </div>
      </div>
  )
}
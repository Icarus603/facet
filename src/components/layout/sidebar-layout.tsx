'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FacetLogo } from '@/components/ui/facet-logo';
import { 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  HeartIcon,
  ChartBarIcon,
  PaintBrushIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

interface SidebarLayoutProps {
  children: React.ReactNode;
  recentSessions?: any[];
  showQuickTools?: boolean;
}

export function SidebarLayout({ children, recentSessions = [], showQuickTools = false }: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [culturalProfile, setCulturalProfile] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          
          // Skip profile fetch for now to speed up loading
          // Cultural profile can be loaded separately if needed
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        // Small delay to ensure DOM is fully rendered before enabling transitions
        setTimeout(() => setIsInitialized(true), 50);
      }
    };

    getSession();
  }, [supabase]);

  const getButtonColor = (path: string) => {
    return pathname === path ? '#C41E3A' : '#2C84DB';
  };

  return (
    <div className="flex h-screen bg-claude-chat">
      {/* Left Sidebar - FACET Style */}
      <div 
        className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-claude-sidebar border-r border-gray-200 flex flex-col overflow-hidden ${isInitialized ? 'transition-all duration-300 ease-in-out' : ''}`}
        style={{ borderRadius: 0 }}
      >
        {/* Sidebar Header */}
        <div style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '8px', paddingBottom: '8px' }}>
          <div className="flex items-center">
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hover:scale-110 transition-all duration-200 hover:drop-shadow-lg"
                title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                <FacetLogo size={40} showGlow={false} />
              </button>
            </div>
            <h2 className={`text-2xl font-normal bg-gradient-to-r from-[#2C84DB] to-[#C41E3A] bg-clip-text text-transparent ml-1 flex items-center h-10 ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ fontFamily: "'Times New Roman', 'Georgia', 'Baskerville', serif" }}>FACET</h2>
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
                title="Start Therapy"
              >
              </button>
            </Link>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Start Therapy</span>
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
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Dashboard</span>
          </div>

          <div className="relative h-10">
            <Link href="/creative">
              <button 
                className={`absolute top-0 h-10 text-white rounded-lg hover:opacity-90 ${isInitialized ? 'transition-all duration-300' : ''}`}
                style={{ 
                  backgroundColor: getButtonColor('/creative'),
                  left: '4px',
                  width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
                }}
                title="Creative Tools"
              >
              </button>
            </Link>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <PaintBrushIcon className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Creative Tools</span>
          </div>

          <div className="relative h-10">
            <button 
              className="absolute top-0 h-10 text-white rounded-lg hover:opacity-90 transition-all duration-300"
              style={{ 
                backgroundColor: '#2C84DB',
                left: '4px',
                width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
              }}
              title="Session History"
            >
            </button>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <ClockIcon className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Session History</span>
          </div>

          <div className="relative h-10">
            <button 
              className="absolute top-0 h-10 text-white rounded-lg hover:opacity-90 transition-all duration-300"
              style={{ 
                backgroundColor: '#2C84DB',
                left: '4px',
                width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
              }}
              title="Progress"
            >
            </button>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <HeartIcon className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Progress</span>
          </div>
        </div>

        {/* Recent Sessions - Only show when expanded and data exists */}
        {sidebarOpen && recentSessions.length > 0 && (
          <div className="px-4 mt-6">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Recent
            </div>
            <div className="space-y-1">
              {recentSessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <div className="text-sm text-gray-700 truncate">
                    {session.lastMessage || `Session ${session.id.slice(-6)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spacer to push user profile to bottom */}
        <div className="flex-1"></div>

        {/* User Profile */}
        <div style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '16px', paddingBottom: '16px' }}>
          <div className="relative h-10">
            <div className="absolute top-0 w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center" style={{ left: '4px' }}>
              <span className="text-sm font-medium text-gray-600">
                {session?.user.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className={`absolute top-0 left-14 flex-1 min-w-0 ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <p className="text-sm font-medium text-gray-900 truncate whitespace-nowrap">
                {session?.user.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate whitespace-nowrap">
                Ready to help
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
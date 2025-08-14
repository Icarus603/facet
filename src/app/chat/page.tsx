/**
 * FACET Chat Page
 * Main therapy chat interface with session management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ManagedChatInterface } from '@/components/chat/chat-interface';
import { createClient } from '@/lib/supabase/client';
import { chatHistory } from '@/lib/chat/history';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { FacetLogo } from '@/components/ui/facet-logo';

// Demo user - in production this would come from auth
const DEMO_USER = {
  id: 'demo-user-123',
  name: 'Demo User',
  culturalProfile: {
    primaryCulture: 'Western',
    languages: ['English'],
    culturalValues: ['individualism', 'direct_communication'],
    therapyPreferences: ['cognitive_behavioral', 'mindfulness']
  }
};

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        
        // Get user's cultural profile
        const { data: profile } = await supabase
          .from('user_cultural_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (profile) {
          setUser((prev: any) => ({ ...prev, culturalProfile: profile }));
        }
        // Only set initialized when we have a user, with small delay for DOM
        setTimeout(() => setIsInitialized(true), 50);
      }
      setLoading(false);
    };

    // Load recent sessions on component mount
    const sessions = chatHistory.getRecentSessions(5);
    const summaries = sessions
      .map(s => chatHistory.getSessionSummary(s.id))
      .filter(Boolean);
    setRecentSessions(summaries);
    
    getUser();
  }, [supabase]);

  const handleSessionEnd = () => {
    // Refresh recent sessions when a session ends
    const sessions = chatHistory.getRecentSessions(5);
    const summaries = sessions
      .map(s => chatHistory.getSessionSummary(s.id))
      .filter(Boolean);
    setRecentSessions(summaries);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-facet-blue/20 border-t-facet-blue"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Please sign in to access therapy chat</h2>
          <Button onClick={() => window.location.href = '/auth/signin'}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-claude-chat">
      {/* Left Sidebar - Claude Style with Toggle */}
      <div 
        className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-claude-sidebar border-r border-gray-200 flex flex-col overflow-hidden ${isInitialized ? 'transition-all duration-300 ease-in-out' : ''}`}
        style={{ borderRadius: 0 }}
      >
        {/* Sidebar Header */}
        <div className={`p-2 ${isInitialized ? 'transition-all duration-300' : ''}`}>
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

        {/* Button Container - Fixed structure, no conditional layouts */}
        <div className="pt-2 space-y-3" style={{ paddingLeft: '8px', paddingRight: '8px' }}>
          
          {/* New Chat Button - Fixed left side, expandable right */}
          <div className="relative h-10" style={{ width: '100%' }}>
            <button 
              className={`absolute top-0 h-10 text-white rounded-lg hover:opacity-90 ${isInitialized ? 'transition-all duration-300' : ''}`}
              style={{ 
                backgroundColor: '#2C84DB',
                left: '4px',
                width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
              }}
              title="New chat"
            >
            </button>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <PlusIcon className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>New chat</span>
          </div>

          {/* Chats Button - Fixed left side, expandable right */}
          <div className="relative h-10" style={{ width: '100%' }}>
            <button 
              className={`absolute top-0 h-10 text-white rounded-lg hover:opacity-90 ${isInitialized ? 'transition-all duration-300' : ''}`}
              style={{ 
                backgroundColor: '#2C84DB',
                left: '4px',
                width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
              }}
              title="Chats"
            >
            </button>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Chats</span>
          </div>
          
          {/* Sessions Button - Fixed left side, expandable right */}
          <div className="relative h-10" style={{ width: '100%' }}>
            <button 
              className={`absolute top-0 h-10 text-white rounded-lg hover:opacity-90 ${isInitialized ? 'transition-all duration-300' : ''}`}
              style={{ 
                backgroundColor: '#2C84DB',
                left: '4px',
                width: sidebarOpen ? 'calc(100% - 8px)' : '40px'
              }}
              title="Sessions"
            >
            </button>
            <div className="absolute top-0 left-1 w-10 h-10 flex items-center justify-center pointer-events-none">
              <ClockIcon className="w-5 h-5 text-white" />
            </div>
            <span className={`absolute top-2.5 left-14 text-sm font-medium text-white whitespace-nowrap ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Sessions</span>
          </div>
        </div>

        {/* Recent Sessions - Only show when expanded */}
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

        {/* User Profile - Always at bottom */}
        <div style={{ paddingLeft: '8px', paddingRight: '8px', paddingTop: '16px', paddingBottom: '16px' }}>
          <div className="relative h-10">
            <div className="absolute top-0 w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center" style={{ left: '4px' }}>
              <span className="text-sm font-medium text-gray-600">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className={`absolute top-0 left-14 flex-1 min-w-0 ${isInitialized ? 'transition-opacity duration-300' : ''} ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <p className="text-sm font-medium text-gray-900 truncate whitespace-nowrap">
                {user.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate whitespace-nowrap">
                {user.culturalProfile?.primaryCulture || 'Getting started'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ManagedChatInterface
          userId={user.id}
          culturalProfile={user.culturalProfile || DEMO_USER.culturalProfile}
          onSessionEnd={handleSessionEnd}
          className="flex-1"
        />
      </div>
    </div>
  );
}
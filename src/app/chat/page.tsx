/**
 * FACET Chat Page
 * Main therapy chat interface with session management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ManagedChatInterface } from '@/components/chat';
import { chatHistory } from '@/lib/chat/history';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserCircleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { DiamondLogo } from '@/components/ui/diamond-logo';

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
  const [showHistory, setShowHistory] = useState(false);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  useEffect(() => {
    // Load recent sessions on component mount
    const sessions = chatHistory.getRecentSessions(5);
    const summaries = sessions
      .map(s => chatHistory.getSessionSummary(s.id))
      .filter(Boolean);
    setRecentSessions(summaries);
  }, []);

  const handleSessionEnd = () => {
    // Refresh recent sessions when a session ends
    const sessions = chatHistory.getRecentSessions(5);
    const summaries = sessions
      .map(s => chatHistory.getSessionSummary(s.id))
      .filter(Boolean);
    setRecentSessions(summaries);
  };

  return (
    <div className="flex h-screen bg-claude-chat">
      {/* Left Sidebar - Claude Style */}
      <div className="w-80 bg-claude-sidebar border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <h2 className="text-2xl font-normal bg-gradient-to-r from-[#2C84DB] to-[#C41E3A] bg-clip-text text-transparent" style={{ fontFamily: "'Times New Roman', 'Georgia', 'Baskerville', serif" }}>FACET</h2>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button className="w-full text-white rounded-lg hover:opacity-90" style={{ backgroundColor: '#1886C0' }}>
            <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
            New chat
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Chats</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <ClockIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Sessions</span>
            </div>
          </div>

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <div className="mt-6">
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
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {DEMO_USER.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {DEMO_USER.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {DEMO_USER.culturalProfile.primaryCulture}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ManagedChatInterface
          userId={DEMO_USER.id}
          culturalProfile={DEMO_USER.culturalProfile}
          onSessionEnd={handleSessionEnd}
          className="flex-1"
        />
      </div>
    </div>
  );
}
'use client'

import React from 'react'
import { AgentAvatar } from './AgentAvatar'
import { AgentType } from '@/types/chat'
import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  agent: AgentType
  className?: string
}

export function TypingIndicator({ agent, className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex gap-3 max-w-4xl", className)}>
      {/* Agent Avatar */}
      <div className="flex-shrink-0">
        <AgentAvatar 
          agent={agent}
          size="md"
          showStatus={true}
        />
      </div>

      {/* Typing Animation */}
      <div className="flex flex-col gap-1">
        {/* Agent Name */}
        <div className="px-1">
          <span className="text-sm font-medium text-gray-700">
            {getAgentDisplayName(agent)} is typing...
          </span>
        </div>

        {/* Typing Bubble */}
        <div className="relative px-4 py-3 rounded-2xl bg-white shadow-sm border border-gray-100 max-w-lg">
          {/* Typing dots animation */}
          <div className="flex items-center gap-1">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>

          {/* Message tail */}
          <div className="absolute top-3 -left-1.5 w-3 h-3 bg-white border-l border-b border-gray-100 transform rotate-45" />
        </div>
      </div>
    </div>
  )
}

// Helper function to get display names for agents
function getAgentDisplayName(agent: AgentType): string {
  const names = {
    intake: 'Intake Coordinator',
    therapy_coordinator: 'Therapy Coordinator', 
    cultural_adapter: 'Cultural Guide',
    crisis_monitor: 'Crisis Support',
    progress_tracker: 'Progress Tracker'
  }
  return names[agent] || agent
}
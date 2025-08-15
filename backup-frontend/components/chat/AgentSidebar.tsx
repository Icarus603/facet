'use client'

import React from 'react'
import { AgentAvatar, AgentAvatarWithName } from './AgentAvatar'
import { AgentType, ConnectionState } from '@/types/chat'
import { cn } from '@/lib/utils'

interface AgentSidebarProps {
  currentAgent: AgentType
  onAgentSelect: (agent: AgentType) => void
  connectionState: ConnectionState
  className?: string
}

const agents: Array<{ type: AgentType; name: string; description: string }> = [
  {
    type: 'therapy_coordinator',
    name: 'Therapy Coordinator',
    description: 'Guides your therapeutic journey'
  },
  {
    type: 'cultural_adapter',
    name: 'Cultural Guide',
    description: 'Integrates cultural wisdom'
  },
  {
    type: 'crisis_monitor',
    name: 'Crisis Support',
    description: 'Provides immediate safety support'
  },
  {
    type: 'progress_tracker',
    name: 'Progress Tracker',
    description: 'Monitors therapeutic progress'
  },
  {
    type: 'intake',
    name: 'Intake Coordinator',
    description: 'Initial assessment and onboarding'
  }
]

export function AgentSidebar({
  currentAgent,
  onAgentSelect,
  connectionState,
  className
}: AgentSidebarProps) {
  return (
    <div className={cn(
      "w-64 bg-claude-sidebar border-r border-gray-200 flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-claude-sidebar">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full",
            connectionState === 'connected' ? "bg-claude-orange" :
            connectionState === 'connecting' ? "bg-claude-orange animate-pulse opacity-60" :
            "bg-gray-400"
          )} />
          <div>
            <h2 className="font-medium text-gray-900">Therapy Agents</h2>
            <p className="text-xs text-gray-600 capitalize">{connectionState}</p>
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-claude-sidebar">
        {agents.map((agent) => (
          <button
            key={agent.type}
            onClick={() => onAgentSelect(agent.type)}
            className={cn(
              "w-full p-3 rounded-lg text-left transition-all duration-200",
              "hover:bg-white hover:shadow-sm border",
              currentAgent === agent.type
                ? "bg-claude-orange text-white shadow-sm border-transparent"
                : "bg-transparent border-transparent hover:border-gray-200 text-gray-800"
            )}
          >
            <div className="flex items-center gap-3">
              <AgentAvatar
                agent={agent.type}
                size="md"
                isActive={currentAgent === agent.type}
                showStatus={currentAgent === agent.type}
              />
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "font-medium text-sm truncate",
                  currentAgent === agent.type ? "text-white" : "text-gray-900"
                )}>
                  {agent.name}
                </div>
                <div className={cn(
                  "text-xs mt-1 line-clamp-2",
                  currentAgent === agent.type ? "text-orange-100" : "text-gray-600"
                )}>
                  {agent.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-claude-sidebar">
        <div className="text-xs text-gray-600 text-center">
          Agents work together to provide personalized therapy
        </div>
      </div>
    </div>
  )
}
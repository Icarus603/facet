'use client'

import React, { useState } from 'react'
import { AgentType } from '@/lib/types/agent'
import { cn } from '@/lib/utils'
import { Brain, Clock, Users, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface TypingIndicatorProps {
  agentType?: AgentType
  className?: string
}

// Mock active agents for demo - in real app this would come from WebSocket
const mockActiveAgents = [
  { name: 'Emotion Analyzer', emoji: '😊', status: 'analyzing', progress: 'Processing emotional context...' },
  { name: 'Memory Manager', emoji: '🧠', status: 'queued', progress: 'Waiting for emotional analysis...' },
  { name: 'Crisis Monitor', emoji: '🛡️', status: 'monitoring', progress: 'Checking safety indicators...' },
  { name: 'Therapy Advisor', emoji: '🎯', status: 'queued', progress: 'Ready to synthesize...' }
]

export function TypingIndicator({ agentType = 'therapeutic_advisor', className }: TypingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const activeAgents = mockActiveAgents.filter(agent => 
    agent.status === 'analyzing' || agent.status === 'monitoring'
  ).length
  
  const queuedAgents = mockActiveAgents.filter(agent => 
    agent.status === 'queued'
  ).length

  return (
    <div className={cn("flex justify-start", className)}>
      <div className="w-96 bg-white border border-gray-200 rounded-2xl shadow-sm">
        {/* Main Processing Header - Clickable */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-all duration-200 group ${
            isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 animate-pulse" style={{ color: 'var(--facet-blue-primary)' }} />
                <span className="text-sm font-semibold meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                  AI Team Processing
                </span>
                <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--facet-blue-primary)' }} />
              </div>
              <div className="flex items-center gap-1">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                )}
              </div>
            </div>
          </div>

          {/* Live Metrics */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 meslo-font">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{activeAgents} active • {queuedAgents} queued</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Processing...</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Analyzing your message</span>
            </div>
          </div>
        </button>

        {/* Expanded Real-time Agent Status */}
        {isExpanded && (
          <div className="border-t border-gray-200 px-5 pb-5 rounded-b-2xl" style={{ backgroundColor: 'var(--facet-chat-bg)' }}>
            <div className="mt-4">
              <h4 className="text-sm font-bold mb-4 meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                🔄 Live Agent Activity
              </h4>
              
              {/* Agent Status List */}
              <div className="space-y-3">
                {mockActiveAgents.map((agent, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent.emoji}</span>
                        <span className="font-medium text-sm meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                          {agent.name}
                        </span>
                        {agent.status === 'analyzing' || agent.status === 'monitoring' ? (
                          <div className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                            <span className="text-xs text-blue-600 font-medium meslo-font">
                              {agent.status === 'analyzing' ? 'Analyzing' : 'Monitoring'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 font-medium meslo-font">Queued</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Agent Progress */}
                    <div className="text-sm text-gray-700 meslo-font">
                      {agent.progress}
                    </div>
                    
                    {/* Progress Bar for Active Agents */}
                    {(agent.status === 'analyzing' || agent.status === 'monitoring') && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full animate-pulse" 
                               style={{ width: agent.status === 'analyzing' ? '60%' : '40%' }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
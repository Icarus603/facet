'use client'

import React from 'react'
import { AgentType } from '@/lib/types/agent'
import { cn } from '@/lib/utils'
import { Shield, Brain, Heart, Target } from 'lucide-react'

interface TypingIndicatorProps {
  agentType?: AgentType
  className?: string
}

export function TypingIndicator({ agentType = 'therapeutic_advisor', className }: TypingIndicatorProps) {
  const getAgentInfo = (agentType: AgentType) => {
    switch (agentType) {
      case 'crisis_assessor':
        return {
          name: 'Crisis Support',
          icon: Shield,
          color: 'text-red-600'
        }
      case 'emotion_analyzer':
        return {
          name: 'Emotional Support',
          icon: Heart,
          color: 'text-pink-600'
        }
      case 'therapeutic_advisor':
        return {
          name: 'Therapy Guide',
          icon: Brain,
          color: 'text-blue-600'
        }
      case 'smart_router':
        return {
          name: 'Coordinator',
          icon: Target,
          color: 'text-purple-600'
        }
      default:
        return {
          name: 'Therapy Guide',
          icon: Brain,
          color: 'text-blue-600'
        }
    }
  }

  const agentInfo = getAgentInfo(agentType)

  return (
    <div className={cn("flex gap-3 max-w-4xl mr-auto", className)}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
        <agentInfo.icon className={cn("h-4 w-4", agentInfo.color)} />
      </div>

      {/* Typing Bubble */}
      <div className="flex flex-col gap-1">
        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 max-w-md">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">{agentInfo.name} is thinking</span>
            <div className="flex gap-1 ml-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
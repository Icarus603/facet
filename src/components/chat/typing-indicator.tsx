'use client'

import React from 'react'
import { AgentType } from '@/lib/types/agent'

interface TypingIndicatorProps {
  agentType?: AgentType
  className?: string
}

export function TypingIndicator({ agentType = 'therapeutic_advisor', className }: TypingIndicatorProps) {
  return (
    <div className="flex justify-center w-full">
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm" style={{ width: '720px' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <span className="text-sm text-gray-600 meslo-font">FACET is thinking...</span>
        </div>
      </div>
    </div>
  )
}
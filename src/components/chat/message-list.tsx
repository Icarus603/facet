'use client'

import React from 'react'
import { Message } from '@/lib/types/agent'
import { EnhancedMessageBubble } from './message-components/enhanced-message-bubble'
import { AITeamProcessingBubble } from './message-components/ai-team-processing-bubble'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  transparencyLevel?: 'minimal' | 'standard' | 'detailed'
}

export function MessageList({ messages, currentUserId, transparencyLevel = 'standard' }: MessageListProps) {
  if (messages.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        // Create a unique key that combines id, index, and type to prevent conflicts
        const messageKey = message.id ? `${message.type}-${message.id}` : `message-${message.type}-${index}-${Date.now()}`
        
        if (message.type === 'user') {
          // User message bubble with FACET styling
          return (
            <div key={messageKey} className="flex justify-end">
              <div className="max-w-xs sm:max-w-md text-white rounded-2xl px-4 py-3 shadow-sm"
                   style={{ backgroundColor: 'var(--facet-blue-primary)' }}>
                <div className="text-sm leading-relaxed meslo-font">
                  {message.content}
                </div>
              </div>
            </div>
          )
        } else {
          // Agent response - Claude-style workflow with FACET aesthetics
          return (
            <div key={messageKey} className="space-y-3">
              {/* AI Team Processing Bubble - Only show if orchestration data exists */}
              {message.orchestration && (
                <AITeamProcessingBubble 
                  orchestration={message.orchestration}
                  transparencyLevel={transparencyLevel}
                />
              )}
              
              {/* Final Response Bubble */}
              <div className="flex justify-start">
                <div className="max-w-3xl bg-white border border-gray-200 rounded-2xl shadow-sm">
                  {/* Emergency/Risk Indicators */}
                  {message.metadata?.emergencyResponse?.emergencyDetected && (
                    <div className="mx-6 mt-4 mb-4 p-3 rounded-lg border"
                         style={{ 
                           backgroundColor: 'var(--facet-wine-light)', 
                           borderColor: 'var(--facet-wine-primary)',
                           color: 'var(--facet-wine-dark)'
                         }}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold meslo-font">🚨 Emergency Support Activated</span>
                      </div>
                      <p className="text-sm mt-2 meslo-font">
                        Crisis detection protocols have been triggered. Professional resources are available.
                      </p>
                    </div>
                  )}

                  {/* Main Response Content */}
                  <div className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🤖</span>
                      <span className="text-sm font-medium meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                        FACET AI
                      </span>
                    </div>
                    <div className="text-base leading-relaxed text-gray-900 meslo-font">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      })}
    </div>
  )
}
'use client'

import React from 'react'
// import { format } from 'date-fns'
import { AgentAvatar } from './AgentAvatar'
import { ChatMessage, AgentType } from '@/types/chat'
import { CulturalContentCard } from './CulturalContentCard'
import { TherapeuticExercise } from './TherapeuticExercise'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: ChatMessage
  showAvatar: boolean
  showTimestamp: boolean
  isCurrentUser: boolean
  currentAgent: AgentType
  className?: string
}

export function MessageBubble({
  message,
  showAvatar,
  showTimestamp,
  isCurrentUser,
  currentAgent,
  className
}: MessageBubbleProps) {
  const isAgent = message.type === 'agent'
  const isSystem = message.type === 'system'

  // System messages (agent switches, notifications)
  if (isSystem) {
    return (
      <div className={cn("flex justify-center my-4", className)}>
        <div className="bg-orange-50 text-orange-800 px-4 py-2 rounded-full text-sm font-medium">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex gap-3 max-w-4xl",
      isCurrentUser ? "ml-auto flex-row-reverse" : "mr-auto",
      className
    )}>
      {/* Avatar */}
      {showAvatar && !isCurrentUser && (
        <div className="flex-shrink-0">
          <AgentAvatar 
            agent={message.sender as AgentType}
            size="md"
            showStatus={message.sender === currentAgent}
          />
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-1",
        isCurrentUser ? "items-end" : "items-start"
      )}>
        {/* Agent Name */}
        {showAvatar && !isCurrentUser && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-medium text-gray-700">
              {getAgentDisplayName(message.sender as AgentType)}
            </span>
            {message.metadata?.confidence && (
              <span className="text-xs text-gray-500">
                {Math.round(message.metadata.confidence * 100)}% confidence
              </span>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div className={cn(
          "relative px-4 py-3 rounded-2xl max-w-lg word-wrap",
          isCurrentUser 
            ? "bg-orange-600 text-white" 
            : "bg-white text-gray-900 shadow-sm border border-gray-100",
          // Special styling for different message types
          message.metadata?.type === 'crisis_alert' && "border-red-200 bg-red-50 text-red-900",
          message.metadata?.type === 'cultural_content' && "border-blue-200 bg-blue-50"
        )}>
          {/* Message Text */}
          <div className="prose prose-sm max-w-none">
            <p className={cn(
              "mb-0 leading-relaxed",
              isCurrentUser ? "text-white" : "text-gray-900"
            )}>
              {message.content}
            </p>
          </div>

          {/* Rich Content */}
          {message.metadata?.culturalContent && (
            <CulturalContentCard 
              content={message.metadata.culturalContent}
              className="mt-3"
            />
          )}

          {message.metadata?.therapeuticExercise && (
            <TherapeuticExercise 
              exercise={message.metadata.therapeuticExercise}
              className="mt-3"
            />
          )}

          {/* Message tail */}
          <div className={cn(
            "absolute top-3 w-3 h-3 transform rotate-45",
            isCurrentUser 
              ? "-right-1.5 bg-orange-600"
              : "-left-1.5 bg-white border-l border-b border-gray-100"
          )} />
        </div>

        {/* Timestamp */}
        {showTimestamp && (
          <div className={cn(
            "text-xs text-gray-400 px-1",
            isCurrentUser ? "text-right" : "text-left"
          )}>
            {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            {message.metadata?.editedAt && (
              <span className="ml-1">(edited)</span>
            )}
          </div>
        )}

        {/* Message Status */}
        {isCurrentUser && message.metadata?.status && (
          <div className={cn(
            "text-xs px-1",
            message.metadata.status === 'delivered' ? "text-gray-400" :
            message.metadata.status === 'read' ? "text-blue-500" : "text-gray-300"
          )}>
            {message.metadata.status === 'sending' && '⏳'}
            {message.metadata.status === 'delivered' && '✓'}
            {message.metadata.status === 'read' && '✓✓'}
            {message.metadata.status === 'failed' && '❌'}
          </div>
        )}

        {/* Action Items */}
        {message.metadata?.actionItems && message.metadata.actionItems.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.metadata.actionItems.map((item, index) => (
              <div key={index} className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded">
                📋 {item}
              </div>
            ))}
          </div>
        )}

        {/* Cultural Relevance Indicator */}
        {message.metadata?.culturalRelevance && message.metadata.culturalRelevance > 0.8 && (
          <div className="mt-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded inline-flex items-center gap-1">
            🌍 Culturally Relevant
          </div>
        )}
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
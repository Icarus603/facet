'use client'

import React from 'react'
import { Message, AgentType } from '@/lib/types/agent'
import { cn } from '@/lib/utils'
import { Shield, Brain, Heart, Target, User } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showTimestamp?: boolean
}

export function MessageBubble({ message, isOwn, showTimestamp = false }: MessageBubbleProps) {
  const getAgentIcon = (agentType?: AgentType) => {
    switch (agentType) {
      case 'crisis_assessor':
        return <Shield className="h-4 w-4 text-red-600" />
      case 'emotion_analyzer':
        return <Heart className="h-4 w-4 text-pink-600" />
      case 'therapeutic_advisor':
        return <Brain className="h-4 w-4 text-blue-600" />
      case 'smart_router':
        return <Target className="h-4 w-4 text-purple-600" />
      default:
        return <Brain className="h-4 w-4 text-blue-600" />
    }
  }

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(timestamp))
  }

  const formatContent = (content: string) => {
    // Split content by line breaks and render with proper spacing
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }

  return (
    <div className={cn(
      "flex gap-3 max-w-4xl",
      isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isOwn 
          ? "bg-blue-600" 
          : "bg-gray-100 border border-gray-200"
      )}>
        {isOwn ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          getAgentIcon(message.agentType)
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-1",
        isOwn ? "items-end" : "items-start"
      )}>
        {/* Timestamp */}
        {showTimestamp && (
          <div className="text-xs text-gray-500 px-1">
            {formatTime(message.timestamp)}
          </div>
        )}

        {/* Message Bubble */}
        <div className={cn(
          "px-4 py-3 rounded-2xl max-w-md break-words",
          isOwn 
            ? "bg-blue-600 text-white rounded-br-md" 
            : "bg-white border border-gray-200 rounded-bl-md"
        )}>
          <div className={cn(
            "text-sm leading-relaxed",
            isOwn ? "text-white" : "text-gray-900"
          )}>
            {formatContent(message.content)}
          </div>

          {/* Metadata for agent messages */}
          {!isOwn && message.metadata && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              {message.metadata.interventions && message.metadata.interventions.length > 0 && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Interventions:</span> {message.metadata.interventions.join(', ')}
                </div>
              )}
              {message.metadata.processingTime && (
                <div className="text-xs text-gray-400 mt-1">
                  Response time: {Math.round(message.metadata.processingTime)}ms
                </div>
              )}
            </div>
          )}
        </div>

        {/* Crisis indicator */}
        {message.agentType === 'crisis_assessor' && (
          <div className="flex items-center gap-1 text-xs text-red-600 px-1">
            <Shield className="h-3 w-3" />
            Crisis Support Active
          </div>
        )}
      </div>
    </div>
  )
}
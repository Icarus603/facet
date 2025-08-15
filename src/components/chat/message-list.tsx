'use client'

import React from 'react'
import { Message } from '@/lib/types/agent'
import { MessageBubble } from './message-bubble'

interface MessageListProps {
  messages: Message[]
  currentUserId: string
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Start your conversation</p>
          <p className="text-sm">I'm here to listen and support you</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.type === 'user'}
          showTimestamp={
            index === 0 || 
            (index > 0 && 
             new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 300000) // 5 minutes
          }
        />
      ))}
    </div>
  )
}
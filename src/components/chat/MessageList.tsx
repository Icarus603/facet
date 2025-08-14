'use client'

import React, { useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'
import { MessageBubble } from './MessageBubble'
import { ChatMessage, AgentType } from '@/types/chat'
import { cn } from '@/lib/utils'

interface MessageListProps {
  messages: ChatMessage[]
  currentAgent: AgentType
  userId: string
  className?: string
}

interface MessageItemProps {
  index: number
  style: React.CSSProperties
  data: {
    messages: ChatMessage[]
    userId: string
    currentAgent: AgentType
  }
}

// Virtualized message item component
const MessageItem: React.FC<MessageItemProps> = ({ index, style, data }) => {
  const { messages, userId, currentAgent } = data
  const message = messages[index]
  const previousMessage = index > 0 ? messages[index - 1] : null
  const nextMessage = index < messages.length - 1 ? messages[index + 1] : null

  // Determine if we should show the avatar and timestamp
  const showAvatar = !previousMessage || previousMessage.sender !== message.sender
  const showTimestamp = !nextMessage || 
    nextMessage.sender !== message.sender ||
    (new Date(nextMessage.timestamp).getTime() - new Date(message.timestamp).getTime()) > 300000 // 5 minutes

  return (
    <div style={style} className="px-2">
      <MessageBubble
        message={message}
        showAvatar={showAvatar}
        showTimestamp={showTimestamp}
        isCurrentUser={message.sender === 'user'}
        currentAgent={currentAgent}
      />
    </div>
  )
}

export function MessageList({ 
  messages, 
  currentAgent, 
  userId, 
  className 
}: MessageListProps) {
  // Calculate total height needed for virtualization
  const itemData = useMemo(() => ({
    messages,
    userId,
    currentAgent
  }), [messages, userId, currentAgent])

  // If we have few messages, render normally without virtualization
  if (messages.length < 50) {
    return (
      <div className={cn("space-y-4", className)}>
        {messages.map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : null
          const nextMessage = index < messages.length - 1 ? messages[index + 1] : null

          const showAvatar = !previousMessage || previousMessage.sender !== message.sender
          const showTimestamp = !nextMessage || 
            nextMessage.sender !== message.sender ||
            (new Date(nextMessage.timestamp).getTime() - new Date(message.timestamp).getTime()) > 300000

          return (
            <MessageBubble
              key={message.id}
              message={message}
              showAvatar={showAvatar}
              showTimestamp={showTimestamp}
              isCurrentUser={message.sender === 'user'}
              currentAgent={currentAgent}
            />
          )
        })}
      </div>
    )
  }

  // For large message lists, use virtualization
  return (
    <div className={cn("flex-1", className)}>
      <List
        height={600} // This would be dynamically calculated in a real implementation
        itemCount={messages.length}
        itemSize={100} // Average message height
        itemData={itemData}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {MessageItem}
      </List>
    </div>
  )
}
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { AgentSidebar } from './AgentSidebar'
import { AgentSwitchNotification } from './AgentSwitchNotification'
import { TypingIndicator } from './TypingIndicator'
import { useChatWebSocket } from '@/hooks/useChatWebSocket'
import { useChatHistory } from '@/hooks/useChatHistory'
import { ChatMessage, AgentType, ChatSession } from '@/types/chat'
import { cn } from '@/lib/utils'

interface ChatInterfaceProps {
  userId: string
  sessionId?: string
  className?: string
  initialAgent?: AgentType
}

export function ChatInterface({ 
  userId, 
  sessionId, 
  className,
  initialAgent = 'therapy_coordinator' 
}: ChatInterfaceProps) {
  const [currentAgent, setCurrentAgent] = useState<AgentType>(initialAgent)
  const [isTyping, setIsTyping] = useState(false)
  const [typingAgent, setTypingAgent] = useState<AgentType | null>(null)
  const [showAgentSwitch, setShowAgentSwitch] = useState(false)
  const [switchMessage, setSwitchMessage] = useState('')
  
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Custom hooks for chat functionality
  const {
    messages,
    addMessage,
    updateMessage,
    clearMessages,
    totalMessages
  } = useChatHistory(sessionId)

  const {
    isConnected,
    sendMessage: sendWebSocketMessage,
    lastMessage,
    connectionState
  } = useChatWebSocket(userId, sessionId)

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const messageData = JSON.parse(lastMessage)
      
      switch (messageData.type) {
        case 'agent_message':
          addMessage({
            id: messageData.messageId,
            content: messageData.content,
            sender: messageData.agent,
            timestamp: new Date(messageData.timestamp),
            type: 'agent',
            metadata: messageData.metadata
          })
          setIsTyping(false)
          setTypingAgent(null)
          break
          
        case 'agent_switch':
          handleAgentSwitch(messageData.fromAgent, messageData.toAgent, messageData.reason)
          break
          
        case 'typing_start':
          setIsTyping(true)
          setTypingAgent(messageData.agent)
          break
          
        case 'typing_end':
          setIsTyping(false)
          setTypingAgent(null)
          break
          
        case 'error':
          console.error('Chat error:', messageData.error)
          break
      }
    }
  }, [lastMessage, addMessage])

  // Handle agent switching
  const handleAgentSwitch = (fromAgent: AgentType, toAgent: AgentType, reason: string) => {
    setCurrentAgent(toAgent)
    setSwitchMessage(`${getAgentDisplayName(fromAgent)} is connecting you with ${getAgentDisplayName(toAgent)} ${reason ? `- ${reason}` : ''}`)
    setShowAgentSwitch(true)
    
    // Hide switch notification after 4 seconds
    setTimeout(() => {
      setShowAgentSwitch(false)
    }, 4000)
  }

  // Send user message
  const handleSendMessage = async (content: string) => {
    // Add user message immediately (optimistic update)
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date(),
      type: 'user'
    }
    
    addMessage(userMessage)

    // Send to agents via WebSocket
    if (isConnected) {
      sendWebSocketMessage(JSON.stringify({
        type: 'user_message',
        content,
        userId,
        sessionId,
        currentAgent,
        timestamp: new Date().toISOString()
      }))
      
      // Show typing indicator
      setIsTyping(true)
      setTypingAgent(currentAgent)
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isTyping])

  return (
    <div className={cn(
      "flex h-screen bg-claude-chat",
      className
    )}>
      {/* Agent Sidebar */}
      <AgentSidebar 
        currentAgent={currentAgent}
        onAgentSelect={setCurrentAgent}
        connectionState={connectionState}
        className="hidden md:flex"
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 relative">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isConnected ? "bg-claude-orange" : "bg-gray-300"
            )} />
            <div>
              <h1 className="text-lg font-medium text-gray-900">
                {getAgentDisplayName(currentAgent)}
              </h1>
              <p className="text-sm text-gray-500">
                {isConnected ? 'Connected' : 'Connecting...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>{totalMessages} messages</span>
          </div>
        </div>

        {/* Agent Switch Notification */}
        <AgentSwitchNotification 
          show={showAgentSwitch}
          message={switchMessage}
          onClose={() => setShowAgentSwitch(false)}
        />

        {/* Messages Container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-claude-chat"
        >
          <MessageList 
            messages={messages}
            currentAgent={currentAgent}
            userId={userId}
          />
          
          {isTyping && typingAgent && (
            <TypingIndicator 
              agent={typingAgent}
              className="mb-4"
            />
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <ChatInput 
            onSendMessage={handleSendMessage}
            disabled={!isConnected}
            placeholder={`Message ${getAgentDisplayName(currentAgent)}...`}
            currentAgent={currentAgent}
          />
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
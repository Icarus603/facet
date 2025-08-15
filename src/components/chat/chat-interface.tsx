'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { TypingIndicator } from './typing-indicator'
import { AgentOrchestrator } from '@/lib/agents/orchestrator'
import { Message, AgentType } from '@/lib/types/agent'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Shield, Brain, Heart, Target } from 'lucide-react'

interface ChatInterfaceProps {
  userId: string
  sessionId?: string
  className?: string
}

export function ChatInterface({ 
  userId, 
  sessionId, 
  className
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<AgentType>('therapeutic_advisor')
  const [loading, setLoading] = useState(true)
  
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const orchestrator = useRef(new AgentOrchestrator())
  const supabase = createClient()

  // Load conversation history on mount
  useEffect(() => {
    loadConversationHistory()
  }, [sessionId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const loadConversationHistory = async () => {
    if (!sessionId) return

    try {
      const { data: history } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true })

      if (history) {
        const formattedMessages: Message[] = history.map(msg => ({
          id: msg.id,
          userId: userId,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          type: msg.message_type as 'user' | 'agent',
          agentType: msg.agent_type as AgentType,
          metadata: {
            emotionAnalysis: msg.emotion_analysis,
            crisisAssessment: msg.crisis_assessment,
            workflowMode: msg.workflow_mode,
            processingTime: msg.response_time_ms,
            interventions: msg.therapeutic_interventions?.interventions || []
          }
        }))

        setMessages(formattedMessages)
      }

      // Add welcome message if this is a new session
      if (!history || history.length === 0) {
        const welcomeMessage: Message = {
          id: 'welcome',
          userId: userId,
          content: `Hello! I'm here to provide you with personalized mental health support. I'm equipped with specialized knowledge in therapy, crisis intervention, and emotional wellness.

You can talk to me about anything that's on your mind - whether you're dealing with stress, anxiety, depression, relationship issues, or just need someone to listen. I'm here 24/7 to support you.

How are you feeling today?`,
          timestamp: new Date(),
          type: 'agent',
          agentType: 'therapeutic_advisor'
        }
        setMessages([welcomeMessage])
      }
    } catch (error) {
      console.error('Error loading conversation history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // Add user message immediately
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      userId,
      content,
      timestamp: new Date(),
      type: 'user'
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    try {
      // Process message through orchestrator
      const response = await orchestrator.current.processMessage(
        content,
        userId,
        sessionId
      )

      // Update current agent based on response
      setCurrentAgent(response.agentType)

      // Add agent response
      const agentMessage: Message = {
        id: `agent_${Date.now()}`,
        userId,
        content: response.content,
        timestamp: new Date(),
        type: 'agent',
        agentType: response.agentType,
        metadata: {
          processingTime: response.processingTime,
          interventions: response.metadata?.interventions || [],
          recommendations: response.metadata?.recommendations,
          confidence: response.confidence
        }
      }

      setMessages(prev => [...prev, agentMessage])

    } catch (error) {
      console.error('Error processing message:', error)
      
      // Add error message
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        userId,
        content: "I'm sorry, I'm experiencing a technical issue. Please try again in a moment. If you're in crisis, please contact 988 immediately.",
        timestamp: new Date(),
        type: 'agent',
        agentType: 'therapeutic_advisor'
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const getAgentInfo = (agentType: AgentType) => {
    switch (agentType) {
      case 'crisis_assessor':
        return {
          name: 'Crisis Support',
          icon: Shield,
          color: 'text-red-600',
          description: 'Immediate safety and crisis intervention'
        }
      case 'emotion_analyzer':
        return {
          name: 'Emotional Support',
          icon: Heart,
          color: 'text-pink-600',
          description: 'Understanding and processing emotions'
        }
      case 'therapeutic_advisor':
        return {
          name: 'Therapy Guide',
          icon: Brain,
          color: 'text-blue-600',
          description: 'Therapeutic interventions and guidance'
        }
      case 'smart_router':
        return {
          name: 'Coordinator',
          icon: Target,
          color: 'text-purple-600',
          description: 'Coordinating your care'
        }
      default:
        return {
          name: 'Therapy Guide',
          icon: Brain,
          color: 'text-blue-600',
          description: 'Therapeutic support'
        }
    }
  }

  const agentInfo = getAgentInfo(currentAgent)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-gray-50", className)}>
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={cn("p-2 rounded-lg bg-gray-100", agentInfo.color)}>
            <agentInfo.icon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-medium text-gray-900">
              {agentInfo.name}
            </h1>
            <p className="text-sm text-gray-500">
              {agentInfo.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <span className="text-sm text-gray-500">Online</span>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        <MessageList 
          messages={messages}
          currentUserId={userId}
        />
        
        {isTyping && (
          <TypingIndicator 
            agentType={currentAgent}
          />
        )}
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <ChatInput 
          onSendMessage={handleSendMessage}
          disabled={isTyping}
          placeholder="Share what's on your mind..."
        />
      </div>
    </div>
  )
}
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { TypingIndicator } from './typing-indicator'
import { AIWorkflowDisplay } from './ai-workflow-display'
import { Message, AgentType } from '@/lib/types/agent'
import { ChatRequest, ChatResponse, AgentOrchestrationData } from '@/lib/types/api-contract'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/lib/hooks/useSidebar'
import { useWebSocketConnection, useAgentStatusUpdates } from '@/lib/websocket/orchestration-hooks'

interface ChatInterfaceProps {
  conversationId?: string
  onFirstMessage?: (message: string) => void
  isNewSession?: boolean
  className?: string
  initialMessage?: string
}

export function ChatInterface({ 
  conversationId, 
  onFirstMessage,
  isNewSession = false,
  className,
  initialMessage
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<AgentType>('therapeutic_advisor')
  const [userId, setUserId] = useState<string>('')
  const [hasStartedConversation, setHasStartedConversation] = useState(false)
  
  // Agent transparency state
  const [agentStatuses, setAgentStatuses] = useState<Array<{
    agentName: keyof typeof import('@/lib/types/api-contract').AGENT_CONFIG
    status: 'pending' | 'running' | 'completed' | 'error'
    progress?: number
    executionTimeMs?: number
    confidence?: number
  }>>([])
  const [totalProcessingTime, setTotalProcessingTime] = useState(0)
  const [transparencyLevel] = useState<'minimal' | 'standard' | 'detailed'>('standard')
  
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const { sidebarOpen } = useSidebar()

  // WebSocket connection for real-time agent updates
  const { agentStatuses: realAgentStatuses, orchestrationData } = useAgentStatusUpdates(conversationId)

  // Update local state when WebSocket receives agent status updates
  useEffect(() => {
    if (realAgentStatuses.length > 0) {
      setAgentStatuses(realAgentStatuses.map(status => ({
        agentName: status.agentName as keyof typeof import('@/lib/types/api-contract').AGENT_CONFIG,
        status: status.status === 'queued' ? 'pending' : status.status === 'failed' ? 'error' : status.status,
        progress: status.progress,
        executionTimeMs: status.executionTimeMs,
        confidence: status.confidence
      })))
    }
  }, [realAgentStatuses])

  // Update orchestration data when WebSocket receives updates
  useEffect(() => {
    if (orchestrationData.complete) {
      setTotalProcessingTime(orchestrationData.complete.totalTimeMs)
      setIsTyping(false)
    }
  }, [orchestrationData])

  // Get user and load conversation history on mount
  useEffect(() => {
    async function initializeChat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        await loadConversationHistory(user.id)
        
        // Handle initial message if provided (API call already started)
        if (initialMessage && initialMessage.trim()) {
          // Add the user message to display
          const userMessage: Message = {
            id: `user_${Date.now()}`,
            userId: user.id,
            content: initialMessage.trim(),
            timestamp: new Date(),
            type: 'user'
          }
          setMessages([userMessage])
          setIsTyping(true)
          
          // Wait for the API response (already called when user pressed Enter)
          waitForApiResponse(userMessage.id)
        }
      }
    }
    initializeChat()
  }, [conversationId, initialMessage])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const loadConversationHistory = async (currentUserId: string) => {
    if (!conversationId) return

    // Don't set loading - show interface immediately
    try {
      const { data: history } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', conversationId)
        .order('timestamp', { ascending: true })

      if (history) {
        const formattedMessages: Message[] = history.map(msg => ({
          id: msg.id,
          userId: currentUserId,
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

      // No automatic welcome message - let conversations start clean
    } catch (error) {
      console.error('Error loading conversation history:', error)
    }
    // Remove setLoading(false) - no loading state needed
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // Handle first message callback for new sessions
    if (isNewSession && !hasStartedConversation) {
      setHasStartedConversation(true)
      if (onFirstMessage) {
        onFirstMessage(content)
      }
    }

    // Reset agent transparency state
    setAgentStatuses([])
    setTotalProcessingTime(0)

    // Add user message immediately - no waiting
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      userId,
      content,
      timestamp: new Date(),
      type: 'user'
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    // Start API call in background - real agent events will come via WebSocket
    processMessageInBackground(content, userMessage.id)
  }

  const waitForApiResponse = async (userMessageId: string) => {
    // Check sessionStorage for API response that's being processed
    const checkForResponse = () => {
      const response = sessionStorage.getItem('apiResponse')
      const error = sessionStorage.getItem('apiError')
      
      if (response) {
        // API succeeded
        sessionStorage.removeItem('apiResponse')
        const chatResponse = JSON.parse(response)
        
        // Add agent message with orchestration data
        const agentMessage: Message = {
          id: chatResponse.messageId,
          userId,
          content: chatResponse.content,
          timestamp: new Date(),
          type: 'agent',
          agentType: currentAgent,
          orchestration: chatResponse.orchestration,
          metadata: {
            processingTime: chatResponse.metadata.processingTimeMs,
            interventions: chatResponse.metadata.recommendedFollowUp || [],
            recommendations: chatResponse.metadata.recommendedFollowUp,
            confidence: chatResponse.metadata.responseConfidence,
            emotionalState: chatResponse.metadata.emotionalState,
            riskAssessment: chatResponse.metadata.riskAssessment,
            emergencyResponse: chatResponse.metadata.emergencyResponse
          }
        }
        setMessages(prev => [...prev, agentMessage])
        setIsTyping(false)
        return true
      }
      
      if (error) {
        // API failed
        sessionStorage.removeItem('apiError')
        const errorMessage: Message = {
          id: `error_${userMessageId}_${Date.now()}`,
          userId,
          content: "I'm sorry, I'm experiencing a technical issue. Please try again in a moment.",
          timestamp: new Date(),
          type: 'agent',
          agentType: 'therapeutic_advisor'
        }
        setMessages(prev => [...prev, errorMessage])
        setIsTyping(false)
        return true
      }
      
      return false
    }
    
    // Poll for response
    const pollInterval = setInterval(() => {
      if (checkForResponse()) {
        clearInterval(pollInterval)
      }
    }, 100)
    
  }

  const processMessageInBackground = async (content: string, userMessageId: string) => {
    const messageStartTime = Date.now()
    try {
      // Create chat request
      const chatRequest: ChatRequest = {
        message: content,
        conversationId,
        userPreferences: {
          transparencyLevel: 'standard',
          agentVisibility: true,
          processingSpeed: 'thorough',
          communicationStyle: 'professional_warm'
        }
      }

      // Send to API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest)
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const responseData = await response.json()

      const chatResponse: ChatResponse = responseData

      // Update current agent based on response
      if (chatResponse.orchestration?.agentResults) {
        const lastAgent = chatResponse.orchestration.agentResults[chatResponse.orchestration.agentResults.length - 1]
        setCurrentAgent(lastAgent.agentName as AgentType)
      }

      // Update agent statuses based on orchestration results
      if (chatResponse.orchestration) {
        console.log('🔍 Frontend orchestration data:', chatResponse.orchestration)
        console.log('🔍 Agent results:', chatResponse.orchestration.agentResults)
        setTotalProcessingTime(chatResponse.orchestration.timing.totalTimeMs)
        
        // Update final agent statuses
        const finalStatuses = chatResponse.orchestration.agentResults.map(result => ({
          agentName: result.agentName as keyof typeof import('@/lib/types/api-contract').AGENT_CONFIG,
          status: result.success ? 'completed' as const : 'error' as const,
          executionTimeMs: result.executionTimeMs,
          confidence: result.confidence
        }))
        console.log('🔍 Final agent statuses:', finalStatuses)
        setAgentStatuses(finalStatuses)
      } else {
        // Handle fast path responses (orchestration: null)
        console.log('🚀 Fast path response - marking emotion analyzer as completed')
        setTotalProcessingTime(chatResponse.metadata.processingTimeMs)
        
        // For fast path, only emotion analyzer runs
        const fastPathStatus = [{
          agentName: 'emotion_analyzer' as keyof typeof import('@/lib/types/api-contract').AGENT_CONFIG,
          status: 'completed' as const,
          executionTimeMs: chatResponse.metadata.processingTimeMs,
          confidence: chatResponse.metadata.emotionalState?.confidence || 0.7
        }]
        setAgentStatuses(fastPathStatus)
      }

      // Add agent response with orchestration data
      const agentMessage: Message = {
        id: chatResponse.messageId,
        userId,
        content: chatResponse.content,
        timestamp: new Date(),
        type: 'agent',
        agentType: currentAgent,
        orchestration: chatResponse.orchestration,
        metadata: {
          processingTime: chatResponse.metadata.processingTimeMs,
          interventions: chatResponse.metadata.recommendedFollowUp || [],
          recommendations: chatResponse.metadata.recommendedFollowUp,
          confidence: chatResponse.metadata.responseConfidence,
          emotionalState: chatResponse.metadata.emotionalState,
          riskAssessment: chatResponse.metadata.riskAssessment,
          emergencyResponse: chatResponse.metadata.emergencyResponse
        }
      }

      setMessages(prev => [...prev, agentMessage])

    } catch (error) {
      console.error('Error processing message:', error)
      
      // Add error message
      const errorMessage: Message = {
        id: `error_${userMessageId}_${Date.now()}`,
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



  // Remove loading screen completely - show interface immediately

  if (isNewSession && !hasStartedConversation) {
    return (
      <div className={cn("", className)}>
        <ChatInput 
          onSendMessage={handleSendMessage}
          disabled={isTyping}
          placeholder="How can I help you today?"
        />
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen flex flex-col", className)} style={{backgroundColor: '#FAF9F5'}}>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-8 space-y-6 max-w-4xl mx-auto w-full"
        style={{ paddingBottom: '300px' }} // Space for fixed input
      >
        <MessageList 
          messages={messages}
          currentUserId={userId}
          transparencyLevel={transparencyLevel}
        />
        
        {(isTyping || agentStatuses.length > 0 || totalProcessingTime > 0) && (
          <AIWorkflowDisplay 
            isProcessing={isTyping}
            agentStatuses={agentStatuses}
            totalProcessingTime={totalProcessingTime}
            orchestrationData={orchestrationData}
          />
        )}
      </div>

      {/* Fixed Chat Input - Always centered in main content area */}
      <div 
        className={`fixed bottom-0 right-0 px-4 pb-8 ${sidebarOpen ? 'left-80' : 'left-16'} transition-all duration-300 ease-in-out pointer-events-none`}
      >
        <div className="w-full max-w-3xl mx-auto pointer-events-auto relative">
          <ChatInput 
            onSendMessage={handleSendMessage}
            disabled={isTyping}
            placeholder="How can I support you today?"
          />
          {/* Invisible barrier below input */}
          <div 
            className="absolute top-full left-0 w-full h-8 pointer-events-none"
            style={{ backgroundColor: '#FAF9F5' }}
          />
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSocket } from '@/lib/socket/useSocket'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  PaperAirplaneIcon, 
  ExclamationTriangleIcon,
  HeartIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { nanoid } from 'nanoid'

interface Message {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  agentName?: string
  agentType?: string
  agentId?: string
  timestamp: string
  culturalContent?: any[]
  suggestedActions?: string[]
  emotionalAnalysis?: any
}

interface RealTimeTherapyChatProps {
  sessionId?: string
  userId: string
  culturalContext?: any
  onSessionCreate?: (sessionId: string) => void
}

export function RealTimeTherapyChat({ 
  sessionId: initialSessionId, 
  userId, 
  culturalContext,
  onSessionCreate 
}: RealTimeTherapyChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<string>('Connecting...')
  const [sessionId, setSessionId] = useState<string>(initialSessionId || '')
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Socket integration
  const { 
    isConnected, 
    isAuthenticated, 
    authenticate, 
    sendMessage, 
    joinSession,
    connectionError 
  } = useSocket({
    onConnected: () => {
      console.log('Therapy chat connected')
    },
    onAuthenticated: (data) => {
      console.log('Therapy chat authenticated:', data)
      if (sessionId) {
        joinSession(sessionId)
      }
    },
    onTherapyResponse: (response) => {
      setIsTyping(false)
      setCurrentAgent(response.response.agentName)
      
      const agentMessage: Message = {
        id: nanoid(),
        type: 'agent',
        content: response.response.content,
        agentName: response.response.agentName,
        agentType: response.response.agentType,
        agentId: response.response.agentId,
        timestamp: response.timestamp,
        culturalContent: response.response.culturalContent,
        suggestedActions: response.response.suggestedActions,
        emotionalAnalysis: response.response.emotionalAnalysis
      }
      
      setMessages(prev => [...prev, agentMessage])
    },
    onAgentTyping: (data) => {
      setIsTyping(true)
      setCurrentAgent(data.agentName)
    },
    onAgentSwitched: (data) => {
      const switchMessage: Message = {
        id: nanoid(),
        type: 'system',
        content: `Transitioning from ${data.fromAgent} to ${data.toAgent}. ${data.reason}`,
        timestamp: data.timestamp
      }
      setMessages(prev => [...prev, switchMessage])
    },
    onError: (error) => {
      console.error('Therapy chat error:', error)
    },
    onCrisisAlert: (alert) => {
      setUrgencyLevel('critical')
      const alertMessage: Message = {
        id: nanoid(),
        type: 'system',
        content: '🚨 Crisis support has been activated. You are not alone, and help is available.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, alertMessage])
    }
  })

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        if (isConnected && !isAuthenticated) {
          await authenticate(sessionId)
        }

        if (!sessionId) {
          // Create new therapy session
          const response = await fetch('/api/therapy/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              culturalContext,
              urgencyLevel: 'medium'
            })
          })

          if (response.ok) {
            const data = await response.json()
            setSessionId(data.sessionId)
            onSessionCreate?.(data.sessionId)
          }
        }
      } catch (error) {
        console.error('Session initialization error:', error)
      }
    }

    if (isConnected) {
      initializeSession()
    }
  }, [isConnected, isAuthenticated, sessionId, culturalContext, onSessionCreate, authenticate])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentMessage.trim() || !sessionId) {
      return
    }

    const userMessage: Message = {
      id: nanoid(),
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsTyping(true)

    // Send via WebSocket if connected, otherwise fallback to HTTP
    if (isAuthenticated) {
      sendMessage({
        message: userMessage.content,
        sessionId,
        culturalContext,
        urgencyLevel
      })
    } else {
      // Fallback to HTTP API
      try {
        const response = await fetch('/api/therapy/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage.content,
            sessionId,
            culturalContext,
            urgencyLevel
          })
        })

        if (response.ok) {
          const data = await response.json()
          
          const agentMessage: Message = {
            id: nanoid(),
            type: 'agent',
            content: data.response.content,
            agentName: data.response.agentName,
            agentType: data.response.agentType,
            timestamp: new Date().toISOString(),
            culturalContent: data.response.culturalContent,
            suggestedActions: data.response.suggestedActions,
            emotionalAnalysis: data.response.emotionalAnalysis
          }
          
          setMessages(prev => [...prev, agentMessage])
          setCurrentAgent(data.response.agentName)
        }
      } catch (error) {
        console.error('HTTP fallback error:', error)
      } finally {
        setIsTyping(false)
      }
    }
  }

  const getAgentIcon = (agentType?: string) => {
    switch (agentType) {
      case 'crisis_intervention':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
      case 'cultural_integration':
        return <SparklesIcon className="w-4 h-4 text-purple-500" />
      default:
        return <HeartIcon className="w-4 h-4 text-facet-blue" />
    }
  }

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isAuthenticated ? 'Connected' : isConnected ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
          {currentAgent && (
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">with</span>
              <span className="text-sm font-medium text-gray-700">{currentAgent}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${getUrgencyColor(urgencyLevel)} text-white`}>
            {urgencyLevel.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <HeartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Welcome to FACET Therapy</p>
              <p className="text-sm">Share what's on your mind. I'm here to listen and support you.</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <Card className={`max-w-[80%] ${message.type === 'user' 
              ? 'bg-facet-blue text-white' 
              : message.type === 'system' 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-gray-50'
            }`}>
              <CardContent className="p-3">
                {message.type === 'agent' && (
                  <div className="flex items-center gap-2 mb-2">
                    {getAgentIcon(message.agentType)}
                    <span className="text-xs font-medium text-gray-600">
                      {message.agentName}
                    </span>
                  </div>
                )}
                
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>

                {message.culturalContent && message.culturalContent.length > 0 && (
                  <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-600 font-medium mb-1">Cultural Insight:</p>
                    {message.culturalContent.map((content, idx) => (
                      <p key={idx} className="text-xs text-purple-700">{content.title}</p>
                    ))}
                  </div>
                )}

                {message.suggestedActions && message.suggestedActions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.suggestedActions.map((action, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs mr-1">
                        {action}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <Card className="bg-gray-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <HeartIcon className="w-4 h-4 text-facet-blue" />
                  <span className="text-sm text-gray-600">{currentAgent} is typing...</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        {connectionError && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">Connection error: {connectionError}</p>
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Share what's on your mind..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-facet-blue focus:border-transparent"
            disabled={!sessionId}
          />
          <Button 
            type="submit" 
            disabled={!currentMessage.trim() || !sessionId}
            className="px-4 py-2"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex gap-2 mt-2">
          {['low', 'medium', 'high', 'critical'].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setUrgencyLevel(level as any)}
              className={`px-2 py-1 text-xs rounded ${
                urgencyLevel === level 
                  ? 'bg-facet-blue text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}
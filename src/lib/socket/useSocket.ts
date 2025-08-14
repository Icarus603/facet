'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { createClient } from '@/lib/supabase/client'

interface TherapyResponse {
  success: boolean;
  response: {
    content: string;
    agentName: string;
    agentType: string;
    agentId: string;
    culturalContent: any[];
    suggestedActions: string[];
    emotionalAnalysis: any;
  };
  processingTime: number;
  timestamp: string;
}

interface SocketEvents {
  onConnected?: () => void;
  onAuthenticated?: (data: { userId: string; sessionId?: string }) => void;
  onTherapyResponse?: (response: TherapyResponse) => void;
  onAgentTyping?: (data: { agentId: string; agentName: string }) => void;
  onAgentSwitched?: (data: { fromAgent: string; toAgent: string; reason: string; timestamp: string }) => void;
  onError?: (error: { message: string; error?: string }) => void;
  onCrisisAlert?: (alert: any) => void;
}

export function useSocket(events: SocketEvents = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Temporarily disable Socket.io for testing
    console.log('Socket.io connection disabled for testing')
    return
    
    // Initialize socket connection
    socketRef.current = io(process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '', {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true
    })

    const socket = socketRef.current

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      setIsConnected(true)
      setConnectionError(null)
      events.onConnected?.()
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setIsConnected(false)
      setIsAuthenticated(false)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setConnectionError(error.message)
      setIsConnected(false)
    })

    // Authentication handlers
    socket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data)
      setIsAuthenticated(true)
      events.onAuthenticated?.(data)
    })

    socket.on('auth_error', (error) => {
      console.error('Socket auth error:', error)
      setIsAuthenticated(false)
      setConnectionError(error.message)
    })

    // Therapy session handlers
    socket.on('therapy_response', (response: TherapyResponse) => {
      events.onTherapyResponse?.(response)
    })

    socket.on('therapy_error', (error) => {
      console.error('Therapy error:', error)
      events.onError?.(error)
    })

    // Agent coordination handlers
    socket.on('agent_typing', (data) => {
      events.onAgentTyping?.(data)
    })

    socket.on('agent_switched', (data) => {
      events.onAgentSwitched?.(data)
    })

    // Crisis monitoring
    socket.on('crisis_alert', (alert) => {
      events.onCrisisAlert?.(alert)
    })

    // General error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error)
      events.onError?.(error)
    })

    // Heartbeat
    socket.on('pong', (data) => {
      // Connection health confirmed
    })

    return () => {
      socket.disconnect()
    }
  }, [events])

  // Authenticate with current session
  const authenticate = async (sessionId?: string) => {
    if (!socketRef.current || !isConnected) {
      console.error('Socket not connected')
      return false
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        console.error('No valid session for socket authentication')
        return false
      }

      socketRef.current.emit('authenticate', {
        sessionToken: session.access_token,
        sessionId
      })

      return true
    } catch (error) {
      console.error('Authentication error:', error)
      return false
    }
  }

  // Send therapy message
  const sendMessage = (params: {
    message: string;
    sessionId: string;
    culturalContext?: any;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  }) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not authenticated')
      return false
    }

    socketRef.current.emit('therapy_message', params)
    return true
  }

  // Join therapy session
  const joinSession = (sessionId: string) => {
    if (!socketRef.current || !isAuthenticated) {
      console.error('Socket not authenticated')
      return false
    }

    socketRef.current.emit('join_session', sessionId)
    return true
  }

  // Leave therapy session
  const leaveSession = (sessionId: string) => {
    if (!socketRef.current) {
      return false
    }

    socketRef.current.emit('leave_session', sessionId)
    return true
  }

  // Send heartbeat
  const ping = () => {
    if (!socketRef.current) {
      return false
    }

    socketRef.current.emit('ping')
    return true
  }

  // Notify agent switch
  const notifyAgentSwitch = (params: {
    sessionId: string;
    fromAgent: string;
    toAgent: string;
    reason: string;
  }) => {
    if (!socketRef.current || !isAuthenticated) {
      return false
    }

    socketRef.current.emit('agent_switch', params)
    return true
  }

  return {
    isConnected,
    isAuthenticated,
    connectionError,
    authenticate,
    sendMessage,
    joinSession,
    leaveSession,
    ping,
    notifyAgentSwitch,
    socket: socketRef.current
  }
}
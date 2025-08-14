'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ConnectionState } from '@/types/chat'

interface UseChatWebSocketReturn {
  isConnected: boolean
  connectionState: ConnectionState
  lastMessage: string | null
  sendMessage: (message: string) => void
  disconnect: () => void
  connect: () => void
}

export function useChatWebSocket(userId: string, sessionId?: string): UseChatWebSocketReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (!userId) {
      console.warn('Cannot connect WebSocket: userId is required')
      return
    }

    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionState('connecting')

    try {
      // In development, use a mock WebSocket for demonstration
      if (process.env.NODE_ENV === 'development') {
        // Import and use mock WebSocket
        import('@/lib/chat/mock-websocket').then(({ createMockSocket }) => {
          const mockWS = createMockSocket(userId, sessionId)
          
          mockWS.onopen = () => {
            setConnectionState('connected')
            reconnectAttempts.current = 0
            console.log('Mock WebSocket connected')
          }

          mockWS.onmessage = (event) => {
            setLastMessage(event.data)
          }

          mockWS.onclose = () => {
            setConnectionState('disconnected')
            scheduleReconnect()
          }

          mockWS.onerror = (error) => {
            console.error('Mock WebSocket error:', error)
            setConnectionState('error')
            scheduleReconnect()
          }

          // Store reference
          websocketRef.current = mockWS as any
        }).catch(error => {
          console.error('Failed to load mock WebSocket:', error)
          setConnectionState('error')
        })
        return
      }

      // Production WebSocket connection
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/chat'
      const ws = new WebSocket(`${wsUrl}?userId=${userId}&sessionId=${sessionId || 'new'}`)

      ws.onopen = () => {
        setConnectionState('connected')
        reconnectAttempts.current = 0
        console.log('WebSocket connected')
      }

      ws.onmessage = (event) => {
        setLastMessage(event.data)
      }

      ws.onclose = () => {
        setConnectionState('disconnected')
        scheduleReconnect()
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionState('error')
        scheduleReconnect()
      }

      websocketRef.current = ws

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionState('error')
      scheduleReconnect()
    }
  }, [userId, sessionId])

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      setConnectionState('error')
      return
    }

    const delay = Math.pow(2, reconnectAttempts.current) * 1000 // Exponential backoff
    reconnectAttempts.current += 1

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Attempting to reconnect (attempt ${reconnectAttempts.current})`)
      connect()
    }, delay)
  }, [connect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
    }

    setConnectionState('disconnected')
  }, [])

  const sendMessage = useCallback((message: string) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(message)
    } else {
      console.warn('Cannot send message: WebSocket is not connected')
      // Queue message for when connection is restored
      // In a real implementation, you'd implement a message queue
    }
  }, [])

  // Connect on mount
  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, optionally disconnect
      } else {
        // Page is visible again, ensure connection
        if (connectionState === 'disconnected') {
          connect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connectionState, connect])

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    lastMessage,
    sendMessage,
    disconnect,
    connect
  }
}
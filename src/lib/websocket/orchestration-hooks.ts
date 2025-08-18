'use client'

import { useEffect, useState, useCallback } from 'react'
import { wsClient, AgentStatusUpdate, OrchestrationStart, OrchestrationComplete } from './websocket-client'
import { createClient } from '@/lib/supabase/client'

// Hook for WebSocket connection management
export function useWebSocketConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<string>('disconnected')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const connect = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user && mounted) {
          const connected = await wsClient.connect(user.id)
          if (mounted) {
            setIsConnected(connected)
            setConnectionState(wsClient.getConnectionState())
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Connection failed')
        }
      }
    }

    const handleConnected = () => {
      if (mounted) {
        setIsConnected(true)
        setConnectionState('connected')
        setError(null)
      }
    }

    const handleDisconnected = () => {
      if (mounted) {
        setIsConnected(false)
        setConnectionState('disconnected')
      }
    }

    const handleError = (data: any) => {
      if (mounted) {
        setError(data.error?.message || 'WebSocket error')
      }
    }

    // Set up event listeners
    wsClient.on('connected', handleConnected)
    wsClient.on('disconnected', handleDisconnected)
    wsClient.on('error', handleError)

    // Initial connection
    connect()

    return () => {
      mounted = false
      wsClient.off('connected', handleConnected)
      wsClient.off('disconnected', handleDisconnected)
      wsClient.off('error', handleError)
    }
  }, [])

  const reconnect = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        wsClient.disconnect()
        const connected = await wsClient.connect(user.id)
        setIsConnected(connected)
        setConnectionState(wsClient.getConnectionState())
        if (connected) {
          setError(null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconnection failed')
    }
  }, [])

  return {
    isConnected,
    connectionState,
    error,
    reconnect
  }
}

// Hook for real-time agent status updates
export function useAgentStatusUpdates(conversationId?: string) {
  const [agentStatuses, setAgentStatuses] = useState<AgentStatusUpdate[]>([])
  const [orchestrationData, setOrchestrationData] = useState<{
    start?: OrchestrationStart
    complete?: OrchestrationComplete
    isProcessing: boolean
  }>({
    isProcessing: false
  })

  useEffect(() => {
    if (!conversationId) return

    let mounted = true

    const handleAgentUpdate = (update: AgentStatusUpdate) => {
      if (!mounted) return
      
      setAgentStatuses(prev => {
        const existing = prev.find(a => a.agentName === update.agentName)
        if (existing) {
          return prev.map(a => a.agentName === update.agentName ? update : a)
        } else {
          return [...prev, update]
        }
      })
    }

    const handleOrchestrationStart = (data: OrchestrationStart) => {
      if (!mounted) return
      
      setOrchestrationData(prev => ({
        ...prev,
        start: data,
        isProcessing: true
      }))
      
      // Initialize agent statuses based on agents involved
      const initialStatuses = data.agentsInvolved.map(agentName => ({
        agentName,
        status: 'queued' as const,
        progress: 0
      }))
      setAgentStatuses(initialStatuses)
    }

    const handleOrchestrationComplete = (data: OrchestrationComplete) => {
      if (!mounted) return
      
      setOrchestrationData(prev => ({
        ...prev,
        complete: data,
        isProcessing: false
      }))
    }

    const handleError = (error: any) => {
      if (!mounted) return
      
      console.error('WebSocket orchestration error:', error)
      setOrchestrationData(prev => ({
        ...prev,
        isProcessing: false
      }))
    }

    // Set up event listeners
    wsClient.on('agentStatusUpdate', handleAgentUpdate)
    wsClient.on('orchestrationStart', handleOrchestrationStart)
    wsClient.on('orchestrationComplete', handleOrchestrationComplete)
    wsClient.on('error', handleError)

    // Subscribe to conversation updates
    wsClient.subscribe(conversationId)

    return () => {
      mounted = false
      wsClient.off('agentStatusUpdate', handleAgentUpdate)
      wsClient.off('orchestrationStart', handleOrchestrationStart)
      wsClient.off('orchestrationComplete', handleOrchestrationComplete)
      wsClient.off('error', handleError)
    }
  }, [conversationId])

  const clearStatuses = useCallback(() => {
    setAgentStatuses([])
    setOrchestrationData({
      isProcessing: false
    })
  }, [])

  return {
    agentStatuses,
    orchestrationData,
    clearStatuses
  }
}

// Hook for heartbeat and connection health
export function useWebSocketHealth() {
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null)
  const [isHealthy, setIsHealthy] = useState(true)

  useEffect(() => {
    let mounted = true
    let healthCheckInterval: NodeJS.Timeout

    const handleHeartbeat = () => {
      if (mounted) {
        setLastHeartbeat(new Date())
        setIsHealthy(true)
      }
    }

    const handleDisconnected = () => {
      if (mounted) {
        setIsHealthy(false)
      }
    }

    const handleConnected = () => {
      if (mounted) {
        setIsHealthy(true)
      }
    }

    // Set up event listeners
    wsClient.on('heartbeat', handleHeartbeat)
    wsClient.on('disconnected', handleDisconnected)
    wsClient.on('connected', handleConnected)

    // Health check - consider unhealthy if no heartbeat for 2 minutes
    healthCheckInterval = setInterval(() => {
      if (mounted && lastHeartbeat) {
        const timeSinceLastHeartbeat = Date.now() - lastHeartbeat.getTime()
        const isStale = timeSinceLastHeartbeat > 120000 // 2 minutes
        setIsHealthy(!isStale && wsClient.isConnected())
      }
    }, 30000) // Check every 30 seconds

    return () => {
      mounted = false
      wsClient.off('heartbeat', handleHeartbeat)
      wsClient.off('disconnected', handleDisconnected)
      wsClient.off('connected', handleConnected)
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval)
      }
    }
  }, [lastHeartbeat])

  return {
    lastHeartbeat,
    isHealthy,
    connectionState: wsClient.getConnectionState()
  }
}

// Hook for debugging WebSocket events
export function useWebSocketDebug() {
  const [events, setEvents] = useState<Array<{
    type: string
    data: any
    timestamp: Date
  }>>([])

  useEffect(() => {
    let mounted = true

    const handleEvent = (type: string) => (data: any) => {
      if (mounted) {
        setEvents(prev => [
          ...prev.slice(-49), // Keep last 50 events
          {
            type,
            data,
            timestamp: new Date()
          }
        ])
      }
    }

    // Listen to all WebSocket events
    const eventTypes = [
      'connected',
      'disconnected',
      'agentStatusUpdate',
      'orchestrationStart',
      'orchestrationComplete',
      'error',
      'heartbeat'
    ]

    eventTypes.forEach(eventType => {
      wsClient.on(eventType, handleEvent(eventType))
    })

    return () => {
      mounted = false
      eventTypes.forEach(eventType => {
        wsClient.off(eventType, handleEvent(eventType))
      })
    }
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return {
    events,
    clearEvents
  }
}
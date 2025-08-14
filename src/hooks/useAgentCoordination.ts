'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { nanoid } from 'nanoid'
import {
  AgentCoordinationState,
  AgentState,
  CoordinationSession,
  CoordinationEvent,
  CrisisAlert,
  CulturalContentRequest,
  CulturalContentResponse,
  SessionContext,
  AgentCoordinationEvent,
  UseAgentCoordinationReturn,
  AgentPerformanceMetrics,
  CoordinationMetrics,
  CrisisIntervention,
  AgentCoordinationConfig
} from '@/types/agent-coordination'
import { AgentType, CoordinationStrategy } from '@/types/chat'

const DEFAULT_CONFIG: AgentCoordinationConfig = {
  enableRealTimeUpdates: true,
  enableCrisisMonitoring: true,
  enableCulturalAdaptation: true,
  maxConcurrentCoordinations: 10,
  coordinationTimeout: 120000, // 2 minutes
  performanceMetricsInterval: 30000, // 30 seconds
  cacheSize: 1000,
  retryAttempts: 3,
  debugMode: false
}

export function useAgentCoordination(
  userId: string,
  sessionId: string,
  config: Partial<AgentCoordinationConfig> = {}
): UseAgentCoordinationReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
  // Core state
  const [coordinationState, setCoordinationState] = useState<AgentCoordinationState>({
    agents: new Map(),
    activeCoordinations: new Map(),
    coordinationQueue: [],
    globalMetrics: {
      totalActiveAgents: 0,
      averageResponseTime: 0,
      coordinationEfficiency: 0,
      culturalAdaptationRate: 0
    },
    lastUpdated: Date.now()
  })

  const [activeAlerts, setActiveAlerts] = useState<CrisisAlert[]>([])
  const [culturalContent, setCulturalContent] = useState<CulturalContentResponse | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // WebSocket and event handling
  const websocketRef = useRef<WebSocket | null>(null)
  const eventListenersRef = useRef<Map<string, Set<(event: any) => void>>>(new Map())
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cache for performance metrics
  const metricsCache = useRef<Map<string, AgentPerformanceMetrics>>(new Map())
  const coordinationMetricsCache = useRef<Map<string, CoordinationMetrics>>(new Map())

  // ============================================================================
  // WEBSOCKET CONNECTION MANAGEMENT
  // ============================================================================

  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_AGENT_WS_URL || 'ws://localhost:8080/agent-coordination'
      const ws = new WebSocket(`${wsUrl}?userId=${userId}&sessionId=${sessionId}`)

      ws.onopen = () => {
        setIsConnected(true)
        if (finalConfig.debugMode) {
          console.log('Agent coordination WebSocket connected')
        }
        
        // Request initial state
        ws.send(JSON.stringify({
          type: 'request_initial_state',
          userId,
          sessionId,
          timestamp: Date.now()
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        scheduleReconnect()
      }

      ws.onerror = (error) => {
        console.error('Agent coordination WebSocket error:', error)
        setIsConnected(false)
      }

      websocketRef.current = ws
    } catch (error) {
      console.error('Failed to connect agent coordination WebSocket:', error)
      scheduleReconnect()
    }
  }, [userId, sessionId, finalConfig.debugMode])

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isConnected) {
        connectWebSocket()
      }
    }, 5000) // Retry every 5 seconds
  }, [isConnected, connectWebSocket])

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'initial_state':
        handleInitialState(message.data)
        break
      case 'agent_status_update':
        handleAgentStatusUpdate(message.data)
        break
      case 'coordination_event':
        handleCoordinationEvent(message.data)
        break
      case 'crisis_alert':
        handleCrisisAlert(message.data)
        break
      case 'cultural_content_response':
        handleCulturalContentResponse(message.data)
        break
      case 'performance_metrics':
        handlePerformanceMetrics(message.data)
        break
      default:
        if (finalConfig.debugMode) {
          console.log('Unknown message type:', message.type)
        }
    }
  }, [finalConfig.debugMode])

  const handleInitialState = useCallback((data: any) => {
    const agents = new Map<string, AgentState>()
    const activeCoordinations = new Map<string, CoordinationSession>()

    // Populate agents
    if (data.agents) {
      data.agents.forEach((agent: any) => {
        agents.set(agent.agentId, {
          agentId: agent.agentId,
          type: agent.type,
          status: agent.status || 'idle',
          currentTask: agent.currentTask || null,
          queuePosition: agent.queuePosition || 0,
          estimatedCompletion: agent.estimatedCompletion || null,
          performance: {
            averageResponseTime: agent.performance?.averageResponseTime || 0,
            successRate: agent.performance?.successRate || 1,
            culturalAccuracy: agent.performance?.culturalAccuracy || 0,
            totalProcessed: agent.performance?.totalProcessed || 0,
            lastHealthCheck: agent.performance?.lastHealthCheck || Date.now()
          },
          culturalSpecializations: agent.culturalSpecializations || [],
          isHealthy: agent.isHealthy !== false,
          lastActivity: agent.lastActivity || Date.now()
        })
      })
    }

    // Populate active coordinations
    if (data.activeCoordinations) {
      data.activeCoordinations.forEach((coordination: any) => {
        activeCoordinations.set(coordination.coordinationId, coordination)
      })
    }

    setCoordinationState(prev => ({
      ...prev,
      agents,
      activeCoordinations,
      coordinationQueue: data.coordinationQueue || [],
      globalMetrics: data.globalMetrics || prev.globalMetrics,
      lastUpdated: Date.now()
    }))

    // Set active alerts
    if (data.activeAlerts) {
      setActiveAlerts(data.activeAlerts)
    }
  }, [])

  const handleAgentStatusUpdate = useCallback((data: any) => {
    setCoordinationState(prev => {
      const newAgents = new Map(prev.agents)
      const existingAgent = newAgents.get(data.agentId)
      
      if (existingAgent) {
        newAgents.set(data.agentId, {
          ...existingAgent,
          ...data,
          lastActivity: Date.now()
        })
      } else {
        newAgents.set(data.agentId, {
          agentId: data.agentId,
          type: data.type,
          status: data.status || 'idle',
          currentTask: data.currentTask || null,
          queuePosition: data.queuePosition || 0,
          estimatedCompletion: data.estimatedCompletion || null,
          performance: data.performance || {
            averageResponseTime: 0,
            successRate: 1,
            culturalAccuracy: 0,
            totalProcessed: 0,
            lastHealthCheck: Date.now()
          },
          culturalSpecializations: data.culturalSpecializations || [],
          isHealthy: data.isHealthy !== false,
          lastActivity: Date.now()
        })
      }

      return {
        ...prev,
        agents: newAgents,
        lastUpdated: Date.now()
      }
    })

    // Notify subscribers
    notifySubscribers(`agent:${data.agentId}`, { type: 'status_update', data })
  }, [])

  const handleCoordinationEvent = useCallback((data: any) => {
    const coordinationEvent: CoordinationEvent = {
      eventId: data.eventId || nanoid(),
      timestamp: data.timestamp || Date.now(),
      sourceAgent: data.sourceAgent || null,
      targetAgent: data.targetAgent || null,
      eventType: data.eventType,
      context: data.context || {},
      culturalContext: data.culturalContext,
      priority: data.priority || 'medium',
      processingTime: data.processingTime
    }

    setCoordinationState(prev => {
      const newCoordinations = new Map(prev.activeCoordinations)
      const coordination = newCoordinations.get(data.coordinationId)
      
      if (coordination) {
        coordination.events.push(coordinationEvent)
        coordination.status = data.coordinationStatus || coordination.status
        
        if (data.metrics) {
          coordination.metrics = { ...coordination.metrics, ...data.metrics }
        }
        
        newCoordinations.set(data.coordinationId, coordination)
      }

      return {
        ...prev,
        activeCoordinations: newCoordinations,
        coordinationQueue: data.eventType === 'handoff' 
          ? [...prev.coordinationQueue, coordinationEvent]
          : prev.coordinationQueue,
        lastUpdated: Date.now()
      }
    })

    // Notify coordination subscribers
    notifySubscribers(`coordination:${data.coordinationId}`, coordinationEvent)
  }, [])

  const handleCrisisAlert = useCallback((data: any) => {
    const alert: CrisisAlert = {
      alertId: data.alertId || nanoid(),
      userId: data.userId,
      sessionId: data.sessionId,
      riskLevel: data.riskLevel,
      triggerFactors: data.triggerFactors || [],
      detectedAt: data.detectedAt || Date.now(),
      status: data.status || 'active',
      assignedAgent: data.assignedAgent || null,
      culturalConsiderations: data.culturalConsiderations || [],
      interventionPlan: data.interventionPlan || [],
      estimatedResolutionTime: data.estimatedResolutionTime || null
    }

    setActiveAlerts(prev => {
      const existing = prev.find(a => a.alertId === alert.alertId)
      if (existing) {
        return prev.map(a => a.alertId === alert.alertId ? alert : a)
      }
      return [...prev, alert]
    })

    // Notify crisis alert subscribers
    notifySubscribers(`crisis:${userId}`, alert)
  }, [userId])

  const handleCulturalContentResponse = useCallback((data: any) => {
    setCulturalContent(data)
  }, [])

  const handlePerformanceMetrics = useCallback((data: any) => {
    // Update metrics cache
    if (data.agentMetrics) {
      data.agentMetrics.forEach((metric: AgentPerformanceMetrics) => {
        metricsCache.current.set(metric.agentId, metric)
      })
    }

    if (data.coordinationMetrics) {
      data.coordinationMetrics.forEach((metric: CoordinationMetrics) => {
        coordinationMetricsCache.current.set(metric.coordinationId, metric)
      })
    }

    // Update global metrics
    if (data.globalMetrics) {
      setCoordinationState(prev => ({
        ...prev,
        globalMetrics: data.globalMetrics,
        lastUpdated: Date.now()
      }))
    }
  }, [])

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  const notifySubscribers = useCallback((topic: string, data: any) => {
    const listeners = eventListenersRef.current.get(topic)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in event listener for ${topic}:`, error)
        }
      })
    }
  }, [])

  const subscribe = useCallback((topic: string, listener: (data: any) => void) => {
    if (!eventListenersRef.current.has(topic)) {
      eventListenersRef.current.set(topic, new Set())
    }
    eventListenersRef.current.get(topic)!.add(listener)

    return () => {
      const listeners = eventListenersRef.current.get(topic)
      if (listeners) {
        listeners.delete(listener)
        if (listeners.size === 0) {
          eventListenersRef.current.delete(topic)
        }
      }
    }
  }, [])

  // ============================================================================
  // PUBLIC API ACTIONS
  // ============================================================================

  const requestCoordination = useCallback(async (
    strategy: CoordinationStrategy,
    agentTypes: AgentType[],
    context: SessionContext
  ): Promise<string> => {
    const coordinationId = nanoid()
    
    if (websocketRef.current && isConnected) {
      websocketRef.current.send(JSON.stringify({
        type: 'request_coordination',
        coordinationId,
        strategy,
        agentTypes,
        context,
        timestamp: Date.now()
      }))
    }

    return coordinationId
  }, [isConnected])

  const cancelCoordination = useCallback(async (coordinationId: string): Promise<void> => {
    if (websocketRef.current && isConnected) {
      websocketRef.current.send(JSON.stringify({
        type: 'cancel_coordination',
        coordinationId,
        timestamp: Date.now()
      }))
    }

    setCoordinationState(prev => {
      const newCoordinations = new Map(prev.activeCoordinations)
      newCoordinations.delete(coordinationId)
      return {
        ...prev,
        activeCoordinations: newCoordinations,
        lastUpdated: Date.now()
      }
    })
  }, [isConnected])

  const updateAgentStatus = useCallback((agentId: string, status: Partial<AgentState>) => {
    setCoordinationState(prev => {
      const newAgents = new Map(prev.agents)
      const existingAgent = newAgents.get(agentId)
      
      if (existingAgent) {
        newAgents.set(agentId, {
          ...existingAgent,
          ...status,
          lastActivity: Date.now()
        })
      }

      return {
        ...prev,
        agents: newAgents,
        lastUpdated: Date.now()
      }
    })
  }, [])

  const triggerCrisisIntervention = useCallback(async (
    intervention: Partial<CrisisIntervention>
  ): Promise<void> => {
    if (websocketRef.current && isConnected) {
      websocketRef.current.send(JSON.stringify({
        type: 'trigger_crisis_intervention',
        intervention: {
          ...intervention,
          interventionId: intervention.interventionId || nanoid(),
          timestamp: intervention.timestamp || Date.now()
        },
        timestamp: Date.now()
      }))
    }
  }, [isConnected])

  const requestCulturalContent = useCallback(async (
    request: CulturalContentRequest
  ): Promise<void> => {
    if (websocketRef.current && isConnected) {
      websocketRef.current.send(JSON.stringify({
        type: 'request_cultural_content',
        request,
        timestamp: Date.now()
      }))
    }
  }, [isConnected])

  // ============================================================================
  // SUBSCRIPTION HELPERS
  // ============================================================================

  const subscribeToAgent = useCallback((agentId: string) => {
    return subscribe(`agent:${agentId}`, () => {})
  }, [subscribe])

  const subscribeToCoordination = useCallback((coordinationId: string) => {
    return subscribe(`coordination:${coordinationId}`, () => {})
  }, [subscribe])

  const subscribeToCrisisAlerts = useCallback((alertUserId: string) => {
    return subscribe(`crisis:${alertUserId}`, () => {})
  }, [subscribe])

  // ============================================================================
  // METRICS ACCESS
  // ============================================================================

  const getAgentMetrics = useCallback((agentId: string): AgentPerformanceMetrics | null => {
    return metricsCache.current.get(agentId) || null
  }, [])

  const getCoordinationMetrics = useCallback((coordinationId: string): CoordinationMetrics | null => {
    return coordinationMetricsCache.current.get(coordinationId) || null
  }, [])

  const getGlobalMetrics = useCallback(() => {
    return coordinationState.globalMetrics
  }, [coordinationState.globalMetrics])

  // ============================================================================
  // LIFECYCLE MANAGEMENT
  // ============================================================================

  useEffect(() => {
    connectWebSocket()

    // Start performance metrics polling
    if (finalConfig.enableRealTimeUpdates) {
      metricsIntervalRef.current = setInterval(() => {
        if (websocketRef.current && isConnected) {
          websocketRef.current.send(JSON.stringify({
            type: 'request_performance_metrics',
            timestamp: Date.now()
          }))
        }
      }, finalConfig.performanceMetricsInterval)
    }

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close()
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connectWebSocket, finalConfig.enableRealTimeUpdates, finalConfig.performanceMetricsInterval, isConnected])

  // Cleanup cache when it gets too large
  useEffect(() => {
    const cleanupCache = () => {
      if (metricsCache.current.size > finalConfig.cacheSize) {
        const entries = Array.from(metricsCache.current.entries())
        metricsCache.current.clear()
        // Keep only the most recent half
        entries.slice(-Math.floor(finalConfig.cacheSize / 2)).forEach(([key, value]) => {
          metricsCache.current.set(key, value)
        })
      }
    }

    const interval = setInterval(cleanupCache, 60000) // Cleanup every minute
    return () => clearInterval(interval)
  }, [finalConfig.cacheSize])

  return {
    coordinationState,
    activeAlerts,
    culturalContent,
    isConnected,
    requestCoordination,
    cancelCoordination,
    updateAgentStatus,
    triggerCrisisIntervention,
    requestCulturalContent,
    subscribeToAgent,
    subscribeToCoordination,
    subscribeToCrisisAlerts,
    getAgentMetrics,
    getCoordinationMetrics,
    getGlobalMetrics
  }
}
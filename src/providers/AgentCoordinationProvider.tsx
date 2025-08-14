'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useAgentCoordination } from '@/hooks/useAgentCoordination'
import {
  UseAgentCoordinationReturn,
  AgentCoordinationConfig
} from '@/types/agent-coordination'

interface AgentCoordinationProviderProps {
  children: ReactNode
  userId: string
  sessionId: string
  config?: Partial<AgentCoordinationConfig>
}

interface AgentCoordinationContextType {
  coordination: UseAgentCoordinationReturn
  config: AgentCoordinationConfig
}

const AgentCoordinationContext = createContext<AgentCoordinationContextType | null>(null)

export function AgentCoordinationProvider({
  children,
  userId,
  sessionId,
  config = {}
}: AgentCoordinationProviderProps) {
  const defaultConfig: AgentCoordinationConfig = {
    enableRealTimeUpdates: true,
    enableCrisisMonitoring: true,
    enableCulturalAdaptation: true,
    maxConcurrentCoordinations: 10,
    coordinationTimeout: 120000,
    performanceMetricsInterval: 30000,
    cacheSize: 1000,
    retryAttempts: 3,
    debugMode: process.env.NODE_ENV === 'development'
  }

  const finalConfig = { ...defaultConfig, ...config }
  const coordination = useAgentCoordination(userId, sessionId, finalConfig)

  const contextValue: AgentCoordinationContextType = {
    coordination,
    config: finalConfig
  }

  return (
    <AgentCoordinationContext.Provider value={contextValue}>
      {children}
    </AgentCoordinationContext.Provider>
  )
}

export function useAgentCoordinationContext(): AgentCoordinationContextType {
  const context = useContext(AgentCoordinationContext)
  
  if (!context) {
    throw new Error('useAgentCoordinationContext must be used within an AgentCoordinationProvider')
  }
  
  return context
}

// Helper hook for easier access to coordination state
export function useCoordinationState() {
  const { coordination } = useAgentCoordinationContext()
  return coordination.coordinationState
}

// Helper hook for crisis monitoring
export function useCrisisMonitoring() {
  const { coordination } = useAgentCoordinationContext()
  return {
    alerts: coordination.activeAlerts,
    triggerIntervention: coordination.triggerCrisisIntervention,
    subscribe: coordination.subscribeToCrisisAlerts
  }
}

// Helper hook for cultural content
export function useCulturalContent() {
  const { coordination } = useAgentCoordinationContext()
  return {
    content: coordination.culturalContent,
    requestContent: coordination.requestCulturalContent
  }
}

// Helper hook for agent metrics
export function useAgentMetrics() {
  const { coordination } = useAgentCoordinationContext()
  return {
    getAgentMetrics: coordination.getAgentMetrics,
    getCoordinationMetrics: coordination.getCoordinationMetrics,
    getGlobalMetrics: coordination.getGlobalMetrics
  }
}
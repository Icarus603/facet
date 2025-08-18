'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { AgentOrchestrationData, AgentExecutionResult } from '@/lib/types/api-contract'

export interface AgentStatus {
  agentName: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress?: number
  executionTimeMs?: number
  confidence?: number
  startTime?: number
  message?: string
}

export interface OrchestrationState {
  isProcessing: boolean
  strategy?: string
  estimatedTimeMs?: number
  agentsInvolved?: string[]
  executionPattern?: string
  startTime?: number
}

interface AgentStore {
  // Current agent statuses
  agentStatuses: AgentStatus[]
  
  // Current orchestration state
  orchestrationState: OrchestrationState
  
  // Recent orchestration history (last 10)
  orchestrationHistory: AgentOrchestrationData[]
  
  // Total processing time for current operation
  totalProcessingTime: number
  
  // User preferences
  transparencyLevel: 'minimal' | 'standard' | 'detailed'
  showAgentVisibility: boolean
  
  // Actions
  setAgentStatus: (agentName: string, status: Partial<AgentStatus>) => void
  updateAgentProgress: (agentName: string, progress: number) => void
  completeAgent: (agentName: string, executionTimeMs: number, confidence: number) => void
  errorAgent: (agentName: string, message: string) => void
  clearAgentStatuses: () => void
  
  startOrchestration: (orchestration: Partial<OrchestrationState>) => void
  completeOrchestration: (orchestrationData: AgentOrchestrationData) => void
  
  setTransparencyLevel: (level: 'minimal' | 'standard' | 'detailed') => void
  setAgentVisibility: (visible: boolean) => void
  
  // Utility methods
  getAgentsByStatus: (status: AgentStatus['status']) => AgentStatus[]
  getProcessingProgress: () => number
  isAgentProcessing: (agentName: string) => boolean
}

export const useAgentStore = create<AgentStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    agentStatuses: [],
    orchestrationState: {
      isProcessing: false
    },
    orchestrationHistory: [],
    totalProcessingTime: 0,
    transparencyLevel: 'standard',
    showAgentVisibility: true,
    
    // Agent status actions
    setAgentStatus: (agentName: string, status: Partial<AgentStatus>) => {
      set((state) => ({
        agentStatuses: state.agentStatuses.map(agent =>
          agent.agentName === agentName 
            ? { ...agent, ...status }
            : agent
        ).concat(
          // Add new agent if it doesn't exist
          state.agentStatuses.find(a => a.agentName === agentName) 
            ? [] 
            : [{ agentName, status: 'pending', ...status }]
        )
      }))
    },

    updateAgentProgress: (agentName: string, progress: number) => {
      set((state) => ({
        agentStatuses: state.agentStatuses.map(agent =>
          agent.agentName === agentName 
            ? { ...agent, progress: Math.min(100, Math.max(0, progress)) }
            : agent
        )
      }))
    },

    completeAgent: (agentName: string, executionTimeMs: number, confidence: number) => {
      set((state) => ({
        agentStatuses: state.agentStatuses.map(agent =>
          agent.agentName === agentName 
            ? { 
                ...agent, 
                status: 'completed' as const, 
                progress: 100, 
                executionTimeMs, 
                confidence 
              }
            : agent
        )
      }))
    },

    errorAgent: (agentName: string, message: string) => {
      set((state) => ({
        agentStatuses: state.agentStatuses.map(agent =>
          agent.agentName === agentName 
            ? { ...agent, status: 'error' as const, message }
            : agent
        )
      }))
    },

    clearAgentStatuses: () => {
      set({
        agentStatuses: [],
        orchestrationState: { isProcessing: false },
        totalProcessingTime: 0
      })
    },

    // Orchestration actions
    startOrchestration: (orchestration: Partial<OrchestrationState>) => {
      set((state) => ({
        orchestrationState: {
          ...state.orchestrationState,
          ...orchestration,
          isProcessing: true,
          startTime: Date.now()
        },
        // Initialize agent statuses if agents are provided
        agentStatuses: orchestration.agentsInvolved 
          ? orchestration.agentsInvolved.map(agentName => ({
              agentName,
              status: 'pending' as const,
              startTime: Date.now()
            }))
          : state.agentStatuses
      }))
    },

    completeOrchestration: (orchestrationData: AgentOrchestrationData) => {
      set((state) => {
        const completedTime = Date.now()
        const totalTime = state.orchestrationState.startTime 
          ? completedTime - state.orchestrationState.startTime 
          : orchestrationData.timing.totalTimeMs

        return {
          orchestrationState: {
            ...state.orchestrationState,
            isProcessing: false
          },
          totalProcessingTime: totalTime,
          orchestrationHistory: [
            orchestrationData,
            ...state.orchestrationHistory.slice(0, 9) // Keep last 10
          ],
          // Update agent statuses with final results
          agentStatuses: orchestrationData.agentResults.map(result => ({
            agentName: result.agentName,
            status: result.success ? 'completed' as const : 'error' as const,
            progress: 100,
            executionTimeMs: result.executionTimeMs,
            confidence: result.confidence,
            message: result.success ? undefined : result.errorMessage
          }))
        }
      })
    },

    // Preference actions
    setTransparencyLevel: (level) => {
      set({ transparencyLevel: level })
    },

    setAgentVisibility: (visible) => {
      set({ showAgentVisibility: visible })
    },

    // Utility methods
    getAgentsByStatus: (status) => {
      return get().agentStatuses.filter(agent => agent.status === status)
    },

    getProcessingProgress: () => {
      const { agentStatuses } = get()
      if (agentStatuses.length === 0) return 0
      
      const totalProgress = agentStatuses.reduce((sum, agent) => {
        if (agent.status === 'completed') return sum + 100
        if (agent.status === 'running') return sum + (agent.progress || 0)
        return sum
      }, 0)
      
      return totalProgress / agentStatuses.length
    },

    isAgentProcessing: (agentName) => {
      const agent = get().agentStatuses.find(a => a.agentName === agentName)
      return agent?.status === 'running'
    }
  }))
)

// Selectors for common use cases
export const selectAgentStatuses = (state: ReturnType<typeof useAgentStore.getState>) => 
  state.agentStatuses

export const selectIsProcessing = (state: ReturnType<typeof useAgentStore.getState>) => 
  state.orchestrationState.isProcessing

export const selectProcessingProgress = (state: ReturnType<typeof useAgentStore.getState>) => 
  state.getProcessingProgress()

export const selectTransparencySettings = (state: ReturnType<typeof useAgentStore.getState>) => ({
  level: state.transparencyLevel,
  showAgentVisibility: state.showAgentVisibility
})

export const selectRecentOrchestration = (state: ReturnType<typeof useAgentStore.getState>) => 
  state.orchestrationHistory[0]

// Derived selectors
export const useAgentStatuses = () => useAgentStore(selectAgentStatuses)
export const useIsProcessing = () => useAgentStore(selectIsProcessing)
export const useProcessingProgress = () => useAgentStore(selectProcessingProgress)
export const useTransparencySettings = () => useAgentStore(selectTransparencySettings)
export const useRecentOrchestration = () => useAgentStore(selectRecentOrchestration)

// Actions
export const useAgentActions = () => useAgentStore((state) => ({
  setAgentStatus: state.setAgentStatus,
  updateAgentProgress: state.updateAgentProgress,
  completeAgent: state.completeAgent,
  errorAgent: state.errorAgent,
  clearAgentStatuses: state.clearAgentStatuses,
  startOrchestration: state.startOrchestration,
  completeOrchestration: state.completeOrchestration,
  setTransparencyLevel: state.setTransparencyLevel,
  setAgentVisibility: state.setAgentVisibility
}))

// Persistence (optional - save to localStorage)
if (typeof window !== 'undefined') {
  // Subscribe to transparency preferences changes and save to localStorage
  useAgentStore.subscribe(
    (state) => ({ 
      transparencyLevel: state.transparencyLevel, 
      showAgentVisibility: state.showAgentVisibility 
    }),
    (transparencySettings) => {
      localStorage.setItem('facet-transparency-settings', JSON.stringify(transparencySettings))
    }
  )

  // Load transparency preferences from localStorage on initialization
  const savedSettings = localStorage.getItem('facet-transparency-settings')
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings)
      useAgentStore.setState({
        transparencyLevel: settings.transparencyLevel || 'standard',
        showAgentVisibility: settings.showAgentVisibility ?? true
      })
    } catch (error) {
      console.warn('Failed to load transparency settings from localStorage:', error)
    }
  }
}
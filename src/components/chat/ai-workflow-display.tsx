'use client'

import React, { useState, useEffect } from 'react'
import { AgentType } from '@/lib/types/agent'
import { AgentOrchestrationData } from '@/lib/types/api-contract'
import { AITeamProcessingBubble } from './message-components/ai-team-processing-bubble'
import { Brain, Clock, Users, Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface AIWorkflowDisplayProps {
  isProcessing: boolean
  agentStatuses?: Array<{
    agentName: keyof typeof import('@/lib/types/api-contract').AGENT_CONFIG
    status: 'pending' | 'running' | 'completed' | 'error'
    progress?: number
    executionTimeMs?: number
    confidence?: number
  }>
  totalProcessingTime?: number
  orchestrationData?: AgentOrchestrationData
  className?: string
}

// Agent display mapping
const getAgentDisplayInfo = (agentName: string) => {
  const mapping: Record<string, { name: string; emoji: string }> = {
    'emotion_analyzer': { name: 'Emotion Analyzer', emoji: '😊' },
    'memory_manager': { name: 'Memory Manager', emoji: '🧠' },
    'crisis_monitor': { name: 'Crisis Monitor', emoji: '🛡️' },
    'therapy_advisor': { name: 'Therapy Advisor', emoji: '🎯' },
    'progress_tracker': { name: 'Progress Tracker', emoji: '📊' }
  }
  return mapping[agentName] || { name: agentName, emoji: '🤖' }
}

export function AIWorkflowDisplay({ 
  isProcessing,
  agentStatuses = [],
  totalProcessingTime = 0,
  orchestrationData,
  className 
}: AIWorkflowDisplayProps) {
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showConnectionLine1, setShowConnectionLine1] = useState(false)
  const [showConnectionLine2, setShowConnectionLine2] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Calculate workflow stages
  const hasStartedProcessing = isProcessing || agentStatuses.length > 0
  const hasCompletedProcessing = agentStatuses.some(agent => agent.status === 'completed') || orchestrationData?.complete
  const hasCompletedResponse = orchestrationData?.complete || !isProcessing

  // Progressive reveal with delays - each stage stays visible
  useEffect(() => {
    if (hasCompletedProcessing) {
      // Show first connection line
      const lineTimer1 = setTimeout(() => setShowConnectionLine1(true), 300)
      // Then show analysis bubble  
      const analysisTimer = setTimeout(() => setShowAnalysis(true), 800)
      // Then show second connection line
      const lineTimer2 = setTimeout(() => setShowConnectionLine2(true), 1300)
      // Finally show response placeholder
      const responseTimer = setTimeout(() => setShowResponse(true), 1800)
      
      return () => {
        clearTimeout(lineTimer1)
        clearTimeout(analysisTimer)
        clearTimeout(lineTimer2)
        clearTimeout(responseTimer)
      }
    }
  }, [hasCompletedProcessing])

  // Reset when new processing starts
  useEffect(() => {
    if (isProcessing) {
      setShowAnalysis(false)
      setShowConnectionLine1(false)
      setShowConnectionLine2(false)
      setShowResponse(false)
    }
  }, [isProcessing])
  
  const activeAgents = agentStatuses.filter(agent => 
    agent.status === 'running'
  ).length
  
  const completedAgents = agentStatuses.filter(agent => 
    agent.status === 'completed'
  ).length
  
  const queuedAgents = agentStatuses.filter(agent => 
    agent.status === 'pending'
  ).length

  // Debug log
  console.log('🔍 AIWorkflowDisplay received:', {
    isProcessing,
    agentStatuses,
    totalProcessingTime,
    orchestrationData,
    activeAgents,
    completedAgents,
    queuedAgents,
    hasStartedProcessing,
    hasCompletedProcessing
  })

  return (
    <div className="flex justify-center w-full">
      <div className="relative" style={{ width: '720px' }}>
        
        {/* Stage 1: AI Team Processing */}
        {hasStartedProcessing && (
          <div className="relative">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              {/* Main Processing Header - Clickable */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-all duration-200 group ${
                  isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 animate-pulse" style={{ color: 'var(--facet-blue-primary)' }} />
                      <span className="text-sm font-semibold meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                        AI Team Processing
                      </span>
                      <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--facet-blue-primary)' }} />
                    </div>
                    <div className="flex items-center gap-1">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Metrics */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 meslo-font">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{activeAgents} active • {queuedAgents} queued • {completedAgents} completed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{isProcessing ? 'Processing...' : `${totalProcessingTime}ms`}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>{isProcessing ? 'Analyzing your message' : 'Analysis complete'}</span>
                  </div>
                </div>
              </button>

              {/* Expanded Real-time Agent Status */}
              {isExpanded && (
                <div className="border-t border-gray-200 px-5 pb-5 rounded-b-2xl" style={{ backgroundColor: 'var(--facet-chat-bg)' }}>
                  <div className="mt-4">
                    <h4 className="text-sm font-bold mb-4 meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                      🔄 Live Agent Activity
                    </h4>
                    
                    {/* Agent Status List */}
                    <div className="space-y-3">
                      {agentStatuses.map((agent, index) => {
                        const displayInfo = getAgentDisplayInfo(agent.agentName)
                        return (
                          <div key={index} className="bg-white rounded-lg p-3 border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{displayInfo.emoji}</span>
                                <span className="font-medium text-sm meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                                  {displayInfo.name}
                                </span>
                                {agent.status === 'running' ? (
                                  <div className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                                    <span className="text-xs text-blue-600 font-medium meslo-font">
                                      Running
                                    </span>
                                  </div>
                                ) : agent.status === 'completed' ? (
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs text-green-600 font-medium meslo-font">
                                      Completed
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500 font-medium meslo-font">Pending</span>
                                )}
                              </div>
                              {agent.executionTimeMs && (
                                <span className="text-xs text-gray-500 meslo-font">
                                  {agent.executionTimeMs}ms
                                </span>
                              )}
                            </div>
                            
                            {/* Agent Progress */}
                            <div className="text-sm text-gray-700 meslo-font">
                              {agent.status === 'running' && 'Processing your message...'}
                              {agent.status === 'completed' && agent.confidence && 
                                `Analysis complete • ${Math.round(agent.confidence * 100)}% confidence`}
                              {agent.status === 'pending' && 'Waiting in queue...'}
                            </div>
                            
                            {/* Progress Bar for Active Agents */}
                            {agent.status === 'running' && (
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div className="bg-blue-500 h-1.5 rounded-full animate-pulse" 
                                       style={{ width: `${agent.progress || 50}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Connection Line 1: Processing -> Analysis */}
            {showConnectionLine1 && (
              <div 
                className="absolute left-4 w-0.5 transition-all duration-500 ease-out"
                style={{ 
                  backgroundColor: '#8B5A6B',
                  height: '20px',
                  top: '100%',
                  zIndex: 10,
                  animation: 'slideDown 0.5s ease-out'
                }}
              />
            )}
          </div>
        )}

        {/* Stage 2: AI Team Analysis Complete - Simple completion summary */}
        {showAnalysis && (
          <div className="relative mt-5 animate-fadeIn">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-semibold meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                    AI Team Analysis Complete
                  </span>
                </div>
                <div className="text-sm text-gray-600 meslo-font">
                  Multi-agent coordination successful • {totalProcessingTime}ms
                </div>
                {agentStatuses.filter(agent => agent.status === 'completed').length > 0 && (
                  <div className="mt-2 text-xs text-gray-500 meslo-font">
                    {agentStatuses.filter(agent => agent.status === 'completed').length} agents completed analysis
                  </div>
                )}
              </div>
            </div>
            
            {/* Connection Line 2: Analysis -> Response */}
            {showConnectionLine2 && (
              <div 
                className="absolute left-4 w-0.5 transition-all duration-500 ease-out"
                style={{ 
                  backgroundColor: '#8B5A6B',
                  height: '20px',
                  top: '100%',
                  zIndex: 10,
                  animation: 'slideDown 0.5s ease-out'
                }}
              />
            )}
          </div>
        )}

        {/* Stage 3: FACET AI Response Ready */}
        {showResponse && (
          <div className="relative mt-5 animate-fadeIn">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">🤖</span>
                  <span className="text-sm font-semibold meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                    FACET AI Response Ready
                  </span>
                </div>
                <div className="text-sm text-gray-600 meslo-font">
                  Therapeutic response prepared and delivered
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      
      <style jsx>{`
        @keyframes slideDown {
          from { height: 0; }
          to { height: 20px; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
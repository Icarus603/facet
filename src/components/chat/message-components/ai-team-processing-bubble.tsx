'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { AgentOrchestrationData } from '@/lib/types/api-contract'
import { ChevronDown, ChevronUp, Brain, Clock, Users, Sparkles } from 'lucide-react'

interface AITeamProcessingBubbleProps {
  orchestration: AgentOrchestrationData
  transparencyLevel?: 'minimal' | 'standard' | 'detailed'
  className?: string
}

export function AITeamProcessingBubble({
  orchestration,
  transparencyLevel = 'standard',
  className
}: AITeamProcessingBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const completedAgents = orchestration.agentResults.filter(a => a.success).length
  const totalAgents = orchestration.agentResults.length
  const avgConfidence = orchestration.agentResults.reduce((acc, agent) => acc + agent.confidence, 0) / totalAgents
  const processingTime = orchestration.timing?.totalTimeMs || 0
  const timeInSeconds = (processingTime / 1000).toFixed(1)
  const confidenceLevel = avgConfidence >= 0.8 ? 'High' : avgConfidence >= 0.6 ? 'Good' : 'Moderate'

  return (
    <div className="flex justify-center w-full">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm" style={{ width: '720px' }}>
        {/* Main Processing Bubble - Clickable Header */}
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
                <Brain className="h-4 w-4" style={{ color: 'var(--facet-blue-primary)' }} />
                <span className="text-sm font-semibold meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                  AI Team Analysis
                </span>
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

          {/* Summary Metrics */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 meslo-font">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{completedAgents}/{totalAgents} agents</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{timeInSeconds}s</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>{confidenceLevel} confidence</span>
            </div>
          </div>

          {/* Strategy Preview */}
          {!isExpanded && orchestration.strategy && (
            <div className="mt-3 text-sm text-gray-700 italic meslo-font">
              "{orchestration.strategy}"
            </div>
          )}
        </button>

        {/* Expanded Detail View - Inline */}
        {isExpanded && (
          <div className="border-t border-gray-200 px-5 pb-5 rounded-b-2xl" style={{ backgroundColor: 'var(--facet-chat-bg)' }}>
            {/* Team Coordination Strategy */}
            <div className="mt-4 mb-6">
              <h3 className="text-base font-bold mb-2 meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                🎯 Team Coordination Strategy
              </h3>
              <p className="text-sm text-gray-700 italic bg-white rounded-lg p-3 border border-gray-100 meslo-font">
                "{orchestration.strategy || 'Parallel emotional and memory analysis with therapeutic synthesis'}"
              </p>
            </div>

            {/* Agent Execution Timeline */}
            <div className="mb-6">
              <h4 className="text-sm font-bold mb-4 meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                🔄 Agent Execution Timeline ({timeInSeconds}s total)
              </h4>
              
              {/* Agent Results */}
              <div className="space-y-3">
                {orchestration.agentResults.map((agent, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {agent.agentName === 'emotion_analyzer' ? '😊' :
                           agent.agentName === 'memory_manager' ? '🧠' :
                           agent.agentName === 'crisis_monitor' ? '🛡️' :
                           agent.agentName === 'therapy_advisor' ? '🎯' :
                           agent.agentName === 'progress_tracker' ? '📊' : '🤖'}
                        </span>
                        <span className="font-medium text-sm meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                          {agent.agentName.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')} {agent.success ? '✓' : '❌'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 meslo-font">
                        {agent.executionTimeMs}ms • {Math.round(agent.confidence * 100)}%
                      </div>
                    </div>
                    
                    {/* Agent Result */}
                    {agent.result && typeof agent.result === 'object' && agent.result.analysis && (
                      <div className="text-sm text-gray-700 meslo-font">
                        "{agent.result.analysis}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Final Coordination Decision */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-bold mb-2 meslo-font" style={{ color: 'var(--facet-blue-primary)' }}>
                💡 Final Coordination Decision
              </h4>
              <p className="text-sm text-gray-700 italic bg-white rounded-lg p-3 border border-gray-100 meslo-font">
                "{orchestration.reasoning || 'Integrated therapeutic approach based on emotional state analysis and contextual patterns'}"
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
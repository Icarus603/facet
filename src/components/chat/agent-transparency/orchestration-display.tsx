'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { AgentOrchestrationData, AgentExecutionResult } from '@/lib/types/api-contract'
import { ChevronDown, ChevronRight, Clock, Target, Zap, TrendingUp, Brain, Users } from 'lucide-react'
import { AgentExecutionTimeline } from './agent-execution-timeline'
import { ReasoningExpansion } from './reasoning-expansion'

interface OrchestrationDisplayProps {
  orchestration: AgentOrchestrationData
  transparencyLevel?: 'minimal' | 'standard' | 'detailed'
  className?: string
}

export function OrchestrationDisplay({ 
  orchestration, 
  transparencyLevel = 'standard',
  className 
}: OrchestrationDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeSection, setActiveSection] = useState<'strategy' | 'timeline' | 'agents' | 'metrics'>('strategy')

  if (!orchestration) {
    return null
  }

  const sections = [
    { 
      id: 'strategy' as const, 
      label: 'Strategy', 
      icon: Target,
      description: 'How your AI team coordinated'
    },
    { 
      id: 'timeline' as const, 
      label: 'Timeline', 
      icon: Clock,
      description: 'Step-by-step execution'
    },
    { 
      id: 'agents' as const, 
      label: 'Agent Results', 
      icon: Users,
      description: 'Individual agent findings'
    },
    { 
      id: 'metrics' as const, 
      label: 'Performance', 
      icon: TrendingUp,
      description: 'Timing and quality metrics'
    }
  ]

  return (
    <div className={cn(
      "bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg overflow-hidden transition-all duration-300",
      className
    )}>
      {/* Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-blue-100/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                AI Team Coordination
              </h3>
              <p className="text-xs text-gray-600">
                {orchestration.strategy}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-500">
                {orchestration.totalAgentsInvolved} agents
              </div>
              <div className="text-xs text-blue-600 font-medium">
                {orchestration.timing.totalTimeMs}ms
              </div>
            </div>
            <div className="transition-transform duration-200">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-blue-200">
          {/* Section Navigation */}
          <div className="flex border-b border-blue-200 bg-white/50">
            {sections.map((section) => {
              const IconComponent = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex-1 px-4 py-3 text-xs font-medium transition-colors relative",
                    activeSection === section.id
                      ? "text-blue-700 bg-blue-100/70"
                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <IconComponent className="h-3 w-3" />
                    <span className="hidden sm:inline">{section.label}</span>
                  </div>
                  {activeSection === section.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Section Content */}
          <div className="p-4 bg-white/30">
            {activeSection === 'strategy' && (
              <StrategySection orchestration={orchestration} />
            )}
            {activeSection === 'timeline' && (
              <AgentExecutionTimeline 
                executionPlan={orchestration.executionPlan}
                executionPattern={orchestration.executionPattern}
              />
            )}
            {activeSection === 'agents' && (
              <AgentResultsSection 
                agentResults={orchestration.agentResults}
                transparencyLevel={transparencyLevel}
              />
            )}
            {activeSection === 'metrics' && (
              <MetricsSection orchestration={orchestration} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StrategySection({ orchestration }: { orchestration: AgentOrchestrationData }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Coordination Strategy</h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {orchestration.reasoning}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium text-gray-900">Execution Pattern</span>
          </div>
          <span className="text-sm text-gray-600 capitalize">
            {orchestration.executionPattern.replace('_', ' ')}
          </span>
        </div>

        <div className="bg-white/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-900">Agents Used</span>
          </div>
          <span className="text-sm text-gray-600">
            {orchestration.totalAgentsInvolved} specialized agents
          </span>
        </div>
      </div>

      {orchestration.adaptations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Adaptations Made</h4>
          <div className="space-y-1">
            {orchestration.adaptations.map((adaptation, index) => (
              <div key={index} className="text-xs text-blue-700 bg-blue-100/50 rounded px-2 py-1">
                {adaptation.replace('_', ' ').toLowerCase()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AgentResultsSection({ 
  agentResults, 
  transparencyLevel 
}: { 
  agentResults: AgentExecutionResult[]
  transparencyLevel: 'minimal' | 'standard' | 'detailed'
}) {
  return (
    <div className="space-y-3">
      {agentResults.map((result) => (
        <div key={result.agentName} className="bg-white/50 rounded-lg p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{result.agentIcon}</span>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {result.agentDisplayName}
                </div>
                <div className="text-xs text-gray-600">
                  {result.assignedTask}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">
                {result.executionTimeMs}ms
              </div>
              <div className="text-xs text-green-600">
                {Math.round(result.confidence * 100)}% confidence
              </div>
            </div>
          </div>

          {transparencyLevel !== 'minimal' && result.keyInsights && (
            <div className="mb-2">
              <div className="text-xs font-medium text-gray-700 mb-1">Key Insights:</div>
              <div className="space-y-1">
                {result.keyInsights.map((insight, index) => (
                  <div key={index} className="text-xs text-gray-600">
                    • {insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {transparencyLevel === 'detailed' && result.reasoning && (
            <ReasoningExpansion 
              agentName={result.agentDisplayName}
              reasoning={result.reasoning}
              recommendations={result.recommendationsToOrchestrator}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function MetricsSection({ orchestration }: { orchestration: AgentOrchestrationData }) {
  const metrics = [
    {
      label: 'Planning Time',
      value: `${orchestration.timing.planningTimeMs}ms`,
      description: 'Time to determine strategy'
    },
    {
      label: 'Coordination Overhead',
      value: `${orchestration.timing.coordinationOverheadMs}ms`,
      description: 'Agent management time'
    },
    {
      label: 'Parallel Execution',
      value: `${orchestration.timing.parallelExecutionTimeMs}ms`,
      description: 'Concurrent agent processing'
    },
    {
      label: 'Response Synthesis',
      value: `${orchestration.timing.synthesisTimeMs}ms`,
      description: 'Final response generation'
    }
  ]

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Breakdown</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-white/50 rounded-lg p-3">
              <div className="text-lg font-semibold text-gray-900">
                {metric.value}
              </div>
              <div className="text-xs font-medium text-gray-700">
                {metric.label}
              </div>
              <div className="text-xs text-gray-500">
                {metric.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Quality Metrics</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-green-600">
              {Math.round(orchestration.confidence.overall * 100)}%
            </div>
            <div className="text-xs text-gray-600">Overall Confidence</div>
          </div>
          <div className="bg-white/50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-blue-600">
              {Math.round(orchestration.confidence.agentAgreement * 100)}%
            </div>
            <div className="text-xs text-gray-600">Agent Agreement</div>
          </div>
          <div className="bg-white/50 rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-purple-600">
              {Math.round(orchestration.confidence.responseQuality * 100)}%
            </div>
            <div className="text-xs text-gray-600">Response Quality</div>
          </div>
        </div>
      </div>
    </div>
  )
}
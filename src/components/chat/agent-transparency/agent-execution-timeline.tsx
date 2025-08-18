'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ExecutionStep, AGENT_CONFIG } from '@/lib/types/api-contract'
import { Clock, Zap, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface AgentExecutionTimelineProps {
  executionPlan: ExecutionStep[]
  executionPattern: 'serial' | 'parallel' | 'hybrid' | 'crisis_priority'
  className?: string
}

export function AgentExecutionTimeline({ 
  executionPlan, 
  executionPattern,
  className 
}: AgentExecutionTimelineProps) {
  if (!executionPlan || executionPlan.length === 0) {
    return null
  }

  // Sort steps by start time and step number
  const sortedSteps = [...executionPlan].sort((a, b) => {
    if (a.startTimeMs !== b.startTimeMs) {
      return a.startTimeMs - b.startTimeMs
    }
    return a.stepNumber - b.stepNumber
  })

  // Calculate timeline scale based on total execution time
  const maxEndTime = Math.max(...sortedSteps.map(step => step.startTimeMs + step.durationMs))
  const timeScale = maxEndTime > 0 ? 100 / maxEndTime : 1

  // Group steps by parallel execution
  const groupedSteps = groupParallelSteps(sortedSteps)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Execution Timeline</span>
        </div>
        <div className="text-xs text-gray-500 capitalize">
          {executionPattern.replace('_', ' ')} execution
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="space-y-2">
        {groupedSteps.map((group, groupIndex) => (
          <TimelineGroup 
            key={groupIndex}
            steps={group}
            timeScale={timeScale}
            maxEndTime={maxEndTime}
            isParallel={group.length > 1}
          />
        ))}
      </div>

      {/* Timeline Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 bg-blue-500 rounded" />
          <span>Parallel</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 bg-purple-500 rounded" />
          <span>Serial</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 bg-green-500 rounded" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 bg-red-500 rounded" />
          <span>Error</span>
        </div>
      </div>
    </div>
  )
}

interface TimelineGroupProps {
  steps: ExecutionStep[]
  timeScale: number
  maxEndTime: number
  isParallel: boolean
}

function TimelineGroup({ steps, timeScale, maxEndTime, isParallel }: TimelineGroupProps) {
  return (
    <div className="space-y-1">
      {isParallel && steps.length > 1 && (
        <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">
          <Zap className="h-3 w-3" />
          Parallel execution group
        </div>
      )}
      
      {steps.map((step) => (
        <TimelineStep 
          key={step.stepId}
          step={step}
          timeScale={timeScale}
          maxEndTime={maxEndTime}
          isParallel={isParallel}
        />
      ))}
    </div>
  )
}

interface TimelineStepProps {
  step: ExecutionStep
  timeScale: number
  maxEndTime: number
  isParallel: boolean
}

function TimelineStep({ step, timeScale, maxEndTime, isParallel }: TimelineStepProps) {
  const startPercent = (step.startTimeMs / maxEndTime) * 100
  const widthPercent = (step.durationMs / maxEndTime) * 100

  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      default:
        return <div className="h-3 w-3 rounded-full bg-gray-300" />
    }
  }

  const getStepColor = () => {
    if (step.status === 'error') return 'bg-red-500'
    if (step.status === 'completed') return 'bg-green-500'
    if (step.status === 'running') return 'bg-blue-500'
    
    switch (step.executionType) {
      case 'parallel':
      case 'cached_parallel':
        return 'bg-blue-500'
      case 'serial':
        return 'bg-purple-500'
      case 'crisis_priority':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="relative">
      {/* Step Info */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getStatusIcon()}
          
          {/* Agent Icons */}
          <div className="flex -space-x-1">
            {step.agentsInvolved.map((agentName) => {
              const agentConfig = AGENT_CONFIG[agentName as keyof typeof AGENT_CONFIG]
              return (
                <div 
                  key={agentName}
                  className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs"
                  title={agentConfig?.displayName || agentName}
                >
                  {agentConfig?.icon || '🤖'}
                </div>
              )
            })}
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {step.description}
            </div>
            <div className="text-xs text-gray-500">
              Step {step.stepNumber} • {step.durationMs}ms
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          {step.executionType.replace('_', ' ')}
        </div>
      </div>

      {/* Timeline Bar */}
      <div className="relative h-4 bg-gray-100 rounded-md overflow-hidden">
        {/* Background timeline */}
        <div className="absolute inset-0 bg-gray-100" />
        
        {/* Execution bar */}
        <div 
          className={cn(
            "absolute top-0 h-full rounded-sm transition-all duration-300",
            getStepColor(),
            step.status === 'running' && "animate-pulse"
          )}
          style={{ 
            left: `${startPercent}%`, 
            width: `${Math.max(widthPercent, 2)}%` 
          }}
        >
          {/* Shimmer effect for running steps */}
          {step.status === 'running' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </div>

        {/* Dependencies arrows */}
        {step.dependencies.length > 0 && (
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2">
            <ArrowRight className="h-3 w-3 text-gray-400" />
          </div>
        )}
      </div>

      {/* Error message */}
      {step.status === 'error' && step.errorMessage && (
        <div className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
          {step.errorMessage}
        </div>
      )}
    </div>
  )
}

// Helper function to group parallel steps
function groupParallelSteps(steps: ExecutionStep[]): ExecutionStep[][] {
  const groups: ExecutionStep[][] = []
  const processed = new Set<string>()

  for (const step of steps) {
    if (processed.has(step.stepId)) continue

    // Find all steps that start at the same time (parallel group)
    const parallelSteps = steps.filter(s => 
      !processed.has(s.stepId) && 
      Math.abs(s.startTimeMs - step.startTimeMs) < 50 // 50ms tolerance
    )

    // Add all parallel steps to processed set
    parallelSteps.forEach(s => processed.add(s.stepId))
    
    groups.push(parallelSteps)
  }

  return groups
}

// Add shimmer animation to global CSS
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('timeline-styles')) {
  const style = document.createElement('style')
  style.id = 'timeline-styles'
  style.textContent = shimmerKeyframes
  document.head.appendChild(style)
}
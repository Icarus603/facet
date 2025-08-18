'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { AGENT_NAMES, AGENT_CONFIG, AgentExecutionResult } from '@/lib/types/api-contract'
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface AgentStatus {
  agentName: keyof typeof AGENT_CONFIG
  status: 'pending' | 'running' | 'completed' | 'error'
  progress?: number
  executionTimeMs?: number
  confidence?: number
}

interface AgentStatusBarProps {
  agentStatuses?: AgentStatus[]
  isProcessing: boolean
  totalProcessingTime?: number
  className?: string
}

export function AgentStatusBar({ 
  agentStatuses = [], 
  isProcessing, 
  totalProcessingTime = 0,
  className 
}: AgentStatusBarProps) {
  // Default to show all agents as pending when processing starts
  const defaultAgents: AgentStatus[] = Object.values(AGENT_NAMES).map(agentName => ({
    agentName: agentName as keyof typeof AGENT_CONFIG,
    status: 'pending' as const,
    progress: undefined,
    executionTimeMs: undefined,
    confidence: undefined
  }))

  const displayAgents = agentStatuses.length > 0 ? agentStatuses : 
    (isProcessing ? defaultAgents : [])

  if (!isProcessing && agentStatuses.length === 0) {
    return null
  }

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg p-4 shadow-sm transition-all duration-300",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-900">
            {isProcessing ? 'AI Team Processing...' : 'AI Team Analysis Complete'}
          </div>
          {isProcessing && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
        </div>
        {totalProcessingTime > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            {totalProcessingTime}ms
          </div>
        )}
      </div>

      {/* Agent Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {displayAgents.map((agent) => {
          const agentConfig = AGENT_CONFIG[agent.agentName]
          return (
            <AgentStatusCard
              key={agent.agentName}
              agentName={agent.agentName}
              displayName={agentConfig?.displayName || agent.agentName}
              icon={agentConfig?.icon || '🤖'}
              status={agent.status}
              progress={agent.progress}
              executionTimeMs={agent.executionTimeMs}
              confidence={agent.confidence}
            />
          )
        })}
      </div>

      {/* Overall Progress Bar */}
      {isProcessing && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Overall Progress</span>
            <span>{Math.round((agentStatuses.filter(a => a.status === 'completed').length / displayAgents.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${(agentStatuses.filter(a => a.status === 'completed').length / displayAgents.length) * 100}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface AgentStatusCardProps {
  agentName: string
  displayName: string
  icon: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress?: number
  executionTimeMs?: number
  confidence?: number
}

function AgentStatusCard({
  agentName,
  displayName,
  icon,
  status,
  progress = 0,
  executionTimeMs,
  confidence
}: AgentStatusCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      default:
        return <div className="h-3 w-3 rounded-full bg-gray-300" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'border-blue-200 bg-blue-50'
      case 'completed':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className={cn(
      "border rounded-lg p-3 transition-all duration-300",
      getStatusColor(),
      status === 'running' && "animate-pulse"
    )}>
      {/* Agent Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-900 truncate">
              {displayName}
            </span>
          </div>
        </div>
        {getStatusIcon()}
      </div>

      {/* Progress Bar for Running Status */}
      {status === 'running' && (
        <div className="mb-2">
          <div className="w-full bg-white rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Metrics */}
      {status === 'completed' && (
        <div className="space-y-1">
          {executionTimeMs && (
            <div className="text-xs text-gray-600">
              {executionTimeMs}ms
            </div>
          )}
          {confidence && (
            <div className="flex items-center gap-1">
              <div className="text-xs text-gray-600">
                {Math.round(confidence * 100)}% confidence
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Text */}
      <div className="text-xs text-gray-500 capitalize mt-1">
        {status === 'pending' && 'Queued'}
        {status === 'running' && 'Analyzing...'}
        {status === 'completed' && 'Complete'}
        {status === 'error' && 'Failed'}
      </div>
    </div>
  )
}
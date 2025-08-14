'use client'

import React, { useState, useEffect } from 'react'
import { AgentState, AgentStatusIndicatorProps } from '@/types/agent-coordination'
import { useAgentCoordinationContext } from '@/providers/AgentCoordinationProvider'
import { cn } from '@/lib/utils'

export function AgentStatusIndicator({
  agentId,
  agentType,
  status,
  performance,
  culturalSpecializations = [],
  showDetailedMetrics = false,
  className
}: AgentStatusIndicatorProps) {
  const { coordination } = useAgentCoordinationContext()
  const [isExpanded, setIsExpanded] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState(status)

  // Subscribe to real-time agent updates
  useEffect(() => {
    const unsubscribe = coordination.subscribeToAgent(agentId)
    return unsubscribe
  }, [agentId, coordination])

  // Update status from coordination state
  useEffect(() => {
    const agent = coordination.coordinationState.agents.get(agentId)
    if (agent) {
      setRealtimeStatus(agent.status)
    }
  }, [agentId, coordination.coordinationState.agents])

  const getStatusConfig = (agentStatus: AgentState['status']) => {
    switch (agentStatus) {
      case 'idle':
        return {
          color: 'bg-gray-400',
          pulse: false,
          text: 'Available',
          textColor: 'text-gray-600'
        }
      case 'processing':
        return {
          color: 'bg-blue-500',
          pulse: true,
          text: 'Processing',
          textColor: 'text-blue-600'
        }
      case 'coordinating':
        return {
          color: 'bg-claude-orange',
          pulse: true,
          text: 'Coordinating',
          textColor: 'text-orange-600'
        }
      case 'failed':
        return {
          color: 'bg-red-500',
          pulse: false,
          text: 'Error',
          textColor: 'text-red-600'
        }
      case 'offline':
        return {
          color: 'bg-gray-300',
          pulse: false,
          text: 'Offline',
          textColor: 'text-gray-400'
        }
      default:
        return {
          color: 'bg-gray-400',
          pulse: false,
          text: 'Unknown',
          textColor: 'text-gray-600'
        }
    }
  }

  const statusConfig = getStatusConfig(realtimeStatus)

  const getAgentDisplayName = (type: string): string => {
    const names = {
      intake: 'Intake Coordinator',
      therapy_coordinator: 'Therapy Coordinator',
      cultural_adapter: 'Cultural Guide',
      crisis_monitor: 'Crisis Support',
      progress_tracker: 'Progress Tracker'
    }
    return names[type as keyof typeof names] || type
  }

  const formatResponseTime = (timeMs: number): string => {
    if (timeMs < 1000) return `${Math.round(timeMs)}ms`
    if (timeMs < 60000) return `${(timeMs / 1000).toFixed(1)}s`
    return `${(timeMs / 60000).toFixed(1)}m`
  }

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`
  }

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all duration-200",
      className
    )}>
      {/* Main Status Row */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          {/* Status Indicator */}
          <div className="relative">
            <div className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              statusConfig.color,
              statusConfig.pulse && "animate-pulse"
            )} />
            {statusConfig.pulse && (
              <div className={cn(
                "absolute inset-0 w-3 h-3 rounded-full opacity-30 animate-ping",
                statusConfig.color
              )} />
            )}
          </div>

          {/* Agent Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 text-sm">
                {getAgentDisplayName(agentType)}
              </span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                statusConfig.textColor,
                "bg-gray-50"
              )}>
                {statusConfig.text}
              </span>
            </div>
            
            {/* Cultural Specializations */}
            {culturalSpecializations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {culturalSpecializations.slice(0, 2).map((spec, index) => (
                  <span
                    key={index}
                    className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded"
                  >
                    {spec}
                  </span>
                ))}
                {culturalSpecializations.length > 2 && (
                  <span className="text-xs text-gray-500">
                    +{culturalSpecializations.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <div className="text-right">
            <div>{formatResponseTime(performance.averageResponseTime)}</div>
            <div className="text-gray-400">avg response</div>
          </div>
          <div className="text-right">
            <div>{formatPercentage(performance.successRate)}</div>
            <div className="text-gray-400">success</div>
          </div>
          {showDetailedMetrics && (
            <button className="text-gray-400 hover:text-gray-600">
              <svg className={cn(
                "w-4 h-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Metrics */}
      {isExpanded && showDetailedMetrics && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            {/* Performance Metrics */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Success Rate</span>
                  <span className="font-medium">{formatPercentage(performance.successRate)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Avg Response</span>
                  <span className="font-medium">{formatResponseTime(performance.averageResponseTime)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total Processed</span>
                  <span className="font-medium">{performance.totalProcessed.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Cultural Accuracy */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Cultural Competency</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Accuracy</span>
                  <span className="font-medium">{formatPercentage(performance.culturalAccuracy)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Specializations</span>
                  <span className="font-medium">{culturalSpecializations.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Last Health Check</span>
                  <span className="font-medium">
                    {new Date(performance.lastHealthCheck).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cultural Specializations (Full List) */}
          {culturalSpecializations.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Cultural Specializations</h4>
              <div className="flex flex-wrap gap-1">
                {culturalSpecializations.map((spec, index) => (
                  <span
                    key={index}
                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Performance Trend Indicator */}
          <div className="mt-3 pt-2 border-t border-gray-50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Performance Trend</span>
              <div className="flex items-center space-x-1">
                {performance.successRate > 0.9 ? (
                  <>
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-600 font-medium">Excellent</span>
                  </>
                ) : performance.successRate > 0.7 ? (
                  <>
                    <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-600 font-medium">Good</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-600 font-medium">Needs Attention</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
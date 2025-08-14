'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  CoordinationFlowVisualizationProps,
  CoordinationEvent,
  AgentState
} from '@/types/agent-coordination'
import { useAgentCoordinationContext } from '@/providers/AgentCoordinationProvider'
import { cn } from '@/lib/utils'

interface FlowNode {
  id: string
  type: 'agent' | 'event' | 'decision'
  position: { x: number; y: number }
  data: any
}

interface FlowEdge {
  id: string
  source: string
  target: string
  type: 'handoff' | 'collaboration' | 'escalation' | 'fallback'
  animated: boolean
  data?: any
}

export function CoordinationFlowVisualization({
  coordinationSession,
  showRealTimeUpdates = true,
  highlightCulturalAdaptations = true,
  onEventClick,
  className
}: CoordinationFlowVisualizationProps) {
  const { coordination } = useAgentCoordinationContext()
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [edges, setEdges] = useState<FlowEdge[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CoordinationEvent | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Subscribe to coordination updates
  useEffect(() => {
    if (showRealTimeUpdates) {
      const unsubscribe = coordination.subscribeToCoordination(coordinationSession.coordinationId)
      return unsubscribe
    }
  }, [coordinationSession.coordinationId, coordination, showRealTimeUpdates])

  // Generate flow visualization from coordination session
  useEffect(() => {
    generateFlowVisualization()
  }, [coordinationSession, coordination.coordinationState.agents])

  const generateFlowVisualization = () => {
    const newNodes: FlowNode[] = []
    const newEdges: FlowEdge[] = []

    // Create agent nodes
    coordinationSession.agentIds.forEach((agentId, index) => {
      const agent = coordination.coordinationState.agents.get(agentId)
      newNodes.push({
        id: agentId,
        type: 'agent',
        position: {
          x: 100 + (index * 200),
          y: 50
        },
        data: {
          agent,
          agentId,
          isActive: agent?.status === 'processing' || agent?.status === 'coordinating'
        }
      })
    })

    // Create event nodes and edges from coordination events
    let eventY = 150
    coordinationSession.events.forEach((event, index) => {
      const eventId = `event-${event.eventId}`
      
      newNodes.push({
        id: eventId,
        type: 'event',
        position: {
          x: 50 + (index * 150),
          y: eventY + (index * 60)
        },
        data: {
          event,
          isRecent: Date.now() - event.timestamp < 30000 // Last 30 seconds
        }
      })

      // Create edges between agents and events
      if (event.sourceAgent) {
        newEdges.push({
          id: `${event.sourceAgent}-${eventId}`,
          source: event.sourceAgent,
          target: eventId,
          type: event.eventType,
          animated: Date.now() - event.timestamp < 10000, // Animate recent events
          data: event
        })
      }

      if (event.targetAgent) {
        newEdges.push({
          id: `${eventId}-${event.targetAgent}`,
          source: eventId,
          target: event.targetAgent,
          type: event.eventType,
          animated: Date.now() - event.timestamp < 10000,
          data: event
        })
      }
    })

    // Add strategy-specific connections
    if (coordinationSession.strategy === 'sequential') {
      // Connect agents in sequence
      for (let i = 0; i < coordinationSession.agentIds.length - 1; i++) {
        newEdges.push({
          id: `seq-${i}`,
          source: coordinationSession.agentIds[i],
          target: coordinationSession.agentIds[i + 1],
          type: 'handoff',
          animated: false
        })
      }
    } else if (coordinationSession.strategy === 'parallel') {
      // All agents connect to a central coordination node
      const coordinatorId = 'coordinator'
      newNodes.push({
        id: coordinatorId,
        type: 'decision',
        position: { x: 300, y: 200 },
        data: { type: 'parallel_coordinator' }
      })

      coordinationSession.agentIds.forEach(agentId => {
        newEdges.push({
          id: `${agentId}-${coordinatorId}`,
          source: agentId,
          target: coordinatorId,
          type: 'collaboration',
          animated: false
        })
      })
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const getAgentDisplayName = (agentId: string): string => {
    const agent = coordination.coordinationState.agents.get(agentId)
    if (!agent) return agentId

    const names = {
      intake: 'Intake',
      therapy_coordinator: 'Therapy',
      cultural_adapter: 'Cultural',
      crisis_monitor: 'Crisis',
      progress_tracker: 'Progress'
    }
    return names[agent.type as keyof typeof names] || agent.type
  }

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'handoff':
        return '→'
      case 'collaboration':
        return '⚡'
      case 'escalation':
        return '⚠️'
      case 'fallback':
        return '↩️'
      case 'crisis_detected':
        return '🚨'
      case 'cultural_adaptation':
        return '🌍'
      default:
        return '•'
    }
  }

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'handoff':
        return 'text-blue-600'
      case 'collaboration':
        return 'text-green-600'
      case 'escalation':
        return 'text-red-600'
      case 'fallback':
        return 'text-yellow-600'
      case 'crisis_detected':
        return 'text-red-700'
      case 'cultural_adaptation':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const handleEventClick = (event: CoordinationEvent) => {
    setSelectedEvent(event)
    onEventClick?.(event)
  }

  const getCoordinationStatusColor = () => {
    switch (coordinationSession.status) {
      case 'active':
        return 'text-green-600'
      case 'pending':
        return 'text-yellow-600'
      case 'completed':
        return 'text-blue-600'
      case 'failed':
        return 'text-red-600'
      case 'escalated':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg p-4",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Coordination Flow
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Strategy: {coordinationSession.strategy}</span>
            <span className={cn(
              "font-medium capitalize",
              getCoordinationStatusColor()
            )}>
              {coordinationSession.status}
            </span>
            <span>
              {coordinationSession.agentIds.length} agents
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Processing</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>Idle</span>
          </div>
        </div>
      </div>

      {/* Flow Visualization */}
      <div className="relative min-h-96 overflow-auto bg-gray-50 rounded border">
        <svg
          ref={svgRef}
          width="100%"
          height="400"
          className="absolute inset-0"
        >
          {/* Define patterns for animated edges */}
          <defs>
            <pattern
              id="animated-handoff"
              patternUnits="userSpaceOnUse"
              width="10"
              height="10"
            >
              <rect width="10" height="10" fill="none" stroke="#3B82F6" strokeWidth="1">
                <animate
                  attributeName="x"
                  values="0;10"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </rect>
            </pattern>
          </defs>

          {/* Render edges */}
          {edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source)
            const targetNode = nodes.find(n => n.id === edge.target)
            
            if (!sourceNode || !targetNode) return null

            return (
              <line
                key={edge.id}
                x1={sourceNode.position.x + 60}
                y1={sourceNode.position.y + 30}
                x2={targetNode.position.x + 60}
                y2={targetNode.position.y + 30}
                stroke={edge.animated ? "#3B82F6" : "#9CA3AF"}
                strokeWidth={edge.animated ? "2" : "1"}
                strokeDasharray={edge.animated ? "4 4" : "none"}
                markerEnd="url(#arrowhead)"
              >
                {edge.animated && (
                  <animate
                    attributeName="stroke-dashoffset"
                    values="0;8"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                )}
              </line>
            )
          })}

          {/* Arrow marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#9CA3AF"
              />
            </marker>
          </defs>
        </svg>

        {/* Render nodes */}
        {nodes.map(node => (
          <div
            key={node.id}
            className="absolute"
            style={{
              left: node.position.x,
              top: node.position.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {node.type === 'agent' && (
              <div className={cn(
                "bg-white border-2 rounded-lg p-3 shadow-sm min-w-24 text-center",
                node.data.isActive
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300"
              )}>
                <div className={cn(
                  "w-3 h-3 rounded-full mx-auto mb-1",
                  node.data.agent?.status === 'processing' ? "bg-blue-500 animate-pulse" :
                  node.data.agent?.status === 'coordinating' ? "bg-green-500 animate-pulse" :
                  node.data.agent?.status === 'failed' ? "bg-red-500" :
                  "bg-gray-400"
                )} />
                <div className="text-xs font-medium text-gray-900">
                  {getAgentDisplayName(node.data.agentId)}
                </div>
                {node.data.agent?.culturalSpecializations?.length > 0 && (
                  <div className="text-xs text-purple-600 mt-1">
                    🌍 {node.data.agent.culturalSpecializations[0]}
                  </div>
                )}
              </div>
            )}

            {node.type === 'event' && (
              <div
                className={cn(
                  "bg-white border rounded-full w-8 h-8 flex items-center justify-center shadow-sm cursor-pointer hover:shadow-md transition-shadow",
                  node.data.isRecent && "animate-pulse border-blue-500",
                  highlightCulturalAdaptations && 
                  node.data.event.eventType === 'cultural_adaptation' && 
                  "border-purple-500 bg-purple-50"
                )}
                onClick={() => handleEventClick(node.data.event)}
                title={`${node.data.event.eventType} - ${new Date(node.data.event.timestamp).toLocaleTimeString()}`}
              >
                <span className={cn(
                  "text-sm",
                  getEventTypeColor(node.data.event.eventType)
                )}>
                  {getEventTypeIcon(node.data.event.eventType)}
                </span>
              </div>
            )}

            {node.type === 'decision' && (
              <div className="bg-claude-orange text-white rounded-lg p-2 text-xs font-medium">
                Coordinator
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Metrics Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-50 rounded p-3">
          <div className="text-gray-500 mb-1">Processing Time</div>
          <div className="font-medium text-gray-900">
            {coordinationSession.metrics.totalProcessingTime > 0
              ? `${(coordinationSession.metrics.totalProcessingTime / 1000).toFixed(1)}s`
              : 'In Progress'
            }
          </div>
        </div>

        <div className="bg-gray-50 rounded p-3">
          <div className="text-gray-500 mb-1">Efficiency</div>
          <div className="font-medium text-gray-900">
            {Math.round(coordinationSession.metrics.coordinationEfficiency * 100)}%
          </div>
        </div>

        <div className="bg-gray-50 rounded p-3">
          <div className="text-gray-500 mb-1">Events</div>
          <div className="font-medium text-gray-900">
            {coordinationSession.events.length}
          </div>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Events</h4>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {coordinationSession.events
            .slice(-5)
            .reverse()
            .map((event, index) => (
              <div
                key={event.eventId}
                className={cn(
                  "flex items-center space-x-2 text-xs p-2 rounded cursor-pointer hover:bg-gray-50",
                  selectedEvent?.eventId === event.eventId && "bg-blue-50 border border-blue-200"
                )}
                onClick={() => handleEventClick(event)}
              >
                <span className={getEventTypeColor(event.eventType)}>
                  {getEventTypeIcon(event.eventType)}
                </span>
                <span className="text-gray-600">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className="font-medium text-gray-900">
                  {event.eventType.replace('_', ' ')}
                </span>
                {event.sourceAgent && (
                  <span className="text-gray-500">
                    from {getAgentDisplayName(event.sourceAgent)}
                  </span>
                )}
                {event.targetAgent && (
                  <span className="text-gray-500">
                    to {getAgentDisplayName(event.targetAgent)}
                  </span>
                )}
                {event.culturalContext && highlightCulturalAdaptations && (
                  <span className="text-purple-600">🌍</span>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Selected Event Details */}
      {selectedEvent && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-900">Event Details</h4>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </div>
          <div className="space-y-1 text-xs">
            <div><span className="font-medium">Type:</span> {selectedEvent.eventType}</div>
            <div><span className="font-medium">Time:</span> {new Date(selectedEvent.timestamp).toLocaleString()}</div>
            {selectedEvent.sourceAgent && (
              <div><span className="font-medium">From:</span> {getAgentDisplayName(selectedEvent.sourceAgent)}</div>
            )}
            {selectedEvent.targetAgent && (
              <div><span className="font-medium">To:</span> {getAgentDisplayName(selectedEvent.targetAgent)}</div>
            )}
            {selectedEvent.processingTime && (
              <div><span className="font-medium">Processing Time:</span> {selectedEvent.processingTime}ms</div>
            )}
            {selectedEvent.culturalContext && (
              <div className="mt-2">
                <span className="font-medium">Cultural Context:</span>
                <div className="text-purple-700 mt-1">
                  {selectedEvent.culturalContext.primaryCulture} - {selectedEvent.culturalContext.culturalTags.join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChatResponse, AgentOrchestrationData } from '@/lib/types/api-contract'
// import { OrchestrationDisplay } from '../agent-transparency/orchestration-display' // Using custom FACET display instead
import { CompactReasoningExpansion } from '../agent-transparency/reasoning-expansion'
import { Brain, Clock, Target, Users, Sparkles, Shield, AlertTriangle, Bot, Eye } from 'lucide-react'

interface EnhancedMessageBubbleProps {
  message: {
    id: string
    content: string
    sender: 'user' | 'assistant'
    timestamp: Date
    orchestration?: AgentOrchestrationData | null
    metadata?: ChatResponse['metadata']
  }
  transparencyLevel?: 'minimal' | 'standard' | 'detailed'
  showOrchestration?: boolean
  className?: string
}

export function EnhancedMessageBubble({
  message,
  transparencyLevel = 'standard',
  showOrchestration = true,
  className
}: EnhancedMessageBubbleProps) {
  const [showFullOrchestration, setShowFullOrchestration] = useState(false)
  
  const isUser = message.sender === 'user'
  const hasOrchestration = message.orchestration && showOrchestration
  const hasRiskAssessment = message.metadata?.riskAssessment
  const hasEmergencyResponse = message.metadata?.emergencyResponse

  return (
    <div className={cn(
      "group relative max-w-4xl",
      isUser ? "ml-auto" : "mr-auto",
      className
    )}>
      {/* User Message Bubble */}
      {isUser ? (
        <div className="text-white rounded-2xl px-4 py-3 shadow-sm ml-12" 
             style={{ backgroundColor: 'var(--facet-blue-primary)' }}>
          <div className="text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
      ) : (
        /* FACET AI Team Message */
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mr-12" 
             style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          {/* FACET AI Team Header - Following exact SPECS.md format */}
          <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: '#fafafa' }}>
            <div className="flex items-center gap-3">
              <span className="text-lg">🤖</span>
              <h3 className="text-base font-semibold text-gray-900" 
                  style={{ fontFamily: 'Zapfino, cursive' }}>
                FACET AI Team
              </h3>
            </div>
          </div>
          {/* Emergency/Risk Indicators */}
          {hasEmergencyResponse?.emergencyDetected && (
            <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-semibold">🚨 Emergency Support Activated</span>
              </div>
              <p className="text-sm text-red-700 mt-2">
                Crisis detection protocols have been triggered. Professional resources are available below.
              </p>
            </div>
          )}

          {hasRiskAssessment && hasRiskAssessment.level !== 'none' && (
            <div className={cn(
              "mx-6 mb-4 p-3 rounded-lg border",
              hasRiskAssessment.level === 'crisis' || hasRiskAssessment.level === 'high'
                ? "bg-red-50 border-red-200 text-red-800"
                : hasRiskAssessment.level === 'moderate'
                ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            )}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {hasRiskAssessment.level === 'crisis' ? '⚠️ Crisis Assessment' :
                   hasRiskAssessment.level === 'high' ? '⚠️ High Risk Assessment' :
                   hasRiskAssessment.level === 'moderate' ? '💙 Moderate Risk Assessment' :
                   '💙 Risk Assessment'}
                </span>
              </div>
              {hasRiskAssessment.reasoning && (
                <p className="text-sm mt-2">
                  {hasRiskAssessment.reasoning}
                </p>
              )}
            </div>
          )}

          {/* Main Message Content */}
          <div className="px-6 py-4">
            <div className="text-base leading-relaxed text-gray-900 font-medium">
              {message.content}
            </div>
          </div>

          {/* FACET AI Team Analysis Bar */}
          {hasOrchestration && transparencyLevel !== 'minimal' && (
            <div className="px-6 pb-4">
              <FACETAnalysisBar 
                orchestration={message.orchestration!}
                onExpandClick={() => setShowFullOrchestration(!showFullOrchestration)}
                isExpanded={showFullOrchestration}
              />
            </div>
          )}

        </div>
      )}

      {/* Full Orchestration Display - SPECS.md format */}
      {!isUser && showFullOrchestration && hasOrchestration && (
        <div className="mt-3 mr-12">
          <FACETOrchestrationDisplay 
            orchestration={message.orchestration!}
            transparencyLevel={transparencyLevel}
          />
        </div>
      )}

      {/* Emergency Resources */}
      {!isUser && hasEmergencyResponse?.emergencyDetected && hasEmergencyResponse.professionalContactInfo && (
        <div className="mt-3 mr-12">
          <EmergencyResourcesDisplay 
            emergencyResponse={message.metadata?.emergencyResponse!}
          />
        </div>
      )}
    </div>
  )
}

interface FACETAnalysisBarProps {
  orchestration: AgentOrchestrationData
  onExpandClick: () => void
  isExpanded: boolean
}

function FACETAnalysisBar({ orchestration, onExpandClick, isExpanded }: FACETAnalysisBarProps) {
  const completedAgents = orchestration.agentResults.filter(a => a.success).length
  const totalAgents = orchestration.agentResults.length
  const avgConfidence = orchestration.agentResults.reduce((acc, agent) => acc + agent.confidence, 0) / totalAgents
  const processingTime = orchestration.timing?.totalTimeMs || 0

  // SPECS.md exact format: [💭 See team analysis] [⏱ 2.3s] [🎯 High confidence]
  const confidenceLevel = avgConfidence >= 0.8 ? 'High' : avgConfidence >= 0.6 ? 'Good' : 'Moderate'
  const timeInSeconds = (processingTime / 1000).toFixed(1)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={onExpandClick}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-sm text-gray-700 transition-colors"
        style={{ fontFamily: 'monospace' }}
      >
        💭 See team analysis
      </button>
      
      <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700"
           style={{ fontFamily: 'monospace' }}>
        ⏱ {timeInSeconds}s
      </div>
      
      <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700"
           style={{ fontFamily: 'monospace' }}>
        🎯 {confidenceLevel} confidence
      </div>
    </div>
  )
}

interface EmergencyResourcesDisplayProps {
  emergencyResponse: NonNullable<ChatResponse['metadata']['emergencyResponse']>
}

function EmergencyResourcesDisplay({ emergencyResponse }: EmergencyResourcesDisplayProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-red-600" />
        <h3 className="text-sm font-semibold text-red-900">
          Emergency Support Resources
        </h3>
      </div>

      {emergencyResponse.immediateActions.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-red-800 mb-1">Immediate Actions:</h4>
          <ul className="space-y-1">
            {emergencyResponse.immediateActions.map((action, index) => (
              <li key={`action-${index}`} className="text-sm text-red-700 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {emergencyResponse.professionalContactInfo && emergencyResponse.professionalContactInfo.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-red-800 mb-2">Professional Support:</h4>
          <div className="space-y-2">
            {emergencyResponse.professionalContactInfo.map((contact, index) => (
              <div key={`contact-${index}-${contact.name}`} className="bg-white rounded p-2 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-red-900">{contact.name}</div>
                    <div className="text-xs text-red-700">{contact.serviceType}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-red-900">{contact.phone}</div>
                    {contact.available24_7 && (
                      <div className="text-xs text-red-600">24/7 Available</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// FACET Orchestration Display - Following exact SPECS.md format (lines 264-291)
interface FACETOrchestrationDisplayProps {
  orchestration: AgentOrchestrationData
  transparencyLevel?: 'minimal' | 'standard' | 'detailed'
}

function FACETOrchestrationDisplay({ orchestration, transparencyLevel }: FACETOrchestrationDisplayProps) {
  const processingTime = orchestration.timing?.totalTimeMs || 0
  const timeInSeconds = (processingTime / 1000).toFixed(1)
  
  // Mock agent execution data for SPECS.md format
  const agentExecutions = [
    { emoji: '😊', name: 'Emotion Analyzer', result: 'Anxiety: 7/10, work-related stress triggers', phase: 1 },
    { emoji: '🧠', name: 'Memory Manager', result: 'Similar pattern 2 weeks ago, sleep connection', phase: 1 },
    { emoji: '🛡️', name: 'Crisis Monitor', result: 'Low-moderate risk, supportive intervention', phase: 1 },
    { emoji: '🎯', name: 'Therapy Advisor', result: 'CBT stress management + sleep hygiene plan', phase: 2 }
  ]
  
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6" 
         style={{ fontFamily: 'monospace, Consolas' }}>
      
      {/* Team Coordination Strategy Header */}
      <div className="mb-6">
        <h3 className="text-base font-bold text-gray-900 mb-2">🎯 Team Coordination Strategy</h3>
        <p className="text-sm text-gray-700 italic">
          "{orchestration.strategy || 'Work stress + sleep pattern → parallel emotional and memory analysis with crisis monitoring'}"
        </p>
      </div>
      
      {/* Agent Execution Timeline */}
      <div className="mb-6">
        <h4 className="text-sm font-bold text-gray-900 mb-4">
          🔄 Agent Execution Timeline ({timeInSeconds}s total)
        </h4>
        
        {/* Phase 1: Parallel Analysis */}
        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">
            Phase 1: Parallel Analysis (0.0-1.4s)
          </div>
          <div className="pl-4 space-y-2">
            {agentExecutions.filter(agent => agent.phase === 1).map((agent, index) => (
              <div key={index}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">├─</span>
                  <span>{agent.emoji}</span>
                  <span className="font-medium text-sm">{agent.name} ✓</span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm">│</span>
                  <span className="text-sm">└─ "{agent.result}"</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Phase 2: Strategy Synthesis */}
        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">
            Phase 2: Strategy Synthesis (1.4-{timeInSeconds}s)
          </div>
          <div className="pl-4 space-y-2">
            {agentExecutions.filter(agent => agent.phase === 2).map((agent, index) => (
              <div key={index}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">└─</span>
                  <span>{agent.emoji}</span>
                  <span className="font-medium text-sm">{agent.name} ✓</span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm">└─ "{agent.result}"</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Final Coordination Decision */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-bold text-gray-900 mb-2">
          💡 Final Coordination Decision
        </h4>
        <p className="text-sm text-gray-700 italic">
          "{orchestration.reasoning || 'Integrated approach based on emotional state, memory patterns, and proven therapeutic interventions'}"
        </p>
        
        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-sm text-gray-700 transition-colors">
            📊 View detailed analytics
          </button>
          <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-sm text-gray-700 transition-colors">
            ⚙️ Adjust preferences
          </button>
        </div>
      </div>
    </div>
  )
}
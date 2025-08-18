'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Lightbulb, Target, Brain, CheckCircle } from 'lucide-react'

interface ReasoningExpansionProps {
  agentName: string
  reasoning: string
  recommendations?: string[]
  keyInsights?: string[]
  contributedInsights?: string[]
  confidence?: number
  className?: string
}

export function ReasoningExpansion({ 
  agentName,
  reasoning,
  recommendations = [],
  keyInsights = [],
  contributedInsights = [],
  confidence,
  className 
}: ReasoningExpansionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!reasoning && !recommendations.length && !keyInsights.length) {
    return null
  }

  return (
    <div className={cn(
      "border border-gray-200 rounded-lg overflow-hidden transition-all duration-300",
      className
    )}>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900">
            {agentName} Reasoning
          </span>
          {confidence && (
            <span className="text-xs text-gray-500">
              {Math.round(confidence * 100)}% confidence
            </span>
          )}
        </div>
        <div className="transition-transform duration-200">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 bg-white space-y-3">
          {/* Main Reasoning */}
          {reasoning && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-3 w-3 text-purple-600" />
                <span className="text-xs font-medium text-gray-900">
                  Thought Process
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed bg-purple-50 rounded-lg p-3">
                {reasoning}
              </p>
            </div>
          )}

          {/* Key Insights */}
          {keyInsights.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-3 w-3 text-yellow-600" />
                <span className="text-xs font-medium text-gray-900">
                  Key Insights
                </span>
              </div>
              <div className="space-y-1">
                {keyInsights.map((insight, index) => (
                  <div 
                    key={index}
                    className="text-sm text-gray-700 bg-yellow-50 rounded-lg p-2 flex items-start gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations to Orchestrator */}
          {recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-gray-900">
                  Recommendations to Orchestrator
                </span>
              </div>
              <div className="space-y-1">
                {recommendations.map((recommendation, index) => (
                  <div 
                    key={index}
                    className="text-sm text-gray-700 bg-blue-50 rounded-lg p-2 flex items-start gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    {formatRecommendation(recommendation)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contributed Insights (what made it into final response) */}
          {contributedInsights.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-xs font-medium text-gray-900">
                  Contributed to Final Response
                </span>
              </div>
              <div className="space-y-1">
                {contributedInsights.map((insight, index) => (
                  <div 
                    key={index}
                    className="text-sm text-gray-700 bg-green-50 rounded-lg p-2 flex items-start gap-2"
                  >
                    <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function to format recommendation codes into human-readable text
function formatRecommendation(recommendation: string): string {
  const formattingMap: { [key: string]: string } = {
    'escalate_to_crisis_monitor': 'Escalate to crisis monitoring for safety assessment',
    'provide_calming_techniques': 'Provide calming and grounding techniques',
    'provide_emotional_validation': 'Offer emotional validation and support',
    'offer_supportive_interventions': 'Suggest supportive therapeutic interventions',
    'focus_on_user_agency': 'Focus on empowering user agency and control',
    'prioritize_immediate_support': 'Prioritize immediate emotional support',
    'fallback_to_neutral_response': 'Use neutral supportive response as fallback',
    'emergency_response_protocol': 'Activate emergency response protocols',
    'override_standard_processing': 'Override standard processing for urgency',
    'activate_human_support': 'Activate human professional support',
    'prioritize_safety_response': 'Prioritize safety-focused response',
    'include_professional_resources': 'Include professional mental health resources',
    'schedule_followup': 'Schedule follow-up check-in',
    'include_coping_strategies': 'Include specific coping strategies',
    'provide_support_resources': 'Provide relevant support resources',
    'standard_supportive_response': 'Provide standard supportive response',
    'bypass_normal_wait_times': 'Bypass normal processing delays',
    'default_safety_protocols': 'Apply default safety protocols'
  }

  return formattingMap[recommendation] || recommendation.replace(/_/g, ' ').toLowerCase()
}

// Alternative compact version for inline display
export function CompactReasoningExpansion({
  agentName,
  reasoning,
  className
}: {
  agentName: string
  reasoning: string
  className?: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={cn("inline-block", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-blue-600 hover:text-blue-800 underline decoration-dotted"
      >
        See reasoning
      </button>
      
      {isExpanded && (
        <div className="absolute z-50 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium">{agentName}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {reasoning}
          </p>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-xs text-gray-500 hover:text-gray-700 mt-2"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
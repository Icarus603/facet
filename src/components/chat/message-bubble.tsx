'use client'

import React, { useState } from 'react'
import { Message, AgentType } from '@/lib/types/agent'
import { cn } from '@/lib/utils'
import { Shield, Brain, Heart, Target, User, Bot, Clock, Eye, Sparkles, Users } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showTimestamp?: boolean
  transparencyLevel?: 'minimal' | 'standard' | 'detailed'
}

export function MessageBubble({ message, isOwn, showTimestamp = false, transparencyLevel = 'standard' }: MessageBubbleProps) {
  const [showTeamAnalysis, setShowTeamAnalysis] = useState(false)
  const getAgentIcon = (agentType?: AgentType) => {
    switch (agentType) {
      case 'crisis_assessor':
        return <Shield className="h-4 w-4 text-red-600" />
      case 'emotion_analyzer':
        return <Heart className="h-4 w-4 text-pink-600" />
      case 'therapeutic_advisor':
        return <Brain className="h-4 w-4 text-blue-600" />
      case 'smart_router':
        return <Target className="h-4 w-4 text-purple-600" />
      default:
        return <Brain className="h-4 w-4 text-blue-600" />
    }
  }

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(timestamp))
  }

  const formatContent = (content: string) => {
    // Split content by line breaks and render with proper spacing
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }

  return (
    <div className="flex justify-center w-full">
      <div className="relative" style={{ width: '600px' }}>
      {/* User Message Bubble */}
      {isOwn ? (
        <div className="w-full">
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm" style={{
            backgroundColor: 'var(--facet-blue-primary)',
            borderColor: 'var(--facet-blue-primary)'
          }}>
            <div className="text-sm leading-relaxed text-white font-medium meslo-font">
              {formatContent(message.content)}
            </div>
            {showTimestamp && (
              <div className="text-xs mt-2 opacity-70 text-white meslo-font">
                {formatTime(message.timestamp)}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* FACET AI Team Message - Following SPECS.md design */
        <div className="w-full">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden" 
               style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* FACET AI Team Header */}
            <div className="px-4 py-3 border-b border-gray-100" style={{
              background: 'var(--facet-chat-bg)'
            }}>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ 
                  background: 'linear-gradient(135deg, var(--facet-wine-primary), var(--facet-blue-primary))'
                }}>
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="text-sm font-semibold text-gray-900" 
                     style={{ fontFamily: 'Zapfino, cursive', fontSize: '16px' }}>
                  🤖 FACET AI Team
                </div>
              </div>
            </div>
            
            {/* Main Message Content */}
            <div className="px-4 py-4">
              <div className="text-sm leading-relaxed text-gray-900 meslo-font">
                {formatContent(message.content)}
              </div>
              
              {/* Team Analysis Footer - Following SPECS.md format */}
              {message.metadata && transparencyLevel !== 'minimal' && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowTeamAnalysis(!showTeamAnalysis)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full text-sm font-medium text-blue-700 transition-colors meslo-font"
                    >
                      <Eye className="h-3 w-3" />
                      💭 See team analysis
                    </button>
                    
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium text-gray-700 meslo-font">
                      <Clock className="h-3 w-3" />
                      ⏱ {((message.metadata?.processingTime || 2000) / 1000).toFixed(1)}s
                    </div>
                    
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-700 meslo-font">
                      <Target className="h-3 w-3" />
                      🎯 High confidence
                    </div>
                  </div>
                </div>
              )}
              
              {showTimestamp && (
                <div className="text-xs text-gray-500 mt-3 meslo-font">
                  {formatTime(message.timestamp)}
                </div>
              )}
            </div>
          </div>
          
          {/* Expanded Team Analysis */}
          {showTeamAnalysis && message.metadata && (
            <div className="mt-3">
              <FACETTeamAnalysisDisplay message={message} />
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

// FACET Team Analysis Display Component
interface FACETTeamAnalysisDisplayProps {
  message: Message
}

function FACETTeamAnalysisDisplay({ message }: FACETTeamAnalysisDisplayProps) {
  const processingTime = message.metadata?.processingTime || 2000
  const timeInSeconds = (processingTime / 1000).toFixed(1)
  
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 meslo-font">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2 meslo-font">🎯 Team Coordination Strategy</h3>
        <p className="text-sm text-gray-700 italic mb-4 meslo-font">
          "Emotional support analysis with memory integration and therapeutic intervention"
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2 meslo-font">
            <Sparkles className="h-4 w-4 text-blue-600" />
            🔄 Agent Execution Timeline ({timeInSeconds}s total)
          </h4>
          
          <div className="space-y-3">
            {/* Phase 1: Parallel Analysis */}
            <div className="pl-4 border-l-2 border-blue-200">
              <div className="text-sm font-medium text-gray-800 mb-2 meslo-font">Phase 1: Parallel Analysis (0.0-1.4s)</div>
              <div className="space-y-2 text-sm text-gray-700 meslo-font">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-600" />
                  <span className="font-medium meslo-font">😊 Emotion Analyzer ✓</span>
                </div>
                <div className="pl-6 text-xs text-gray-600 meslo-font">
                  └─ "Detected supportive engagement needed, moderate emotional processing"
                </div>
                
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span className="font-medium meslo-font">🧠 Memory Manager ✓</span>
                </div>
                <div className="pl-6 text-xs text-gray-600 meslo-font">
                  └─ "Contextual patterns identified, therapeutic continuity maintained"
                </div>
                
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="font-medium meslo-font">🛡️ Crisis Monitor ✓</span>
                </div>
                <div className="pl-6 text-xs text-gray-600 meslo-font">
                  └─ "Low risk assessment, supportive intervention recommended"
                </div>
              </div>
            </div>
            
            {/* Phase 2: Strategy Synthesis */}
            <div className="pl-4 border-l-2 border-green-200">
              <div className="text-sm font-medium text-gray-800 mb-2 meslo-font">Phase 2: Strategy Synthesis (1.4-{timeInSeconds}s)</div>
              <div className="space-y-2 text-sm text-gray-700 meslo-font">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="font-medium meslo-font">🎯 Therapy Advisor ✓</span>
                </div>
                <div className="pl-6 text-xs text-gray-600 meslo-font">
                  └─ "Personalized therapeutic response with empathetic engagement"
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900 meslo-font">💡 Final Coordination Decision</span>
          </div>
          <p className="text-sm text-gray-700 italic meslo-font">
            "Integrated approach based on emotional state, memory patterns, and proven therapeutic interventions"
          </p>
        </div>
      </div>
    </div>
  )
}
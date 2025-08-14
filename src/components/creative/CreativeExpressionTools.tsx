"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BookOpenIcon,
  ChartBarIcon,
  SwatchIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

import { TherapeuticJournal, MoodMapping, ArtTherapyCanvas } from './index'

interface CreativeInsight {
  type: 'journal' | 'mood' | 'art'
  content: string[]
  timestamp: string
  cultural_themes?: string[]
}

interface AgentFeedback {
  agent_type: string
  feedback: string
  cultural_content?: string
  therapeutic_suggestion?: string
}

interface CreativeExpressionToolsProps {
  sessionId?: string
  userId: string
  onAgentFeedback?: (feedback: AgentFeedback) => void
}

export default function CreativeExpressionTools({
  sessionId,
  userId,
  onAgentFeedback
}: CreativeExpressionToolsProps) {
  const [activeTab, setActiveTab] = useState('journal')
  const [insights, setInsights] = useState<CreativeInsight[]>([])
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false)
  const [agentFeedback, setAgentFeedback] = useState<AgentFeedback[]>([])

  useEffect(() => {
    loadRecentInsights()
  }, [userId])

  const loadRecentInsights = async () => {
    try {
      const response = await fetch(`/api/creative/insights?user_id=${userId}&limit=10`)
      if (response.ok) {
        const recentInsights = await response.json()
        setInsights(recentInsights)
      }
    } catch (error) {
      console.error('Failed to load recent insights:', error)
    }
  }

  const handleInsightGenerated = async (newInsights: string[], type: 'journal' | 'mood' | 'art') => {
    const insight: CreativeInsight = {
      type,
      content: newInsights,
      timestamp: new Date().toISOString()
    }

    setInsights(prev => [insight, ...prev.slice(0, 9)])

    // Send insights to therapeutic agents for feedback
    await requestAgentFeedback(insight)
  }

  const requestAgentFeedback = async (insight: CreativeInsight) => {
    setIsProcessingFeedback(true)
    
    try {
      const response = await fetch('/api/agents/creative-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insight,
          session_id: sessionId,
          user_id: userId
        })
      })

      if (response.ok) {
        const feedback = await response.json()
        setAgentFeedback(prev => [feedback, ...prev.slice(0, 4)])
        onAgentFeedback?.(feedback)
      }
    } catch (error) {
      console.error('Failed to get agent feedback:', error)
    } finally {
      setIsProcessingFeedback(false)
    }
  }

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'journal': return <BookOpenIcon className="w-4 h-4" />
      case 'mood': return <ChartBarIcon className="w-4 h-4" />
      case 'art': return <SwatchIcon className="w-4 h-4" />
      default: return null
    }
  }

  const getInsightTypeLabel = (type: string) => {
    switch (type) {
      case 'journal': return 'Journal'
      case 'mood': return 'Mood'
      case 'art': return 'Artwork'
      default: return type
    }
  }

  const getAgentTypeLabel = (agentType: string) => {
    switch (agentType) {
      case 'cultural_adapter': return 'Cultural Guide'
      case 'therapy_coordinator': return 'Therapy Coordinator'
      case 'creative_expression': return 'Creative Expression'
      case 'progress_tracker': return 'Progress Tracker'
      default: return agentType.replace('_', ' ')
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Creative Tools */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <SparklesIcon className="w-5 h-5 text-facet-blue" />
            Creative Expression Tools
          </CardTitle>
          <CardDescription>
            Express yourself through writing, mood tracking, and art therapy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="journal" className="flex items-center gap-2">
                {getTabIcon('journal')}
                Journal
              </TabsTrigger>
              <TabsTrigger value="mood" className="flex items-center gap-2">
                {getTabIcon('mood')}
                Mood Map
              </TabsTrigger>
              <TabsTrigger value="art" className="flex items-center gap-2">
                {getTabIcon('art')}
                Art Canvas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="journal" className="mt-6">
              <TherapeuticJournal
                sessionId={sessionId}
                onInsightGenerated={(insights) => handleInsightGenerated(insights, 'journal')}
              />
            </TabsContent>

            <TabsContent value="mood" className="mt-6">
              <MoodMapping
                sessionId={sessionId}
                onPatternDetected={(patterns) => {
                  const insights = patterns.map(p => 
                    `${p.period}: ${p.trend} trend with cultural influences: ${p.cultural_influences.join(', ')}`
                  )
                  handleInsightGenerated(insights, 'mood')
                }}
              />
            </TabsContent>

            <TabsContent value="art" className="mt-6">
              <ArtTherapyCanvas
                sessionId={sessionId}
                onInsightGenerated={(insights) => handleInsightGenerated(insights, 'art')}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Agent Feedback */}
      {agentFeedback.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-facet-wine" />
              Therapeutic Agent Feedback
              {isProcessingFeedback && (
                <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin w-4 h-4 border-2 border-facet-blue border-t-transparent rounded-full" />
                  Processing...
                </div>
              )}
            </CardTitle>
            <CardDescription>
              Personalized guidance from your therapeutic agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agentFeedback.map((feedback, index) => (
                <div key={index} className="p-4 border rounded-lg bg-facet-wine/5">
                  <div className="flex items-center gap-2 mb-2">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 text-facet-wine" />
                    <span className="font-medium text-sm">
                      {getAgentTypeLabel(feedback.agent_type)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed mb-3">
                    {feedback.feedback}
                  </p>
                  
                  {feedback.cultural_content && (
                    <div className="p-3 bg-facet-teal/10 rounded border-l-4 border-facet-teal mb-3">
                      <h5 className="text-xs font-medium text-facet-teal mb-1">
                        Cultural Wisdom
                      </h5>
                      <p className="text-sm text-gray-700">{feedback.cultural_content}</p>
                    </div>
                  )}

                  {feedback.therapeutic_suggestion && (
                    <div className="p-3 bg-facet-blue/10 rounded border-l-4 border-facet-blue">
                      <h5 className="text-xs font-medium text-facet-blue mb-1">
                        Therapeutic Suggestion
                      </h5>
                      <p className="text-sm text-gray-700">{feedback.therapeutic_suggestion}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Insights Summary */}
      {insights.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <ArrowTrendingUpIcon className="w-5 h-5 text-facet-teal" />
              Recent Creative Insights
            </CardTitle>
            <CardDescription>
              Summary of your creative expression patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.slice(0, 5).map((insight, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTabIcon(insight.type)}
                      <span className="text-sm font-medium">
                        {getInsightTypeLabel(insight.type)} Insight
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(insight.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {insight.content.slice(0, 2).map((item, idx) => (
                      <p key={idx} className="text-sm text-gray-700">• {item}</p>
                    ))}
                    {insight.content.length > 2 && (
                      <p className="text-xs text-gray-500">
                        +{insight.content.length - 2} more insights
                      </p>
                    )}
                  </div>
                  {insight.cultural_themes && insight.cultural_themes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {insight.cultural_themes.slice(0, 3).map((theme, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-facet-teal/20 text-facet-teal rounded"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
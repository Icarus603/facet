/**
 * FACET Conversations API Endpoint
 * 
 * Retrieve conversation history and analytics
 * Implements exact conversation formats from API_CONTRACT.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

import { APIErrorResponse } from '@/lib/types/api-contract'

// Conversation interfaces from API_CONTRACT.md
interface ConversationSummary {
  conversationId: string
  startTime: string
  endTime?: string
  messageCount: number
  primaryTopics: string[]
  emotionalJourney: EmotionalDataPoint[]
  progressMilestones: string[]
  riskAssessments: RiskAssessmentSummary[]
  agentInteractions: AgentInteractionSummary[]
  overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  sessionDuration: number
  lastActivity: string
}

interface EmotionalDataPoint {
  timestamp: string
  valence: number
  arousal: number
  dominance: number
  primaryEmotion: string
  confidence: number
}

interface RiskAssessmentSummary {
  timestamp: string
  riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'crisis'
  interventionRequired: boolean
  reasoning: string
}

interface AgentInteractionSummary {
  agentName: string
  invocations: number
  avgConfidence: number
  avgExecutionTime: number
  successRate: number
  keyContributions: string[]
}

interface ConversationFilters {
  startDate?: string
  endDate?: string
  riskLevel?: string[]
  topics?: string[]
  limit?: number
  offset?: number
  sortBy?: 'timestamp' | 'duration' | 'risk_level' | 'activity'
  sortOrder?: 'asc' | 'desc'
}

// Query parameter validation
const ConversationFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  riskLevel: z.array(z.enum(['none', 'low', 'moderate', 'high', 'crisis'])).optional(),
  topics: z.array(z.string()).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['timestamp', 'duration', 'risk_level', 'activity']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Simulated conversation store - in production this would use Supabase
const conversationStore = new Map<string, ConversationSummary[]>()

// Mock conversation data generator
function generateMockConversations(userId: string, count: number = 10): ConversationSummary[] {
  const conversations: ConversationSummary[] = []
  
  for (let i = 0; i < count; i++) {
    const startTime = new Date(Date.now() - (i * 24 * 60 * 60 * 1000) - Math.random() * 12 * 60 * 60 * 1000)
    const sessionDuration = Math.random() * 3600 + 300 // 5 minutes to 1 hour
    const endTime = new Date(startTime.getTime() + sessionDuration * 1000)
    
    conversations.push({
      conversationId: uuidv4(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      messageCount: Math.floor(Math.random() * 20) + 3,
      primaryTopics: generateRandomTopics(),
      emotionalJourney: generateEmotionalJourney(startTime, sessionDuration),
      progressMilestones: generateProgressMilestones(),
      riskAssessments: generateRiskAssessments(startTime, sessionDuration),
      agentInteractions: generateAgentInteractions(),
      overallSentiment: ['positive', 'neutral', 'negative', 'mixed'][Math.floor(Math.random() * 4)] as any,
      sessionDuration,
      lastActivity: endTime.toISOString()
    })
  }
  
  return conversations.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
}

// GET /api/conversations - Retrieve conversation history
export async function GET(request: NextRequest) {
  const requestId = uuidv4()
  
  try {
    // Get user ID from authentication
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication required',
          recoveryOptions: ['login', 'refresh_token']
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          errorSeverity: 'high'
        }
      } as APIErrorResponse, { status: 401 })
    }

    // Parse query parameters
    const url = new URL(request.url)
    const rawFilters: any = {}
    
    // Extract query parameters
    url.searchParams.forEach((value, key) => {
      if (key === 'riskLevel' || key === 'topics') {
        rawFilters[key] = value.split(',')
      } else {
        rawFilters[key] = value
      }
    })

    // Validate filters
    const filtersResult = ConversationFiltersSchema.safeParse(rawFilters)
    if (!filtersResult.success) {
      return NextResponse.json({
        error: {
          code: 'INVALID_QUERY_PARAMETERS',
          message: 'Invalid query parameters',
          details: filtersResult.error.message,
          recoveryOptions: ['check_parameter_format', 'use_default_parameters']
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          errorSeverity: 'medium'
        }
      } as APIErrorResponse, { status: 400 })
    }

    const filters = filtersResult.data

    // Get or generate conversation data
    let conversations = conversationStore.get(userId)
    if (!conversations) {
      conversations = generateMockConversations(userId, 25)
      conversationStore.set(userId, conversations)
    }

    // Apply filters
    let filteredConversations = applyFilters(conversations, filters)

    // Apply sorting
    filteredConversations = applySorting(filteredConversations, filters.sortBy, filters.sortOrder)

    // Calculate total count before pagination
    const totalCount = filteredConversations.length

    // Apply pagination
    const paginatedConversations = filteredConversations.slice(
      filters.offset,
      filters.offset + filters.limit
    )

    // Generate conversation analytics
    const analytics = generateConversationAnalytics(conversations, filteredConversations)

    return NextResponse.json({
      conversations: paginatedConversations,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: totalCount,
        hasNext: filters.offset + filters.limit < totalCount,
        hasPrevious: filters.offset > 0
      },
      analytics,
      filters: filters,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        queryTimeMs: Date.now() - new Date().getTime()
      }
    })

  } catch (error) {
    console.error('Get conversations error:', error)
    
    return NextResponse.json({
      error: {
        code: 'CONVERSATIONS_RETRIEVAL_FAILED',
        message: 'Unable to retrieve conversations',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : undefined,
        recoveryOptions: ['try_again', 'contact_support']
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        errorSeverity: 'high'
      }
    } as APIErrorResponse, { status: 500 })
  }
}

// Helper functions

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // TODO: Implement proper authentication using Supabase
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  
  // Mock user ID for development
  return 'mock-user-id-12345'
}

function applyFilters(conversations: ConversationSummary[], filters: ConversationFilters): ConversationSummary[] {
  return conversations.filter(conv => {
    // Date range filter
    if (filters.startDate && new Date(conv.startTime) < new Date(filters.startDate)) {
      return false
    }
    if (filters.endDate && new Date(conv.startTime) > new Date(filters.endDate)) {
      return false
    }
    
    // Risk level filter
    if (filters.riskLevel && filters.riskLevel.length > 0) {
      const hasMatchingRisk = conv.riskAssessments.some(risk => 
        filters.riskLevel!.includes(risk.riskLevel)
      )
      if (!hasMatchingRisk) return false
    }
    
    // Topics filter
    if (filters.topics && filters.topics.length > 0) {
      const hasMatchingTopic = filters.topics.some(topic => 
        conv.primaryTopics.some(convTopic => 
          convTopic.toLowerCase().includes(topic.toLowerCase())
        )
      )
      if (!hasMatchingTopic) return false
    }
    
    return true
  })
}

function applySorting(
  conversations: ConversationSummary[], 
  sortBy: string, 
  sortOrder: 'asc' | 'desc'
): ConversationSummary[] {
  const sorted = [...conversations].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'timestamp':
        comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        break
      case 'duration':
        comparison = a.sessionDuration - b.sessionDuration
        break
      case 'risk_level':
        const riskLevels = { none: 0, low: 1, moderate: 2, high: 3, crisis: 4 }
        const aMaxRisk = Math.max(...a.riskAssessments.map(r => riskLevels[r.riskLevel]))
        const bMaxRisk = Math.max(...b.riskAssessments.map(r => riskLevels[r.riskLevel]))
        comparison = aMaxRisk - bMaxRisk
        break
      case 'activity':
        comparison = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
        break
    }
    
    return sortOrder === 'desc' ? -comparison : comparison
  })
  
  return sorted
}

function generateConversationAnalytics(
  allConversations: ConversationSummary[],
  filteredConversations: ConversationSummary[]
): any {
  const analytics = {
    totalConversations: allConversations.length,
    filteredConversations: filteredConversations.length,
    averageSessionDuration: 0,
    emotionalTrends: {
      averageValence: 0,
      averageArousal: 0,
      averageDominance: 0,
      moodProgression: 'stable' as 'improving' | 'stable' | 'declining'
    },
    riskDistribution: {
      none: 0,
      low: 0,
      moderate: 0,
      high: 0,
      crisis: 0
    },
    topTopics: [] as Array<{ topic: string, frequency: number }>,
    agentEffectiveness: [] as Array<{ agent: string, avgConfidence: number, usage: number }>,
    progressIndicators: {
      milestonesAchieved: 0,
      trendsIdentified: 0,
      improvementAreas: [] as string[]
    }
  }
  
  if (filteredConversations.length === 0) return analytics
  
  // Calculate averages
  analytics.averageSessionDuration = filteredConversations.reduce((sum, conv) => 
    sum + conv.sessionDuration, 0) / filteredConversations.length
  
  // Emotional trends
  const allEmotionalPoints = filteredConversations.flatMap(conv => conv.emotionalJourney)
  if (allEmotionalPoints.length > 0) {
    analytics.emotionalTrends.averageValence = allEmotionalPoints.reduce((sum, point) => 
      sum + point.valence, 0) / allEmotionalPoints.length
    analytics.emotionalTrends.averageArousal = allEmotionalPoints.reduce((sum, point) => 
      sum + point.arousal, 0) / allEmotionalPoints.length
    analytics.emotionalTrends.averageDominance = allEmotionalPoints.reduce((sum, point) => 
      sum + point.dominance, 0) / allEmotionalPoints.length
  }
  
  // Risk distribution
  const allRiskAssessments = filteredConversations.flatMap(conv => conv.riskAssessments)
  allRiskAssessments.forEach(risk => {
    analytics.riskDistribution[risk.riskLevel]++
  })
  
  // Top topics
  const topicCounts = new Map<string, number>()
  filteredConversations.forEach(conv => {
    conv.primaryTopics.forEach(topic => {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
    })
  })
  analytics.topTopics = Array.from(topicCounts.entries())
    .map(([topic, frequency]) => ({ topic, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10)
  
  // Agent effectiveness
  const agentStats = new Map<string, { totalConfidence: number, totalUsage: number }>()
  filteredConversations.forEach(conv => {
    conv.agentInteractions.forEach(agent => {
      const existing = agentStats.get(agent.agentName) || { totalConfidence: 0, totalUsage: 0 }
      existing.totalConfidence += agent.avgConfidence
      existing.totalUsage += agent.invocations
      agentStats.set(agent.agentName, existing)
    })
  })
  
  analytics.agentEffectiveness = Array.from(agentStats.entries())
    .map(([agent, stats]) => ({
      agent,
      avgConfidence: stats.totalConfidence / filteredConversations.length,
      usage: stats.totalUsage
    }))
    .sort((a, b) => b.avgConfidence - a.avgConfidence)
  
  // Progress indicators
  analytics.progressIndicators.milestonesAchieved = filteredConversations.reduce((sum, conv) => 
    sum + conv.progressMilestones.length, 0)
  
  return analytics
}

// Mock data generators
function generateRandomTopics(): string[] {
  const allTopics = [
    'anxiety', 'depression', 'work stress', 'relationships', 'family',
    'sleep issues', 'self-esteem', 'trauma', 'grief', 'anger management',
    'social anxiety', 'panic attacks', 'loneliness', 'life transitions',
    'mindfulness', 'coping strategies', 'medication', 'therapy progress'
  ]
  
  const topicCount = Math.floor(Math.random() * 3) + 1
  const topics: string[] = []
  for (let i = 0; i < topicCount; i++) {
    const topic = allTopics[Math.floor(Math.random() * allTopics.length)]
    if (!topics.includes(topic)) {
      topics.push(topic)
    }
  }
  return topics
}

function generateEmotionalJourney(startTime: Date, duration: number): EmotionalDataPoint[] {
  const points: EmotionalDataPoint[] = []
  const pointCount = Math.floor(duration / 600) + 1 // One point every 10 minutes
  
  for (let i = 0; i < pointCount; i++) {
    const timestamp = new Date(startTime.getTime() + (i * duration * 1000 / pointCount))
    points.push({
      timestamp: timestamp.toISOString(),
      valence: (Math.random() - 0.5) * 2, // -1 to 1
      arousal: Math.random(), // 0 to 1
      dominance: Math.random(), // 0 to 1
      primaryEmotion: ['sad', 'anxious', 'calm', 'happy', 'frustrated', 'hopeful'][Math.floor(Math.random() * 6)],
      confidence: 0.6 + Math.random() * 0.4 // 0.6 to 1.0
    })
  }
  
  return points
}

function generateProgressMilestones(): string[] {
  const milestones = [
    'Identified trigger pattern',
    'Practiced breathing technique',
    'Set weekly goal',
    'Completed mood tracking',
    'Shared personal insight',
    'Applied coping strategy'
  ]
  
  const milestoneCount = Math.floor(Math.random() * 3)
  return milestones.slice(0, milestoneCount)
}

function generateRiskAssessments(startTime: Date, duration: number): RiskAssessmentSummary[] {
  const assessments: RiskAssessmentSummary[] = []
  const assessmentCount = Math.floor(Math.random() * 2) + 1
  
  for (let i = 0; i < assessmentCount; i++) {
    const timestamp = new Date(startTime.getTime() + Math.random() * duration * 1000)
    const riskLevels = ['none', 'low', 'moderate', 'high', 'crisis']
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)] as any
    
    assessments.push({
      timestamp: timestamp.toISOString(),
      riskLevel,
      interventionRequired: riskLevel === 'high' || riskLevel === 'crisis',
      reasoning: `Risk assessment based on conversation context and emotional indicators`
    })
  }
  
  return assessments
}

function generateAgentInteractions(): AgentInteractionSummary[] {
  const agents = ['emotion_analyzer', 'memory_manager', 'crisis_monitor', 'therapy_advisor', 'progress_tracker']
  
  return agents.map(agentName => ({
    agentName,
    invocations: Math.floor(Math.random() * 5) + 1,
    avgConfidence: 0.5 + Math.random() * 0.5,
    avgExecutionTime: Math.random() * 1000 + 200,
    successRate: 0.8 + Math.random() * 0.2,
    keyContributions: [
      `Analyzed ${agentName.replace('_', ' ')} patterns`,
      `Provided relevant insights`
    ]
  }))
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'POST method not supported for conversations endpoint',
      recoveryOptions: ['use_get_method']
    },
    metadata: {
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
      errorSeverity: 'low'
    }
  } as APIErrorResponse, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'PUT method not supported for conversations endpoint',
      recoveryOptions: ['use_get_method']
    },
    metadata: {
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
      errorSeverity: 'low'
    }
  } as APIErrorResponse, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'DELETE method not supported for conversations endpoint',
      recoveryOptions: ['contact_support_for_data_deletion']
    },
    metadata: {
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
      errorSeverity: 'low'
    }
  } as APIErrorResponse, { status: 405 })
}
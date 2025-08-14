import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AgentRegistry } from '@/lib/agents/AgentRegistry'
import { FACETOrchestrationSystem } from '@/lib/agents/orchestration'
import { nanoid } from 'nanoid'

const agentRegistry = new AgentRegistry()

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, sessionId, culturalContext, urgencyLevel = 'medium' } = await request.json()

    // Create new therapy session if none exists
    let therapySessionId = sessionId
    if (!therapySessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('therapy_sessions')
        .insert({
          id: nanoid(),
          user_id: session.user.id,
          session_type: 'individual',
          status: 'active',
          cultural_context: culturalContext,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Session creation error:', sessionError)
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
      }

      therapySessionId = newSession.id
    }

    // Get user's cultural profile for context
    const { data: culturalProfile } = await supabase
      .from('user_cultural_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    // Get session history for context
    const { data: sessionHistory } = await supabase
      .from('therapy_interactions')
      .select('*')
      .eq('session_id', therapySessionId)
      .order('timestamp', { ascending: true })
      .limit(10)

    // Route message through agent orchestration
    const orchestrationContext = {
      sessionId: therapySessionId,
      userId: session.user.id,
      userInput: message,
      culturalContext: {
        ...culturalContext,
        profile: culturalProfile
      },
      sessionHistory: sessionHistory || [],
      urgencyLevel,
      maxResponseTime: 5000
    }

    // Get appropriate agent response through orchestration
    const response = await agentRegistry.processTherapeuticInteraction({
      userId: session.user.id,
      sessionId: therapySessionId,
      userInput: message,
      culturalContext: orchestrationContext.culturalContext,
      urgencyLevel
    })

    // Log interaction to database
    await supabase
      .from('therapy_interactions')
      .insert({
        session_id: therapySessionId,
        interaction_type: 'user_message',
        user_input: message,
        agent_response: response.content,
        agent_type: response.agentId,
        cultural_content_used: response.culturalContent,
        emotional_analysis: response.emotionalAnalysis,
        processing_time_ms: response.processingTime,
        coordination_events: response.coordinationEvents
      })

    // Crisis assessment if needed
    let crisisAssessment = null
    if (urgencyLevel === 'high' || urgencyLevel === 'critical') {
      // Crisis detection logic would go here
      // For now, we'll use a placeholder
      crisisAssessment = {
        riskLevel: 'low',
        intervention: null
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: therapySessionId,
      response: {
        content: response.content,
        agentName: response.agentName,
        agentType: response.agentType,
        culturalContent: response.culturalContent,
        suggestedActions: response.suggestedActions,
        emotionalAnalysis: response.emotionalAnalysis
      },
      crisisAssessment,
      processingTime: response.processingTime
    })

  } catch (error) {
    console.error('Therapy session API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!sessionId) {
      // Get all user sessions
      const { data: sessions, error } = await supabase
        .from('therapy_sessions')
        .select(`
          id,
          session_type,
          primary_concern,
          status,
          started_at,
          ended_at,
          satisfaction_rating,
          cultural_relevance_rating
        `)
        .eq('user_id', session.user.id)
        .order('started_at', { ascending: false })
        .limit(limit)

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
      }

      return NextResponse.json({ sessions })
    } else {
      // Get specific session with interactions
      const [sessionData, interactions] = await Promise.all([
        supabase
          .from('therapy_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', session.user.id)
          .single(),
        
        supabase
          .from('therapy_interactions')
          .select('*')
          .eq('session_id', sessionId)
          .order('timestamp', { ascending: true })
          .limit(limit)
      ])

      if (sessionData.error) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      return NextResponse.json({
        session: sessionData.data,
        interactions: interactions.data || []
      })
    }

  } catch (error) {
    console.error('Get sessions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
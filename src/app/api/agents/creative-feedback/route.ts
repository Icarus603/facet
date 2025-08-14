import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AgentOrchestrator } from '@/lib/agents/orchestrator'
import { CulturalEngine } from '@/lib/cultural'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { insight, session_id, user_id } = body

    if (!insight || !insight.content || insight.content.length === 0) {
      return NextResponse.json({ error: 'Insight content is required' }, { status: 400 })
    }

    // Get user cultural profile
    const { data: userProfile } = await supabase
      .from('users')
      .select(`
        cultural_background,
        user_cultural_profiles:user_cultural_profiles(*)
      `)
      .eq('id', session.user.id)
      .single()

    const culturalProfile = userProfile?.user_cultural_profiles?.[0]

    // Initialize agents
    const orchestrator = new AgentOrchestrator()
    const culturalEngine = new CulturalEngine()

    // Determine appropriate agent based on insight type
    let primaryAgent = 'therapy_coordinator'
    if (insight.type === 'art') {
      primaryAgent = 'creative_expression'
    } else if (insight.type === 'mood') {
      primaryAgent = 'progress_tracker'
    }

    // Get relevant cultural content
    let culturalContent = ''
    try {
      const culturalResults = await culturalEngine.searchContent(
        insight.content.join(' '),
        {
          primaryCulture: culturalProfile?.primary_culture || '',
          secondaryCultures: culturalProfile?.secondary_cultures || [],
          religiousSpiritualBackground: culturalProfile?.religious_spiritual_background || '',
          culturalValues: culturalProfile?.cultural_values || {}
        }
      )
      
      if (culturalResults.length > 0) {
        culturalContent = culturalResults[0].content
      }
    } catch (culturalError) {
      console.error('Cultural content search error:', culturalError)
    }

    // Generate therapeutic feedback
    const feedbackPrompt = `
      As a ${primaryAgent.replace('_', ' ')}, provide supportive therapeutic feedback based on this creative expression insight:

      Insight Type: ${insight.type}
      Insight Content: ${insight.content.join('. ')}
      User Cultural Background: ${culturalProfile?.primary_culture || 'Not specified'}

      ${culturalContent ? `Relevant Cultural Wisdom: "${culturalContent}"` : ''}

      Please provide:
      1. Acknowledgment of the user's emotional expression and creativity
      2. Therapeutic observations about their growth or patterns
      3. Gentle suggestions for continued healing
      4. How this relates to their cultural background if relevant

      Keep the tone warm, supportive, and culturally sensitive. Focus on strengths and growth potential.
    `

    const feedback = await orchestrator.processUserMessage({
      content: feedbackPrompt,
      userId: session.user.id,
      sessionId: session_id || 'creative-feedback',
      messageType: 'text',
      timestamp: Date.now(),
      correlationId: `feedback-${Date.now()}`,
      metadata: {
        insight_type: insight.type,
        cultural_context: culturalProfile
      }
    })

    // Extract therapeutic suggestion
    let therapeuticSuggestion = ''
    const feedbackText = feedback.primaryResponse.content || ''
    
    // Look for suggestion patterns
    const suggestionMatch = feedbackText.match(/suggestion[s]?:?\s*(.+?)(?:\n|$)/i)
    if (suggestionMatch) {
      therapeuticSuggestion = suggestionMatch[1].trim()
    } else {
      // Extract last sentence as suggestion
      const sentences = feedbackText.split(/[.!?]+/).filter((s: string) => s.trim())
      if (sentences.length > 0) {
        therapeuticSuggestion = sentences[sentences.length - 1].trim()
      }
    }

    const agentFeedback = {
      agent_type: primaryAgent,
      feedback: feedbackText,
      cultural_content: culturalContent || undefined,
      therapeutic_suggestion: therapeuticSuggestion || undefined
    }

    return NextResponse.json(agentFeedback)
  } catch (error) {
    console.error('Agent feedback error:', error)
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 })
  }
}
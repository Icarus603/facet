import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AgentOrchestrator } from '@/lib/agents/orchestrator'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, mood_rating, session_id } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Get user cultural profile for context
    const { data: userProfile } = await supabase
      .from('users')
      .select(`
        cultural_background,
        user_cultural_profiles:user_cultural_profiles(*)
      `)
      .eq('id', session.user.id)
      .single()

    const culturalProfile = userProfile?.user_cultural_profiles?.[0]

    // Initialize agent orchestrator
    const orchestrator = new AgentOrchestrator()
    
    // Analyze journal entry with cultural context
    const analysisPrompt = `
      Analyze this therapeutic journal entry and provide gentle, culturally-aware insights:

      Journal Entry: "${content}"
      Mood Rating: ${mood_rating}/10
      Cultural Background: ${culturalProfile?.primary_culture || 'Not specified'}
      Cultural Values: ${JSON.stringify(culturalProfile?.cultural_values || {})}

      Please provide 3-5 therapeutic insights that:
      1. Acknowledge the emotions and experiences expressed
      2. Identify potential growth opportunities or patterns
      3. Integrate relevant cultural wisdom or perspectives
      4. Suggest gentle therapeutic approaches
      5. Are supportive and non-judgmental

      Return insights as an array of strings, each being a complete therapeutic observation.
    `

    // Get analysis from therapy coordinator agent
    const analysis = await orchestrator.processUserMessage({
      content: analysisPrompt,
      userId: session.user.id,
      sessionId: session_id || 'journal-analysis',
      messageType: 'text',
      timestamp: Date.now(),
      correlationId: `journal-${Date.now()}`,
      metadata: {
        mood_rating,
        cultural_context: culturalProfile
      }
    })

    // Parse insights from agent response
    let insights: string[] = []
    try {
      // Try to extract insights from the response
      const responseText = analysis.primaryResponse.content || ''
      
      // Look for bullet points or numbered lists
      const bulletMatches = responseText.match(/[•\-\*]\s+(.+?)(?=\n|$)/g)
      const numberMatches = responseText.match(/\d+\.\s+(.+?)(?=\n|$)/g)
      
      if (bulletMatches) {
        insights = bulletMatches.map((match: string) => match.replace(/^[•\-\*]\s+/, '').trim())
      } else if (numberMatches) {
        insights = numberMatches.map((match: string) => match.replace(/^\d+\.\s+/, '').trim())
      } else {
        // Split by sentences and filter meaningful ones
        insights = responseText
          .split(/[.!?]+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 20 && !s.includes('analyze') && !s.includes('insight'))
          .slice(0, 5)
      }

      // Fallback insights if parsing fails
      if (insights.length === 0) {
        insights = [
          "Your willingness to express yourself through writing shows self-awareness and courage.",
          "The emotions you've shared are valid and important parts of your human experience.",
          "Consider exploring the underlying patterns or triggers that might be influencing your feelings.",
          "Your cultural background may offer valuable perspectives on processing these experiences.",
          "Continue using journaling as a tool for self-reflection and emotional processing."
        ]
      }
    } catch (parseError) {
      console.error('Error parsing insights:', parseError)
      insights = [
        "Thank you for sharing your thoughts and feelings through journaling.",
        "Your self-reflection demonstrates emotional intelligence and growth mindset.",
        "Consider exploring these feelings further with culturally-informed therapeutic approaches.",
        "Your experiences are valid and deserve compassionate understanding.",
        "Continue using creative expression as a path toward healing and self-discovery."
      ]
    }

    return NextResponse.json({
      insights: insights.slice(0, 5),
      cultural_themes: culturalProfile ? [
        culturalProfile.primary_culture,
        ...(culturalProfile.secondary_cultures || []).slice(0, 2)
      ] : [],
      analysis_metadata: {
        mood_rating,
        entry_length: content.length,
        cultural_context: !!culturalProfile
      }
    })
  } catch (error) {
    console.error('Journal analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze entry' }, { status: 500 })
  }
}
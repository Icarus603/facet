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
    const { canvas_data, emotions_expressed, session_id } = body

    if (!canvas_data || !emotions_expressed || emotions_expressed.length === 0) {
      return NextResponse.json({ error: 'Canvas data and emotions are required' }, { status: 400 })
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
    
    // Analyze artwork with cultural context
    const analysisPrompt = `
      Analyze this art therapy creation and provide supportive, culturally-aware insights:

      Emotions Expressed: ${emotions_expressed.join(', ')}
      Cultural Background: ${culturalProfile?.primary_culture || 'Not specified'}
      Cultural Values: ${JSON.stringify(culturalProfile?.cultural_values || {})}

      Note: The artwork is created as a form of therapeutic expression. Please provide 3-5 gentle insights that:
      
      1. Acknowledge the emotional expression and creative courage
      2. Interpret possible symbolic meanings or patterns
      3. Connect to cultural art traditions or symbols when relevant
      4. Identify therapeutic themes or healing potential
      5. Suggest ways to continue using art for emotional processing
      
      Focus on being supportive, non-judgmental, and culturally sensitive. Avoid clinical diagnosis.
      Return insights as an array of meaningful therapeutic observations.
    `

    // Get analysis from creative expression agent
    const analysis = await orchestrator.processUserMessage({
      content: analysisPrompt,
      userId: session.user.id,
      sessionId: session_id || 'art-analysis',
      messageType: 'text',
      timestamp: Date.now(),
      correlationId: `art-${Date.now()}`,
      metadata: {
        emotions_expressed,
        cultural_context: culturalProfile,
        canvas_size: canvas_data.length // Basic metadata
      }
    })

    // Parse insights from agent response
    let insights: string[] = []
    try {
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
          .filter((s: string) => s.length > 15 && !s.includes('analyze') && !s.includes('artwork'))
          .slice(0, 5)
      }

      // Fallback insights if parsing fails
      if (insights.length === 0) {
        insights = generateFallbackArtInsights(emotions_expressed, culturalProfile)
      }
    } catch (parseError) {
      console.error('Error parsing art insights:', parseError)
      insights = generateFallbackArtInsights(emotions_expressed, culturalProfile)
    }

    // Identify potential cultural symbols
    const culturalSymbols = identifyCulturalSymbols(emotions_expressed, culturalProfile)

    return NextResponse.json({
      insights: insights.slice(0, 5),
      cultural_symbols: culturalSymbols,
      emotions_analyzed: emotions_expressed,
      analysis_metadata: {
        cultural_context: !!culturalProfile,
        primary_emotions: emotions_expressed.slice(0, 3),
        therapeutic_themes: extractTherapeuticThemes(emotions_expressed)
      }
    })
  } catch (error) {
    console.error('Art analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze artwork' }, { status: 500 })
  }
}

function generateFallbackArtInsights(emotions: string[], culturalProfile?: any): string[] {
  const insights = [
    `Your creative expression through art shows courage in exploring emotions like ${emotions.slice(0, 2).join(' and ')}.`,
    "The act of translating feelings into visual form is a powerful therapeutic tool that connects mind and heart.",
    "Art has been used across cultures for healing - your creation continues this ancient tradition of creative processing."
  ]

  if (emotions.includes('Joy') || emotions.includes('Hope')) {
    insights.push("The presence of joy and hope in your artwork suggests resilience and positive emotional resources.")
  } else if (emotions.includes('Sadness') || emotions.includes('Anxiety')) {
    insights.push("Creating art during difficult emotions demonstrates healthy coping strategies and emotional intelligence.")
  }

  if (culturalProfile?.primary_culture) {
    insights.push(`Consider exploring how ${culturalProfile.primary_culture} artistic traditions might enrich your creative expression.`)
  }

  return insights
}

function identifyCulturalSymbols(emotions: string[], culturalProfile?: any): string[] {
  const symbols: string[] = []

  // Basic symbolic interpretations based on emotions
  if (emotions.includes('Peace') || emotions.includes('Calm')) {
    symbols.push('Elements of tranquility and balance')
  }
  
  if (emotions.includes('Energy') || emotions.includes('Joy')) {
    symbols.push('Vibrant expression and life force')
  }

  if (emotions.includes('Love') || emotions.includes('Hope')) {
    symbols.push('Connection and optimism symbols')
  }

  // Add cultural context if available
  if (culturalProfile?.primary_culture) {
    symbols.push(`Potential ${culturalProfile.primary_culture} symbolic elements`)
  }

  return symbols
}

function extractTherapeuticThemes(emotions: string[]): string[] {
  const themes: string[] = []
  
  if (emotions.some(e => ['Joy', 'Hope', 'Love', 'Peace'].includes(e))) {
    themes.push('Emotional resilience')
  }
  
  if (emotions.some(e => ['Sadness', 'Anxiety', 'Fear', 'Anger'].includes(e))) {
    themes.push('Emotional processing')
  }
  
  if (emotions.some(e => ['Confusion', 'Overwhelmed'].includes(e))) {
    themes.push('Clarity seeking')
  }
  
  if (emotions.some(e => ['Freedom', 'Energy'].includes(e))) {
    themes.push('Self-empowerment')
  }

  return themes
}
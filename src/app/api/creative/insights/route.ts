import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Fetch insights from multiple creative sources
    const [journalEntries, moodEntries, artDrawings] = await Promise.all([
      supabase
        .from('journal_entries')
        .select('ai_insights, created_at')
        .eq('user_id', session.user.id)
        .not('ai_insights', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit),
      
      supabase
        .from('mood_entries')
        .select('emotions, cultural_context, timestamp')
        .eq('user_id', session.user.id)
        .order('timestamp', { ascending: false })
        .limit(limit),
        
      supabase
        .from('art_therapy_drawings')
        .select('therapeutic_insights, emotions_expressed, created_at')
        .eq('user_id', session.user.id)
        .not('therapeutic_insights', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit)
    ])

    // Combine and format insights
    const insights: any[] = []

    // Journal insights
    if (journalEntries.data) {
      journalEntries.data.forEach(entry => {
        if (entry.ai_insights && entry.ai_insights.length > 0) {
          insights.push({
            type: 'journal',
            content: entry.ai_insights,
            timestamp: entry.created_at,
            cultural_themes: []
          })
        }
      })
    }

    // Mood pattern insights
    if (moodEntries.data) {
      const recentMoodData = moodEntries.data.slice(0, 5)
      if (recentMoodData.length > 0) {
        const emotions = recentMoodData.flatMap(entry => entry.emotions || [])
        const culturalContexts = recentMoodData
          .map(entry => entry.cultural_context)
          .filter(Boolean)
        
        insights.push({
          type: 'mood',
          content: [
            `Recent mood tracking shows patterns in emotions: ${[...new Set(emotions)].slice(0, 3).join(', ')}`,
            `Cultural contexts identified: ${culturalContexts.length > 0 ? culturalContexts.slice(0, 2).join(', ') : 'None recorded'}`
          ],
          timestamp: recentMoodData[0].timestamp,
          cultural_themes: culturalContexts.slice(0, 3)
        })
      }
    }

    // Art therapy insights
    if (artDrawings.data) {
      artDrawings.data.forEach(drawing => {
        if (drawing.therapeutic_insights && drawing.therapeutic_insights.length > 0) {
          insights.push({
            type: 'art',
            content: drawing.therapeutic_insights,
            timestamp: drawing.created_at,
            cultural_themes: []
          })
        }
      })
    }

    // Sort by timestamp and limit results
    insights.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return NextResponse.json(insights.slice(0, limit))
  } catch (error) {
    console.error('Creative insights error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface MoodEntry {
  id: string
  mood_value: number
  energy_level: number
  stress_level: number
  emotions: string[]
  triggers?: string[]
  cultural_context?: string
  timestamp: string
}

interface MoodPattern {
  period: string
  average_mood: number
  trend: 'improving' | 'stable' | 'declining'
  cultural_influences: string[]
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch last 60 days of mood entries for pattern analysis
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const { data: entries, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('timestamp', sixtyDaysAgo.toISOString())
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch mood entries' }, { status: 500 })
    }

    if (!entries || entries.length < 3) {
      return NextResponse.json([])
    }

    const patterns: MoodPattern[] = analyzePatterns(entries as MoodEntry[])
    
    return NextResponse.json(patterns)
  } catch (error) {
    console.error('Mood patterns error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function analyzePatterns(entries: MoodEntry[]): MoodPattern[] {
  const patterns: MoodPattern[] = []

  try {
    // Weekly pattern analysis
    const weeklyData = groupByWeek(entries)
    const weeklyPattern = analyzeWeeklyTrend(weeklyData)
    if (weeklyPattern) patterns.push(weeklyPattern)

    // Monthly pattern analysis
    const monthlyData = groupByMonth(entries)
    const monthlyPattern = analyzeMonthlyTrend(monthlyData)
    if (monthlyPattern) patterns.push(monthlyPattern)

    // Cultural influences analysis
    const culturalPattern = analyzeCulturalInfluences(entries)
    if (culturalPattern) patterns.push(culturalPattern)

    return patterns
  } catch (error) {
    console.error('Pattern analysis error:', error)
    return []
  }
}

function groupByWeek(entries: MoodEntry[]) {
  const weeks: { [key: string]: MoodEntry[] } = {}
  
  entries.forEach(entry => {
    const date = new Date(entry.timestamp)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]
    
    if (!weeks[weekKey]) weeks[weekKey] = []
    weeks[weekKey].push(entry)
  })
  
  return weeks
}

function groupByMonth(entries: MoodEntry[]) {
  const months: { [key: string]: MoodEntry[] } = {}
  
  entries.forEach(entry => {
    const date = new Date(entry.timestamp)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!months[monthKey]) months[monthKey] = []
    months[monthKey].push(entry)
  })
  
  return months
}

function analyzeWeeklyTrend(weeklyData: { [key: string]: MoodEntry[] }): MoodPattern | null {
  const weeks = Object.keys(weeklyData).sort()
  if (weeks.length < 2) return null

  const weeklyAverages = weeks.map(week => {
    const entries = weeklyData[week]
    const avgMood = entries.reduce((sum, entry) => sum + entry.mood_value, 0) / entries.length
    return avgMood
  })

  const recentAvg = weeklyAverages.slice(-2).reduce((a, b) => a + b, 0) / 2
  const earlierAvg = weeklyAverages.slice(0, Math.max(1, weeklyAverages.length - 2)).reduce((a, b) => a + b, 0) / Math.max(1, weeklyAverages.length - 2)

  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  if (recentAvg > earlierAvg + 0.5) trend = 'improving'
  else if (recentAvg < earlierAvg - 0.5) trend = 'declining'

  // Analyze cultural influences in recent weeks
  const recentEntries = weeks.slice(-2).flatMap(week => weeklyData[week])
  const culturalInfluences = extractCulturalInfluences(recentEntries)

  return {
    period: `Last ${weeks.length} weeks`,
    average_mood: recentAvg,
    trend,
    cultural_influences: culturalInfluences
  }
}

function analyzeMonthlyTrend(monthlyData: { [key: string]: MoodEntry[] }): MoodPattern | null {
  const months = Object.keys(monthlyData).sort()
  if (months.length < 2) return null

  const monthlyAverages = months.map(month => {
    const entries = monthlyData[month]
    const avgMood = entries.reduce((sum, entry) => sum + entry.mood_value, 0) / entries.length
    return avgMood
  })

  const recentAvg = monthlyAverages[monthlyAverages.length - 1]
  const previousAvg = monthlyAverages[monthlyAverages.length - 2]

  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  if (recentAvg > previousAvg + 0.5) trend = 'improving'
  else if (recentAvg < previousAvg - 0.5) trend = 'declining'

  const recentEntries = monthlyData[months[months.length - 1]]
  const culturalInfluences = extractCulturalInfluences(recentEntries)

  return {
    period: `Current month vs previous`,
    average_mood: recentAvg,
    trend,
    cultural_influences: culturalInfluences
  }
}

function analyzeCulturalInfluences(entries: MoodEntry[]): MoodPattern | null {
  const culturalEntries = entries.filter(entry => entry.cultural_context)
  if (culturalEntries.length < 3) return null

  const avgMoodWithCulture = culturalEntries.reduce((sum, entry) => sum + entry.mood_value, 0) / culturalEntries.length
  const avgMoodOverall = entries.reduce((sum, entry) => sum + entry.mood_value, 0) / entries.length

  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  if (avgMoodWithCulture > avgMoodOverall + 0.5) trend = 'improving'
  else if (avgMoodWithCulture < avgMoodOverall - 0.5) trend = 'declining'

  const culturalInfluences = extractCulturalInfluences(culturalEntries)

  return {
    period: 'Cultural context impact',
    average_mood: avgMoodWithCulture,
    trend,
    cultural_influences: culturalInfluences
  }
}

function extractCulturalInfluences(entries: MoodEntry[]): string[] {
  const influences = new Set<string>()

  entries.forEach(entry => {
    if (entry.cultural_context) {
      influences.add(entry.cultural_context)
    }
    
    if (entry.triggers) {
      entry.triggers.forEach(trigger => {
        if (trigger.toLowerCase().includes('family') || 
            trigger.toLowerCase().includes('tradition') ||
            trigger.toLowerCase().includes('cultural') ||
            trigger.toLowerCase().includes('community')) {
          influences.add(trigger)
        }
      })
    }
  })

  return Array.from(influences).slice(0, 5)
}
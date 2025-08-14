import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')

    // Fetch recent mood entries
    const { data: entries, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch mood entries' }, { status: 500 })
    }

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Mood entries GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      mood_value, 
      energy_level, 
      stress_level, 
      emotions, 
      triggers, 
      cultural_context,
      session_id 
    } = body

    if (!emotions || emotions.length === 0) {
      return NextResponse.json({ error: 'At least one emotion is required' }, { status: 400 })
    }

    // Save mood entry
    const { data: entry, error } = await supabase
      .from('mood_entries')
      .insert({
        id: nanoid(),
        user_id: session.user.id,
        mood_value: mood_value || 5,
        energy_level: energy_level || 5,
        stress_level: stress_level || 5,
        emotions: emotions,
        triggers: triggers || [],
        cultural_context,
        session_id,
        timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to save mood entry' }, { status: 500 })
    }

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Mood entries POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
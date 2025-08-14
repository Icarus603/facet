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
    const limit = parseInt(searchParams.get('limit') || '10')

    // Fetch recent art drawings
    const { data: drawings, error } = await supabase
      .from('art_therapy_drawings')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch drawings' }, { status: 500 })
    }

    return NextResponse.json(drawings)
  } catch (error) {
    console.error('Art drawings GET error:', error)
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
      title, 
      canvas_data, 
      emotions_expressed, 
      therapeutic_insights,
      session_id 
    } = body

    if (!title?.trim() || !canvas_data) {
      return NextResponse.json({ error: 'Title and canvas data are required' }, { status: 400 })
    }

    // Save art therapy drawing
    const { data: drawing, error } = await supabase
      .from('art_therapy_drawings')
      .insert({
        id: nanoid(),
        user_id: session.user.id,
        title: title.trim(),
        canvas_data,
        emotions_expressed: emotions_expressed || [],
        therapeutic_insights: therapeutic_insights || [],
        session_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to save drawing' }, { status: 500 })
    }

    return NextResponse.json(drawing)
  } catch (error) {
    console.error('Art drawings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
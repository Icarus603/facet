import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MemoryManager } from '@/lib/memory/memory-manager'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, ...params } = await request.json()
    const memoryManager = new MemoryManager()

    switch (action) {
      case 'store':
        const { content, memoryType, emotionalContext, importance, categories, relatedGoals } = params
        const memory = await memoryManager.storeMemory(
          user.id,
          content,
          memoryType,
          emotionalContext,
          importance,
          categories,
          relatedGoals
        )
        return NextResponse.json({ memory })

      case 'search':
        const { query, limit, minSimilarity } = params
        const results = await memoryManager.retrieveRelevantMemories(
          query,
          user.id,
          limit,
          minSimilarity
        )
        return NextResponse.json({ results })

      case 'contextual':
        const { emotion, context, contextLimit } = params
        const contextual = await memoryManager.getContextualMemories(
          emotion,
          context,
          user.id,
          contextLimit
        )
        return NextResponse.json({ memories: contextual })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Memory API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
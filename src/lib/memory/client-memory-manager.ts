import { MemoryType } from '@/lib/types/memory'
import { EmotionAnalysis } from '@/lib/types/agent'

export interface MemorySearchResult {
  id: string
  score: number
  content: string
  summary: string
  memoryType: MemoryType
  importance: number
  createdAt: Date
  categories: string[]
  therapeuticRelevance: number
}

/**
 * Client-side memory manager that communicates with server API
 */
export class ClientMemoryManager {
  private baseUrl = '/api/memory'

  async storeMemory(
    content: string,
    memoryType: MemoryType,
    emotionalContext?: EmotionAnalysis,
    importance: number = 0.5,
    categories: string[] = [],
    relatedGoals: string[] = []
  ): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store',
          content,
          memoryType,
          emotionalContext,
          importance,
          categories,
          relatedGoals
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to store memory: ${response.statusText}`)
      }

      const data = await response.json()
      return data.memory
    } catch (error) {
      console.error('Error storing memory:', error)
      throw error
    }
  }

  async retrieveRelevantMemories(
    query: string,
    limit: number = 5,
    minSimilarity: number = 0.7
  ): Promise<MemorySearchResult[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query,
          limit,
          minSimilarity
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to retrieve memories: ${response.statusText}`)
      }

      const data = await response.json()
      return data.results
    } catch (error) {
      console.error('Error retrieving memories:', error)
      return []
    }
  }

  async getContextualMemories(
    emotion: string,
    context: string,
    limit: number = 8
  ): Promise<MemorySearchResult[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'contextual',
          emotion,
          context,
          contextLimit: limit
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to get contextual memories: ${response.statusText}`)
      }

      const data = await response.json()
      return data.memories
    } catch (error) {
      console.error('Error getting contextual memories:', error)
      return []
    }
  }
}
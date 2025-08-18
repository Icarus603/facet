/**
 * FACET Memory Manager Agent
 * 
 * AI-powered memory retrieval, pattern recognition, and therapeutic insight generation
 * Implements exact AgentExecutionResult format from API_CONTRACT.md
 */

import { BaseAgent, AgentContext, createAgentConfig } from '../base-agent'
import { AgentExecutionResult, AGENT_NAMES, AGENT_CONFIG } from '@/lib/types/api-contract'
import { 
  MEMORY_MANAGER_SYSTEM_PROMPT, 
  buildMemoryAnalysisPrompt 
} from '../prompts/memory-manager-prompts'
import { getModelForAgent } from '@/lib/openai/client'
import { MemoryManager, MemorySearchResult } from '@/lib/memory/memory-manager'

export interface MemoryAnalysisResult {
  relevantMemories: {
    id: string
    content: string
    summary: string
    memoryType: string
    importance: number
    relevanceScore: number
    categories: string[]
    createdAt: string
    therapeuticRelevance: number
  }[]
  identifiedPatterns: {
    patternType: 'emotional' | 'behavioral' | 'interpersonal' | 'crisis' | 'progress'
    description: string
    frequency: number
    confidence: number
    therapeuticImplications: string[]
    examples: string[]
  }[]
  contextualInsights: string[]
  reasoning: string
  confidence: number
  insights: string[]
  recommendations: string[]
  contributedInsights: string[]
  therapeuticContinuity: {
    connectedThemes: string[]
    progressIndicators: string[]
    riskFactors: string[]
    strengthFactors: string[]
  }
  memoryGaps: string[]
  recommendedQuestions: string[]
}

export class MemoryManagerAgent extends BaseAgent {
  private memoryManager: MemoryManager

  constructor() {
    super(createAgentConfig(
      AGENT_NAMES.MEMORY_MANAGER,
      AGENT_CONFIG[AGENT_NAMES.MEMORY_MANAGER].displayName,
      AGENT_CONFIG[AGENT_NAMES.MEMORY_MANAGER].icon,
      MEMORY_MANAGER_SYSTEM_PROMPT,
      {
        model: getModelForAgent('memory_manager'),
        temperature: 0.4, // Moderate temperature for balanced analysis
        maxTokens: 2500,
        timeoutMs: 60000 // 60 second timeout for memory analysis (increased for proxy requests)
      }
    ))
    
    this.memoryManager = new MemoryManager()
  }

  /**
   * Prepare input for memory analysis
   */
  protected async prepareInput(context: AgentContext): Promise<any> {
    // Retrieve relevant memories from Pinecone
    const memories = await this.retrieveRelevantMemories(
      context.userMessage,
      context.userId,
      context.emotionalState
    )

    return {
      message: context.userMessage,
      userId: context.userId,
      retrievedMemories: memories,
      emotionalContext: context.emotionalState,
      previousResults: context.previousResults
    }
  }

  /**
   * Perform AI-powered memory analysis
   */
  protected async performAnalysis(input: any, context: AgentContext): Promise<MemoryAnalysisResult> {
    try {
      // Build messages for OpenAI
      const messages = await this.buildMessages(input, context)

      // Call OpenAI API
      const response = await this.callOpenAI(messages)

      // Parse JSON response
      const memoryAnalysis = JSON.parse(response)

      // Validate and return structured memory analysis
      return this.validateMemoryAnalysis(memoryAnalysis, input.retrievedMemories)

    } catch (error) {
      console.error('Memory analysis error:', error)
      throw error
    }
  }

  /**
   * Process and validate the analysis result
   */
  protected async processResult(result: MemoryAnalysisResult): Promise<MemoryAnalysisResult> {
    // Store significant insights as new memories
    await this.storeInsightsAsMemories(result)

    // Ensure all required fields are present with proper structure
    return {
      relevantMemories: result.relevantMemories || [],
      identifiedPatterns: result.identifiedPatterns || [],
      contextualInsights: result.contextualInsights || [],
      reasoning: result.reasoning || 'Memory analysis completed',
      confidence: Math.max(0, Math.min(1, result.confidence || 0.7)),
      insights: result.insights || [],
      recommendations: result.recommendations || [],
      contributedInsights: result.contributedInsights || [],
      therapeuticContinuity: result.therapeuticContinuity || {
        connectedThemes: [],
        progressIndicators: [],
        riskFactors: [],
        strengthFactors: []
      },
      memoryGaps: result.memoryGaps || [],
      recommendedQuestions: result.recommendedQuestions || []
    }
  }

  /**
   * Format user input for the AI prompt
   */
  protected async formatUserInput(input: any): Promise<string> {
    return buildMemoryAnalysisPrompt(
      input.message,
      input.retrievedMemories,
      input.emotionalContext,
      input.previousResults?.crisis
    )
  }

  /**
   * Provide fallback result for errors
   */
  protected async getFallbackResult(error: Error, context: AgentContext): Promise<MemoryAnalysisResult> {
    // Simple fallback when AI analysis fails
    const basicMemories = await this.retrieveRelevantMemories(
      context.userMessage, 
      context.userId,
      context.emotionalState
    )

    return {
      relevantMemories: basicMemories.slice(0, 3).map(mem => ({
        id: mem.id,
        content: mem.content,
        summary: mem.summary,
        memoryType: mem.memoryType,
        importance: mem.importance,
        relevanceScore: mem.score,
        categories: mem.categories,
        createdAt: mem.createdAt.toISOString(),
        therapeuticRelevance: mem.therapeuticRelevance
      })),
      identifiedPatterns: [],
      contextualInsights: ['Memory analysis unavailable'],
      reasoning: `Fallback analysis due to error: ${error.message}`,
      confidence: 0.3,
      insights: ['Unable to perform full memory analysis'],
      recommendations: ['Please try again or contact support'],
      contributedInsights: ['Basic memory retrieval only'],
      therapeuticContinuity: {
        connectedThemes: [],
        progressIndicators: [],
        riskFactors: [],
        strengthFactors: []
      },
      memoryGaps: ['Full memory analysis unavailable'],
      recommendedQuestions: []
    }
  }

  /**
   * Retrieve relevant memories from Pinecone
   */
  private async retrieveRelevantMemories(
    message: string,
    userId: string,
    emotionalState?: any
  ): Promise<MemorySearchResult[]> {
    try {
      // Enhanced query construction based on emotional context
      let queryText = message

      if (emotionalState?.primaryEmotion) {
        queryText += ` ${emotionalState.primaryEmotion}`
      }

      // Retrieve memories with different strategies
      const [
        similarMemories,
        emotionalMemories,
        recentMemories
      ] = await Promise.allSettled([
        // Semantic similarity search
        this.memoryManager.retrieveRelevantMemories(queryText, userId, 8, 0.75),
        
        // Emotion-based memories
        emotionalState?.primaryEmotion 
          ? this.memoryManager.getContextualMemories(
              emotionalState.primaryEmotion,
              this.extractTopics(message)[0] || '',
              userId
            )
          : Promise.resolve([]),
          
        // Recent relevant memories (last 7 days)
        this.memoryManager.getContextualMemories(
          message,
          '',
          userId,
          {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
        )
      ])

      // Combine and deduplicate results
      const allMemories = new Map<string, MemorySearchResult>()
      
      if (similarMemories.status === 'fulfilled') {
        similarMemories.value.forEach(mem => allMemories.set(mem.id, mem))
      }
      if (emotionalMemories.status === 'fulfilled') {
        emotionalMemories.value.forEach(mem => allMemories.set(mem.id, mem))
      }
      if (recentMemories.status === 'fulfilled') {
        recentMemories.value.forEach(mem => allMemories.set(mem.id, mem))
      }

      // Sort by relevance and therapeutic importance
      return Array.from(allMemories.values())
        .sort((a, b) => {
          const scoreA = (a.score * 0.7) + (a.therapeuticRelevance * 0.3)
          const scoreB = (b.score * 0.7) + (b.therapeuticRelevance * 0.3)
          return scoreB - scoreA
        })
        .slice(0, 10) // Limit to top 10 memories

    } catch (error) {
      console.error('Error retrieving memories:', error)
      return []
    }
  }

  /**
   * Store significant insights as new memories
   */
  private async storeInsightsAsMemories(result: MemoryAnalysisResult): Promise<void> {
    try {
      // Store significant patterns as memories
      for (const pattern of result.identifiedPatterns) {
        if (pattern.confidence > 0.7 && pattern.therapeuticImplications.length > 0) {
          const content = `Pattern identified: ${pattern.description}. Therapeutic implications: ${pattern.therapeuticImplications.join(', ')}`
          
          await this.memoryManager.storeMemory(
            '', // userId will be set by context
            content,
            'pattern',
            undefined,
            0.8, // High importance for therapeutic patterns
            ['pattern', pattern.patternType],
            [] // No specific goals yet
          )
        }
      }

      // Store significant contextual insights
      for (const insight of result.contextualInsights) {
        if (insight.length > 20) { // Filter trivial insights
          await this.memoryManager.storeMemory(
            '',
            `Therapeutic insight: ${insight}`,
            'insight',
            undefined,
            0.7,
            ['insight', 'therapy'],
            []
          )
        }
      }

    } catch (error) {
      console.error('Error storing insights as memories:', error)
      // Don't fail the entire analysis if memory storage fails
    }
  }

  /**
   * Validate memory analysis response from AI
   */
  private validateMemoryAnalysis(analysis: any, retrievedMemories: MemorySearchResult[]): MemoryAnalysisResult {
    return {
      relevantMemories: Array.isArray(analysis.relevantMemories) 
        ? analysis.relevantMemories 
        : retrievedMemories.slice(0, 5).map(mem => ({
            id: mem.id,
            content: mem.content,
            summary: mem.summary,
            memoryType: mem.memoryType,
            importance: mem.importance,
            relevanceScore: mem.score,
            categories: mem.categories,
            createdAt: mem.createdAt.toISOString(),
            therapeuticRelevance: mem.therapeuticRelevance
          })),
      identifiedPatterns: Array.isArray(analysis.identifiedPatterns) ? analysis.identifiedPatterns : [],
      contextualInsights: Array.isArray(analysis.contextualInsights) ? analysis.contextualInsights : [],
      reasoning: analysis.reasoning || 'Memory analysis completed',
      confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0.7,
      insights: Array.isArray(analysis.insights) ? analysis.insights : [],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      contributedInsights: Array.isArray(analysis.contributedInsights) ? analysis.contributedInsights : [],
      therapeuticContinuity: analysis.therapeuticContinuity || {
        connectedThemes: [],
        progressIndicators: [],
        riskFactors: [],
        strengthFactors: []
      },
      memoryGaps: Array.isArray(analysis.memoryGaps) ? analysis.memoryGaps : [],
      recommendedQuestions: Array.isArray(analysis.recommendedQuestions) ? analysis.recommendedQuestions : []
    }
  }

  /**
   * Extract topics from message for contextual search
   */
  private extractTopics(message: string): string[] {
    const commonTopics = [
      'work', 'family', 'relationship', 'health', 'money', 'school', 
      'friends', 'therapy', 'medication', 'sleep', 'anxiety', 'depression'
    ]
    
    const lowerMessage = message.toLowerCase()
    return commonTopics.filter(topic => lowerMessage.includes(topic))
  }
}

// Create singleton instance
export const memoryManagerAgent = new MemoryManagerAgent()

// Export helper function for backward compatibility
export async function analyzeMemories(
  message: string,
  userId: string,
  startTimeMs: number,
  emotionalState?: any,
  assignedTask: string = 'Retrieve relevant memories and identify patterns'
): Promise<AgentExecutionResult> {
  const context: AgentContext = {
    userId,
    messageId: `memory_${Date.now()}`,
    conversationId: `conv_${userId}_${Date.now()}`,
    userMessage: message,
    emotionalState
  }
  
  return await memoryManagerAgent.execute(context, assignedTask, startTimeMs)
}
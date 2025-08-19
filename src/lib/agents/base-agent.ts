/**
 * FACET Base Agent Class
 * 
 * Foundation class for all AI-powered agents with GPT-5 integration,
 * streaming support, error handling, and performance monitoring.
 */

import OpenAI from 'openai'
import { getOpenAIClient } from '@/lib/openai/client'
import { AgentExecutionResult } from '@/lib/types/api-contract'

export interface AgentConfig {
  name: string
  displayName: string
  icon: string
  model?: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
  retryAttempts?: number
  systemPrompt: string
}

export interface AgentContext {
  userId: string
  messageId: string
  conversationId: string
  userMessage: string
  emotionalState?: any
  memoryContext?: any
  previousResults?: Record<string, any>
  urgencyLevel?: 'normal' | 'elevated' | 'crisis'
}

export interface StreamingCallback {
  onToken?: (token: string) => void
  onComplete?: (fullResponse: string) => void
  onError?: (error: Error) => void
}

export abstract class BaseAgent {
  protected openai: OpenAI
  protected config: AgentConfig
  
  constructor(config: AgentConfig) {
    this.config = {
      model: 'gpt-5-2025-08-07',
      temperature: 0.7,
      maxTokens: 1500,
      timeoutMs: 30000,
      retryAttempts: 2,
      ...config
    }
    this.openai = getOpenAIClient()
  }

  /**
   * Execute agent with full monitoring and error handling
   */
  async execute(
    context: AgentContext,
    assignedTask: string,
    startTimeMs: number
  ): Promise<AgentExecutionResult> {
    const agentStart = Date.now()
    
    try {
      // Prepare agent input
      const input = await this.prepareInput(context)
      
      // Execute with retry logic
      const result = await this.executeWithRetry(input, context)
      
      // Process and validate result
      const processedResult = await this.processResult(result, context)
      
      const executionTimeMs = Date.now() - agentStart
      
      return {
        agentName: this.config.name,
        agentDisplayName: this.config.displayName,
        agentIcon: this.config.icon,
        assignedTask,
        inputData: { 
          message: context.userMessage,
          userId: context.userId,
          emotionalState: context.emotionalState
        },
        executionTimeMs,
        executionType: 'parallel',
        startTimeMs: agentStart - startTimeMs,
        endTimeMs: (agentStart - startTimeMs) + executionTimeMs,
        result: processedResult,
        confidence: processedResult.confidence || 0.8,
        success: true,
        reasoning: processedResult.reasoning || 'Analysis completed successfully',
        keyInsights: processedResult.insights || [],
        recommendationsToOrchestrator: processedResult.recommendations || [],
        influenceOnFinalResponse: 0.8,
        contributedInsights: processedResult.contributedInsights || []
      }
      
    } catch (error) {
      const executionTimeMs = Date.now() - agentStart
      
      console.error(`${this.config.name} execution error:`, error)
      
      return {
        agentName: this.config.name,
        agentDisplayName: this.config.displayName,
        agentIcon: this.config.icon,
        assignedTask,
        inputData: { 
          message: context.userMessage,
          userId: context.userId,
          emotionalState: context.emotionalState
        },
        executionTimeMs,
        executionType: 'parallel',
        startTimeMs: agentStart - startTimeMs,
        endTimeMs: (agentStart - startTimeMs) + executionTimeMs,
        result: await this.getFallbackResult(error instanceof Error ? error : new Error('Unknown error'), context),
        confidence: 0.2,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        reasoning: `Error during execution: ${error instanceof Error ? error.message : 'Unknown error'}`,
        keyInsights: [],
        recommendationsToOrchestrator: ['Please try again or contact support if the issue persists'],
        influenceOnFinalResponse: 0.1,
        contributedInsights: []
      }
    }
  }

  /**
   * Execute with streaming support
   */
  async executeStreaming(
    context: AgentContext,
    callback: StreamingCallback
  ): Promise<string> {
    try {
      const input = await this.prepareInput(context)
      const messages = await this.buildMessages(input, context)
      
      const params: any = {
        model: this.config.model!,
        messages,
        max_completion_tokens: this.config.maxTokens,
        stream: true
      }
      
      // GPT-5 only supports default temperature (1), don't set it
      if (this.config.model !== 'gpt-5-2025-08-07') {
        params.temperature = this.config.temperature
      }
      
      const stream = await this.openai.chat.completions.create(params)

      let fullResponse = ''
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          fullResponse += content
          callback.onToken?.(content)
        }
      }
      
      callback.onComplete?.(fullResponse)
      return fullResponse
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Unknown streaming error')
      callback.onError?.(errorObj)
      throw errorObj
    }
  }

  /**
   * Execute with retry logic and timeout
   */
  private async executeWithRetry(input: any, context: AgentContext): Promise<any> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        return await Promise.race([
          this.performAnalysis(input, context),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Agent execution timeout')), this.config.timeoutMs)
          )
        ])
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt === this.config.retryAttempts) {
          throw lastError
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }

  /**
   * Build OpenAI messages array
   */
  protected async buildMessages(input: any, context: AgentContext): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.config.systemPrompt
      }
    ]
    
    // Add context if available
    if (context.emotionalState) {
      messages.push({
        role: 'system',
        content: `Current emotional context: ${JSON.stringify(context.emotionalState, null, 2)}`
      })
    }
    
    if (context.memoryContext && context.memoryContext.length > 0) {
      messages.push({
        role: 'system',
        content: `Relevant memories: ${JSON.stringify(context.memoryContext, null, 2)}`
      })
    }
    
    // Add the user message
    messages.push({
      role: 'user',
      content: await this.formatUserInput(input, context)
    })
    
    return messages
  }

  /**
   * Make OpenAI API call
   */
  protected async callOpenAI(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<string> {
    const params: any = {
      model: this.config.model!,
      messages,
      max_completion_tokens: this.config.maxTokens
    }
    
    // GPT-5 only supports default temperature (1), don't set it
    if (this.config.model !== 'gpt-5-2025-08-07') {
      params.temperature = this.config.temperature
    }
    
    const response = await this.openai.chat.completions.create(params)
    return response.choices[0]?.message?.content || ''
  }

  /**
   * Abstract methods to be implemented by specific agents
   */
  protected abstract prepareInput(context: AgentContext): Promise<any>
  protected abstract performAnalysis(input: any, context: AgentContext): Promise<any>
  protected abstract processResult(result: any, context: AgentContext): Promise<any>
  protected abstract getFallbackResult(error: Error, context: AgentContext): Promise<any>
  protected abstract formatUserInput(input: any, context: AgentContext): Promise<string>
}

/**
 * Utility function to create agent-specific configurations
 */
export function createAgentConfig(
  name: string,
  displayName: string,
  icon: string,
  systemPrompt: string,
  overrides?: Partial<AgentConfig>
): AgentConfig {
  return {
    name,
    displayName,
    icon,
    systemPrompt,
    ...overrides
  }
}
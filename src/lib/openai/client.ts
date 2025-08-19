import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

// Model configuration with GPT-5 support
export const MODELS = {
  GPT_5: 'gpt-5-2025-08-07',
  GPT_4_TURBO: 'gpt-4-turbo-2024-04-09',
  GPT_4: 'gpt-4',
  EMBEDDING: 'text-embedding-3-large'
} as const

export type ModelType = typeof MODELS[keyof typeof MODELS]

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    // Check for HTTP proxy environment variables
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy
    
    let clientOptions: any = {
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID,
      defaultHeaders: {
        'User-Agent': 'FACET-Mental-Health-Platform/2.0',
      },
      timeout: 120000, // 2 minutes for proxy requests
      maxRetries: 5, // More retries for proxy instability
    }
    
    if (httpProxy || httpsProxy) {
      console.log('🌐 Configuring OpenAI client with proxy:', {
        httpProxy: httpProxy ? '[configured]' : 'none',
        httpsProxy: httpsProxy ? '[configured]' : 'none'
      })
      
      const proxyUrl = httpsProxy || httpProxy
      
      // For OpenAI SDK v4+, we need to use fetch with proxy
      const { ProxyAgent } = require('undici')
      const proxyAgent = new ProxyAgent(proxyUrl)
      
      // Override the fetch implementation to use proxy
      clientOptions.fetch = async (url: any, options: any = {}) => {
        const { fetch } = require('undici')
        return fetch(url, {
          ...options,
          dispatcher: proxyAgent
        })
      }
      
      console.log('✅ Enhanced proxy agent configured for OpenAI SDK v4+:', proxyUrl)
      console.log('⏱️  Using undici ProxyAgent with fetch override')
    }

    openaiClient = new OpenAI(clientOptions)

    console.log('✅ OpenAI client initialized with proxy support')
  }

  return openaiClient
}

/**
 * Get the appropriate model for a given agent type
 */
export function getModelForAgent(agentType: string): ModelType {
  const envVar = `${agentType.toUpperCase()}_MODEL`
  const configuredModel = process.env[envVar]
  
  if (configuredModel && Object.values(MODELS).includes(configuredModel as ModelType)) {
    return configuredModel as ModelType
  }
  
  // Default to GPT-5
  return MODELS.GPT_5
}

/**
 * Chat completion with streaming support
 */
export async function createChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: {
    model?: ModelType
    temperature?: number
    maxTokens?: number
    stream?: boolean
    userId?: string
    functions?: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[]
  } = {}
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const client = getOpenAIClient()
  
  const params: any = {
    model: options.model || MODELS.GPT_5,
    messages,
    max_completion_tokens: options.maxTokens || 1500,
    stream: false, // Ensure we don't stream for this function
    user: options.userId, // For abuse detection and analytics
  }
  
  // GPT-5 only supports default temperature (1), don't set it
  const modelToUse = options.model || MODELS.GPT_5
  if (modelToUse !== MODELS.GPT_5) {
    params.temperature = options.temperature ?? 0.7
  }
  
  if (options.functions) {
    params.functions = options.functions
  }
  
  try {
    const result = await client.chat.completions.create(params)
    return result as OpenAI.Chat.Completions.ChatCompletion
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Fallback to GPT-4 if GPT-5 fails
    if (params.model === MODELS.GPT_5) {
      console.log('Falling back to GPT-4 Turbo')
      params.model = MODELS.GPT_4_TURBO
      const fallbackResult = await client.chat.completions.create(params)
      return fallbackResult as OpenAI.Chat.Completions.ChatCompletion
    }
    
    throw error
  }
}

/**
 * Streaming chat completion
 */
export async function createStreamingCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: {
    model?: ModelType
    temperature?: number
    maxTokens?: number
    userId?: string
  } = {}
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const client = getOpenAIClient()
  
  const params: any = {
    model: options.model || MODELS.GPT_5,
    messages,
    max_completion_tokens: options.maxTokens || 1500,
    stream: true,
    user: options.userId,
  }
  
  // GPT-5 only supports default temperature (1), don't set it
  const modelToUse = options.model || MODELS.GPT_5
  if (modelToUse !== MODELS.GPT_5) {
    params.temperature = options.temperature ?? 0.7
  }
  
  try {
    return await client.chat.completions.create(params)
  } catch (error) {
    console.error('OpenAI streaming error:', error)
    
    // Fallback to GPT-4 if GPT-5 fails
    if (params.model === MODELS.GPT_5) {
      console.log('Falling back to GPT-4 Turbo for streaming')
      params.model = MODELS.GPT_4_TURBO
      return await client.chat.completions.create(params)
    }
    
    throw error
  }
}

/**
 * Generate embeddings using OpenAI's latest embedding model
 */
export async function generateEmbeddings(
  texts: string[],
  model: ModelType = MODELS.EMBEDDING
): Promise<number[][]> {
  const client = getOpenAIClient()

  try {
    const response = await client.embeddings.create({
      model,
      input: texts,
      encoding_format: 'float'
    })

    return response.data.map(item => item.embedding)
  } catch (error) {
    console.error('Error generating embeddings:', error)
    throw new Error(`Failed to generate embeddings: ${error}`)
  }
}

/**
 * Generate a single embedding
 */
export async function generateEmbedding(
  text: string,
  model: ModelType = MODELS.EMBEDDING
): Promise<number[]> {
  const embeddings = await generateEmbeddings([text], model)
  return embeddings[0]
}

/**
 * Generate summary using OpenAI GPT models
 */
export async function generateSummary(
  content: string,
  maxLength: number = 100,
  model: ModelType = MODELS.GPT_5
): Promise<string> {
  const client = getOpenAIClient()

  try {
    const params: any = {
      model,
      messages: [
        {
          role: 'system',
          content: `You are a therapist assistant that creates concise, therapeutic summaries of user conversations and memories. Focus on the key therapeutic insights, emotions, and important details. Keep summaries under ${maxLength} characters.`
        },
        {
          role: 'user',
          content: `Please create a therapeutic summary of this content:\n\n${content}`
        }
      ],
      max_completion_tokens: Math.floor(maxLength / 2), // Rough estimate
    }
    
    // GPT-5 only supports default temperature (1), don't set it
    if (model !== MODELS.GPT_5) {
      params.temperature = 0.3 // Lower temperature for consistency
    }
    
    const response = await client.chat.completions.create(params)

    const summary = response.choices[0]?.message?.content?.trim() || ''
    return summary.length > maxLength 
      ? summary.substring(0, maxLength - 3) + '...'
      : summary
  } catch (error) {
    console.error('Error generating summary:', error)
    
    // Fallback to extractive summary
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    if (sentences.length <= 1) {
      return content.trim().substring(0, maxLength)
    }
    
    const firstSentence = sentences[0].trim()
    return firstSentence.length > maxLength 
      ? firstSentence.substring(0, maxLength - 3) + '...'
      : firstSentence
  }
}

/**
 * Analyze emotional content using GPT
 */
export async function analyzeEmotionalContent(
  content: string,
  model: ModelType = MODELS.GPT_5
): Promise<{
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  therapeuticRelevance: number;
  keyThemes: string[];
  emotionalTone: number; // -1 to 1
}> {
  const client = getOpenAIClient()

  try {
    const params: any = {
      model,
      messages: [
        {
          role: 'system',
          content: `You are a licensed therapist analyzing content for therapeutic relevance and emotional sensitivity. Respond with JSON only.

Analyze the content and return:
{
  "sensitivity": "low|medium|high|critical", // Based on mental health sensitivity
  "therapeuticRelevance": 0.0-1.0, // How relevant this is for therapy
  "keyThemes": ["theme1", "theme2"], // Key therapeutic themes
  "emotionalTone": -1.0 to 1.0 // Negative to positive emotional tone
}

Sensitivity levels:
- critical: Suicide, self-harm, abuse, severe crisis
- high: Depression, anxiety, trauma, medication issues
- medium: General mental health topics, relationships
- low: Daily activities, neutral topics`
        },
        {
          role: 'user',
          content: `Analyze this content:\n\n${content}`
        }
      ],
      max_completion_tokens: 200,
    }
    
    // GPT-5 only supports default temperature (1), don't set it
    if (model !== MODELS.GPT_5) {
      params.temperature = 0.1
    }
    
    const response = await client.chat.completions.create(params)

    const result = response.choices[0]?.message?.content?.trim()
    if (result) {
      return JSON.parse(result)
    }
  } catch (error) {
    console.error('Error analyzing emotional content:', error)
  }

  // Fallback analysis
  const lowerContent = content.toLowerCase()
  
  // Critical keywords
  const criticalKeywords = ['suicide', 'kill myself', 'self-harm', 'abuse', 'rape']
  if (criticalKeywords.some(keyword => lowerContent.includes(keyword))) {
    return {
      sensitivity: 'critical',
      therapeuticRelevance: 1.0,
      keyThemes: ['crisis', 'safety'],
      emotionalTone: -0.8
    }
  }
  
  // High sensitivity
  const highKeywords = ['depression', 'anxiety', 'panic', 'trauma', 'medication']
  if (highKeywords.some(keyword => lowerContent.includes(keyword))) {
    return {
      sensitivity: 'high',
      therapeuticRelevance: 0.8,
      keyThemes: ['mental-health'],
      emotionalTone: -0.4
    }
  }
  
  // Medium sensitivity
  const mediumKeywords = ['therapy', 'counseling', 'stress', 'relationship']
  if (mediumKeywords.some(keyword => lowerContent.includes(keyword))) {
    return {
      sensitivity: 'medium',
      therapeuticRelevance: 0.6,
      keyThemes: ['therapy', 'relationships'],
      emotionalTone: 0.0
    }
  }
  
  return {
    sensitivity: 'low',
    therapeuticRelevance: 0.3,
    keyThemes: ['general'],
    emotionalTone: 0.1
  }
}
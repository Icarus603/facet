import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  return openaiClient
}

/**
 * Generate embeddings using OpenAI's text-embedding-ada-002 model
 */
export async function generateEmbeddings(
  texts: string[],
  model: string = 'text-embedding-ada-002'
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
  model: string = 'text-embedding-ada-002'
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
  model: string = 'gpt-4'
): Promise<string> {
  const client = getOpenAIClient()

  try {
    const response = await client.chat.completions.create({
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
      max_tokens: Math.floor(maxLength / 2), // Rough estimate
      temperature: 0.3 // Lower temperature for consistency
    })

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
  model: string = 'gpt-4'
): Promise<{
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  therapeuticRelevance: number;
  keyThemes: string[];
  emotionalTone: number; // -1 to 1
}> {
  const client = getOpenAIClient()

  try {
    const response = await client.chat.completions.create({
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
      max_tokens: 200,
      temperature: 0.1
    })

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
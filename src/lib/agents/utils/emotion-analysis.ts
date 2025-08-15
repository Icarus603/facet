import { EmotionAnalysis } from '@/lib/types/agent'

/**
 * Emotion Analysis Utility
 * Provides real-time emotion detection and analysis
 * Based on VAD (Valence-Arousal-Dominance) model
 */

// Emotion keywords mapped to VAD values and intensities
const EMOTION_PATTERNS = {
  // High intensity positive emotions
  joy: {
    keywords: ['happy', 'joy', 'joyful', 'excited', 'thrilled', 'ecstatic', 'elated', 'euphoric'],
    valence: 85,
    arousal: 75,
    dominance: 70,
    baseIntensity: 7
  },
  gratitude: {
    keywords: ['grateful', 'thankful', 'blessed', 'appreciative', 'thankful'],
    valence: 80,
    arousal: 45,
    dominance: 65,
    baseIntensity: 6
  },
  
  // Moderate positive emotions
  contentment: {
    keywords: ['content', 'satisfied', 'peaceful', 'calm', 'serene', 'relaxed'],
    valence: 70,
    arousal: 25,
    dominance: 60,
    baseIntensity: 5
  },
  
  // High intensity negative emotions
  anger: {
    keywords: ['angry', 'furious', 'enraged', 'livid', 'irritated', 'frustrated', 'mad'],
    valence: 15,
    arousal: 85,
    dominance: 75,
    baseIntensity: 8
  },
  sadness: {
    keywords: ['sad', 'depressed', 'miserable', 'heartbroken', 'devastated', 'grief'],
    valence: 20,
    arousal: 35,
    dominance: 25,
    baseIntensity: 7
  },
  anxiety: {
    keywords: ['anxious', 'worried', 'nervous', 'panic', 'stressed', 'overwhelmed', 'fearful'],
    valence: 25,
    arousal: 80,
    dominance: 20,
    baseIntensity: 8
  },
  fear: {
    keywords: ['afraid', 'scared', 'terrified', 'frightened', 'petrified'],
    valence: 20,
    arousal: 75,
    dominance: 15,
    baseIntensity: 7
  },
  
  // Moderate negative emotions
  disappointment: {
    keywords: ['disappointed', 'let down', 'discouraged', 'defeated'],
    valence: 35,
    arousal: 40,
    dominance: 30,
    baseIntensity: 5
  },
  loneliness: {
    keywords: ['lonely', 'alone', 'isolated', 'disconnected', 'abandoned'],
    valence: 25,
    arousal: 30,
    dominance: 20,
    baseIntensity: 6
  },
  
  // Neutral/mixed emotions
  confusion: {
    keywords: ['confused', 'uncertain', 'lost', 'unclear', 'mixed up'],
    valence: 45,
    arousal: 55,
    dominance: 35,
    baseIntensity: 4
  },
  neutral: {
    keywords: ['okay', 'fine', 'normal', 'average', 'alright'],
    valence: 50,
    arousal: 50,
    dominance: 50,
    baseIntensity: 3
  }
}

// Intensity modifiers
const INTENSITY_MODIFIERS = {
  amplifiers: {
    'extremely': 2.0,
    'incredibly': 1.8,
    'very': 1.5,
    'really': 1.3,
    'quite': 1.2,
    'pretty': 1.1,
    'so': 1.4,
    'totally': 1.6,
    'completely': 1.7
  },
  diminishers: {
    'slightly': 0.7,
    'somewhat': 0.8,
    'a bit': 0.75,
    'a little': 0.7,
    'kind of': 0.8,
    'sort of': 0.8
  }
}

/**
 * Analyze emotion from text input with historical context
 */
export async function emotionAnalysis(
  input: string,
  emotionalHistory: EmotionAnalysis[] = []
): Promise<EmotionAnalysis> {
  const startTime = performance.now()
  
  const normalizedInput = input.toLowerCase()
  const detectedEmotions: { [key: string]: number } = {}
  const triggers: string[] = []
  
  let primaryEmotion = 'neutral'
  let maxIntensity = 0
  let valence = 50
  let arousal = 50
  let dominance = 50
  
  // Detect emotions and calculate intensities
  for (const [emotion, pattern] of Object.entries(EMOTION_PATTERNS)) {
    let emotionIntensity = 0
    let foundKeywords: string[] = []
    
    // Check for keyword matches
    for (const keyword of pattern.keywords) {
      if (normalizedInput.includes(keyword)) {
        foundKeywords.push(keyword)
        emotionIntensity = Math.max(emotionIntensity, pattern.baseIntensity)
      }
    }
    
    // Apply intensity modifiers
    if (emotionIntensity > 0) {
      for (const [modifier, multiplier] of Object.entries(INTENSITY_MODIFIERS.amplifiers)) {
        if (normalizedInput.includes(modifier)) {
          emotionIntensity *= multiplier
          break
        }
      }
      
      for (const [modifier, multiplier] of Object.entries(INTENSITY_MODIFIERS.diminishers)) {
        if (normalizedInput.includes(modifier)) {
          emotionIntensity *= multiplier
          break
        }
      }
    }
    
    // Cap intensity at 10
    emotionIntensity = Math.min(10, emotionIntensity)
    
    if (emotionIntensity > 0) {
      detectedEmotions[emotion] = emotionIntensity
      triggers.push(...foundKeywords)
      
      // Update primary emotion if this is stronger
      if (emotionIntensity > maxIntensity) {
        maxIntensity = emotionIntensity
        primaryEmotion = emotion
        valence = pattern.valence
        arousal = pattern.arousal
        dominance = pattern.dominance
      }
    }
  }
  
  // If no emotions detected, analyze context and history
  if (maxIntensity === 0 && emotionalHistory.length > 0) {
    const recentEmotion = emotionalHistory[emotionalHistory.length - 1]
    primaryEmotion = recentEmotion.primaryEmotion
    maxIntensity = Math.max(1, recentEmotion.intensity * 0.7) // Decay previous emotion
    valence = recentEmotion.valence
    arousal = recentEmotion.arousal
  }
  
  // Calculate confidence based on keyword matches and context
  let confidence = 0.5
  if (triggers.length > 0) {
    confidence = Math.min(0.95, 0.6 + (triggers.length * 0.1))
  }
  
  // Determine emotional trend
  let emotionalTrend: 'improving' | 'stable' | 'declining' = 'stable'
  if (emotionalHistory.length >= 3) {
    const recentHistory = emotionalHistory.slice(-3)
    const avgPreviousValence = recentHistory.reduce((sum, e) => sum + e.valence, 0) / recentHistory.length
    
    if (valence > avgPreviousValence + 10) {
      emotionalTrend = 'improving'
    } else if (valence < avgPreviousValence - 10) {
      emotionalTrend = 'declining'
    }
  }
  
  // Generate contextual factors
  const contextualFactors = generateContextualFactors(normalizedInput, primaryEmotion)
  
  const processingTime = performance.now() - startTime
  
  // Map detected emotions to the expected format
  const emotions = {
    joy: detectedEmotions.joy || detectedEmotions.gratitude || detectedEmotions.contentment || 0,
    sadness: detectedEmotions.sadness || detectedEmotions.disappointment || 0,
    anger: detectedEmotions.anger || 0,
    fear: detectedEmotions.fear || detectedEmotions.anxiety || 0,
    surprise: 0, // Would need more sophisticated detection
    disgust: 0,  // Would need more sophisticated detection
    anxiety: detectedEmotions.anxiety || 0,
    depression: detectedEmotions.sadness || 0
  }
  
  return {
    primaryEmotion,
    intensity: Math.round(maxIntensity),
    valence,
    arousal, // VAD model: arousal (calm to excited)
    confidence: Math.round(confidence * 100) / 100,
    emotions,
    linguisticMarkers: triggers,
    emotionalTrend
  }
}

/**
 * Generate contextual factors that might be influencing emotion
 */
function generateContextualFactors(input: string, primaryEmotion: string): string[] {
  const factors: string[] = []
  
  // Work-related stress
  if (input.includes('work') || input.includes('job') || input.includes('boss')) {
    factors.push('work-related')
  }
  
  // Relationship factors
  if (input.includes('family') || input.includes('friend') || input.includes('partner')) {
    factors.push('relationship-related')
  }
  
  // Health factors
  if (input.includes('sick') || input.includes('health') || input.includes('pain')) {
    factors.push('health-related')
  }
  
  // Financial factors
  if (input.includes('money') || input.includes('financial') || input.includes('bills')) {
    factors.push('financial-stress')
  }
  
  // Time of expression
  const hour = new Date().getHours()
  if (hour < 6 || hour > 22) {
    factors.push('late-night-expression')
  }
  
  // Intensity factors
  if (primaryEmotion === 'anxiety' || primaryEmotion === 'fear') {
    factors.push('anxiety-response')
  }
  
  return factors
}

/**
 * Compare current emotion with expected baseline for user
 */
export function compareWithBaseline(
  currentEmotion: EmotionAnalysis,
  userBaseline: EmotionAnalysis
): {
  significantChange: boolean
  direction: 'positive' | 'negative' | 'neutral'
  magnitude: number
  concerns: string[]
} {
  const valenceDiff = currentEmotion.valence - userBaseline.valence
  const intensityDiff = currentEmotion.intensity - userBaseline.intensity
  
  const magnitude = Math.abs(valenceDiff) + Math.abs(intensityDiff)
  const significantChange = magnitude > 20
  
  let direction: 'positive' | 'negative' | 'neutral' = 'neutral'
  if (valenceDiff > 10 && intensityDiff > -2) {
    direction = 'positive'
  } else if (valenceDiff < -10 || intensityDiff > 3) {
    direction = 'negative'
  }
  
  const concerns: string[] = []
  if (currentEmotion.intensity > 7 && currentEmotion.valence < 30) {
    concerns.push('high-intensity-negative-emotion')
  }
  if (currentEmotion.intensity > 8) {
    concerns.push('emotional-overwhelm')
  }
  
  return {
    significantChange,
    direction,
    magnitude,
    concerns
  }
}
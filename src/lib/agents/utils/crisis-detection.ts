/**
 * Crisis Detection Utility
 * Multi-layer crisis detection system for immediate risk assessment
 * Based on SPECS.md safety requirements
 */

export interface CrisisDetectionResult {
  hasCrisisKeywords: boolean
  riskLevel: 'low' | 'moderate' | 'high' | 'severe'
  confidence: number
  triggerWords: string[]
  categories: string[]
  immediateIntervention: boolean
}

// High-risk crisis keywords (immediate escalation)
const SEVERE_CRISIS_KEYWORDS = [
  // Suicide ideation
  'suicide', 'kill myself', 'end my life', 'want to die', 'better off dead',
  'suicide plan', 'how to kill', 'ways to die', 'suicide method',
  
  // Self-harm
  'cut myself', 'hurt myself', 'self harm', 'self-harm', 'harm myself',
  'cutting', 'burning myself', 'overdose',
  
  // Immediate danger
  'going to kill', 'tonight is the night', 'this is it', 'goodbye forever',
  'final message', 'won\'t be here tomorrow',
  
  // Means and planning
  'have pills', 'have rope', 'have gun', 'wrote note', 'suicide note',
  'final preparations', 'ready to go'
]

// Moderate risk keywords (heightened monitoring)
const MODERATE_CRISIS_KEYWORDS = [
  // Hopelessness
  'hopeless', 'no point', 'nothing matters', 'can\'t go on', 'give up',
  'no future', 'no hope', 'meaningless', 'pointless',
  
  // Emotional distress
  'overwhelmed', 'can\'t cope', 'breaking down', 'falling apart',
  'can\'t handle', 'too much pain', 'unbearable',
  
  // Isolation indicators
  'alone', 'nobody cares', 'no one understands', 'isolated',
  'disconnected', 'abandoned'
]

// Mild concern keywords (monitoring)
const MILD_CONCERN_KEYWORDS = [
  'depressed', 'anxious', 'struggling', 'difficult time', 'hard time',
  'stressed', 'worried', 'scared', 'afraid', 'upset', 'sad',
  'angry', 'frustrated', 'confused', 'lost'
]

// Crisis categories for context
const CRISIS_CATEGORIES = {
  suicide_ideation: ['suicide', 'kill myself', 'end my life', 'want to die'],
  self_harm: ['cut myself', 'hurt myself', 'self harm', 'cutting'],
  means_access: ['have pills', 'have rope', 'have gun', 'wrote note'],
  hopelessness: ['hopeless', 'no point', 'give up', 'no future'],
  overwhelming_distress: ['overwhelmed', 'can\'t cope', 'unbearable'],
  isolation: ['alone', 'nobody cares', 'abandoned', 'isolated']
}

/**
 * Rapid crisis keyword detection (< 100ms requirement)
 */
export async function crisisKeywordDetection(input: string): Promise<CrisisDetectionResult> {
  const startTime = performance.now()
  
  const normalizedInput = input.toLowerCase().trim()
  const foundWords: string[] = []
  const categories: string[] = []
  
  let riskLevel: 'low' | 'moderate' | 'high' | 'severe' = 'low'
  let confidence = 0.1
  
  // Check severe crisis keywords first
  for (const keyword of SEVERE_CRISIS_KEYWORDS) {
    if (normalizedInput.includes(keyword.toLowerCase())) {
      foundWords.push(keyword)
      riskLevel = 'severe'
      confidence = 0.95
    }
  }
  
  // Check moderate crisis keywords
  if (riskLevel !== 'severe') {
    for (const keyword of MODERATE_CRISIS_KEYWORDS) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        foundWords.push(keyword)
        if (riskLevel === 'low') {
          riskLevel = 'moderate'
          confidence = 0.75
        }
      }
    }
  }
  
  // Check mild concern keywords
  if (riskLevel === 'low') {
    for (const keyword of MILD_CONCERN_KEYWORDS) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        foundWords.push(keyword)
        riskLevel = 'moderate'
        confidence = 0.6
      }
    }
  }
  
  // Determine categories
  for (const [category, keywords] of Object.entries(CRISIS_CATEGORIES)) {
    if (keywords.some(keyword => normalizedInput.includes(keyword.toLowerCase()))) {
      categories.push(category)
    }
  }
  
  // Context-based risk elevation
  if (foundWords.length > 2) {
    if (riskLevel === 'moderate') riskLevel = 'high'
    confidence = Math.min(0.95, confidence + 0.1)
  }
  
  // Multiple category involvement increases risk
  if (categories.length > 2) {
    if (riskLevel === 'moderate') riskLevel = 'high'
    confidence = Math.min(0.95, confidence + 0.15)
  }
  
  const processingTime = performance.now() - startTime
  
  // Log performance (should be < 100ms)
  if (processingTime > 100) {
    console.warn(`Crisis detection took ${processingTime}ms - exceeds 100ms target`)
  }
  
  return {
    hasCrisisKeywords: foundWords.length > 0,
    riskLevel,
    confidence,
    triggerWords: foundWords,
    categories,
    immediateIntervention: riskLevel === 'severe' || categories.includes('suicide_ideation')
  }
}

/**
 * Enhanced crisis detection with context analysis
 * Used for deeper assessment when initial keywords are detected
 */
export async function contextualCrisisAssessment(
  input: string,
  conversationHistory: string[],
  userContext: any
): Promise<CrisisDetectionResult> {
  const keywordResult = await crisisKeywordDetection(input)
  
  if (!keywordResult.hasCrisisKeywords) {
    return keywordResult
  }
  
  // Analyze conversation history for escalation patterns
  const recentMessages = conversationHistory.slice(-5)
  let escalationPattern = false
  
  // Check for increasing crisis language over recent messages
  let crisisWordCount = 0
  for (const message of recentMessages) {
    const messageResult = await crisisKeywordDetection(message)
    if (messageResult.hasCrisisKeywords) {
      crisisWordCount++
    }
  }
  
  if (crisisWordCount >= 2) {
    escalationPattern = true
    keywordResult.confidence = Math.min(0.95, keywordResult.confidence + 0.2)
  }
  
  // Check for planning indicators
  const planningIndicators = [
    'tonight', 'tomorrow', 'this weekend', 'plan', 'going to',
    'decided', 'ready', 'time has come', 'made up my mind'
  ]
  
  const hasPlanningLanguage = planningIndicators.some(indicator => 
    input.toLowerCase().includes(indicator)
  )
  
  if (hasPlanningLanguage && keywordResult.hasCrisisKeywords) {
    if (keywordResult.riskLevel === 'moderate') {
      keywordResult.riskLevel = 'high'
    } else if (keywordResult.riskLevel === 'high') {
      keywordResult.riskLevel = 'severe'
    }
    keywordResult.confidence = Math.min(0.95, keywordResult.confidence + 0.15)
    keywordResult.immediateIntervention = true
  }
  
  return keywordResult
}

/**
 * Crisis intervention recommendations based on risk level
 */
export function getCrisisInterventionPlan(result: CrisisDetectionResult): {
  actions: string[]
  resources: string[]
  escalationRequired: boolean
  timeframe: string
} {
  switch (result.riskLevel) {
    case 'severe':
      return {
        actions: [
          'Immediate crisis intervention response',
          'Connect to crisis hotline',
          'Suggest emergency services contact',
          'Activate safety plan if available',
          'Continuous monitoring required'
        ],
        resources: [
          '988 Suicide & Crisis Lifeline',
          'Crisis Text Line: Text HOME to 741741',
          'Emergency Services: 911',
          'Local crisis intervention teams'
        ],
        escalationRequired: true,
        timeframe: 'immediate'
      }
      
    case 'high':
      return {
        actions: [
          'Enhanced crisis support response',
          'Safety planning conversation',
          'Professional referral recommendation',
          'Increased check-in frequency'
        ],
        resources: [
          '988 Suicide & Crisis Lifeline',
          'Crisis Text Line: Text HOME to 741741',
          'Local mental health crisis services',
          'Trusted friend or family member contact'
        ],
        escalationRequired: true,
        timeframe: 'within 1 hour'
      }
      
    case 'moderate':
      return {
        actions: [
          'Supportive therapeutic response',
          'Coping strategy exploration',
          'Resource provision',
          'Follow-up scheduling'
        ],
        resources: [
          'Mental health support resources',
          'Coping strategy guides',
          'Professional therapy options',
          'Peer support groups'
        ],
        escalationRequired: false,
        timeframe: 'within 24 hours'
      }
      
    case 'low':
    default:
      return {
        actions: [
          'Standard supportive response',
          'Emotional validation',
          'Resource awareness'
        ],
        resources: [
          'General mental health resources',
          'Self-care guides',
          'Mindfulness exercises'
        ],
        escalationRequired: false,
        timeframe: 'routine follow-up'
      }
  }
}
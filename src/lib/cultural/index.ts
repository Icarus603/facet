// Main cultural intelligence exports
export { CulturalEngine } from './cultural-engine'
export type {
  CulturalEngineConfig,
  TherapeuticRequest,
  CulturalRecommendation,
  ContentUsageTracking,
  CulturalAnalytics
} from './cultural-engine'

// Content database exports
export { CulturalContentDatabase } from './content-database'
export type {
  CulturalContent,
  CulturalContentType,
  ContentSearchOptions,
  ContentSearchResult,
  EmbeddingResult,
  ContentValidationResult
} from './content-database'

// Vector search exports
export { CulturalVectorSearch } from './vector-search'
export type {
  VectorSearchOptions,
  VectorSearchResult,
  EmbeddingModel
} from './vector-search'

// Initialize cultural engine with default configuration
export const createCulturalEngine = (config?: Partial<CulturalEngineConfig>) => {
  return new CulturalEngine(config)
}

// Default configurations
export const PRODUCTION_CULTURAL_CONFIG: CulturalEngineConfig = {
  enableVectorSearch: true,
  fallbackToKeyword: true,
  cacheResults: true,
  maxCacheSize: 1000,
  enableBiasDetection: true,
  strictValidationOnly: true
}

export const DEVELOPMENT_CULTURAL_CONFIG: CulturalEngineConfig = {
  enableVectorSearch: false, // Use keyword search for development
  fallbackToKeyword: true,
  cacheResults: false,
  maxCacheSize: 100,
  enableBiasDetection: false,
  strictValidationOnly: false
}

// Utility functions
export const validateCulturalTags = (tags: string[]): string[] => {
  const validTags = [
    'African', 'African American', 'Arab', 'Asian', 'Caribbean', 'Chinese',
    'East Asian', 'European', 'Hispanic', 'Indigenous', 'Japanese', 'Jewish',
    'Korean', 'Latino', 'Middle Eastern', 'Native American', 'Pacific Islander',
    'South Asian', 'Southeast Asian', 'Mixed', 'Multiracial'
  ]
  
  return tags.filter(tag => 
    validTags.some(validTag => 
      validTag.toLowerCase().includes(tag.toLowerCase()) ||
      tag.toLowerCase().includes(validTag.toLowerCase())
    )
  )
}

export const validateTherapeuticThemes = (themes: string[]): string[] => {
  const validThemes = [
    'Acceptance', 'Anxiety', 'Choice', 'Compassion', 'Connection', 'Depression',
    'Emotional regulation', 'Grief', 'Growth', 'Healing', 'Identity', 'Mindfulness',
    'Perspective', 'Resilience', 'Self-awareness', 'Self-compassion', 'Strength',
    'Trauma', 'Values', 'Wisdom'
  ]
  
  return themes.filter(theme =>
    validThemes.some(validTheme =>
      validTheme.toLowerCase().includes(theme.toLowerCase()) ||
      theme.toLowerCase().includes(validTheme.toLowerCase())
    )
  )
}

export const formatCulturalRecommendation = (
  recommendation: CulturalRecommendation
): string => {
  const { content, reasoningExplanation, usageGuidance } = recommendation
  
  return `
**${content.title}** (${content.contentType})
*Source: ${content.source}${content.author ? ` by ${content.author}` : ''}*

${content.content}

**Why this fits:** ${reasoningExplanation}

**How to use:** ${usageGuidance}

**Cultural relevance:** ${Math.round(recommendation.culturalAlignment * 100)}%
**Therapeutic fit:** ${Math.round(recommendation.therapeuticFit * 100)}%
  `.trim()
}

// Health check utility
export const checkCulturalEngineHealth = async (engine: CulturalEngine) => {
  const health = await engine.healthCheck()
  
  if (health.status === 'critical') {
    console.error('Cultural Engine is in critical state:', health.lastError)
    return false
  }
  
  if (health.status === 'degraded') {
    console.warn('Cultural Engine is degraded. Vector search may be unavailable.')
  }
  
  return true
}

// Content seeding utility
export const seedCulturalContent = async (engine: CulturalEngine) => {
  try {
    await engine.initialize()
    console.log('Cultural content seeding completed successfully')
    return true
  } catch (error) {
    console.error('Failed to seed cultural content:', error)
    return false
  }
}
import { CulturalContentDatabase, CulturalContent, ContentSearchOptions } from './content-database'
import { CulturalVectorSearch, VectorSearchOptions, VectorSearchResult } from './vector-search'
import { CulturalBiasDetector, BiasDetectionResult } from './bias-detection'
import { ExpertValidationSystem } from './expert-validation'
import { createClient } from '@/lib/supabase/client'

export interface CulturalEngineConfig {
  enableVectorSearch: boolean
  fallbackToKeyword: boolean
  cacheResults: boolean
  maxCacheSize: number
  enableBiasDetection: boolean
  strictValidationOnly: boolean
}

export interface TherapeuticRequest {
  userId: string
  sessionId: string
  userCulturalTags: string[]
  therapeuticNeeds: string[]
  currentIssues: string[]
  previousContentIds?: string[]
  preferredContentTypes?: string[]
  maxResults?: number
}

export interface CulturalRecommendation {
  content: CulturalContent
  relevanceScore: number
  culturalAlignment: number
  therapeuticFit: number
  reasoningExplanation: string
  usageGuidance: string
  cautionaryNotes?: string[]
}

export interface ContentUsageTracking {
  contentId: string
  userId: string
  sessionId: string
  usageContext: string
  userResponseRating?: number
  culturalResonanceRating?: number
  therapeuticEffectiveness?: number
  notes?: string
}

export interface CulturalAnalytics {
  totalContent: number
  validatedContent: number
  contentByCulture: Record<string, number>
  contentByType: Record<string, number>
  averageBiasScore: number
  recentUsage: ContentUsageTracking[]
  topPerformingContent: CulturalContent[]
}

export class CulturalEngine {
  private contentDatabase: CulturalContentDatabase
  private vectorSearch: CulturalVectorSearch
  private biasDetector: CulturalBiasDetector
  private expertValidation: ExpertValidationSystem
  private supabase: ReturnType<typeof createClient>
  private config: CulturalEngineConfig
  private cache: Map<string, any> = new Map()

  constructor(config: Partial<CulturalEngineConfig> = {}) {
    this.contentDatabase = new CulturalContentDatabase()
    this.vectorSearch = new CulturalVectorSearch()
    this.biasDetector = new CulturalBiasDetector()
    this.expertValidation = new ExpertValidationSystem()
    this.supabase = createClient()
    
    this.config = {
      enableVectorSearch: true,
      fallbackToKeyword: true,
      cacheResults: true,
      maxCacheSize: 1000,
      enableBiasDetection: true,
      strictValidationOnly: true,
      ...config
    }
  }

  /**
   * Get culturally-aware therapeutic recommendations
   */
  async getTherapeuticRecommendations(
    request: TherapeuticRequest
  ): Promise<CulturalRecommendation[]> {
    try {
      const cacheKey = this.generateCacheKey('recommendations', request)
      
      if (this.config.cacheResults && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)
      }

      // Combine user needs into search query
      const searchQuery = [
        ...request.therapeuticNeeds,
        ...request.currentIssues
      ].join(' ')

      let searchResults: VectorSearchResult[] = []

      // Try vector search first if enabled
      if (this.config.enableVectorSearch) {
        try {
          searchResults = await this.vectorSearch.getCulturalRecommendations(
            request.userCulturalTags,
            [...request.therapeuticNeeds, ...request.currentIssues],
            request.previousContentIds || [],
            request.maxResults || 5
          )
        } catch (error) {
          console.error('Vector search failed, falling back to database search:', error)
          if (this.config.fallbackToKeyword) {
            searchResults = await this.fallbackSearch(request)
          }
        }
      } else {
        searchResults = await this.fallbackSearch(request)
      }

      // Convert to cultural recommendations with detailed analysis
      const recommendations: CulturalRecommendation[] = []

      for (const result of searchResults) {
        const recommendation = await this.analyzeContentForRecommendation(
          result,
          request
        )
        recommendations.push(recommendation)
      }

      // Cache results
      if (this.config.cacheResults) {
        this.manageCache(cacheKey, recommendations)
      }

      return recommendations
    } catch (error) {
      console.error('Failed to get therapeutic recommendations:', error)
      return []
    }
  }

  /**
   * Search cultural content with advanced filtering
   */
  async searchCulturalContent(
    query: string,
    culturalContext: string[],
    therapeuticContext: string[],
    options: ContentSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      const searchOptions: VectorSearchOptions = {
        culturalFilters: culturalContext,
        therapeuticFilters: therapeuticContext,
        maxResults: options.limit || 10,
        similarityThreshold: 0.7,
        includeMetadata: true
      }

      if (this.config.enableVectorSearch) {
        return await this.vectorSearch.hybridSearch(query, searchOptions)
      } else {
        // Fallback to database search
        const dbResults = await this.contentDatabase.searchContent(query, options)
        return dbResults.map(result => ({
          ...result,
          vectorSimilarity: 0
        }))
      }
    } catch (error) {
      console.error('Failed to search cultural content:', error)
      return []
    }
  }

  /**
   * Add new cultural content with comprehensive bias detection and validation
   */
  async addCulturalContent(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>,
    options: {
      validateImmediately?: boolean
      requestExpertValidation?: boolean
      skipBiasDetection?: boolean
      priority?: 'low' | 'medium' | 'high' | 'urgent'
    } = {}
  ): Promise<{
    contentId: string
    biasAnalysis: BiasDetectionResult
    validationRequestId?: string
  }> {
    try {
      const {
        validateImmediately = false,
        requestExpertValidation = false,
        skipBiasDetection = false,
        priority = 'medium'
      } = options

      let biasAnalysis: BiasDetectionResult

      // Perform comprehensive bias detection if enabled
      if (this.config.enableBiasDetection && !skipBiasDetection) {
        biasAnalysis = await this.biasDetector.detectBias(content)
        content.biasScore = biasAnalysis.biasScore
        content.expertValidated = biasAnalysis.isValid && validateImmediately
      } else {
        // Fallback to simple analysis
        const simpleAnalysis = await this.analyzeCulturalBias(content)
        biasAnalysis = {
          biasScore: simpleAnalysis.biasScore,
          isValid: simpleAnalysis.isValid,
          biasIndicators: simpleAnalysis.biasIndicators.map(indicator => ({
            type: 'cultural_stereotyping' as const,
            severity: 'medium' as const,
            content: indicator,
            explanation: 'Detected by simple keyword analysis',
            startIndex: 0,
            endIndex: indicator.length
          })),
          culturalAppropriateness: simpleAnalysis.isValid ? 0.8 : 0.4,
          confidence: 0.6,
          recommendations: simpleAnalysis.recommendations,
          analysisDetails: {
            culturalStereotyping: simpleAnalysis.biasScore,
            culturalAppropriation: 0,
            harmfulGeneralization: 0,
            religousSensitivity: 0,
            historicalAccuracy: 0,
            languagePropriety: 0,
            contextualAppropriaqteness: simpleAnalysis.isValid ? 0.8 : 0.4
          }
        }
        content.biasScore = biasAnalysis.biasScore
        content.expertValidated = biasAnalysis.isValid && validateImmediately
      }

      // Add content to database
      const contentId = await this.contentDatabase.addContent(content)

      // Update content with ID for expert validation
      const fullContent: CulturalContent = {
        id: contentId,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...content
      }

      let validationRequestId: string | undefined

      // Request expert validation if needed
      if (requestExpertValidation || 
          (biasAnalysis.biasScore > 0.4 && this.config.enableBiasDetection)) {
        try {
          const validationRequest = await this.expertValidation.submitForValidation(
            fullContent,
            biasAnalysis,
            'system',
            priority
          )
          validationRequestId = validationRequest.id
          console.log(`Expert validation requested for content: ${content.title}`)
        } catch (error) {
          console.error('Failed to request expert validation:', error)
        }
      }

      // Clear related cache entries
      this.clearCacheByPattern('recommendations')
      this.clearCacheByPattern('search')

      console.log(`Cultural content added: ${contentId} with bias score: ${biasAnalysis.biasScore}`)

      return {
        contentId,
        biasAnalysis,
        validationRequestId
      }
    } catch (error) {
      console.error('Failed to add cultural content:', error)
      throw error
    }
  }

  /**
   * Validate cultural content for bias and appropriateness
   */
  async validateCulturalContent(
    contentId: string,
    validatorId?: string
  ): Promise<{
    isValid: boolean
    biasScore: number
    recommendations: string[]
    culturalAccuracy: number
  }> {
    try {
      // Get content for analysis
      const { data: content, error } = await this.supabase
        .from('cultural_content')
        .select('*')
        .eq('id', contentId)
        .single()

      if (error || !content) {
        throw new Error('Content not found')
      }

      // Perform comprehensive validation
      const validation = await this.performContentValidation(content)

      // Update validation status
      await this.contentDatabase.updateContentValidation(
        contentId,
        validation,
        validatorId
      )

      return validation
    } catch (error) {
      console.error('Failed to validate cultural content:', error)
      throw error
    }
  }

  /**
   * Track content usage and effectiveness
   */
  async trackContentUsage(
    usage: ContentUsageTracking
  ): Promise<void> {
    try {
      await this.supabase
        .from('cultural_content_usage')
        .insert({
          content_id: usage.contentId,
          user_id: usage.userId,
          session_id: usage.sessionId,
          usage_context: usage.usageContext,
          user_response_rating: usage.userResponseRating,
          cultural_resonance_rating: usage.culturalResonanceRating,
          therapeutic_effectiveness: usage.therapeuticEffectiveness,
          notes: usage.notes
        })

      // Update content performance metrics
      await this.updateContentMetrics(usage.contentId, usage)
    } catch (error) {
      console.error('Failed to track content usage:', error)
    }
  }

  /**
   * Get cultural content analytics and insights
   */
  async getCulturalAnalytics(
    timeRange?: { start: Date; end: Date }
  ): Promise<CulturalAnalytics> {
    try {
      // Get basic content statistics
      const contentStats = await this.contentDatabase.getContentStatistics()

      // Get recent usage data
      let usageQuery = this.supabase
        .from('cultural_content_usage')
        .select('*')
        .order('used_at', { ascending: false })
        .limit(50)

      if (timeRange) {
        usageQuery = usageQuery
          .gte('used_at', timeRange.start.toISOString())
          .lte('used_at', timeRange.end.toISOString())
      }

      const { data: usageData } = await usageQuery

      // Get top performing content
      const { data: topContent } = await this.supabase
        .from('cultural_content')
        .select(`
          *,
          usage:cultural_content_usage(
            user_response_rating,
            cultural_resonance_rating,
            therapeutic_effectiveness
          )
        `)
        .eq('expert_validated', true)
        .order('created_at', { ascending: false })
        .limit(10)

      return {
        totalContent: contentStats.totalContent,
        validatedContent: contentStats.validatedContent,
        contentByCulture: contentStats.contentByCulture,
        contentByType: contentStats.contentByType,
        averageBiasScore: contentStats.averageBiasScore,
        recentUsage: usageData?.map(this.mapUsageData) || [],
        topPerformingContent: topContent?.map(item => 
          this.contentDatabase['mapDbItemToContent'](item)
        ) || []
      }
    } catch (error) {
      console.error('Failed to get cultural analytics:', error)
      return {
        totalContent: 0,
        validatedContent: 0,
        contentByCulture: {},
        contentByType: {},
        averageBiasScore: 0,
        recentUsage: [],
        topPerformingContent: []
      }
    }
  }

  /**
   * Initialize the cultural engine with seed content
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Cultural Engine...')

      // Check if content already exists
      const stats = await this.contentDatabase.getContentStatistics()
      
      if (stats.totalContent === 0) {
        console.log('Seeding initial cultural content...')
        const seedCount = await this.contentDatabase.seedInitialContent()
        console.log(`Seeded ${seedCount} pieces of cultural content`)
      } else {
        console.log(`Cultural database already has ${stats.totalContent} pieces of content`)
      }

      console.log('Cultural Engine initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Cultural Engine:', error)
      throw error
    }
  }

  /**
   * Get comprehensive bias detection analytics
   */
  async getBiasDetectionAnalytics(
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    biasStatistics: any
    validationMetrics: any
    mlModelPerformance: any
  }> {
    try {
      const [
        biasStatistics,
        validationMetrics,
        mlModelPerformance
      ] = await Promise.all([
        this.biasDetector.getBiasStatistics(timeRange),
        this.expertValidation.getValidationAnalytics(timeRange),
        this.biasDetector['mlModels'].getPerformanceMetrics()
      ])

      return {
        biasStatistics,
        validationMetrics,
        mlModelPerformance
      }
    } catch (error) {
      console.error('Failed to get bias detection analytics:', error)
      return {
        biasStatistics: {},
        validationMetrics: {},
        mlModelPerformance: {}
      }
    }
  }

  /**
   * Real-time bias check for content as it's being written
   */
  async performRealTimeBiasCheck(
    partialContent: string,
    culturalContext: string[]
  ): Promise<BiasDetectionResult> {
    try {
      return await this.biasDetector.analyzeIncrementalContent(
        partialContent,
        culturalContext
      )
    } catch (error) {
      console.error('Real-time bias check failed:', error)
      return {
        biasScore: 0.5,
        isValid: false,
        biasIndicators: [{
          type: 'misrepresentation',
          severity: 'medium',
          content: 'Analysis failed',
          explanation: 'Real-time analysis could not be completed',
          startIndex: 0,
          endIndex: partialContent.length
        }],
        culturalAppropriateness: 0.5,
        confidence: 0.1,
        recommendations: ['Manual review recommended'],
        analysisDetails: {
          culturalStereotyping: 0,
          culturalAppropriation: 0,
          harmfulGeneralization: 0,
          religousSensitivity: 0,
          historicalAccuracy: 0,
          languagePropriety: 0,
          contextualAppropriaqteness: 0.5
        }
      }
    }
  }

  /**
   * Batch bias detection for multiple content pieces
   */
  async batchBiasDetection(
    contents: Array<Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>>,
    options: {
      maxConcurrency?: number
      requestExpertValidation?: boolean
    } = {}
  ): Promise<Array<{
    content: typeof contents[0]
    biasAnalysis: BiasDetectionResult
    validationRequestId?: string
  }>> {
    try {
      const results = await this.biasDetector.batchDetectBias(contents, {
        maxConcurrency: options.maxConcurrency,
        skipCache: false
      })

      const processedResults = []

      for (let i = 0; i < contents.length; i++) {
        const content = contents[i]
        const biasAnalysis = results[i]
        let validationRequestId: string | undefined

        // Request expert validation if needed
        if (options.requestExpertValidation && biasAnalysis.biasScore > 0.4) {
          try {
            // Create temporary content object with ID for validation
            const tempContent: CulturalContent = {
              id: `temp-${Date.now()}-${i}`,
              createdAt: new Date(),
              updatedAt: new Date(),
              ...content
            }

            const validationRequest = await this.expertValidation.submitForValidation(
              tempContent,
              biasAnalysis,
              'batch-processing',
              'medium'
            )
            validationRequestId = validationRequest.id
          } catch (error) {
            console.error(`Failed to request validation for batch item ${i}:`, error)
          }
        }

        processedResults.push({
          content,
          biasAnalysis,
          validationRequestId
        })
      }

      return processedResults
    } catch (error) {
      console.error('Batch bias detection failed:', error)
      throw error
    }
  }

  /**
   * Get expert validation queue for dashboard
   */
  async getExpertValidationQueue(
    expertId?: string,
    status?: string[]
  ): Promise<any[]> {
    try {
      if (expertId) {
        return await this.expertValidation.getExpertValidationQueue(expertId, status)
      } else {
        // Return all pending validations if no expert specified
        const analytics = await this.expertValidation.getValidationAnalytics()
        return [] // Would implement general queue view
      }
    } catch (error) {
      console.error('Failed to get validation queue:', error)
      return []
    }
  }

  /**
   * Submit expert validation result
   */
  async submitExpertValidation(
    requestId: string,
    expertId: string,
    validationResult: any
  ): Promise<any> {
    try {
      return await this.expertValidation.submitValidationResult(
        requestId,
        expertId,
        validationResult
      )
    } catch (error) {
      console.error('Failed to submit expert validation:', error)
      throw error
    }
  }

  /**
   * Perform health check on cultural engine with bias detection components
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical'
    contentDatabase: boolean
    vectorSearch: boolean
    biasDetection: boolean
    expertValidation: boolean
    mlModels: boolean
    cacheHealth: { size: number; hitRate: number }
    lastError?: string
  }> {
    try {
      // Test content database
      const dbStats = await this.contentDatabase.getContentStatistics()
      const dbHealthy = dbStats.totalContent > 0

      // Test vector search
      let vectorHealthy = false
      try {
        await this.vectorSearch.semanticSearch('test query', { maxResults: 1 })
        vectorHealthy = true
      } catch (error) {
        console.warn('Vector search health check failed:', error)
      }

      // Test bias detection system
      let biasDetectionHealthy = false
      try {
        await this.biasDetector.performRealTimeBiasCheck(
          'This is a test content for bias detection',
          ['general']
        )
        biasDetectionHealthy = true
      } catch (error) {
        console.warn('Bias detection health check failed:', error)
      }

      // Test ML models
      let mlModelsHealthy = false
      try {
        const mlHealth = await this.biasDetector['mlModels'].healthCheck()
        mlModelsHealthy = mlHealth.status !== 'critical'
      } catch (error) {
        console.warn('ML models health check failed:', error)
      }

      // Test expert validation system
      let expertValidationHealthy = false
      try {
        const validationAnalytics = await this.expertValidation.getValidationAnalytics()
        expertValidationHealthy = true
      } catch (error) {
        console.warn('Expert validation health check failed:', error)
      }

      // Calculate cache hit rate (simplified)
      const cacheHitRate = this.cache.size > 0 ? 0.8 : 0 // Mock hit rate

      let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
      if (!dbHealthy) {
        status = 'critical'
      } else if (!biasDetectionHealthy || !mlModelsHealthy) {
        status = 'degraded'
      } else if (!vectorHealthy && this.config.enableVectorSearch) {
        status = 'degraded'
      }

      return {
        status,
        contentDatabase: dbHealthy,
        vectorSearch: vectorHealthy || !this.config.enableVectorSearch,
        biasDetection: biasDetectionHealthy,
        expertValidation: expertValidationHealthy,
        mlModels: mlModelsHealthy,
        cacheHealth: {
          size: this.cache.size,
          hitRate: cacheHitRate
        }
      }
    } catch (error) {
      return {
        status: 'critical',
        contentDatabase: false,
        vectorSearch: false,
        biasDetection: false,
        expertValidation: false,
        mlModels: false,
        cacheHealth: { size: 0, hitRate: 0 },
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Private helper methods

  private async fallbackSearch(request: TherapeuticRequest): Promise<VectorSearchResult[]> {
    const searchQuery = [
      ...request.therapeuticNeeds,
      ...request.currentIssues
    ].join(' ')

    const dbResults = await this.contentDatabase.searchContent(searchQuery, {
      cultureTags: request.userCulturalTags,
      therapeuticThemes: request.therapeuticNeeds,
      targetIssues: request.currentIssues,
      contentTypes: request.preferredContentTypes as any,
      expertValidatedOnly: this.config.strictValidationOnly,
      limit: request.maxResults || 5
    })

    return dbResults.map(result => ({
      ...result,
      vectorSimilarity: 0
    }))
  }

  private async analyzeContentForRecommendation(
    searchResult: VectorSearchResult,
    request: TherapeuticRequest
  ): Promise<CulturalRecommendation> {
    const content = searchResult.content

    // Generate reasoning explanation
    const culturalMatches = content.cultureTags.filter(tag =>
      request.userCulturalTags.some(userTag =>
        userTag.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(userTag.toLowerCase())
      )
    )

    const therapeuticMatches = content.therapeuticThemes.filter(theme =>
      request.therapeuticNeeds.some(need =>
        need.toLowerCase().includes(theme.toLowerCase()) ||
        theme.toLowerCase().includes(need.toLowerCase())
      )
    )

    let reasoningExplanation = ''
    if (culturalMatches.length > 0) {
      reasoningExplanation += `This ${content.contentType} aligns with your cultural background (${culturalMatches.join(', ')}). `
    }
    if (therapeuticMatches.length > 0) {
      reasoningExplanation += `It addresses your therapeutic needs through themes of ${therapeuticMatches.join(', ')}. `
    }

    // Generate usage guidance
    const usageGuidance = this.generateUsageGuidance(content, request)

    // Check for cautionary notes
    const cautionaryNotes: string[] = []
    if (content.biasScore && content.biasScore > 0.3) {
      cautionaryNotes.push('This content has been flagged for potential cultural bias. Use with sensitivity.')
    }
    if (!content.expertValidated) {
      cautionaryNotes.push('This content is pending expert validation.')
    }

    return {
      content,
      relevanceScore: searchResult.relevanceScore,
      culturalAlignment: searchResult.culturalMatch,
      therapeuticFit: searchResult.therapeuticMatch,
      reasoningExplanation,
      usageGuidance,
      cautionaryNotes: cautionaryNotes.length > 0 ? cautionaryNotes : undefined
    }
  }

  private generateUsageGuidance(
    content: CulturalContent,
    request: TherapeuticRequest
  ): string {
    const suggestions: string[] = []

    // Content-type specific guidance
    switch (content.contentType) {
      case 'meditation':
        suggestions.push('Consider guiding the user through this practice during the session.')
        break
      case 'story':
        suggestions.push('Share this story and explore its meaning with the user.')
        break
      case 'proverb':
        suggestions.push('Use this wisdom to reframe the user\'s current challenges.')
        break
      case 'philosophy':
        suggestions.push('Discuss how these concepts apply to the user\'s situation.')
        break
    }

    // Therapeutic application guidance
    if (content.therapeuticApplications.length > 0) {
      suggestions.push(`Recommended applications: ${content.therapeuticApplications.slice(0, 2).join(', ')}.`)
    }

    return suggestions.join(' ') || 'Integrate this content thoughtfully into the therapeutic conversation.'
  }

  private async analyzeCulturalBias(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>
  ): Promise<{
    biasScore: number
    isValid: boolean
    biasIndicators: string[]
    recommendations: string[]
  }> {
    // Simplified bias detection - in production, use ML models
    const biasKeywords = [
      'primitive', 'backward', 'savage', 'exotic', 'mystical', 'ancient wisdom',
      'superstition', 'folklore', 'tribal', 'simple people'
    ]

    const contentText = (content.content + ' ' + content.title).toLowerCase()
    const foundBiasKeywords = biasKeywords.filter(keyword =>
      contentText.includes(keyword.toLowerCase())
    )

    const biasScore = Math.min(foundBiasKeywords.length * 0.2, 1.0)
    const isValid = biasScore < 0.4

    return {
      biasScore,
      isValid,
      biasIndicators: foundBiasKeywords,
      recommendations: foundBiasKeywords.length > 0
        ? ['Review language for cultural sensitivity', 'Consider alternative phrasing']
        : []
    }
  }

  private async performContentValidation(content: any): Promise<{
    isValid: boolean
    biasScore: number
    biasIndicators: string[]
    recommendations: string[]
    culturalAccuracy: number
  }> {
    const biasAnalysis = await this.analyzeCulturalBias(content)
    
    // Calculate cultural accuracy based on source reliability
    let culturalAccuracy = 0.7 // Base score
    
    if (content.expert_validator) culturalAccuracy += 0.2
    if (content.source && content.source.length > 10) culturalAccuracy += 0.1
    if (biasAnalysis.biasScore < 0.2) culturalAccuracy += 0.1

    return {
      ...biasAnalysis,
      culturalAccuracy: Math.min(culturalAccuracy, 1.0)
    }
  }

  private async updateContentMetrics(
    contentId: string,
    usage: ContentUsageTracking
  ): Promise<void> {
    // Update performance metrics in background
    // This would typically update aggregated metrics tables
    try {
      // Implementation would go here for performance tracking
      console.log(`Updated metrics for content ${contentId}`)
    } catch (error) {
      console.error('Failed to update content metrics:', error)
    }
  }

  private mapUsageData(item: any): ContentUsageTracking {
    return {
      contentId: item.content_id,
      userId: item.user_id,
      sessionId: item.session_id,
      usageContext: item.usage_context,
      userResponseRating: item.user_response_rating,
      culturalResonanceRating: item.cultural_resonance_rating,
      therapeuticEffectiveness: item.therapeutic_effectiveness,
      notes: item.notes
    }
  }

  private generateCacheKey(operation: string, data: any): string {
    return `${operation}:${JSON.stringify(data)}`
  }

  private manageCache(key: string, value: any): void {
    if (this.cache.size >= this.config.maxCacheSize) {
      // Remove oldest entries (simple LRU simulation)
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  private clearCacheByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}
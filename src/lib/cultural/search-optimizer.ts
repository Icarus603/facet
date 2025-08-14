import { createClient } from '@/lib/supabase/client'
import { QueryProcessor, ProcessedQuery, QueryIntent } from './query-processor'
import { RankingEngine, RankingOptions, RankingResult } from './ranking-engine'
import { SearchPersonalization, UserSearchProfile } from './search-personalization'
import { SearchAnalytics, SearchMetrics } from './search-analytics'
import { VectorSearchResult } from './vector-search'
import { CulturalContent } from './content-database'
import Redis from 'ioredis'
import { nanoid } from 'nanoid'

export interface OptimizedSearchOptions {
  userId?: string
  sessionId?: string
  culturalContext?: string[]
  therapeuticContext?: string[]
  maxResults?: number
  includePersonalization?: boolean
  enableCaching?: boolean
  forceRefresh?: boolean
  searchTimeout?: number
  rankingStrategy?: 'hybrid' | 'semantic' | 'collaborative' | 'therapeutic'
  includeAnalytics?: boolean
}

export interface OptimizedSearchResult extends VectorSearchResult {
  personalizedScore: number
  rankingFactors: {
    semanticScore: number
    bm25Score: number
    culturalRelevance: number
    therapeuticFit: number
    personalizedBoost: number
    recencyBoost: number
    popularityBoost: number
  }
  searchId: string
  processingTime: number
  cacheHit: boolean
}

export interface SearchPerformanceMetrics {
  searchId: string
  queryTime: number
  indexTime: number
  rankingTime: number
  personalizationTime: number
  totalResults: number
  cacheHit: boolean
  rankingStrategy: string
}

export interface IndexOptimization {
  status: 'building' | 'ready' | 'updating' | 'error'
  lastUpdated: Date
  vectorDimensions: number
  indexType: 'ivfflat' | 'hnsw' | 'brute_force'
  indexParameters: {
    lists?: number // for ivfflat
    m?: number // for hnsw
    efConstruction?: number // for hnsw
    efSearch?: number // for hnsw
  }
  buildTime: number
  memoryUsage: number
  queryPerformance: {
    p50: number
    p95: number
    p99: number
  }
}

export class SemanticSearchOptimizer {
  private supabase: ReturnType<typeof createClient>
  private redis: Redis
  private queryProcessor: QueryProcessor
  private rankingEngine: RankingEngine
  private personalization: SearchPersonalization
  private analytics: SearchAnalytics
  private indexStatus: Map<string, IndexOptimization> = new Map()
  private queryCache: Map<string, OptimizedSearchResult[]> = new Map()
  private cacheExpiry: Map<string, number> = new Map()

  constructor() {
    this.supabase = createClient()
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })
    this.queryProcessor = new QueryProcessor()
    this.rankingEngine = new RankingEngine()
    this.personalization = new SearchPersonalization()
    this.analytics = new SearchAnalytics()

    this.initializeIndexOptimization()
  }

  /**
   * Main optimized search interface with ML-powered enhancements
   */
  async optimizedSearch(
    query: string,
    options: OptimizedSearchOptions = {}
  ): Promise<OptimizedSearchResult[]> {
    const startTime = Date.now()
    const searchId = nanoid()

    try {
      // Step 1: Process and enhance the query
      const processedQuery = await this.queryProcessor.processQuery(query, {
        culturalContext: options.culturalContext || [],
        enableExpansion: true,
        enableTranslation: true,
        detectIntent: true,
        enableTypoCorrection: true
      })

      // Step 2: Check cache if enabled
      if (options.enableCaching !== false) {
        const cachedResults = await this.getCachedResults(processedQuery, options)
        if (cachedResults && !options.forceRefresh) {
          const endTime = Date.now()
          
          // Update analytics for cache hit
          await this.analytics.recordSearchMetrics({
            searchId,
            query: processedQuery.original,
            processedQuery: processedQuery.enhanced,
            resultCount: cachedResults.length,
            processingTime: endTime - startTime,
            cacheHit: true,
            userId: options.userId,
            sessionId: options.sessionId,
            timestamp: new Date()
          })

          return cachedResults.map(result => ({
            ...result,
            searchId,
            processingTime: endTime - startTime,
            cacheHit: true
          }))
        }
      }

      // Step 3: Get user personalization profile if enabled
      let userProfile: UserSearchProfile | undefined
      if (options.includePersonalization !== false && options.userId) {
        userProfile = await this.personalization.getUserProfile(options.userId)
      }

      // Step 4: Execute multi-strategy search
      const searchResults = await this.executeMultiStrategySearch(
        processedQuery,
        options,
        userProfile
      )

      // Step 5: Apply advanced ranking
      const rankedResults = await this.rankingEngine.rankResults(
        searchResults,
        processedQuery,
        {
          strategy: options.rankingStrategy || 'hybrid',
          userProfile,
          culturalContext: options.culturalContext || [],
          therapeuticContext: options.therapeuticContext || [],
          maxResults: options.maxResults || 10
        }
      )

      // Step 6: Apply personalization if enabled
      let personalizedResults: RankingResult[] = rankedResults
      if (options.includePersonalization !== false && userProfile) {
        personalizedResults = await this.personalization.personalizeResults(
          rankedResults,
          userProfile,
          processedQuery
        )
      }

      // Step 7: Create final optimized results
      const optimizedResults: OptimizedSearchResult[] = personalizedResults.map(result => ({
        ...result,
        searchId,
        processingTime: Date.now() - startTime,
        cacheHit: false,
        personalizedScore: result.personalizedScore || result.relevanceScore,
        rankingFactors: result.rankingFactors || {
          semanticScore: result.vectorSimilarity,
          bm25Score: 0,
          culturalRelevance: result.culturalMatch,
          therapeuticFit: result.therapeuticMatch,
          personalizedBoost: 0,
          recencyBoost: 0,
          popularityBoost: 0
        }
      }))

      // Step 8: Cache results
      if (options.enableCaching !== false) {
        await this.cacheResults(processedQuery, options, optimizedResults)
      }

      // Step 9: Record analytics
      const endTime = Date.now()
      if (options.includeAnalytics !== false) {
        await this.analytics.recordSearchMetrics({
          searchId,
          query: processedQuery.original,
          processedQuery: processedQuery.enhanced,
          resultCount: optimizedResults.length,
          processingTime: endTime - startTime,
          cacheHit: false,
          userId: options.userId,
          sessionId: options.sessionId,
          intent: processedQuery.intent,
          culturalContext: options.culturalContext,
          rankingStrategy: options.rankingStrategy || 'hybrid',
          timestamp: new Date()
        })

        // Update user profile with search behavior
        if (options.userId && userProfile) {
          await this.personalization.updateUserProfile(
            options.userId,
            processedQuery,
            optimizedResults
          )
        }
      }

      console.log(`Optimized search completed in ${endTime - startTime}ms with ${optimizedResults.length} results`)
      return optimizedResults

    } catch (error) {
      console.error('Optimized search failed:', error)
      
      // Fallback to basic search
      try {
        const fallbackResults = await this.fallbackSearch(query, options)
        return fallbackResults.map(result => ({
          ...result,
          searchId,
          processingTime: Date.now() - startTime,
          cacheHit: false,
          personalizedScore: result.relevanceScore,
          rankingFactors: {
            semanticScore: result.vectorSimilarity,
            bm25Score: 0,
            culturalRelevance: result.culturalMatch,
            therapeuticFit: result.therapeuticMatch,
            personalizedBoost: 0,
            recencyBoost: 0,
            popularityBoost: 0
          }
        }))
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError)
        return []
      }
    }
  }

  /**
   * Optimize database indexes for vector search performance
   */
  async optimizeIndexes(
    indexType: 'ivfflat' | 'hnsw' = 'hnsw',
    parameters?: {
      lists?: number
      m?: number
      efConstruction?: number
      efSearch?: number
    }
  ): Promise<IndexOptimization> {
    const startTime = Date.now()
    
    try {
      console.log(`Starting index optimization with ${indexType} algorithm...`)
      
      // Drop existing index if it exists
      await this.supabase.rpc('drop_vector_index_if_exists')
      
      // Create optimized index based on type
      let indexQuery: string
      const defaultParams = {
        lists: 100,
        m: 16,
        efConstruction: 64,
        efSearch: 40
      }
      
      const finalParams = { ...defaultParams, ...parameters }
      
      if (indexType === 'hnsw') {
        // Create HNSW index for fast approximate search
        indexQuery = `
          CREATE INDEX CONCURRENTLY cultural_content_embedding_hnsw_idx
          ON cultural_content
          USING hnsw (embedding vector_cosine_ops)
          WITH (m = ${finalParams.m}, ef_construction = ${finalParams.efConstruction})
        `
      } else {
        // Create IVFFlat index
        indexQuery = `
          CREATE INDEX CONCURRENTLY cultural_content_embedding_ivfflat_idx
          ON cultural_content
          USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = ${finalParams.lists})
        `
      }

      const { error } = await this.supabase.rpc('execute_sql', { 
        query: indexQuery 
      })

      if (error) {
        throw error
      }

      // Test query performance
      const performanceTest = await this.measureQueryPerformance()
      
      const optimization: IndexOptimization = {
        status: 'ready',
        lastUpdated: new Date(),
        vectorDimensions: 1536,
        indexType,
        indexParameters: finalParams,
        buildTime: Date.now() - startTime,
        memoryUsage: 0, // Would be measured in production
        queryPerformance: performanceTest
      }

      this.indexStatus.set('primary', optimization)
      
      console.log(`Index optimization completed in ${optimization.buildTime}ms`)
      console.log(`Query performance - P50: ${performanceTest.p50}ms, P95: ${performanceTest.p95}ms`)
      
      return optimization

    } catch (error) {
      console.error('Index optimization failed:', error)
      
      const failedOptimization: IndexOptimization = {
        status: 'error',
        lastUpdated: new Date(),
        vectorDimensions: 1536,
        indexType,
        indexParameters: parameters || {},
        buildTime: Date.now() - startTime,
        memoryUsage: 0,
        queryPerformance: { p50: 0, p95: 0, p99: 0 }
      }

      this.indexStatus.set('primary', failedOptimization)
      throw error
    }
  }

  /**
   * Real-time index updates for new content
   */
  async updateIndex(contentIds: string[]): Promise<void> {
    try {
      const updateStart = Date.now()
      
      // Batch update embeddings
      const batchSize = 10
      for (let i = 0; i < contentIds.length; i += batchSize) {
        const batch = contentIds.slice(i, i + batchSize)
        
        // Trigger embedding regeneration for updated content
        await Promise.all(
          batch.map(async contentId => {
            await this.supabase.rpc('regenerate_content_embedding', {
              content_id: contentId
            })
          })
        )
      }

      // Invalidate related cache entries
      await this.invalidateRelevantCache(contentIds)
      
      const updateTime = Date.now() - updateStart
      console.log(`Index updated for ${contentIds.length} items in ${updateTime}ms`)
      
    } catch (error) {
      console.error('Index update failed:', error)
      throw error
    }
  }

  /**
   * Get comprehensive search performance metrics
   */
  async getSearchPerformanceMetrics(
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    averageLatency: number
    p95Latency: number
    p99Latency: number
    cacheHitRate: number
    searchVolume: number
    popularQueries: Array<{ query: string; count: number }>
    userEngagement: Array<{ userId: string; searchCount: number }>
    indexPerformance: IndexOptimization[]
  }> {
    try {
      const metrics = await this.analytics.getPerformanceMetrics(timeRange)
      const indexPerformance = Array.from(this.indexStatus.values())
      
      return {
        ...metrics,
        indexPerformance
      }
    } catch (error) {
      console.error('Failed to get performance metrics:', error)
      return {
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        cacheHitRate: 0,
        searchVolume: 0,
        popularQueries: [],
        userEngagement: [],
        indexPerformance: []
      }
    }
  }

  /**
   * Health check for search optimization system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical'
    components: {
      queryProcessor: boolean
      rankingEngine: boolean
      personalization: boolean
      analytics: boolean
      indexOptimization: boolean
      caching: boolean
    }
    performance: {
      averageLatency: number
      cacheHitRate: number
      indexStatus: string
    }
    lastError?: string
  }> {
    try {
      // Test each component
      const [
        queryProcessorHealth,
        rankingEngineHealth,
        personalizationHealth,
        analyticsHealth,
        cachingHealth,
        indexHealth
      ] = await Promise.all([
        this.testQueryProcessor(),
        this.testRankingEngine(),
        this.testPersonalization(),
        this.testAnalytics(),
        this.testCaching(),
        this.testIndexPerformance()
      ])

      const components = {
        queryProcessor: queryProcessorHealth,
        rankingEngine: rankingEngineHealth,
        personalization: personalizationHealth,
        analytics: analyticsHealth,
        indexOptimization: indexHealth,
        caching: cachingHealth
      }

      const failedComponents = Object.values(components).filter(health => !health)
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
      
      if (failedComponents.length > 2) {
        status = 'critical'
      } else if (failedComponents.length > 0) {
        status = 'degraded'
      }

      // Get performance metrics
      const recentMetrics = await this.analytics.getPerformanceMetrics()
      const primaryIndex = this.indexStatus.get('primary')

      return {
        status,
        components,
        performance: {
          averageLatency: recentMetrics.averageLatency,
          cacheHitRate: recentMetrics.cacheHitRate,
          indexStatus: primaryIndex?.status || 'unknown'
        }
      }

    } catch (error) {
      return {
        status: 'critical',
        components: {
          queryProcessor: false,
          rankingEngine: false,
          personalization: false,
          analytics: false,
          indexOptimization: false,
          caching: false
        },
        performance: {
          averageLatency: 0,
          cacheHitRate: 0,
          indexStatus: 'error'
        },
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Private helper methods

  private async executeMultiStrategySearch(
    processedQuery: ProcessedQuery,
    options: OptimizedSearchOptions,
    userProfile?: UserSearchProfile
  ): Promise<RankingResult[]> {
    const searchStrategies = []

    // Semantic vector search
    if (processedQuery.embedding) {
      searchStrategies.push(
        this.executeSemanticSearch(processedQuery, options)
      )
    }

    // BM25 keyword search
    searchStrategies.push(
      this.executeBM25Search(processedQuery, options)
    )

    // Cultural similarity search
    if (options.culturalContext && options.culturalContext.length > 0) {
      searchStrategies.push(
        this.executeCulturalSearch(processedQuery, options)
      )
    }

    // Therapeutic context search
    if (options.therapeuticContext && options.therapeuticContext.length > 0) {
      searchStrategies.push(
        this.executeTherapeuticSearch(processedQuery, options)
      )
    }

    // Collaborative filtering (if user profile available)
    if (userProfile) {
      searchStrategies.push(
        this.executeCollaborativeSearch(processedQuery, options, userProfile)
      )
    }

    // Execute all strategies in parallel
    const strategyResults = await Promise.allSettled(searchStrategies)
    
    // Combine results from successful strategies
    const allResults: RankingResult[] = []
    strategyResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        allResults.push(...result.value)
      } else {
        console.warn(`Search strategy ${index} failed:`, result)
      }
    })

    return allResults
  }

  private async executeSemanticSearch(
    processedQuery: ProcessedQuery,
    options: OptimizedSearchOptions
  ): Promise<RankingResult[]> {
    if (!processedQuery.embedding) return []

    const { data: results, error } = await this.supabase.rpc('optimized_vector_search', {
      query_embedding: JSON.stringify(processedQuery.embedding),
      similarity_threshold: 0.7,
      max_results: (options.maxResults || 10) * 2, // Get more results for ranking
      cultural_filters: options.culturalContext || null,
      therapeutic_filters: options.therapeuticContext || null
    })

    if (error) {
      console.error('Semantic search failed:', error)
      return []
    }

    return (results || []).map((item: any) => ({
      content: this.mapDbItemToContent(item),
      relevanceScore: item.similarity,
      culturalMatch: this.calculateCulturalMatch(
        options.culturalContext || [],
        item.culture_tags || []
      ),
      therapeuticMatch: this.calculateTherapeuticMatch(
        processedQuery.original,
        item.therapeutic_themes || [],
        item.target_issues || []
      ),
      vectorSimilarity: item.similarity,
      strategy: 'semantic'
    }))
  }

  private async executeBM25Search(
    processedQuery: ProcessedQuery,
    options: OptimizedSearchOptions
  ): Promise<RankingResult[]> {
    const { data: results, error } = await this.supabase.rpc('bm25_search', {
      search_query: processedQuery.enhanced,
      max_results: (options.maxResults || 10) * 2,
      cultural_filters: options.culturalContext || null,
      therapeutic_filters: options.therapeuticContext || null
    })

    if (error) {
      console.error('BM25 search failed:', error)
      return []
    }

    return (results || []).map((item: any) => ({
      content: this.mapDbItemToContent(item),
      relevanceScore: item.bm25_score,
      culturalMatch: this.calculateCulturalMatch(
        options.culturalContext || [],
        item.culture_tags || []
      ),
      therapeuticMatch: this.calculateTherapeuticMatch(
        processedQuery.original,
        item.therapeutic_themes || [],
        item.target_issues || []
      ),
      vectorSimilarity: 0,
      strategy: 'bm25'
    }))
  }

  private async executeCulturalSearch(
    processedQuery: ProcessedQuery,
    options: OptimizedSearchOptions
  ): Promise<RankingResult[]> {
    // Implementation for cultural similarity search
    const { data: results, error } = await this.supabase
      .from('cultural_content')
      .select('*')
      .overlaps('culture_tags', options.culturalContext || [])
      .eq('expert_validated', true)
      .limit((options.maxResults || 10) * 2)

    if (error) {
      console.error('Cultural search failed:', error)
      return []
    }

    return (results || []).map((item: any) => ({
      content: this.mapDbItemToContent(item),
      relevanceScore: this.calculateCulturalMatch(
        options.culturalContext || [],
        item.culture_tags || []
      ),
      culturalMatch: this.calculateCulturalMatch(
        options.culturalContext || [],
        item.culture_tags || []
      ),
      therapeuticMatch: this.calculateTherapeuticMatch(
        processedQuery.original,
        item.therapeutic_themes || [],
        item.target_issues || []
      ),
      vectorSimilarity: 0,
      strategy: 'cultural'
    }))
  }

  private async executeTherapeuticSearch(
    processedQuery: ProcessedQuery,
    options: OptimizedSearchOptions
  ): Promise<RankingResult[]> {
    const { data: results, error } = await this.supabase
      .from('cultural_content')
      .select('*')
      .overlaps('therapeutic_themes', options.therapeuticContext || [])
      .eq('expert_validated', true)
      .limit((options.maxResults || 10) * 2)

    if (error) {
      console.error('Therapeutic search failed:', error)
      return []
    }

    return (results || []).map((item: any) => ({
      content: this.mapDbItemToContent(item),
      relevanceScore: this.calculateTherapeuticMatch(
        processedQuery.original,
        item.therapeutic_themes || [],
        item.target_issues || []
      ),
      culturalMatch: this.calculateCulturalMatch(
        options.culturalContext || [],
        item.culture_tags || []
      ),
      therapeuticMatch: this.calculateTherapeuticMatch(
        processedQuery.original,
        item.therapeutic_themes || [],
        item.target_issues || []
      ),
      vectorSimilarity: 0,
      strategy: 'therapeutic'
    }))
  }

  private async executeCollaborativeSearch(
    processedQuery: ProcessedQuery,
    options: OptimizedSearchOptions,
    userProfile: UserSearchProfile
  ): Promise<RankingResult[]> {
    // Find content liked by similar users
    const similarUserIds = userProfile.similarUsers?.slice(0, 10) || []
    
    if (similarUserIds.length === 0) return []

    const { data: results, error } = await this.supabase
      .from('cultural_content')
      .select(`
        *,
        usage:cultural_content_usage!inner(user_id, user_response_rating)
      `)
      .in('usage.user_id', similarUserIds)
      .gte('usage.user_response_rating', 4)
      .eq('expert_validated', true)
      .limit((options.maxResults || 10) * 2)

    if (error) {
      console.error('Collaborative search failed:', error)
      return []
    }

    return (results || []).map((item: any) => ({
      content: this.mapDbItemToContent(item),
      relevanceScore: 0.8, // Base collaborative score
      culturalMatch: this.calculateCulturalMatch(
        options.culturalContext || [],
        item.culture_tags || []
      ),
      therapeuticMatch: this.calculateTherapeuticMatch(
        processedQuery.original,
        item.therapeutic_themes || [],
        item.target_issues || []
      ),
      vectorSimilarity: 0,
      strategy: 'collaborative'
    }))
  }

  private async fallbackSearch(
    query: string,
    options: OptimizedSearchOptions
  ): Promise<VectorSearchResult[]> {
    console.log('Using fallback search for query:', query)
    
    // Simple text search as fallback
    const { data: results, error } = await this.supabase
      .from('cultural_content')
      .select('*')
      .textSearch('fts', query)
      .eq('expert_validated', true)
      .limit(options.maxResults || 10)

    if (error) {
      console.error('Fallback search failed:', error)
      return []
    }

    return (results || []).map((item: any) => ({
      content: this.mapDbItemToContent(item),
      relevanceScore: 0.5,
      culturalMatch: this.calculateCulturalMatch(
        options.culturalContext || [],
        item.culture_tags || []
      ),
      therapeuticMatch: this.calculateTherapeuticMatch(
        query,
        item.therapeutic_themes || [],
        item.target_issues || []
      ),
      vectorSimilarity: 0
    }))
  }

  private async getCachedResults(
    processedQuery: ProcessedQuery,
    options: OptimizedSearchOptions
  ): Promise<OptimizedSearchResult[] | null> {
    try {
      const cacheKey = this.generateCacheKey(processedQuery, options)
      
      // Check in-memory cache first
      if (this.queryCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
        return this.queryCache.get(cacheKey) || null
      }

      // Check Redis cache
      const cachedData = await this.redis.get(cacheKey)
      if (cachedData) {
        const results = JSON.parse(cachedData) as OptimizedSearchResult[]
        this.queryCache.set(cacheKey, results)
        this.cacheExpiry.set(cacheKey, Date.now() + 300000) // 5 minutes
        return results
      }

      return null
    } catch (error) {
      console.error('Cache retrieval failed:', error)
      return null
    }
  }

  private async cacheResults(
    processedQuery: ProcessedQuery,
    options: OptimizedSearchOptions,
    results: OptimizedSearchResult[]
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(processedQuery, options)
      const ttl = 300 // 5 minutes

      // Cache in memory
      this.queryCache.set(cacheKey, results)
      this.cacheExpiry.set(cacheKey, Date.now() + ttl * 1000)

      // Cache in Redis
      await this.redis.setex(cacheKey, ttl, JSON.stringify(results))

    } catch (error) {
      console.error('Cache storage failed:', error)
    }
  }

  private async invalidateRelevantCache(contentIds: string[]): Promise<void> {
    try {
      // Invalidate memory cache entries
      const keysToDelete: string[] = []
      for (const [key, results] of this.queryCache) {
        if (results.some(result => contentIds.includes(result.content.id))) {
          keysToDelete.push(key)
        }
      }

      keysToDelete.forEach(key => {
        this.queryCache.delete(key)
        this.cacheExpiry.delete(key)
      })

      // Pattern-based Redis cache invalidation would require Lua scripts
      console.log(`Invalidated ${keysToDelete.length} cache entries`)

    } catch (error) {
      console.error('Cache invalidation failed:', error)
    }
  }

  private generateCacheKey(
    processedQuery: ProcessedQuery,
    options: OptimizedSearchOptions
  ): string {
    const keyData = {
      query: processedQuery.enhanced,
      cultural: options.culturalContext?.sort(),
      therapeutic: options.therapeuticContext?.sort(),
      maxResults: options.maxResults,
      strategy: options.rankingStrategy,
      personalized: !!options.userId
    }
    return `search:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey)
    return expiry ? Date.now() < expiry : false
  }

  private async measureQueryPerformance(): Promise<{
    p50: number
    p95: number
    p99: number
  }> {
    const testQueries = [
      'meditation mindfulness healing',
      'wisdom ancient philosophy',
      'trauma recovery cultural',
      'anxiety stress management',
      'community connection ubuntu'
    ]

    const latencies: number[] = []
    
    for (const query of testQueries) {
      for (let i = 0; i < 10; i++) {
        const start = Date.now()
        try {
          await this.supabase.rpc('test_vector_search_performance', {
            test_query: query
          })
        } catch (error) {
          // Ignore errors for performance testing
        }
        latencies.push(Date.now() - start)
      }
    }

    latencies.sort((a, b) => a - b)
    const p50 = latencies[Math.floor(latencies.length * 0.5)]
    const p95 = latencies[Math.floor(latencies.length * 0.95)]
    const p99 = latencies[Math.floor(latencies.length * 0.99)]

    return { p50, p95, p99 }
  }

  private async initializeIndexOptimization(): Promise<void> {
    try {
      // Check current index status
      const { data: indexes, error } = await this.supabase.rpc('get_vector_indexes')
      
      if (!error && indexes) {
        // Initialize index status from database
        console.log('Vector indexes initialized')
      }
    } catch (error) {
      console.warn('Could not initialize index optimization:', error)
    }
  }

  private async testQueryProcessor(): Promise<boolean> {
    try {
      await this.queryProcessor.processQuery('test query', {
        culturalContext: ['test'],
        enableExpansion: false
      })
      return true
    } catch {
      return false
    }
  }

  private async testRankingEngine(): Promise<boolean> {
    try {
      await this.rankingEngine.rankResults([], {
        original: 'test',
        enhanced: 'test',
        terms: ['test'],
        intent: 'informational',
        confidence: 0.5
      }, { strategy: 'semantic' })
      return true
    } catch {
      return false
    }
  }

  private async testPersonalization(): Promise<boolean> {
    try {
      await this.personalization.getUserProfile('test-user')
      return true
    } catch {
      return false
    }
  }

  private async testAnalytics(): Promise<boolean> {
    try {
      await this.analytics.getPerformanceMetrics()
      return true
    } catch {
      return false
    }
  }

  private async testCaching(): Promise<boolean> {
    try {
      await this.redis.ping()
      return true
    } catch {
      return false
    }
  }

  private async testIndexPerformance(): Promise<boolean> {
    try {
      const performance = await this.measureQueryPerformance()
      return performance.p95 < 1000 // Less than 1 second for P95
    } catch {
      return false
    }
  }

  private calculateCulturalMatch(queryTags: string[], contentTags: string[]): number {
    if (queryTags.length === 0) return 1.0
    
    const matchingTags = queryTags.filter(tag => 
      contentTags.some(contentTag => 
        contentTag.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(contentTag.toLowerCase())
      )
    )
    
    return matchingTags.length / queryTags.length
  }

  private calculateTherapeuticMatch(
    query: string,
    themes: string[],
    issues: string[]
  ): number {
    const queryLower = query.toLowerCase()
    const allTherapeuticText = [...themes, ...issues].join(' ').toLowerCase()
    
    const queryWords = queryLower.split(' ').filter(word => word.length > 2)
    const matchingWords = queryWords.filter(word => allTherapeuticText.includes(word))
    
    return queryWords.length > 0 ? matchingWords.length / queryWords.length : 0
  }

  private mapDbItemToContent(item: any): CulturalContent {
    return {
      id: item.id,
      contentType: item.content_type,
      cultureTags: item.culture_tags || [],
      title: item.title,
      content: item.content,
      source: item.source,
      author: item.author,
      historicalPeriod: item.historical_period,
      therapeuticThemes: item.therapeutic_themes || [],
      therapeuticApplications: item.therapeutic_applications || [],
      targetIssues: item.target_issues || [],
      embedding: item.embedding ? JSON.parse(item.embedding) : undefined,
      expertValidated: item.expert_validated,
      expertValidator: item.expert_validator,
      biasScore: item.bias_score,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }
  }
}
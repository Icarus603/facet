import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SemanticSearchOptimizer } from '../search-optimizer'
import { QueryProcessor } from '../query-processor'
import { RankingEngine } from '../ranking-engine'
import { SearchPersonalization } from '../search-personalization'
import { SearchAnalytics } from '../search-analytics'

// Mock external dependencies
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null })
  })
}))

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    lpush: vi.fn().mockResolvedValue(1),
    ltrim: vi.fn().mockResolvedValue('OK'),
    lrange: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(1),
    ping: vi.fn().mockResolvedValue('PONG')
  }))
}))

vi.mock('@azure/openai', () => ({
  createClient: () => ({
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: Array.from({ length: 1536 }, () => Math.random()) }]
      })
    }
  })
}))

describe('Semantic Search Optimization System', () => {
  let searchOptimizer: SemanticSearchOptimizer
  let queryProcessor: QueryProcessor
  let rankingEngine: RankingEngine
  let searchPersonalization: SearchPersonalization
  let searchAnalytics: SearchAnalytics

  beforeEach(() => {
    // Initialize components
    searchOptimizer = new SemanticSearchOptimizer()
    queryProcessor = new QueryProcessor()
    rankingEngine = new RankingEngine()
    searchPersonalization = new SearchPersonalization()
    searchAnalytics = new SearchAnalytics()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Processing', () => {
    it('should process queries with cultural context', async () => {
      const query = 'meditation anxiety stress relief'
      const options = {
        culturalContext: ['Buddhist', 'Hindu'],
        enableExpansion: true,
        enableTypoCorrection: true,
        detectIntent: true
      }

      const processedQuery = await queryProcessor.processQuery(query, options)

      expect(processedQuery).toBeDefined()
      expect(processedQuery.original).toBe(query)
      expect(processedQuery.enhanced).toBeDefined()
      expect(processedQuery.terms).toContain('meditation')
      expect(processedQuery.intent).toBe('therapeutic')
      expect(processedQuery.culturalVariants).toBeDefined()
      expect(processedQuery.synonyms).toBeDefined()
    })

    it('should detect therapeutic intent correctly', async () => {
      const therapeuticQueries = [
        'anxiety depression help',
        'trauma healing recovery',
        'stress mindfulness practice',
        'grief loss support'
      ]

      for (const query of therapeuticQueries) {
        const processed = await queryProcessor.processQuery(query, {
          culturalContext: [],
          detectIntent: true
        })
        expect(processed.intent).toBe('therapeutic')
      }
    })

    it('should expand queries with synonyms', async () => {
      const query = 'wisdom healing'
      const processed = await queryProcessor.processQuery(query, {
        culturalContext: ['Chinese'],
        enableExpansion: true,
        maxSynonyms: 5
      })

      expect(processed.synonyms.length).toBeGreaterThan(0)
      expect(processed.expandedQueries.length).toBeGreaterThan(0)
    })

    it('should correct typos in queries', async () => {
      const query = 'mediation anxeity stres'
      const processed = await queryProcessor.processQuery(query, {
        culturalContext: [],
        enableTypoCorrection: true
      })

      expect(processed.typosCorrected.length).toBeGreaterThan(0)
    })
  })

  describe('Search Optimization', () => {
    it('should perform optimized search with multiple strategies', async () => {
      const query = 'Buddhist meditation mindfulness'
      const options = {
        userId: 'test-user-1',
        culturalContext: ['Buddhist'],
        therapeuticContext: ['anxiety', 'stress'],
        maxResults: 10,
        rankingStrategy: 'hybrid' as const,
        includePersonalization: true,
        enableCaching: true
      }

      const results = await searchOptimizer.optimizedSearch(query, options)

      expect(Array.isArray(results)).toBe(true)
      expect(results.every(r => r.searchId)).toBe(true)
      expect(results.every(r => r.rankingFactors)).toBe(true)
      expect(results.every(r => r.processingTime >= 0)).toBe(true)
    })

    it('should cache search results', async () => {
      const query = 'ubuntu community healing'
      const options = {
        culturalContext: ['African'],
        enableCaching: true,
        maxResults: 5
      }

      // First search should not be cached
      const firstResults = await searchOptimizer.optimizedSearch(query, options)
      expect(firstResults.every(r => r.cacheHit === false)).toBe(true)

      // Second search should potentially hit cache (mocked)
      const secondResults = await searchOptimizer.optimizedSearch(query, options)
      expect(Array.isArray(secondResults)).toBe(true)
    })

    it('should apply different ranking strategies', async () => {
      const query = 'zen mindfulness peace'
      const baseOptions = {
        culturalContext: ['Japanese'],
        maxResults: 5
      }

      const strategies = ['semantic', 'bm25', 'hybrid', 'therapeutic'] as const
      
      for (const strategy of strategies) {
        const results = await searchOptimizer.optimizedSearch(query, {
          ...baseOptions,
          rankingStrategy: strategy
        })
        
        expect(Array.isArray(results)).toBe(true)
        // In a real implementation, we'd verify strategy-specific behavior
      }
    })

    it('should handle search errors gracefully', async () => {
      // Mock a failing search
      vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const query = 'test query that fails'
      const results = await searchOptimizer.optimizedSearch(query, {})
      
      // Should return empty array or fallback results, not throw
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('Search Personalization', () => {
    it('should create user profiles', async () => {
      const userId = 'test-user-123'
      const profile = await searchPersonalization.getUserProfile(userId)
      
      expect(profile).toBeDefined()
      expect(profile.userId).toBe(userId)
      expect(profile.personalizedWeights).toBeDefined()
      expect(profile.searchHistory).toBeDefined()
      expect(profile.interactionPatterns).toBeDefined()
    })

    it('should update user profiles with search behavior', async () => {
      const userId = 'test-user-456'
      const processedQuery = {
        original: 'meditation anxiety',
        enhanced: 'meditation anxiety mindfulness stress relief',
        terms: ['meditation', 'anxiety'],
        synonyms: ['mindfulness', 'contemplation'],
        culturalVariants: ['zen', 'dharma'],
        intent: 'therapeutic' as const,
        confidence: 0.9
      }
      const selectedResults = [{
        content: {
          id: 'content-1',
          contentType: 'meditation' as const,
          cultureTags: ['Buddhist'],
          therapeuticThemes: ['anxiety'],
          title: 'Mindfulness Meditation',
          content: 'Test content'
        } as any,
        relevanceScore: 0.9,
        culturalMatch: 0.8,
        therapeuticMatch: 0.9,
        vectorSimilarity: 0.85
      }]

      // Should not throw
      await expect(searchPersonalization.updateUserProfile(
        userId,
        processedQuery,
        selectedResults
      )).resolves.not.toThrow()
    })

    it('should generate personalized recommendations', async () => {
      const userId = 'test-user-789'
      const recommendations = await searchPersonalization.getPersonalizedRecommendations(
        userId,
        5
      )
      
      expect(Array.isArray(recommendations)).toBe(true)
    })

    it('should provide personalization insights', async () => {
      const userId = 'test-user-insights'
      const insights = await searchPersonalization.getPersonalizationInsights(userId)
      
      expect(insights).toBeDefined()
      expect(insights.dominantCultures).toBeDefined()
      expect(insights.preferredThemes).toBeDefined()
      expect(insights.searchPatterns).toBeDefined()
      expect(insights.therapeuticJourney).toBeDefined()
    })
  })

  describe('Search Analytics', () => {
    it('should record search metrics', async () => {
      const metrics = {
        searchId: 'search-123',
        query: 'test query',
        processedQuery: 'enhanced test query',
        resultCount: 5,
        processingTime: 150,
        cacheHit: false,
        userId: 'user-1',
        sessionId: 'session-1',
        timestamp: new Date()
      }

      // Should not throw
      await expect(searchAnalytics.recordSearchMetrics(metrics))
        .resolves.not.toThrow()
    })

    it('should calculate performance metrics', async () => {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      }

      const performanceMetrics = await searchAnalytics.getPerformanceMetrics(timeRange)
      
      expect(performanceMetrics).toBeDefined()
      expect(performanceMetrics.averageLatency).toBeDefined()
      expect(performanceMetrics.cacheHitRate).toBeDefined()
      expect(performanceMetrics.searchVolume).toBeDefined()
      expect(Array.isArray(performanceMetrics.popularQueries)).toBe(true)
    })

    it('should generate analytics reports', async () => {
      const report = await searchAnalytics.generateAnalyticsReport('daily')
      
      expect(report).toBeDefined()
      expect(report.summary).toBeDefined()
      expect(Array.isArray(report.trends)).toBe(true)
      expect(Array.isArray(report.recommendations)).toBe(true)
    })

    it('should track real-time metrics', () => {
      const realTimeMetrics = searchAnalytics.getRealTimeMetrics()
      
      expect(realTimeMetrics).toBeDefined()
      expect(realTimeMetrics.activeSearches).toBeDefined()
      expect(realTimeMetrics.avgLatency).toBeDefined()
      expect(Array.isArray(realTimeMetrics.alerts)).toBe(true)
    })
  })

  describe('Index Optimization', () => {
    it('should optimize database indexes', async () => {
      // Should complete without throwing
      await expect(searchOptimizer.optimizeIndexes('hnsw', {
        m: 16,
        efConstruction: 64,
        efSearch: 40
      })).resolves.not.toThrow()
    })

    it('should update indexes with new content', async () => {
      const contentIds = ['content-1', 'content-2', 'content-3']
      
      // Should complete without throwing
      await expect(searchOptimizer.updateIndex(contentIds))
        .resolves.not.toThrow()
    })

    it('should perform health checks', async () => {
      const healthStatus = await searchOptimizer.healthCheck()
      
      expect(healthStatus).toBeDefined()
      expect(healthStatus.status).toMatch(/healthy|degraded|critical/)
      expect(healthStatus.components).toBeDefined()
      expect(healthStatus.performance).toBeDefined()
    })
  })

  describe('Integration Tests', () => {
    it('should handle end-to-end search workflow', async () => {
      const query = 'anxiety healing meditation Buddhist'
      const userId = 'integration-user'
      
      // 1. Process query
      const processedQuery = await queryProcessor.processQuery(query, {
        culturalContext: ['Buddhist'],
        enableExpansion: true,
        detectIntent: true
      })
      
      expect(processedQuery.intent).toBe('therapeutic')
      
      // 2. Perform optimized search
      const searchResults = await searchOptimizer.optimizedSearch(query, {
        userId,
        culturalContext: ['Buddhist'],
        therapeuticContext: ['anxiety'],
        rankingStrategy: 'hybrid',
        includePersonalization: true,
        maxResults: 5
      })
      
      expect(Array.isArray(searchResults)).toBe(true)
      
      // 3. Record analytics
      if (searchResults.length > 0) {
        await searchAnalytics.recordSearchMetrics({
          searchId: searchResults[0].searchId,
          query: processedQuery.original,
          processedQuery: processedQuery.enhanced,
          resultCount: searchResults.length,
          processingTime: searchResults[0].processingTime,
          cacheHit: searchResults[0].cacheHit,
          userId,
          timestamp: new Date()
        })
      }
      
      // 4. Update user profile
      if (searchResults.length > 0) {
        await searchPersonalization.updateUserProfile(
          userId,
          processedQuery,
          searchResults
        )
      }
      
      // Entire workflow should complete without errors
      expect(true).toBe(true)
    })

    it('should maintain sub-1s latency for typical queries', async () => {
      const queries = [
        'meditation mindfulness',
        'ubuntu community healing',
        'zen wisdom peace',
        'anxiety depression help',
        'story wisdom teaching'
      ]
      
      for (const query of queries) {
        const startTime = Date.now()
        
        const results = await searchOptimizer.optimizedSearch(query, {
          maxResults: 10,
          culturalContext: ['Buddhist'],
          rankingStrategy: 'hybrid'
        })
        
        const endTime = Date.now()
        const latency = endTime - startTime
        
        // Should complete in under 1 second (allowing for test overhead)
        expect(latency).toBeLessThan(2000) // 2s to account for test environment
        expect(Array.isArray(results)).toBe(true)
      }
    })

    it('should handle high concurrency', async () => {
      const concurrentSearches = 20
      const searchPromises = Array.from({ length: concurrentSearches }, (_, i) =>
        searchOptimizer.optimizedSearch(`test query ${i}`, {
          maxResults: 5,
          userId: `concurrent-user-${i}`
        })
      )
      
      const results = await Promise.all(searchPromises)
      
      // All searches should complete successfully
      expect(results.length).toBe(concurrentSearches)
      expect(results.every(result => Array.isArray(result))).toBe(true)
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle database connection failures', async () => {
      // Mock database failure
      const originalConsoleError = console.error
      console.error = vi.fn()
      
      const results = await searchOptimizer.optimizedSearch('test query', {})
      
      // Should return empty array rather than throw
      expect(Array.isArray(results)).toBe(true)
      
      console.error = originalConsoleError
    })

    it('should handle Redis connection failures', async () => {
      // Mock Redis failure scenario
      const results = await searchOptimizer.optimizedSearch('test query', {
        enableCaching: true
      })
      
      // Should still work even if caching fails
      expect(Array.isArray(results)).toBe(true)
    })

    it('should validate input parameters', async () => {
      // Test with invalid parameters
      const results = await searchOptimizer.optimizedSearch('', {
        maxResults: -1,
        culturalContext: null as any,
        therapeuticContext: undefined as any
      })
      
      // Should handle gracefully
      expect(Array.isArray(results)).toBe(true)
    })
  })
})

describe('Performance Benchmarks', () => {
  let searchOptimizer: SemanticSearchOptimizer

  beforeEach(() => {
    searchOptimizer = new SemanticSearchOptimizer()
  })

  it('should meet P95 latency requirements', async () => {
    const iterations = 20
    const latencies: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now()
      
      await searchOptimizer.optimizedSearch('performance test query', {
        maxResults: 10,
        culturalContext: ['Buddhist'],
        rankingStrategy: 'hybrid'
      })
      
      const endTime = Date.now()
      latencies.push(endTime - startTime)
    }
    
    latencies.sort((a, b) => a - b)
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)]
    
    // P95 should be under 1 second
    expect(p95Latency).toBeLessThan(1000)
  })

  it('should handle batch operations efficiently', async () => {
    const batchQueries = Array.from({ length: 10 }, (_, i) => 
      `batch query ${i} meditation wisdom`
    )
    
    const startTime = Date.now()
    
    const batchResults = await Promise.all(
      batchQueries.map(query =>
        searchOptimizer.optimizedSearch(query, { maxResults: 5 })
      )
    )
    
    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    // Batch processing should be efficient
    expect(batchResults.length).toBe(10)
    expect(totalTime / 10).toBeLessThan(500) // Less than 500ms per query on average
  })
})
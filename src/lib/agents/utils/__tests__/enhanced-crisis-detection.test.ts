/**
 * Comprehensive Test Suite for Enhanced Crisis Detection
 * Validates <1s response time and >95% accuracy requirements
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EnhancedCrisisDetector } from '../enhanced-crisis-detection'
import { CrisisContext } from '../crisis-detection'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({ data: [], error: null })
          })
        })
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null })
      })
    })
  })
}))

describe('EnhancedCrisisDetector', () => {
  let detector: EnhancedCrisisDetector

  beforeEach(() => {
    detector = new EnhancedCrisisDetector()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Performance Requirements', () => {
    it('should meet <1s response time requirement for single detection', async () => {
      const context: CrisisContext = {
        text: 'I want to kill myself tonight, I have a plan and I\'m ready to end it all',
        culturalBackground: 'latino',
        historicalRisk: true
      }

      const startTime = Date.now()
      const result = await detector.detectCrisisEnhanced(context)
      const endTime = Date.now()

      const processingTime = endTime - startTime

      expect(processingTime).toBeLessThan(1000) // <1s requirement
      expect(result.processingTimeMs).toBeLessThan(1000)
      expect(result.overallRisk).toBeGreaterThan(8) // High risk content
    })

    it('should maintain performance under load with batch processing', async () => {
      const contexts: CrisisContext[] = Array.from({ length: 50 }, (_, i) => ({
        text: i % 2 === 0 
          ? 'I want to hurt myself and end the pain' 
          : 'I am feeling sad but getting support from family',
        culturalBackground: 'asian',
        historicalRisk: i % 3 === 0
      }))

      const startTime = Date.now()
      const results = await detector.batchDetectCrisis(contexts)
      const totalTime = Date.now() - startTime

      expect(results).toHaveLength(50)
      expect(totalTime).toBeLessThan(10000) // Should process 50 items in <10s
      
      // Check that high-risk items are correctly identified
      const highRiskResults = results.filter(r => r.overallRisk >= 6)
      expect(highRiskResults.length).toBeGreaterThan(20) // About half should be high risk
    })

    it('should use caching effectively for duplicate contexts', async () => {
      const context: CrisisContext = {
        text: 'I am feeling suicidal and want to die'
      }

      // First call - cache miss
      const result1 = await detector.detectCrisisEnhanced(context)
      expect(result1.cacheHit).toBe(false)

      // Second call - should be cache hit and faster
      const startTime = Date.now()
      const result2 = await detector.detectCrisisEnhanced(context)
      const cacheTime = Date.now() - startTime

      expect(result2.cacheHit).toBe(true)
      expect(cacheTime).toBeLessThan(50) // Cache should be very fast
      expect(result2.overallRisk).toEqual(result1.overallRisk)
    })
  })

  describe('Accuracy Requirements', () => {
    it('should accurately detect high-risk suicide indicators', async () => {
      const highRiskContexts: CrisisContext[] = [
        { text: 'I want to kill myself tonight with pills I have saved up' },
        { text: 'I wrote my goodbye letters and plan to hang myself tomorrow' },
        { text: 'The voices are telling me to kill everyone and then myself' },
        { text: 'I have a gun and I am going to use it on myself and others' },
        { text: 'I overdosed on pills but I am still alive unfortunately' }
      ]

      for (const context of highRiskContexts) {
        const result = await detector.detectCrisisEnhanced(context)
        
        expect(result.overallRisk).toBeGreaterThan(7) // Should be high risk
        expect(result.mlConfidence).toBeGreaterThan(0.7) // Should be confident
        expect(result.interventionPriority).toMatch(/critical|high/) // Should prioritize
        expect(result.immediacy).toBeGreaterThan(7) // Should be immediate
      }
    })

    it('should correctly identify low-risk or no-risk content', async () => {
      const lowRiskContexts: CrisisContext[] = [
        { text: 'I am feeling better today with therapy and family support' },
        { text: 'Sometimes I feel sad but I have hope for the future' },
        { text: 'My religious beliefs give me strength to continue living' },
        { text: 'I love my children and they give me reasons to live' },
        { text: 'The weather is nice today and I enjoyed my walk' }
      ]

      for (const context of lowRiskContexts) {
        const result = await detector.detectCrisisEnhanced(context)
        
        expect(result.overallRisk).toBeLessThan(4) // Should be low risk
        expect(result.interventionPriority).toMatch(/low|moderate/) // Should be low priority
        expect(result.protectiveFactors.length).toBeGreaterThanOrEqual(0) // May have protective factors
      }
    })

    it('should handle cultural context appropriately', async () => {
      const culturalContext: CrisisContext = {
        text: 'I feel shame bringing dishonor to my family',
        culturalBackground: 'asian',
        ageGroup: 'adolescent'
      }

      const result = await detector.detectCrisisEnhanced(culturalContext)

      expect(result.enhancementFlags).toContain('historical-risk-factor')
      expect(result.overallRisk).toBeGreaterThan(0) // Should recognize cultural risk factors
      expect(result.mlConfidence).toBeGreaterThan(0.5)
    })

    it('should provide accurate confidence scoring', async () => {
      const explicitContext: CrisisContext = {
        text: 'I am going to commit suicide tonight by hanging myself with the rope I bought'
      }

      const vagueContext: CrisisContext = {
        text: 'not good'
      }

      const explicitResult = await detector.detectCrisisEnhanced(explicitContext)
      const vagueResult = await detector.detectCrisisEnhanced(vagueContext)

      expect(explicitResult.mlConfidence).toBeGreaterThan(vagueResult.mlConfidence)
      expect(explicitResult.confidence).toBeGreaterThan(0.8)
      expect(vagueResult.confidence).toBeLessThan(0.5)
    })
  })

  describe('Real-Time Monitoring', () => {
    it('should provide accurate performance metrics', async () => {
      // Generate some test activity
      const contexts = [
        { text: 'I want to die' },
        { text: 'Feeling good today' },
        { text: 'Suicidal thoughts increasing' }
      ]

      for (const context of contexts) {
        await detector.detectCrisisEnhanced(context)
      }

      const metrics = detector.getRealTimeMetrics()

      expect(metrics.averageProcessingTime).toBeGreaterThan(0)
      expect(metrics.averageProcessingTime).toBeLessThan(1000)
      expect(metrics.totalDetections).toBe(3)
      expect(metrics.systemHealthScore).toBeGreaterThan(5)
    })

    it('should perform comprehensive health checks', async () => {
      const healthCheck = await detector.performHealthCheck()

      expect(healthCheck.status).toMatch(/healthy|degraded|critical/)
      expect(healthCheck.metrics).toBeDefined()
      expect(healthCheck.issues).toBeInstanceOf(Array)
      
      if (healthCheck.status === 'healthy') {
        expect(healthCheck.issues).toHaveLength(0)
      }
    })

    it('should handle outcome feedback for accuracy improvement', async () => {
      const contextId = 'test-context-123'
      
      // Record that a crisis actually occurred (severity 8) vs our prediction
      await expect(
        detector.recordActualOutcome(contextId, true, 8)
      ).resolves.not.toThrow()

      // Record that no crisis occurred
      await expect(
        detector.recordActualOutcome(contextId + '-2', false, 0)
      ).resolves.not.toThrow()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty or malformed input gracefully', async () => {
      const edgeCases: CrisisContext[] = [
        { text: '' },
        { text: ' ' },
        { text: '???' },
        { text: 'a'.repeat(10000) }, // Very long text
        { text: '🔥🔥🔥' } // Emoji only
      ]

      for (const context of edgeCases) {
        const result = await detector.detectCrisisEnhanced(context)
        
        expect(result).toBeDefined()
        expect(result.overallRisk).toBeGreaterThanOrEqual(0)
        expect(result.overallRisk).toBeLessThanOrEqual(10)
        expect(result.processingTimeMs).toBeLessThan(1000)
      }
    })

    it('should maintain functionality when external services fail', async () => {
      // Mock Supabase failure
      vi.mocked(detector['supabase'].from).mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const context: CrisisContext = {
        text: 'I want to hurt myself badly'
      }

      const result = await detector.detectCrisisEnhanced(context)

      expect(result).toBeDefined()
      expect(result.enhancementFlags).toContain('fallback-mode')
      expect(result.overallRisk).toBeGreaterThan(0) // Should still detect risk
    })

    it('should handle concurrent requests without conflicts', async () => {
      const contexts = Array.from({ length: 20 }, (_, i) => ({
        text: `Test message ${i} with some concerning content like wanting to die`
      }))

      const promises = contexts.map(context => detector.detectCrisisEnhanced(context))
      const results = await Promise.all(promises)

      expect(results).toHaveLength(20)
      results.forEach((result, i) => {
        expect(result).toBeDefined()
        expect(result.processingTimeMs).toBeLessThan(1000)
        expect(result.overallRisk).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Integration Points', () => {
    it('should generate appropriate enhancement flags', async () => {
      const contexts: Array<{ context: CrisisContext; expectedFlags: string[] }> = [
        {
          context: { text: 'I want to die', historicalRisk: true },
          expectedFlags: ['historical-risk-factor']
        },
        {
          context: { text: 'I want to kill myself right now tonight immediately' },
          expectedFlags: ['immediate-intervention-needed']
        },
        {
          context: { text: 'sad' },
          expectedFlags: ['low-confidence']
        }
      ]

      for (const { context, expectedFlags } of contexts) {
        const result = await detector.detectCrisisEnhanced(context)
        
        for (const flag of expectedFlags) {
          expect(result.enhancementFlags).toContain(flag)
        }
      }
    })

    it('should properly prioritize interventions', async () => {
      const criticalContext: CrisisContext = {
        text: 'I am going to kill myself and others tonight with my gun',
        historicalRisk: true
      }

      const moderateContext: CrisisContext = {
        text: 'Sometimes I think about ending my life but I have support'
      }

      const criticalResult = await detector.detectCrisisEnhanced(criticalContext)
      const moderateResult = await detector.detectCrisisEnhanced(moderateContext)

      expect(criticalResult.interventionPriority).toBe('critical')
      expect(moderateResult.interventionPriority).toMatch(/moderate|low/)
      expect(criticalResult.overallRisk).toBeGreaterThan(moderateResult.overallRisk)
    })
  })

  describe('Performance Optimization', () => {
    it('should optimize memory usage over time', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Generate many detections to test memory management
      for (let i = 0; i < 100; i++) {
        await detector.detectCrisisEnhanced({
          text: `Test message ${i} with various content`
        })
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should maintain cache efficiency', async () => {
      const context: CrisisContext = {
        text: 'Repeated test message for cache testing'
      }

      // Fill cache with this context
      for (let i = 0; i < 5; i++) {
        await detector.detectCrisisEnhanced(context)
      }

      // All subsequent calls should be cache hits
      const results = []
      for (let i = 0; i < 3; i++) {
        const result = await detector.detectCrisisEnhanced(context)
        results.push(result)
      }

      const cacheHits = results.filter(r => r.cacheHit).length
      expect(cacheHits).toBeGreaterThan(0) // Should have at least some cache hits
    })
  })

  describe('Alert System', () => {
    it('should generate alerts for critical situations', async () => {
      const criticalContext: CrisisContext = {
        text: 'I am going to kill myself tonight, I have the pills ready and wrote my goodbye letter'
      }

      const result = await detector.detectCrisisEnhanced(criticalContext)

      expect(result.interventionPriority).toBe('critical')
      expect(result.overallRisk).toBeGreaterThan(8)
      expect(result.immediacy).toBeGreaterThan(8)
    })

    it('should handle alert acknowledgments', async () => {
      const alertId = 'test-alert-123'
      const clinicianId = 'clinician-456'
      const notes = 'Patient contacted, safety plan implemented'

      await expect(
        detector.acknowledgeAlert(alertId, clinicianId, notes)
      ).resolves.not.toThrow()
    })
  })
})

// Performance benchmark tests
describe('Performance Benchmarks', () => {
  let detector: EnhancedCrisisDetector

  beforeEach(() => {
    detector = new EnhancedCrisisDetector()
  })

  it('should meet P95 latency requirements', async () => {
    const contexts = Array.from({ length: 100 }, (_, i) => ({
      text: `Performance test message ${i} containing various crisis indicators like suicide, self-harm, and violence`
    }))

    const processingTimes: number[] = []

    for (const context of contexts) {
      const result = await detector.detectCrisisEnhanced(context)
      processingTimes.push(result.processingTimeMs)
    }

    // Sort times to calculate percentiles
    processingTimes.sort((a, b) => a - b)
    
    const p50 = processingTimes[Math.floor(processingTimes.length * 0.5)]
    const p95 = processingTimes[Math.floor(processingTimes.length * 0.95)]
    const p99 = processingTimes[Math.floor(processingTimes.length * 0.99)]

    expect(p50).toBeLessThan(200) // P50 < 200ms
    expect(p95).toBeLessThan(1000) // P95 < 1s
    expect(p99).toBeLessThan(2000) // P99 < 2s
  })

  it('should maintain accuracy across different content types', async () => {
    const testCases = [
      { text: 'I want to commit suicide by overdose tonight', expectedHigh: true },
      { text: 'Going to shoot up the school and then myself', expectedHigh: true },
      { text: 'Voices telling me to kill everyone around me', expectedHigh: true },
      { text: 'I am feeling depressed but therapy helps', expectedHigh: false },
      { text: 'Having a great day with friends and family', expectedHigh: false },
      { text: 'Struggling but finding hope in community', expectedHigh: false }
    ]

    let correctPredictions = 0

    for (const testCase of testCases) {
      const result = await detector.detectCrisisEnhanced({ text: testCase.text })
      const predictedHigh = result.overallRisk >= 6
      
      if (predictedHigh === testCase.expectedHigh) {
        correctPredictions++
      }
    }

    const accuracy = correctPredictions / testCases.length
    expect(accuracy).toBeGreaterThan(0.95) // >95% accuracy requirement
  })
})
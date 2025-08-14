import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { CulturalBiasDetector } from '../bias-detection'
import { CulturalContextAnalyzer } from '../cultural-context-analyzer'
import { BiasMLModels } from '../bias-ml-models'
import { CulturalContent } from '../content-database'

// Mock dependencies
vi.mock('../cultural-context-analyzer')
vi.mock('../bias-ml-models')
vi.mock('@/lib/supabase/client')

// Mock Azure OpenAI
vi.mock('@azure/openai', () => ({
  AzureOpenAI: vi.fn().mockImplementation(() => ({
    getChatCompletions: vi.fn()
  }))
}))

describe('CulturalBiasDetector', () => {
  let biasDetector: CulturalBiasDetector
  let mockContextAnalyzer: Mock
  let mockMLModels: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mocks
    mockContextAnalyzer = vi.mocked(CulturalContextAnalyzer).prototype
    mockMLModels = vi.mocked(BiasMLModels).prototype

    mockContextAnalyzer.analyzeCulturalContext = vi.fn().mockResolvedValue({
      culturalAlignment: 0.8,
      appropriatenessScore: 0.7,
      biasRisk: 0.2,
      contextualRelevance: 0.8,
      culturalSensitivity: 0.9,
      crossCulturalConsiderations: [],
      potentialMisrepresentations: [],
      recommendations: []
    })

    mockMLModels.quickBiasCheck = vi.fn().mockResolvedValue({
      biasScore: 0.1,
      indicators: [],
      appropriateness: 0.9,
      recommendations: []
    })

    biasDetector = new CulturalBiasDetector({
      strictnessLevel: 'standard',
      autoFlag: false
    })
  })

  describe('detectBias', () => {
    it('should detect bias in problematic content', async () => {
      const problematicContent: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> = {
        contentType: 'story',
        cultureTags: ['Chinese'],
        title: 'Ancient Oriental Wisdom',
        content: 'The primitive Eastern people have mystical ancient wisdom that modern Western science cannot understand.',
        source: 'Test Source',
        therapeuticThemes: ['mindfulness'],
        therapeuticApplications: ['meditation'],
        targetIssues: ['anxiety'],
        expertValidated: false
      }

      const result = await biasDetector.detectBias(problematicContent)

      expect(result.biasScore).toBeGreaterThan(0.4)
      expect(result.isValid).toBe(false)
      expect(result.biasIndicators).toHaveLength(4) // primitive, oriental, mystical, ancient wisdom
      expect(result.biasIndicators[0].type).toBe('cultural_stereotyping')
      expect(result.recommendations).toContain('Content requires significant revision for cultural sensitivity')
    })

    it('should pass appropriate cultural content', async () => {
      const appropriateContent: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> = {
        contentType: 'meditation',
        cultureTags: ['Buddhist'],
        title: 'Mindfulness Meditation Practice',
        content: 'This meditation practice, rooted in Buddhist tradition, focuses on cultivating awareness and compassion. Practitioners observe their breath and thoughts with gentle attention.',
        source: 'Traditional Buddhist Text',
        therapeuticThemes: ['mindfulness', 'compassion'],
        therapeuticApplications: ['anxiety reduction'],
        targetIssues: ['stress'],
        expertValidated: false
      }

      const result = await biasDetector.detectBias(appropriateContent)

      expect(result.biasScore).toBeLessThan(0.3)
      expect(result.isValid).toBe(true)
      expect(result.biasIndicators).toHaveLength(0)
      expect(result.recommendations).toContain('Content appears culturally appropriate')
    })

    it('should detect religious insensitivity', async () => {
      const insensitiveContent: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> = {
        contentType: 'philosophy',
        cultureTags: ['Indigenous American'],
        title: 'Native Superstitions',
        content: 'These heathen practices from pagan tribes show their primitive understanding of the world.',
        source: 'Biased Source',
        therapeuticThemes: ['healing'],
        therapeuticApplications: ['therapy'],
        targetIssues: ['trauma'],
        expertValidated: false
      }

      const result = await biasDetector.detectBias(insensitiveContent)

      expect(result.biasScore).toBeGreaterThan(0.6)
      expect(result.isValid).toBe(false)
      
      const religiousIndicators = result.biasIndicators.filter(
        indicator => indicator.type === 'religious_insensitivity'
      )
      expect(religiousIndicators.length).toBeGreaterThan(0)
    })

    it('should handle ML analysis failure gracefully', async () => {
      mockMLModels.quickBiasCheck = vi.fn().mockRejectedValue(new Error('ML service unavailable'))

      const content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> = {
        contentType: 'story',
        cultureTags: ['General'],
        title: 'Test Content',
        content: 'This is test content for error handling.',
        source: 'Test',
        therapeuticThemes: ['healing'],
        therapeuticApplications: ['therapy'],
        targetIssues: ['stress'],
        expertValidated: false
      }

      const result = await biasDetector.detectBias(content)

      expect(result.biasScore).toBe(0.8) // Conservative fallback score
      expect(result.isValid).toBe(false)
      expect(result.recommendations).toContain('Manual expert review required due to analysis failure')
    })
  })

  describe('analyzeIncrementalContent', () => {
    it('should provide quick analysis for real-time feedback', async () => {
      const partialContent = 'This ancient wisdom from the mystical Orient...'
      const culturalContext = ['Asian']

      const result = await biasDetector.analyzeIncrementalContent(partialContent, culturalContext)

      expect(result.confidence).toBe(0.6) // Lower confidence for quick analysis
      expect(typeof result.biasScore).toBe('number')
      expect(Array.isArray(result.biasIndicators)).toBe(true)
    })

    it('should return minimal result for very short content', async () => {
      const shortContent = 'Hi'
      const culturalContext = ['General']

      const result = await biasDetector.analyzeIncrementalContent(shortContent, culturalContext)

      expect(result.biasScore).toBe(0)
      expect(result.isValid).toBe(true)
      expect(result.recommendations).toContain('Content too short for comprehensive analysis')
    })
  })

  describe('batchDetectBias', () => {
    it('should process multiple content pieces efficiently', async () => {
      const contents = [
        {
          contentType: 'story' as const,
          cultureTags: ['Chinese'],
          title: 'Story 1',
          content: 'Appropriate content about Chinese culture.',
          source: 'Source 1',
          therapeuticThemes: ['healing'],
          therapeuticApplications: ['therapy'],
          targetIssues: ['stress'],
          expertValidated: false
        },
        {
          contentType: 'proverb' as const,
          cultureTags: ['Japanese'],
          title: 'Story 2',
          content: 'Another appropriate piece of content.',
          source: 'Source 2',
          therapeuticThemes: ['wisdom'],
          therapeuticApplications: ['guidance'],
          targetIssues: ['anxiety'],
          expertValidated: false
        }
      ]

      const results = await biasDetector.batchDetectBias(contents)

      expect(results).toHaveLength(2)
      expect(results[0].biasScore).toBeDefined()
      expect(results[1].biasScore).toBeDefined()
    })
  })

  describe('getBiasStatistics', () => {
    it('should return comprehensive bias statistics', async () => {
      // Mock supabase response
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      }

      // Mock the supabase client to return sample data
      vi.doMock('@/lib/supabase/client', () => ({
        createClient: () => mockSupabase
      }))

      mockSupabase.from().select().eq = vi.fn().mockResolvedValue({
        data: [
          {
            id: '1',
            validator_type: 'bias_detection',
            validation_result: 'flagged',
            cultural_accuracy_score: 0.7,
            bias_indicators: [{ type: 'cultural_stereotyping' }],
            validated_at: new Date().toISOString()
          }
        ]
      })

      const stats = await biasDetector.getBiasStatistics()

      expect(stats.totalAnalyzed).toBeDefined()
      expect(stats.averageBiasScore).toBeDefined()
      expect(stats.flaggedContent).toBeDefined()
      expect(Array.isArray(stats.topBiasTypes)).toBe(true)
    })
  })

  describe('bias pattern detection', () => {
    it('should identify cultural stereotyping patterns', async () => {
      const stereotypicalContent: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> = {
        contentType: 'story',
        cultureTags: ['African'],
        title: 'Tribal Mentality',
        content: 'The backward tribal people with their savage customs need to be civilized.',
        source: 'Problematic Source',
        therapeuticThemes: ['cultural understanding'],
        therapeuticApplications: ['education'],
        targetIssues: ['prejudice'],
        expertValidated: false
      }

      const result = await biasDetector.detectBias(stereotypicalContent)

      const stereotypingIndicators = result.biasIndicators.filter(
        indicator => indicator.type === 'cultural_stereotyping'
      )
      
      expect(stereotypingIndicators.length).toBeGreaterThan(0)
      expect(result.analysisDetails.culturalStereotyping).toBeGreaterThan(0.5)
    })

    it('should identify orientalism patterns', async () => {
      const orientalistContent: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> = {
        contentType: 'philosophy',
        cultureTags: ['Asian'],
        title: 'Exotic Eastern Philosophy',
        content: 'The mystical Orient holds ancient secrets that the exotic Eastern mind understands.',
        source: 'Orientalist Text',
        therapeuticThemes: ['spirituality'],
        therapeuticApplications: ['meditation'],
        targetIssues: ['seeking meaning'],
        expertValidated: false
      }

      const result = await biasDetector.detectBias(orientalistContent)

      const orientalismIndicators = result.biasIndicators.filter(
        indicator => indicator.type === 'orientalism'
      )
      
      expect(orientalismIndicators.length).toBeGreaterThan(0)
    })
  })

  describe('configuration options', () => {
    it('should respect strictness levels', async () => {
      const strictDetector = new CulturalBiasDetector({
        strictnessLevel: 'strict',
        sensitivityThreshold: 0.2
      })

      const borderlineContent: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> = {
        contentType: 'story',
        cultureTags: ['Asian'],
        title: 'Ancient Wisdom',
        content: 'This ancient wisdom from traditional Eastern philosophy offers insights.',
        source: 'Philosophy Text',
        therapeuticThemes: ['wisdom'],
        therapeuticApplications: ['reflection'],
        targetIssues: ['life guidance'],
        expertValidated: false
      }

      const result = await strictDetector.detectBias(borderlineContent)

      // Strict mode should be more sensitive to potentially problematic language
      expect(result.biasScore).toBeGreaterThan(0)
    })

    it('should cache results for performance', async () => {
      const content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> = {
        contentType: 'meditation',
        cultureTags: ['Buddhist'],
        title: 'Mindfulness Practice',
        content: 'Simple mindfulness meditation for daily practice.',
        source: 'Meditation Guide',
        therapeuticThemes: ['mindfulness'],
        therapeuticApplications: ['stress relief'],
        targetIssues: ['anxiety'],
        expertValidated: false
      }

      // First call
      const result1 = await biasDetector.detectBias(content)
      
      // Second call should use cache
      const result2 = await biasDetector.detectBias(content)

      expect(result1.biasScore).toBe(result2.biasScore)
      expect(result1.isValid).toBe(result2.isValid)
    })
  })

  describe('performance requirements', () => {
    it('should complete bias detection within 1 second for real-time analysis', async () => {
      const content = 'This is test content for performance testing of bias detection systems.'
      const culturalContext = ['General']

      const startTime = Date.now()
      await biasDetector.analyzeIncrementalContent(content, culturalContext)
      const endTime = Date.now()

      const processingTime = endTime - startTime
      expect(processingTime).toBeLessThan(1000) // Less than 1 second
    })

    it('should handle concurrent bias checks efficiently', async () => {
      const contents = Array(5).fill(null).map((_, i) => ({
        contentType: 'story' as const,
        cultureTags: ['General'],
        title: `Test Content ${i}`,
        content: `This is test content number ${i} for concurrent processing.`,
        source: 'Test Source',
        therapeuticThemes: ['healing'],
        therapeuticApplications: ['therapy'],
        targetIssues: ['stress'],
        expertValidated: false
      }))

      const startTime = Date.now()
      const results = await Promise.all(
        contents.map(content => biasDetector.detectBias(content))
      )
      const endTime = Date.now()

      expect(results).toHaveLength(5)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})
import { AzureOpenAI } from '@azure/openai'
import { CulturalContent } from './content-database'
import { CulturalContextAnalyzer } from './cultural-context-analyzer'
import { BiasMLModels } from './bias-ml-models'
import { createClient } from '@/lib/supabase/client'

export interface BiasDetectionResult {
  biasScore: number
  isValid: boolean
  biasIndicators: BiasIndicator[]
  culturalAppropriateness: number
  confidence: number
  recommendations: string[]
  analysisDetails: BiasAnalysisDetails
}

export interface BiasIndicator {
  type: BiasType
  severity: 'low' | 'medium' | 'high' | 'critical'
  content: string
  explanation: string
  suggectedFix?: string
  startIndex: number
  endIndex: number
}

export interface BiasAnalysisDetails {
  culturalStereotyping: number
  culturalAppropriation: number
  harmfulGeneralization: number
  religousSensitivity: number
  historicalAccuracy: number
  languagePropriety: number
  contextualAppropriaqteness: number
  expertValidationScore?: number
}

export type BiasType = 
  | 'cultural_stereotyping'
  | 'cultural_appropriation'
  | 'harmful_generalization'
  | 'religious_insensitivity'
  | 'historical_inaccuracy'
  | 'inappropriate_language'
  | 'misrepresentation'
  | 'oversimplification'
  | 'western_bias'
  | 'orientalism'
  | 'cultural_essentialism'

export interface BiasDetectionConfig {
  enableMLModels: boolean
  enableRealTimeAnalysis: boolean
  strictnessLevel: 'permissive' | 'standard' | 'strict'
  requireExpertValidation: boolean
  autoFlag: boolean
  culturalContexts: string[]
  sensitivityThreshold: number
}

export interface CulturalBiasCache {
  contentHash: string
  result: BiasDetectionResult
  analyzedAt: Date
  expertValidated?: boolean
}

export class CulturalBiasDetector {
  private azureOpenAI: AzureOpenAI
  private contextAnalyzer: CulturalContextAnalyzer
  private mlModels: BiasMLModels
  private supabase: ReturnType<typeof createClient>
  private config: BiasDetectionConfig
  private cache: Map<string, CulturalBiasCache> = new Map()
  
  constructor(config: Partial<BiasDetectionConfig> = {}) {
    this.azureOpenAI = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      apiVersion: '2024-08-01-preview'
    })
    
    this.contextAnalyzer = new CulturalContextAnalyzer()
    this.mlModels = new BiasMLModels()
    this.supabase = createClient()
    
    this.config = {
      enableMLModels: true,
      enableRealTimeAnalysis: true,
      strictnessLevel: 'standard',
      requireExpertValidation: false,
      autoFlag: true,
      culturalContexts: [],
      sensitivityThreshold: 0.7,
      ...config
    }
  }

  /**
   * Comprehensive bias detection analysis
   */
  async detectBias(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent,
    options: {
      forceReanalysis?: boolean
      culturalContext?: string[]
      skipCache?: boolean
    } = {}
  ): Promise<BiasDetectionResult> {
    const startTime = Date.now()
    
    try {
      // Generate content hash for caching
      const contentHash = this.generateContentHash(content)
      
      // Check cache first
      if (!options.skipCache && !options.forceReanalysis) {
        const cached = this.getCachedResult(contentHash)
        if (cached) {
          console.log(`Bias detection cache hit for content hash: ${contentHash}`)
          return cached.result
        }
      }

      // Parallel analysis for speed
      const [
        keywordAnalysis,
        mlAnalysis,
        culturalContextAnalysis,
        religiousAnalysis
      ] = await Promise.all([
        this.performKeywordAnalysis(content),
        this.config.enableMLModels ? this.performMLAnalysis(content) : this.createEmptyMLResult(),
        this.contextAnalyzer.analyzeCulturalContext(content, options.culturalContext || content.cultureTags),
        this.analyzeReligiousAndSpiritualSensitivity(content)
      ])

      // Combine analysis results
      const result = this.combineAnalysisResults({
        keywordAnalysis,
        mlAnalysis,
        culturalContextAnalysis,
        religiousAnalysis,
        content
      })

      // Cache result
      this.cacheResult(contentHash, result)

      // Log performance
      const processingTime = Date.now() - startTime
      console.log(`Bias detection completed in ${processingTime}ms for content: ${content.title}`)

      // Auto-flag if configured
      if (this.config.autoFlag && result.biasScore > this.config.sensitivityThreshold) {
        await this.flagForReview(content, result)
      }

      return result
    } catch (error) {
      console.error('Bias detection failed:', error)
      
      // Return safe fallback result
      return {
        biasScore: 0.8, // Conservative high score when analysis fails
        isValid: false,
        biasIndicators: [{
          type: 'misrepresentation',
          severity: 'medium',
          content: 'Analysis failed',
          explanation: 'Could not complete bias analysis - manual review required',
          startIndex: 0,
          endIndex: content.content.length
        }],
        culturalAppropriateness: 0.3,
        confidence: 0.1,
        recommendations: ['Manual expert review required due to analysis failure'],
        analysisDetails: this.createEmptyAnalysisDetails()
      }
    }
  }

  /**
   * Real-time bias detection for content as it's being written
   */
  async analyzeIncrementalContent(
    partialContent: string,
    culturalContext: string[],
    previousAnalysis?: BiasDetectionResult
  ): Promise<BiasDetectionResult> {
    if (partialContent.length < 50) {
      return this.createMinimalAnalysisResult()
    }

    // Quick ML-based analysis for real-time feedback
    const quickAnalysis = await this.mlModels.quickBiasCheck(partialContent, culturalContext)
    
    return {
      biasScore: quickAnalysis.biasScore,
      isValid: quickAnalysis.biasScore < 0.4,
      biasIndicators: quickAnalysis.indicators.map(indicator => ({
        type: indicator.type as BiasType,
        severity: indicator.severity as 'low' | 'medium' | 'high' | 'critical',
        content: indicator.text,
        explanation: indicator.explanation,
        startIndex: indicator.start,
        endIndex: indicator.end
      })),
      culturalAppropriateness: quickAnalysis.appropriateness,
      confidence: 0.6, // Lower confidence for quick analysis
      recommendations: quickAnalysis.recommendations,
      analysisDetails: this.createPartialAnalysisDetails(quickAnalysis)
    }
  }

  /**
   * Batch bias detection for multiple pieces of content
   */
  async batchDetectBias(
    contents: Array<Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>>,
    options: {
      maxConcurrency?: number
      skipCache?: boolean
    } = {}
  ): Promise<BiasDetectionResult[]> {
    const maxConcurrency = options.maxConcurrency || 5
    const results: BiasDetectionResult[] = []
    
    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < contents.length; i += maxConcurrency) {
      const batch = contents.slice(i, i + maxConcurrency)
      const batchResults = await Promise.all(
        batch.map(content => this.detectBias(content, { skipCache: options.skipCache }))
      )
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Get bias detection statistics
   */
  async getBiasStatistics(timeRange?: { start: Date; end: Date }): Promise<{
    totalAnalyzed: number
    averageBiasScore: number
    flaggedContent: number
    expertValidated: number
    topBiasTypes: Array<{ type: BiasType; count: number }>
    improvementTrend: number
  }> {
    try {
      let query = this.supabase
        .from('cultural_content_validation')
        .select('*')
        .eq('validator_type', 'bias_detection')

      if (timeRange) {
        query = query
          .gte('validated_at', timeRange.start.toISOString())
          .lte('validated_at', timeRange.end.toISOString())
      }

      const { data: validations } = await query

      if (!validations) {
        return this.createEmptyStatistics()
      }

      const totalAnalyzed = validations.length
      const averageBiasScore = validations.reduce((sum, v) => 
        sum + (parseFloat(v.cultural_accuracy_score?.toString() || '0')), 0) / totalAnalyzed
      
      const flaggedContent = validations.filter(v => v.validation_result === 'flagged').length
      const expertValidated = validations.filter(v => v.validator_type === 'expert').length

      // Analyze bias types from bias_indicators JSON
      const biasTypeCount: Record<string, number> = {}
      validations.forEach(validation => {
        if (validation.bias_indicators) {
          const indicators = Array.isArray(validation.bias_indicators) 
            ? validation.bias_indicators 
            : [validation.bias_indicators]
          
          indicators.forEach((indicator: any) => {
            if (indicator.type) {
              biasTypeCount[indicator.type] = (biasTypeCount[indicator.type] || 0) + 1
            }
          })
        }
      })

      const topBiasTypes = Object.entries(biasTypeCount)
        .map(([type, count]) => ({ type: type as BiasType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      return {
        totalAnalyzed,
        averageBiasScore,
        flaggedContent,
        expertValidated,
        topBiasTypes,
        improvementTrend: this.calculateImprovementTrend(validations)
      }
    } catch (error) {
      console.error('Failed to get bias statistics:', error)
      return this.createEmptyStatistics()
    }
  }

  // Private methods

  private async performKeywordAnalysis(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): Promise<{ indicators: BiasIndicator[]; score: number }> {
    const biasPatterns = this.getBiasPatterns()
    const indicators: BiasIndicator[] = []
    const contentText = `${content.title} ${content.content}`.toLowerCase()

    for (const pattern of biasPatterns) {
      const matches = this.findPatternMatches(contentText, pattern)
      indicators.push(...matches)
    }

    const score = Math.min(indicators.length * 0.15, 1.0)
    return { indicators, score }
  }

  private async performMLAnalysis(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): Promise<{ indicators: BiasIndicator[]; score: number; confidence: number }> {
    try {
      // Use Azure OpenAI for sophisticated bias analysis
      const prompt = this.createBiasAnalysisPrompt(content)
      
      const response = await this.azureOpenAI.getChatCompletions(
        'gpt-4', // Use GPT-4 for best bias detection
        [{ role: 'user', content: prompt }],
        {
          temperature: 0.1,
          maxTokens: 1000
        }
      )

      const analysis = this.parseMLResponse(response.choices[0]?.message?.content || '')
      return analysis
    } catch (error) {
      console.error('ML bias analysis failed:', error)
      return this.createEmptyMLResult()
    }
  }

  private async analyzeReligiousAndSpiritualSensitivity(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): Promise<{ indicators: BiasIndicator[]; score: number }> {
    const religiousTerms = this.getReligiousAnalysisPatterns()
    const indicators: BiasIndicator[] = []
    const contentText = `${content.title} ${content.content}`.toLowerCase()

    // Check for potentially insensitive religious/spiritual language
    for (const term of religiousTerms) {
      if (contentText.includes(term.pattern)) {
        indicators.push({
          type: 'religious_insensitivity',
          severity: term.severity,
          content: term.pattern,
          explanation: term.explanation,
          suggectedFix: term.suggestedFix,
          startIndex: contentText.indexOf(term.pattern),
          endIndex: contentText.indexOf(term.pattern) + term.pattern.length
        })
      }
    }

    const score = Math.min(indicators.length * 0.2, 1.0)
    return { indicators, score }
  }

  private combineAnalysisResults(analyses: {
    keywordAnalysis: { indicators: BiasIndicator[]; score: number }
    mlAnalysis: { indicators: BiasIndicator[]; score: number; confidence: number }
    culturalContextAnalysis: any
    religiousAnalysis: { indicators: BiasIndicator[]; score: number }
    content: any
  }): BiasDetectionResult {
    const allIndicators = [
      ...analyses.keywordAnalysis.indicators,
      ...analyses.mlAnalysis.indicators,
      ...analyses.religiousAnalysis.indicators
    ]

    // Weighted scoring
    const keywordWeight = 0.2
    const mlWeight = 0.5
    const religiousWeight = 0.2
    const contextWeight = 0.1

    const biasScore = (
      analyses.keywordAnalysis.score * keywordWeight +
      analyses.mlAnalysis.score * mlWeight +
      analyses.religiousAnalysis.score * religiousWeight +
      (analyses.culturalContextAnalysis.biasRisk || 0) * contextWeight
    )

    const culturalAppropriateness = Math.max(0, 1 - biasScore)
    const isValid = biasScore < this.getValidityThreshold()

    return {
      biasScore,
      isValid,
      biasIndicators: allIndicators,
      culturalAppropriateness,
      confidence: analyses.mlAnalysis.confidence || 0.8,
      recommendations: this.generateRecommendations(allIndicators, biasScore),
      analysisDetails: {
        culturalStereotyping: this.calculateSpecificBiasScore(allIndicators, 'cultural_stereotyping'),
        culturalAppropriation: this.calculateSpecificBiasScore(allIndicators, 'cultural_appropriation'),
        harmfulGeneralization: this.calculateSpecificBiasScore(allIndicators, 'harmful_generalization'),
        religousSensitivity: this.calculateSpecificBiasScore(allIndicators, 'religious_insensitivity'),
        historicalAccuracy: this.calculateSpecificBiasScore(allIndicators, 'historical_inaccuracy'),
        languagePropriety: this.calculateSpecificBiasScore(allIndicators, 'inappropriate_language'),
        contextualAppropriaqteness: culturalAppropriateness
      }
    }
  }

  private getBiasPatterns(): Array<{
    pattern: string
    type: BiasType
    severity: 'low' | 'medium' | 'high' | 'critical'
    explanation: string
    suggestedFix?: string
  }> {
    return [
      {
        pattern: 'primitive',
        type: 'cultural_stereotyping',
        severity: 'high',
        explanation: 'The term "primitive" implies a hierarchy that devalues certain cultures',
        suggestedFix: 'Use "traditional" or "indigenous" instead'
      },
      {
        pattern: 'exotic',
        type: 'orientalism',
        severity: 'medium',
        explanation: 'Describing cultures as "exotic" can othering and fetishization',
        suggestedFix: 'Describe specific cultural practices without value judgments'
      },
      {
        pattern: 'mystical orient',
        type: 'orientalism',
        severity: 'high',
        explanation: 'Perpetuates Western stereotypes about Asian cultures',
        suggestedFix: 'Focus on specific cultural practices without generalizations'
      },
      {
        pattern: 'ancient wisdom',
        type: 'cultural_essentialism',
        severity: 'medium',
        explanation: 'Reduces complex cultures to simplistic spiritual concepts',
        suggestedFix: 'Reference specific teachings or practices with historical context'
      },
      {
        pattern: 'savage',
        type: 'cultural_stereotyping',
        severity: 'critical',
        explanation: 'Dehumanizing language historically used to justify oppression',
        suggestedFix: 'Use respectful terminology when discussing different cultural practices'
      },
      {
        pattern: 'backward',
        type: 'cultural_stereotyping',
        severity: 'high',
        explanation: 'Implies cultural hierarchy and progress narrative',
        suggestedFix: 'Describe cultural differences without value judgments'
      },
      {
        pattern: 'tribal mentality',
        type: 'harmful_generalization',
        severity: 'high',
        explanation: 'Reduces complex social structures to negative stereotypes',
        suggestedFix: 'Discuss specific cultural practices or community structures'
      }
    ]
  }

  private getReligiousAnalysisPatterns(): Array<{
    pattern: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    explanation: string
    suggestedFix?: string
  }> {
    return [
      {
        pattern: 'pagan',
        severity: 'medium',
        explanation: 'Can be considered derogatory when referring to indigenous spiritual practices',
        suggestedFix: 'Use "indigenous spiritual traditions" or specific practice names'
      },
      {
        pattern: 'heathen',
        severity: 'high',
        explanation: 'Derogatory term that implies religious superiority',
        suggestedFix: 'Use neutral terms for different religious or spiritual practices'
      },
      {
        pattern: 'cult',
        severity: 'medium',
        explanation: 'Can be loaded with negative connotations when describing religious practices',
        suggestedFix: 'Use "religious movement" or "spiritual community" for neutral description'
      },
      {
        pattern: 'superstition',
        severity: 'medium',
        explanation: 'Dismisses spiritual beliefs as irrational',
        suggestedFix: 'Use "traditional beliefs" or "spiritual practices"'
      }
    ]
  }

  private createBiasAnalysisPrompt(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): string {
    return `Analyze the following cultural content for potential bias, cultural appropriation, or insensitive language. Consider the cultural context: ${content.cultureTags.join(', ')}.

Title: ${content.title}
Content: ${content.content}
Source: ${content.source}
Cultural Tags: ${content.cultureTags.join(', ')}

Please provide a JSON response with the following structure:
{
  "biasScore": number (0-1, where 1 is most biased),
  "confidence": number (0-1),
  "indicators": [
    {
      "type": "bias_type",
      "severity": "low|medium|high|critical",
      "text": "problematic text",
      "explanation": "why this is problematic",
      "start": number,
      "end": number
    }
  ],
  "appropriateness": number (0-1),
  "recommendations": ["specific suggestion 1", "specific suggestion 2"]
}

Focus on:
1. Cultural stereotyping or generalizations
2. Cultural appropriation
3. Orientalism or exoticism
4. Religious insensitivity
5. Historical inaccuracies
6. Language that diminishes or others cultures
7. Western-centric perspectives presented as universal`
  }

  private parseMLResponse(response: string): { indicators: BiasIndicator[]; score: number; confidence: number } {
    try {
      const parsed = JSON.parse(response)
      
      return {
        indicators: parsed.indicators?.map((ind: any) => ({
          type: ind.type as BiasType,
          severity: ind.severity as 'low' | 'medium' | 'high' | 'critical',
          content: ind.text,
          explanation: ind.explanation,
          startIndex: ind.start || 0,
          endIndex: ind.end || 0
        })) || [],
        score: parsed.biasScore || 0,
        confidence: parsed.confidence || 0.5
      }
    } catch (error) {
      console.error('Failed to parse ML bias analysis response:', error)
      return this.createEmptyMLResult()
    }
  }

  private findPatternMatches(text: string, pattern: any): BiasIndicator[] {
    const indicators: BiasIndicator[] = []
    let startIndex = 0
    
    while (true) {
      const index = text.indexOf(pattern.pattern, startIndex)
      if (index === -1) break
      
      indicators.push({
        type: pattern.type,
        severity: pattern.severity,
        content: pattern.pattern,
        explanation: pattern.explanation,
        suggectedFix: pattern.suggestedFix,
        startIndex: index,
        endIndex: index + pattern.pattern.length
      })
      
      startIndex = index + 1
    }
    
    return indicators
  }

  private generateRecommendations(indicators: BiasIndicator[], biasScore: number): string[] {
    const recommendations: string[] = []
    
    if (biasScore > 0.7) {
      recommendations.push('Content requires significant revision for cultural sensitivity')
    } else if (biasScore > 0.4) {
      recommendations.push('Content needs minor adjustments for cultural appropriateness')
    }
    
    // Type-specific recommendations
    const typeGroups = this.groupIndicatorsByType(indicators)
    
    for (const [type, typeIndicators] of Object.entries(typeGroups)) {
      if (typeIndicators.length > 0) {
        recommendations.push(this.getTypeSpecificRecommendation(type as BiasType, typeIndicators))
      }
    }
    
    if (indicators.length === 0) {
      recommendations.push('Content appears culturally appropriate')
    }
    
    return recommendations
  }

  private calculateSpecificBiasScore(indicators: BiasIndicator[], type: BiasType): number {
    const typeIndicators = indicators.filter(ind => ind.type === type)
    if (typeIndicators.length === 0) return 0
    
    const severityWeights = { low: 0.1, medium: 0.3, high: 0.7, critical: 1.0 }
    const totalWeight = typeIndicators.reduce((sum, ind) => sum + severityWeights[ind.severity], 0)
    
    return Math.min(totalWeight / typeIndicators.length, 1.0)
  }

  private async flagForReview(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent,
    result: BiasDetectionResult
  ): Promise<void> {
    try {
      // Store validation record for expert review
      await this.supabase
        .from('cultural_content_validation')
        .insert({
          content_id: 'id' in content ? content.id : 'pending',
          validator_type: 'bias_detection',
          validation_result: 'flagged',
          cultural_accuracy_score: result.culturalAppropriateness,
          bias_indicators: result.biasIndicators,
          recommended_changes: result.recommendations.join('; '),
          validation_notes: `Automated bias detection flagged with score: ${result.biasScore}`
        })
      
      console.log(`Content flagged for expert review: ${content.title}`)
    } catch (error) {
      console.error('Failed to flag content for review:', error)
    }
  }

  // Utility methods

  private generateContentHash(content: any): string {
    const hashInput = `${content.title}|${content.content}|${content.cultureTags.join(',')}`
    return Buffer.from(hashInput).toString('base64').slice(0, 16)
  }

  private getCachedResult(hash: string): CulturalBiasCache | null {
    const cached = this.cache.get(hash)
    if (cached && (Date.now() - cached.analyzedAt.getTime()) < 24 * 60 * 60 * 1000) { // 24 hour cache
      return cached
    }
    return null
  }

  private cacheResult(hash: string, result: BiasDetectionResult): void {
    this.cache.set(hash, {
      contentHash: hash,
      result,
      analyzedAt: new Date()
    })
    
    // Cleanup old cache entries
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
  }

  private getValidityThreshold(): number {
    const thresholds = {
      permissive: 0.6,
      standard: 0.4,
      strict: 0.2
    }
    return thresholds[this.config.strictnessLevel]
  }

  private groupIndicatorsByType(indicators: BiasIndicator[]): Record<string, BiasIndicator[]> {
    return indicators.reduce((groups, indicator) => {
      if (!groups[indicator.type]) {
        groups[indicator.type] = []
      }
      groups[indicator.type].push(indicator)
      return groups
    }, {} as Record<string, BiasIndicator[]>)
  }

  private getTypeSpecificRecommendation(type: BiasType, indicators: BiasIndicator[]): string {
    const recommendations = {
      cultural_stereotyping: 'Replace stereotypical language with specific, respectful descriptions',
      cultural_appropriation: 'Ensure proper attribution and context for cultural practices',
      harmful_generalization: 'Avoid broad generalizations about cultural groups',
      religious_insensitivity: 'Use neutral, respectful language when discussing spiritual practices',
      historical_inaccuracy: 'Verify historical claims with reliable sources',
      inappropriate_language: 'Replace potentially offensive terms with respectful alternatives',
      misrepresentation: 'Ensure accurate representation of cultural practices and beliefs',
      oversimplification: 'Provide more nuanced descriptions of complex cultural concepts',
      western_bias: 'Consider perspectives from the cultures being discussed',
      orientalism: 'Avoid exoticizing or othering language about non-Western cultures',
      cultural_essentialism: 'Acknowledge diversity within cultural groups'
    }
    
    return recommendations[type] || 'Review content for cultural sensitivity'
  }

  private createEmptyMLResult(): { indicators: BiasIndicator[]; score: number; confidence: number } {
    return { indicators: [], score: 0, confidence: 0 }
  }

  private createEmptyAnalysisDetails(): BiasAnalysisDetails {
    return {
      culturalStereotyping: 0,
      culturalAppropriation: 0,
      harmfulGeneralization: 0,
      religousSensitivity: 0,
      historicalAccuracy: 0,
      languagePropriety: 0,
      contextualAppropriaqteness: 0
    }
  }

  private createMinimalAnalysisResult(): BiasDetectionResult {
    return {
      biasScore: 0,
      isValid: true,
      biasIndicators: [],
      culturalAppropriateness: 1,
      confidence: 0.5,
      recommendations: ['Content too short for comprehensive analysis'],
      analysisDetails: this.createEmptyAnalysisDetails()
    }
  }

  private createPartialAnalysisDetails(quickAnalysis: any): BiasAnalysisDetails {
    return {
      culturalStereotyping: quickAnalysis.culturalStereotyping || 0,
      culturalAppropriation: quickAnalysis.culturalAppropriation || 0,
      harmfulGeneralization: quickAnalysis.harmfulGeneralization || 0,
      religousSensitivity: quickAnalysis.religiousSensitivity || 0,
      historicalAccuracy: quickAnalysis.historicalAccuracy || 0,
      languagePropriety: quickAnalysis.languagePropriety || 0,
      contextualAppropriaqteness: quickAnalysis.appropriateness || 0
    }
  }

  private createEmptyStatistics() {
    return {
      totalAnalyzed: 0,
      averageBiasScore: 0,
      flaggedContent: 0,
      expertValidated: 0,
      topBiasTypes: [],
      improvementTrend: 0
    }
  }

  private calculateImprovementTrend(validations: any[]): number {
    if (validations.length < 2) return 0
    
    // Sort by date and calculate trend
    const sorted = validations
      .filter(v => v.cultural_accuracy_score)
      .sort((a, b) => new Date(a.validated_at).getTime() - new Date(b.validated_at).getTime())
    
    if (sorted.length < 2) return 0
    
    const recent = sorted.slice(-10)
    const older = sorted.slice(0, Math.max(1, sorted.length - 10))
    
    const recentAvg = recent.reduce((sum, v) => sum + parseFloat(v.cultural_accuracy_score), 0) / recent.length
    const olderAvg = older.reduce((sum, v) => sum + parseFloat(v.cultural_accuracy_score), 0) / older.length
    
    return (recentAvg - olderAvg) / olderAvg
  }
}
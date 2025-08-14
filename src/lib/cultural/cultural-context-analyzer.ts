import { CulturalContent } from './content-database'
import { AzureOpenAI } from '@azure/openai'

export interface CulturalContextAnalysis {
  culturalAlignment: number
  appropriatenessScore: number
  biasRisk: number
  contextualRelevance: number
  culturalSensitivity: number
  crossCulturalConsiderations: string[]
  potentialMisrepresentations: string[]
  recommendations: string[]
}

export interface CulturalPerspective {
  cultureName: string
  appropriateness: number
  concerns: string[]
  adaptations: string[]
}

export interface CrossCulturalAnalysis {
  primaryCulture: string
  secondaryCultures: string[]
  culturalConflicts: Array<{
    culture1: string
    culture2: string
    conflictType: string
    severity: 'low' | 'medium' | 'high'
    explanation: string
  }>
  universalElements: string[]
  cultureSpecificElements: Array<{
    culture: string
    elements: string[]
    exclusivity: number
  }>
}

export class CulturalContextAnalyzer {
  private azureOpenAI: AzureOpenAI
  private cultureKnowledgeBase: Map<string, CultureKnowledge> = new Map()
  
  constructor() {
    this.azureOpenAI = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      apiVersion: '2024-08-01-preview'
    })
    
    this.initializeCultureKnowledgeBase()
  }

  /**
   * Analyze cultural context and appropriateness
   */
  async analyzeCulturalContext(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent,
    userCulturalContext: string[]
  ): Promise<CulturalContextAnalysis> {
    try {
      // Parallel analysis for comprehensive understanding
      const [
        culturalAlignment,
        biasRisk,
        crossCulturalAnalysis,
        sensitivityAnalysis
      ] = await Promise.all([
        this.assessCulturalAlignment(content, userCulturalContext),
        this.assessBiasRisk(content),
        this.performCrossCulturalAnalysis(content),
        this.analyzeCulturalSensitivity(content, userCulturalContext)
      ])

      return {
        culturalAlignment: culturalAlignment.score,
        appropriatenessScore: this.calculateAppropriatenessScore(culturalAlignment, biasRisk, sensitivityAnalysis),
        biasRisk: biasRisk.riskScore,
        contextualRelevance: culturalAlignment.relevance,
        culturalSensitivity: sensitivityAnalysis.sensitivityScore,
        crossCulturalConsiderations: crossCulturalAnalysis.considerations,
        potentialMisrepresentations: biasRisk.misrepresentations,
        recommendations: this.generateContextualRecommendations(
          culturalAlignment, 
          biasRisk, 
          crossCulturalAnalysis, 
          sensitivityAnalysis
        )
      }
    } catch (error) {
      console.error('Cultural context analysis failed:', error)
      return this.createFailsafeAnalysis()
    }
  }

  /**
   * Analyze how content might be perceived across multiple cultures
   */
  async analyzeMultiCulturalPerspectives(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent,
    targetCultures: string[]
  ): Promise<CulturalPerspective[]> {
    const perspectives: CulturalPerspective[] = []
    
    for (const culture of targetCultures) {
      try {
        const perspective = await this.analyzeFromCulturalPerspective(content, culture)
        perspectives.push(perspective)
      } catch (error) {
        console.error(`Failed to analyze perspective for culture ${culture}:`, error)
        perspectives.push(this.createFailsafePerspective(culture))
      }
    }
    
    return perspectives
  }

  /**
   * Detect potential cultural appropriation
   */
  async detectCulturalAppropriation(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): Promise<{
    appropriationRisk: number
    concernedCultures: string[]
    appropriationTypes: Array<{
      type: 'sacred_symbols' | 'religious_practices' | 'traditional_knowledge' | 'artistic_expressions' | 'healing_practices'
      severity: 'low' | 'medium' | 'high' | 'critical'
      explanation: string
      mitigation: string
    }>
    recommendations: string[]
  }> {
    try {
      const prompt = this.createAppropriationAnalysisPrompt(content)
      
      const response = await this.azureOpenAI.getChatCompletions(
        'gpt-4',
        [{ role: 'user', content: prompt }],
        {
          temperature: 0.1,
          maxTokens: 800
        }
      )

      return this.parseAppropriationResponse(response.choices[0]?.message?.content || '')
    } catch (error) {
      console.error('Cultural appropriation analysis failed:', error)
      return {
        appropriationRisk: 0.5, // Conservative default
        concernedCultures: content.cultureTags,
        appropriationTypes: [],
        recommendations: ['Manual expert review recommended due to analysis failure']
      }
    }
  }

  /**
   * Validate cultural authenticity
   */
  async validateCulturalAuthenticity(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): Promise<{
    authenticityScore: number
    verificationSources: string[]
    discrepancies: Array<{
      claim: string
      issue: string
      severity: 'minor' | 'moderate' | 'major'
      correction?: string
    }>
    confidenceLevel: number
  }> {
    try {
      // Use AI to cross-reference with cultural knowledge
      const prompt = this.createAuthenticityValidationPrompt(content)
      
      const response = await this.azureOpenAI.getChatCompletions(
        'gpt-4',
        [{ role: 'user', content: prompt }],
        {
          temperature: 0.1,
          maxTokens: 1000
        }
      )

      return this.parseAuthenticityResponse(response.choices[0]?.message?.content || '')
    } catch (error) {
      console.error('Cultural authenticity validation failed:', error)
      return {
        authenticityScore: 0.6,
        verificationSources: [],
        discrepancies: [],
        confidenceLevel: 0.3
      }
    }
  }

  // Private methods

  private async assessCulturalAlignment(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent,
    userCulturalContext: string[]
  ): Promise<{ score: number; relevance: number; alignmentFactors: string[] }> {
    const contentCultures = content.cultureTags
    const userCultures = userCulturalContext
    
    // Calculate direct cultural overlap
    const directOverlap = contentCultures.filter(cc => 
      userCultures.some(uc => 
        uc.toLowerCase().includes(cc.toLowerCase()) || 
        cc.toLowerCase().includes(uc.toLowerCase())
      )
    )
    
    const overlapScore = directOverlap.length / Math.max(contentCultures.length, 1)
    
    // Check for cultural family relationships (e.g., East Asian cultures)
    const familyAlignment = this.calculateCulturalFamilyAlignment(contentCultures, userCultures)
    
    // Consider universal vs culture-specific elements
    const universalElements = this.identifyUniversalElements(content)
    const universalScore = universalElements.length > 0 ? 0.3 : 0
    
    const alignmentScore = (overlapScore * 0.6) + (familyAlignment * 0.3) + (universalScore * 0.1)
    
    return {
      score: Math.min(alignmentScore, 1.0),
      relevance: overlapScore > 0 ? 0.8 : familyAlignment > 0 ? 0.6 : 0.4,
      alignmentFactors: [
        ...directOverlap.map(culture => `Direct cultural match: ${culture}`),
        ...(familyAlignment > 0 ? ['Related cultural family'] : []),
        ...(universalElements.length > 0 ? ['Contains universal therapeutic elements'] : [])
      ]
    }
  }

  private async assessBiasRisk(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): Promise<{ riskScore: number; misrepresentations: string[] }> {
    const contentText = `${content.title} ${content.content}`.toLowerCase()
    const biasIndicators: string[] = []
    
    // Check for problematic generalizations
    const generalizationPatterns = [
      'all [culture] people',
      '[culture] culture believes',
      'typical [culture] behavior',
      'traditional [culture] values'
    ]
    
    for (const culture of content.cultureTags) {
      for (const pattern of generalizationPatterns) {
        const patternWithCulture = pattern.replace('[culture]', culture.toLowerCase())
        if (contentText.includes(patternWithCulture)) {
          biasIndicators.push(`Potential overgeneralization about ${culture}`)
        }
      }
    }
    
    // Check for Western-centric framing
    const westernCentricPatterns = [
      'western psychology',
      'modern approach',
      'scientific method',
      'evidence-based'
    ]
    
    const westernFraming = westernCentricPatterns.some(pattern => contentText.includes(pattern))
    if (westernFraming && content.cultureTags.some(tag => !this.isWesternCulture(tag))) {
      biasIndicators.push('Western-centric framing detected in non-Western cultural content')
    }
    
    const riskScore = Math.min(biasIndicators.length * 0.2, 1.0)
    
    return {
      riskScore,
      misrepresentations: biasIndicators
    }
  }

  private async performCrossCulturalAnalysis(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): Promise<{ considerations: string[] }> {
    const considerations: string[] = []
    const cultures = content.cultureTags
    
    // Check for potentially conflicting cultural values
    for (let i = 0; i < cultures.length; i++) {
      for (let j = i + 1; j < cultures.length; j++) {
        const conflicts = this.identifyCulturalConflicts(cultures[i], cultures[j])
        considerations.push(...conflicts)
      }
    }
    
    // Check for cultural hierarchy implications
    if (cultures.length > 1) {
      considerations.push('Consider equal representation of all mentioned cultures')
      considerations.push('Avoid presenting one culture as more advanced or sophisticated')
    }
    
    // Check for religious sensitivities
    const religiousElements = this.identifyReligiousElements(content)
    if (religiousElements.length > 0) {
      considerations.push('Content includes religious/spiritual elements - ensure respectful treatment')
    }
    
    return { considerations }
  }

  private async analyzeCulturalSensitivity(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent,
    userCulturalContext: string[]
  ): Promise<{ sensitivityScore: number; sensitivityFactors: string[] }> {
    const factors: string[] = []
    let score = 1.0 // Start optimistic
    
    // Check for cultural taboos
    const taboos = this.checkForCulturalTaboos(content, userCulturalContext)
    if (taboos.length > 0) {
      score -= 0.3
      factors.push(...taboos)
    }
    
    // Check for appropriate cultural context
    const hasProperContext = this.hasProperCulturalContext(content)
    if (!hasProperContext) {
      score -= 0.2
      factors.push('Lacks sufficient cultural context')
    }
    
    // Check for respectful language
    const respectfulLanguage = this.usesRespectfulLanguage(content)
    if (!respectfulLanguage) {
      score -= 0.3
      factors.push('Language may not be culturally respectful')
    }
    
    return {
      sensitivityScore: Math.max(score, 0),
      sensitivityFactors: factors
    }
  }

  private async analyzeFromCulturalPerspective(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent,
    culture: string
  ): Promise<CulturalPerspective> {
    const prompt = `Analyze the following content from the perspective of ${culture} culture. Consider cultural values, potential sensitivities, and appropriateness.

Title: ${content.title}
Content: ${content.content}
Cultural Tags: ${content.cultureTags.join(', ')}

Provide analysis in JSON format:
{
  "appropriateness": number (0-1),
  "concerns": ["concern 1", "concern 2"],
  "adaptations": ["adaptation 1", "adaptation 2"]
}`

    try {
      const response = await this.azureOpenAI.getChatCompletions(
        'gpt-4',
        [{ role: 'user', content: prompt }],
        {
          temperature: 0.2,
          maxTokens: 500
        }
      )

      const analysis = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        cultureName: culture,
        appropriateness: analysis.appropriateness || 0.5,
        concerns: analysis.concerns || [],
        adaptations: analysis.adaptations || []
      }
    } catch (error) {
      console.error(`Failed to analyze from ${culture} perspective:`, error)
      return this.createFailsafePerspective(culture)
    }
  }

  private calculateAppropriatenessScore(
    alignment: any,
    biasRisk: any,
    sensitivity: any
  ): number {
    const alignmentWeight = 0.3
    const biasWeight = 0.4
    const sensitivityWeight = 0.3
    
    return (
      alignment.score * alignmentWeight +
      (1 - biasRisk.riskScore) * biasWeight +
      sensitivity.sensitivityScore * sensitivityWeight
    )
  }

  private generateContextualRecommendations(
    alignment: any,
    biasRisk: any,
    crossCultural: any,
    sensitivity: any
  ): string[] {
    const recommendations: string[] = []
    
    if (alignment.score < 0.5) {
      recommendations.push('Consider adding more culturally relevant context for the target audience')
    }
    
    if (biasRisk.riskScore > 0.3) {
      recommendations.push('Review content for potential cultural bias or misrepresentation')
    }
    
    if (sensitivity.sensitivityScore < 0.7) {
      recommendations.push('Enhance cultural sensitivity in language and presentation')
    }
    
    if (crossCultural.considerations.length > 2) {
      recommendations.push('Pay special attention to cross-cultural considerations identified')
    }
    
    return recommendations
  }

  private calculateCulturalFamilyAlignment(contentCultures: string[], userCultures: string[]): number {
    const culturalFamilies = this.getCulturalFamilies()
    
    for (const family of culturalFamilies) {
      const contentInFamily = contentCultures.filter(c => 
        family.some(f => c.toLowerCase().includes(f.toLowerCase()))
      )
      const userInFamily = userCultures.filter(c => 
        family.some(f => c.toLowerCase().includes(f.toLowerCase()))
      )
      
      if (contentInFamily.length > 0 && userInFamily.length > 0) {
        return 0.6 // Moderate alignment for cultural family match
      }
    }
    
    return 0
  }

  private identifyUniversalElements(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): string[] {
    const universalThemes = [
      'compassion', 'mindfulness', 'gratitude', 'forgiveness', 'acceptance',
      'healing', 'growth', 'wisdom', 'balance', 'peace'
    ]
    
    const contentText = `${content.title} ${content.content}`.toLowerCase()
    return universalThemes.filter(theme => contentText.includes(theme))
  }

  private isWesternCulture(culture: string): boolean {
    const westernCultures = [
      'american', 'european', 'western', 'anglo', 'germanic', 'celtic',
      'french', 'german', 'english', 'italian', 'spanish', 'british'
    ]
    
    return westernCultures.some(western => 
      culture.toLowerCase().includes(western) || western.includes(culture.toLowerCase())
    )
  }

  private identifyCulturalConflicts(culture1: string, culture2: string): string[] {
    // This would be expanded with actual cultural knowledge
    const knownConflicts: Record<string, string[]> = {
      'individualistic_collectivistic': [
        'Consider balancing individual and collective perspectives',
        'Be aware of different concepts of self and community'
      ],
      'high_context_low_context': [
        'Consider different communication styles',
        'Balance direct and indirect communication approaches'
      ]
    }
    
    // Simple heuristic - would be more sophisticated in production
    if (this.isIndividualistic(culture1) && this.isCollectivistic(culture2)) {
      return knownConflicts.individualistic_collectivistic
    }
    
    return []
  }

  private identifyReligiousElements(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): string[] {
    const religiousTerms = [
      'prayer', 'meditation', 'sacred', 'holy', 'divine', 'spiritual',
      'ritual', 'ceremony', 'blessing', 'temple', 'church', 'mosque'
    ]
    
    const contentText = `${content.title} ${content.content}`.toLowerCase()
    return religiousTerms.filter(term => contentText.includes(term))
  }

  private checkForCulturalTaboos(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent,
    userCultures: string[]
  ): string[] {
    // This would be expanded with comprehensive cultural knowledge
    const taboos: string[] = []
    const contentText = `${content.title} ${content.content}`.toLowerCase()
    
    // Example taboo checks
    if (contentText.includes('ancestor') && userCultures.some(c => c.includes('Christian'))) {
      taboos.push('Ancestor practices may conflict with some Christian beliefs')
    }
    
    return taboos
  }

  private hasProperCulturalContext(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): boolean {
    return content.source && content.source.length > 10 && 
           content.historicalPeriod && content.historicalPeriod.length > 0
  }

  private usesRespectfulLanguage(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): boolean {
    const contentText = `${content.title} ${content.content}`.toLowerCase()
    const disrespectfulTerms = ['primitive', 'backward', 'savage', 'exotic', 'mystical']
    
    return !disrespectfulTerms.some(term => contentText.includes(term))
  }

  private getCulturalFamilies(): string[][] {
    return [
      ['chinese', 'japanese', 'korean', 'east asian'],
      ['indian', 'hindu', 'buddhist', 'south asian'],
      ['arabic', 'middle eastern', 'islamic'],
      ['african', 'west african', 'east african'],
      ['native american', 'indigenous american'],
      ['european', 'western european'],
      ['latin american', 'hispanic', 'latino']
    ]
  }

  private isIndividualistic(culture: string): boolean {
    const individualisticCultures = ['american', 'german', 'dutch', 'western']
    return individualisticCultures.some(ic => culture.toLowerCase().includes(ic))
  }

  private isCollectivistic(culture: string): boolean {
    const collectivisticCultures = ['chinese', 'japanese', 'korean', 'african', 'latin']
    return collectivisticCultures.some(cc => culture.toLowerCase().includes(cc))
  }

  private createAppropriationAnalysisPrompt(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): string {
    return `Analyze the following cultural content for potential cultural appropriation. Focus on sacred elements, traditional knowledge, and proper attribution.

Title: ${content.title}
Content: ${content.content}
Cultural Tags: ${content.cultureTags.join(', ')}
Source: ${content.source || 'Not specified'}

Provide analysis in JSON format:
{
  "appropriationRisk": number (0-1),
  "concernedCultures": ["culture1", "culture2"],
  "appropriationTypes": [
    {
      "type": "sacred_symbols|religious_practices|traditional_knowledge|artistic_expressions|healing_practices",
      "severity": "low|medium|high|critical",
      "explanation": "why this is concerning",
      "mitigation": "how to address this"
    }
  ],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`
  }

  private createAuthenticityValidationPrompt(
    content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'> | CulturalContent
  ): string {
    return `Validate the cultural authenticity of the following content. Check for historical accuracy, proper representation, and factual correctness.

Title: ${content.title}
Content: ${content.content}
Cultural Tags: ${content.cultureTags.join(', ')}
Historical Period: ${content.historicalPeriod || 'Not specified'}

Provide analysis in JSON format:
{
  "authenticityScore": number (0-1),
  "verificationSources": ["source1", "source2"],
  "discrepancies": [
    {
      "claim": "specific claim in content",
      "issue": "what's wrong with it",
      "severity": "minor|moderate|major",
      "correction": "accurate information"
    }
  ],
  "confidenceLevel": number (0-1)
}`
  }

  private parseAppropriationResponse(response: string): any {
    try {
      return JSON.parse(response)
    } catch (error) {
      return {
        appropriationRisk: 0.5,
        concernedCultures: [],
        appropriationTypes: [],
        recommendations: ['Manual expert review recommended']
      }
    }
  }

  private parseAuthenticityResponse(response: string): any {
    try {
      return JSON.parse(response)
    } catch (error) {
      return {
        authenticityScore: 0.6,
        verificationSources: [],
        discrepancies: [],
        confidenceLevel: 0.3
      }
    }
  }

  private createFailsafeAnalysis(): CulturalContextAnalysis {
    return {
      culturalAlignment: 0.5,
      appropriatenessScore: 0.5,
      biasRisk: 0.3,
      contextualRelevance: 0.5,
      culturalSensitivity: 0.7,
      crossCulturalConsiderations: ['Manual expert review recommended'],
      potentialMisrepresentations: [],
      recommendations: ['Analysis failed - manual review required']
    }
  }

  private createFailsafePerspective(culture: string): CulturalPerspective {
    return {
      cultureName: culture,
      appropriateness: 0.5,
      concerns: ['Analysis failed - manual review needed'],
      adaptations: ['Consult cultural experts']
    }
  }

  private initializeCultureKnowledgeBase(): void {
    // This would be populated with comprehensive cultural knowledge
    // For now, basic structure
    this.cultureKnowledgeBase.set('default', {
      values: [],
      taboos: [],
      communicationStyle: 'neutral',
      religiousElements: []
    })
  }
}

interface CultureKnowledge {
  values: string[]
  taboos: string[]
  communicationStyle: string
  religiousElements: string[]
}
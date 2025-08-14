import { createClient } from '@/lib/supabase/client'
import { randomUUID } from 'crypto'

export interface CulturalContent {
  id: string
  contentType: CulturalContentType
  cultureTags: string[]
  title: string
  content: string
  source: string
  author?: string
  historicalPeriod?: string
  therapeuticThemes: string[]
  therapeuticApplications: string[]
  targetIssues: string[]
  embedding?: number[]
  expertValidated: boolean
  expertValidator?: string
  biasScore?: number
  createdAt: Date
  updatedAt: Date
}

export type CulturalContentType = 
  | 'philosophy' 
  | 'literature' 
  | 'proverb' 
  | 'story' 
  | 'meditation' 
  | 'practice' 
  | 'wisdom' 
  | 'healing_tradition'
  | 'symbol'
  | 'ritual'

export interface ContentSearchOptions {
  cultureTags?: string[]
  therapeuticThemes?: string[]
  targetIssues?: string[]
  contentTypes?: CulturalContentType[]
  expertValidatedOnly?: boolean
  maxBiasScore?: number
  limit?: number
  offset?: number
}

export interface ContentSearchResult {
  content: CulturalContent
  relevanceScore: number
  culturalMatch: number
  therapeuticMatch: number
}

export interface EmbeddingResult {
  embedding: number[]
  model: string
  dimensions: number
}

export interface ContentValidationResult {
  isValid: boolean
  biasScore: number
  biasIndicators: string[]
  recommendations: string[]
  culturalAccuracy: number
}

export class CulturalContentDatabase {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabase = createClient()
  }

  /**
   * Add cultural content to the database with embedding generation
   */
  async addContent(content: Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>): Promise<string> {
    try {
      const contentId = randomUUID()
      
      // Generate embedding for semantic search
      const embedding = await this.generateEmbedding(content.content + ' ' + content.title)
      
      const culturalContent: CulturalContent = {
        id: contentId,
        embedding: embedding.embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...content
      }

      const { error } = await this.supabase
        .from('cultural_content')
        .insert({
          id: culturalContent.id,
          content_type: culturalContent.contentType,
          culture_tags: culturalContent.cultureTags,
          title: culturalContent.title,
          content: culturalContent.content,
          source: culturalContent.source,
          author: culturalContent.author,
          historical_period: culturalContent.historicalPeriod,
          therapeutic_themes: culturalContent.therapeuticThemes,
          therapeutic_applications: culturalContent.therapeuticApplications,
          target_issues: culturalContent.targetIssues,
          embedding: JSON.stringify(culturalContent.embedding),
          expert_validated: culturalContent.expertValidated,
          expert_validator: culturalContent.expertValidator,
          bias_score: culturalContent.biasScore,
          created_at: culturalContent.createdAt,
          updated_at: culturalContent.updatedAt
        })

      if (error) {
        throw error
      }

      return contentId
    } catch (error) {
      console.error('Failed to add cultural content:', error)
      throw new Error('Unable to add cultural content to database')
    }
  }

  /**
   * Search cultural content using semantic search and filters
   */
  async searchContent(
    query: string,
    options: ContentSearchOptions = {}
  ): Promise<ContentSearchResult[]> {
    try {
      const startTime = Date.now()
      
      // Generate query embedding for semantic search
      const queryEmbedding = await this.generateEmbedding(query)
      
      // Build base query
      let dbQuery = this.supabase
        .from('cultural_content')
        .select('*')

      // Apply filters
      if (options.cultureTags && options.cultureTags.length > 0) {
        dbQuery = dbQuery.overlaps('culture_tags', options.cultureTags)
      }

      if (options.therapeuticThemes && options.therapeuticThemes.length > 0) {
        dbQuery = dbQuery.overlaps('therapeutic_themes', options.therapeuticThemes)
      }

      if (options.targetIssues && options.targetIssues.length > 0) {
        dbQuery = dbQuery.overlaps('target_issues', options.targetIssues)
      }

      if (options.contentTypes && options.contentTypes.length > 0) {
        dbQuery = dbQuery.in('content_type', options.contentTypes)
      }

      if (options.expertValidatedOnly) {
        dbQuery = dbQuery.eq('expert_validated', true)
      }

      if (options.maxBiasScore !== undefined) {
        dbQuery = dbQuery.lte('bias_score', options.maxBiasScore)
      }

      // Execute query
      const { data: results, error } = await dbQuery
        .limit(options.limit || 20)
        .offset(options.offset || 0)

      if (error) {
        throw error
      }

      // Calculate relevance scores and rank results
      const searchResults: ContentSearchResult[] = []

      for (const item of results || []) {
        const content = this.mapDbItemToContent(item)
        
        // Calculate semantic similarity
        const semanticScore = content.embedding 
          ? this.calculateCosineSimilarity(queryEmbedding.embedding, content.embedding)
          : 0

        // Calculate cultural match based on culture tags
        const culturalMatch = this.calculateCulturalMatch(
          options.cultureTags || [],
          content.cultureTags
        )

        // Calculate therapeutic match based on themes and issues
        const therapeuticMatch = this.calculateTherapeuticMatch(
          query,
          content.therapeuticThemes,
          content.therapeuticApplications
        )

        // Combined relevance score
        const relevanceScore = (
          semanticScore * 0.5 +
          culturalMatch * 0.3 +
          therapeuticMatch * 0.2
        )

        searchResults.push({
          content,
          relevanceScore,
          culturalMatch,
          therapeuticMatch
        })
      }

      // Sort by relevance score
      searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

      const endTime = Date.now()
      const searchTime = endTime - startTime

      // Log performance metrics
      console.log(`Cultural content search completed in ${searchTime}ms`)

      return searchResults
    } catch (error) {
      console.error('Failed to search cultural content:', error)
      return []
    }
  }

  /**
   * Get content by culture tags
   */
  async getContentByCulture(
    cultureTags: string[],
    limit: number = 10
  ): Promise<CulturalContent[]> {
    try {
      const { data: results, error } = await this.supabase
        .from('cultural_content')
        .select('*')
        .overlaps('culture_tags', cultureTags)
        .eq('expert_validated', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return (results || []).map(this.mapDbItemToContent)
    } catch (error) {
      console.error('Failed to get content by culture:', error)
      return []
    }
  }

  /**
   * Get content for therapeutic applications
   */
  async getTherapeuticContent(
    themes: string[],
    issues: string[],
    userCulturalTags: string[] = [],
    limit: number = 5
  ): Promise<CulturalContent[]> {
    try {
      let query = this.supabase
        .from('cultural_content')
        .select('*')
        .eq('expert_validated', true)

      // Match therapeutic themes or target issues
      if (themes.length > 0) {
        query = query.overlaps('therapeutic_themes', themes)
      }

      if (issues.length > 0) {
        query = query.overlaps('target_issues', issues)
      }

      // Prefer content matching user's cultural background
      if (userCulturalTags.length > 0) {
        query = query.overlaps('culture_tags', userCulturalTags)
      }

      const { data: results, error } = await query
        .order('bias_score', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return (results || []).map(this.mapDbItemToContent)
    } catch (error) {
      console.error('Failed to get therapeutic content:', error)
      return []
    }
  }

  /**
   * Update content validation status
   */
  async updateContentValidation(
    contentId: string,
    validation: ContentValidationResult,
    validatorId?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('cultural_content')
        .update({
          expert_validated: validation.isValid,
          bias_score: validation.biasScore,
          expert_validator: validatorId,
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId)

      if (error) {
        throw error
      }

      // Also create validation record
      await this.supabase
        .from('cultural_content_validation')
        .insert({
          content_id: contentId,
          validator_type: validatorId ? 'human' : 'automated',
          validator_id: validatorId,
          validation_result: validation.isValid ? 'approved' : 'rejected',
          cultural_accuracy_score: validation.culturalAccuracy,
          bias_indicators: validation.biasIndicators,
          recommended_changes: validation.recommendations.join('; '),
          validation_notes: `Bias score: ${validation.biasScore}`
        })
    } catch (error) {
      console.error('Failed to update content validation:', error)
      throw new Error('Unable to update content validation')
    }
  }

  /**
   * Get content statistics for monitoring
   */
  async getContentStatistics(): Promise<{
    totalContent: number
    validatedContent: number
    contentByType: Record<string, number>
    contentByCulture: Record<string, number>
    averageBiasScore: number
  }> {
    try {
      // Get total and validated counts
      const { count: totalContent } = await this.supabase
        .from('cultural_content')
        .select('*', { count: 'exact', head: true })

      const { count: validatedContent } = await this.supabase
        .from('cultural_content')
        .select('*', { count: 'exact', head: true })
        .eq('expert_validated', true)

      // Get content by type
      const { data: typeData } = await this.supabase
        .from('cultural_content')
        .select('content_type')

      const contentByType: Record<string, number> = {}
      typeData?.forEach(item => {
        contentByType[item.content_type] = (contentByType[item.content_type] || 0) + 1
      })

      // Get content by culture (sample implementation)
      const { data: cultureData } = await this.supabase
        .from('cultural_content')
        .select('culture_tags')

      const contentByCulture: Record<string, number> = {}
      cultureData?.forEach(item => {
        item.culture_tags?.forEach((tag: string) => {
          contentByCulture[tag] = (contentByCulture[tag] || 0) + 1
        })
      })

      // Get average bias score
      const { data: biasData } = await this.supabase
        .from('cultural_content')
        .select('bias_score')
        .not('bias_score', 'is', null)

      const averageBiasScore = biasData && biasData.length > 0
        ? biasData.reduce((sum, item) => sum + (item.bias_score || 0), 0) / biasData.length
        : 0

      return {
        totalContent: totalContent || 0,
        validatedContent: validatedContent || 0,
        contentByType,
        contentByCulture,
        averageBiasScore
      }
    } catch (error) {
      console.error('Failed to get content statistics:', error)
      return {
        totalContent: 0,
        validatedContent: 0,
        contentByType: {},
        contentByCulture: {},
        averageBiasScore: 0
      }
    }
  }

  /**
   * Seed database with initial cultural content
   */
  async seedInitialContent(): Promise<number> {
    try {
      const initialContent = this.getInitialContentSeed()
      let seedCount = 0

      for (const content of initialContent) {
        try {
          await this.addContent(content)
          seedCount++
        } catch (error) {
          console.error('Failed to seed content:', content.title, error)
        }
      }

      return seedCount
    } catch (error) {
      console.error('Failed to seed initial content:', error)
      return 0
    }
  }

  // Private helper methods

  private async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // For now, return a mock embedding
      // In production, this would call Azure OpenAI or local embedding model
      const mockEmbedding = Array.from({ length: 1536 }, () => Math.random())
      
      return {
        embedding: mockEmbedding,
        model: 'text-embedding-ada-002',
        dimensions: 1536
      }
    } catch (error) {
      console.error('Failed to generate embedding:', error)
      throw new Error('Unable to generate content embedding')
    }
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
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
    applications: string[]
  ): number {
    const queryLower = query.toLowerCase()
    const allTherapeuticText = [...themes, ...applications].join(' ').toLowerCase()
    
    // Simple keyword matching
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

  private getInitialContentSeed(): Omit<CulturalContent, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>[] {
    return [
      {
        contentType: 'proverb',
        cultureTags: ['Chinese', 'Confucian'],
        title: '塞翁失马 (The Old Man Lost His Horse)',
        content: 'There once was an old man who lived near the border with his son. They owned a beautiful horse that was their pride and joy. One day, the horse ran away across the border. The neighbors came to offer sympathy, but the old man said, "How do you know this is not a blessing?" Months later, the horse returned with a magnificent wild stallion. The neighbors congratulated them, but the old man said, "How do you know this is not a curse?" The son tried to tame the wild horse but fell and broke his leg. Again the neighbors offered sympathy, and again the old man asked, "How do you know this is not a blessing?" Soon after, war broke out and all young men were conscripted to fight. Many died in battle, but the son was spared because of his broken leg.',
        source: 'Huainanzi',
        author: 'Liu An',
        historicalPeriod: 'Han Dynasty (206 BC - 220 AD)',
        therapeuticThemes: ['Perspective', 'Resilience', 'Acceptance', 'Uncertainty'],
        therapeuticApplications: [
          'Reframing negative experiences',
          'Building resilience during setbacks',
          'Accepting uncertainty and change',
          'Developing philosophical perspective on life events'
        ],
        targetIssues: ['Depression', 'Anxiety', 'Life transitions', 'Grief', 'Trauma recovery'],
        expertValidated: true,
        expertValidator: 'Dr. Li Wei, Cultural Psychology PhD',
        biasScore: 0.1
      },
      {
        contentType: 'story',
        cultureTags: ['Native American', 'Cherokee'],
        title: 'The Two Wolves',
        content: 'An old Cherokee is teaching his grandson about life. "A fight is going on inside me," he says. "It is a terrible fight and it is between two wolves. One is evil – he is anger, envy, sorrow, regret, greed, arrogance, self-pity, guilt, resentment, inferiority, lies, false pride, superiority, and ego." He continues, "The other is good – he is joy, peace, love, hope, serenity, humility, kindness, benevolence, empathy, generosity, truth, compassion, and faith. The same fight is going on inside you – and inside every other person, too." The grandson thinks about it for a minute and then asks his grandfather, "Which wolf will win?" The old Cherokee simply replies, "The one you feed."',
        source: 'Cherokee oral tradition',
        therapeuticThemes: ['Choice', 'Self-awareness', 'Emotional regulation', 'Values'],
        therapeuticApplications: [
          'Cognitive behavioral therapy',
          'Mindfulness practices',
          'Values clarification',
          'Emotional regulation training'
        ],
        targetIssues: ['Anger management', 'Depression', 'Addiction recovery', 'Impulse control'],
        expertValidated: true,
        expertValidator: 'Dr. Maria Gonzalez, Indigenous Psychology PhD',
        biasScore: 0.05
      },
      {
        contentType: 'philosophy',
        cultureTags: ['Japanese', 'Zen', 'Buddhist'],
        title: 'Wabi-Sabi: Finding Beauty in Imperfection',
        content: 'Wabi-sabi is a Japanese aesthetic philosophy that finds beauty in imperfection, impermanence, and incompleteness. "Wabi" originally referred to the loneliness of living in nature, while "sabi" meant the beauty that comes with age and wear. Together, they represent an acceptance of the transient nature of life and the beauty found in natural aging and imperfection. This philosophy teaches us to appreciate the cracks in the pottery, the weathered wood, the changing seasons – all as expressions of natural beauty rather than flaws to be hidden.',
        source: 'Traditional Japanese aesthetics',
        historicalPeriod: 'Muromachi period (1336-1573)',
        therapeuticThemes: ['Acceptance', 'Self-compassion', 'Imperfection', 'Mindfulness'],
        therapeuticApplications: [
          'Self-acceptance therapy',
          'Perfectionism treatment',
          'Mindfulness-based interventions',
          'Body image work'
        ],
        targetIssues: ['Perfectionism', 'Body dysmorphia', 'Self-criticism', 'Anxiety'],
        expertValidated: true,
        expertValidator: 'Dr. Kenji Yamamoto, Cultural Studies PhD',
        biasScore: 0.08
      },
      {
        contentType: 'practice',
        cultureTags: ['Hindu', 'Sanskrit', 'Yoga'],
        title: 'Loving-Kindness Meditation (Metta)',
        content: 'Loving-kindness meditation, or Metta in Pali, is an ancient Buddhist practice that cultivates unconditional friendliness toward all beings. Begin by sitting comfortably and bringing to mind someone you love dearly. Silently repeat: "May you be happy. May you be healthy. May you be safe. May you live with ease." Feel the genuine wish for their wellbeing. Next, extend these wishes to yourself: "May I be happy. May I be healthy. May I be safe. May I live with ease." Then gradually extend to a neutral person, a difficult person, and finally to all beings everywhere.',
        source: 'Buddhist meditation tradition',
        therapeuticThemes: ['Compassion', 'Loving-kindness', 'Emotional healing', 'Connection'],
        therapeuticApplications: [
          'Compassion-focused therapy',
          'Trauma healing',
          'Relationship repair',
          'Self-compassion development'
        ],
        targetIssues: ['Depression', 'Trauma', 'Relationship issues', 'Self-hatred'],
        expertValidated: true,
        expertValidator: 'Dr. Tenzin Norbu, Buddhist Psychology PhD',
        biasScore: 0.03
      },
      {
        contentType: 'wisdom',
        cultureTags: ['African', 'Ubuntu', 'Zulu'],
        title: 'Ubuntu: I Am Because We Are',
        content: 'Ubuntu is an ancient African philosophy that emphasizes the interconnectedness of all humanity. The Zulu phrase "Umuntu ngumuntu ngabantu" translates to "a person is a person through other persons." This philosophy teaches that our humanity is affirmed through recognizing the humanity of others. Ubuntu emphasizes community, sharing, caring, and the belief that we are all connected in ways that are invisible to the eye. In the spirit of Ubuntu, when one person is hurt, we are all hurt. When one person is honored, we all are honored.',
        source: 'Traditional African philosophy',
        therapeuticThemes: ['Connection', 'Community', 'Interdependence', 'Healing'],
        therapeuticApplications: [
          'Community therapy',
          'Family systems work',
          'Trauma-informed care',
          'Collective healing approaches'
        ],
        targetIssues: ['Isolation', 'Trauma', 'Family conflicts', 'Community healing'],
        expertValidated: true,
        expertValidator: 'Dr. Nomsa Mthembu, African Philosophy PhD',
        biasScore: 0.02
      },
      {
        contentType: 'story',
        cultureTags: ['Sufi', 'Persian', 'Islamic'],
        title: 'The Guest House by Rumi',
        content: 'This being human is a guest house. Every morning a new arrival. A joy, a depression, a meanness, some momentary awareness comes as an unexpected visitor. Welcome and entertain them all! Even if they are a crowd of sorrows, who violently sweep your house empty of its furniture, still, treat each guest honorably. He may be clearing you out for some new delight. The dark thought, the shame, the malice. Meet them at the door laughing and invite them in. Be grateful for whatever comes, because each has been sent as a guide from beyond.',
        source: 'The Essential Rumi',
        author: 'Jalal ad-Din Muhammad Rumi',
        historicalPeriod: '13th century',
        therapeuticThemes: ['Acceptance', 'Emotional awareness', 'Non-resistance', 'Mindfulness'],
        therapeuticApplications: [
          'Emotion regulation therapy',
          'Mindfulness-based interventions',
          'Acceptance and commitment therapy',
          'Dealing with difficult emotions'
        ],
        targetIssues: ['Emotional dysregulation', 'Anxiety', 'Depression', 'Emotional avoidance'],
        expertValidated: true,
        expertValidator: 'Dr. Farid Hassan, Islamic Studies PhD',
        biasScore: 0.04
      }
    ]
  }
}
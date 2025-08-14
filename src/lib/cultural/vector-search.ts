import { createClient } from '@/lib/supabase/client'
import { CulturalContent, ContentSearchResult } from './content-database'
import { SemanticSearchOptimizer, OptimizedSearchOptions, OptimizedSearchResult } from './search-optimizer'

export interface VectorSearchOptions {
  similarityThreshold?: number
  maxResults?: number
  culturalFilters?: string[]
  therapeuticFilters?: string[]
  includeMetadata?: boolean
}

export interface VectorSearchResult extends ContentSearchResult {
  vectorSimilarity: number
  searchMetadata?: {
    queryTime: number
    totalResults: number
    filterMatches: number
  }
}

export interface EmbeddingModel {
  name: string
  dimensions: number
  maxTokens: number
  provider: 'azure-openai' | 'local' | 'mock'
}

export class CulturalVectorSearch {
  private supabase: ReturnType<typeof createClient>
  private embeddingModel: EmbeddingModel
  private searchOptimizer: SemanticSearchOptimizer

  constructor(embeddingModel?: EmbeddingModel) {
    this.supabase = createClient()
    this.embeddingModel = embeddingModel || {
      name: 'text-embedding-ada-002',
      dimensions: 1536,
      maxTokens: 8191,
      provider: 'mock' // Use mock for development
    }
    this.searchOptimizer = new SemanticSearchOptimizer()
  }

  /**
   * Perform optimized semantic search with ML-powered enhancements
   */
  async optimizedSemanticSearch(
    query: string,
    options: OptimizedSearchOptions = {}
  ): Promise<OptimizedSearchResult[]> {
    return await this.searchOptimizer.optimizedSearch(query, {
      ...options,
      rankingStrategy: 'semantic'
    })
  }

  /**
   * Perform semantic search using vector similarity (legacy method)
   */
  async semanticSearch(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const startTime = Date.now()
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query)
      
      // Build SQL query for vector similarity search
      const similarityThreshold = options.similarityThreshold || 0.7
      const maxResults = options.maxResults || 10
      
      // Use SQL function for cosine similarity
      let sqlQuery = `
        SELECT 
          *,
          1 - (embedding <=> $1::vector) as similarity
        FROM cultural_content
        WHERE 1 - (embedding <=> $1::vector) > $2
      `
      
      const queryParams = [
        JSON.stringify(queryEmbedding),
        similarityThreshold
      ]
      
      // Add cultural filters
      if (options.culturalFilters && options.culturalFilters.length > 0) {
        sqlQuery += ` AND culture_tags && $${queryParams.length + 1}::text[]`
        queryParams.push(options.culturalFilters)
      }
      
      // Add therapeutic filters
      if (options.therapeuticFilters && options.therapeuticFilters.length > 0) {
        sqlQuery += ` AND (therapeutic_themes && $${queryParams.length + 1}::text[] OR target_issues && $${queryParams.length + 1}::text[])`
        queryParams.push(options.therapeuticFilters)
      }
      
      // Add ordering and limit
      sqlQuery += ` ORDER BY similarity DESC LIMIT $${queryParams.length + 1}`
      queryParams.push(maxResults)
      
      // Execute the query
      const { data: results, error } = await this.supabase.rpc('vector_similarity_search', {
        query_embedding: JSON.stringify(queryEmbedding),
        similarity_threshold: similarityThreshold,
        max_results: maxResults,
        cultural_filters: options.culturalFilters || null,
        therapeutic_filters: options.therapeuticFilters || null
      })
      
      if (error) {
        console.error('Vector search error:', error)
        // Fallback to standard search
        return await this.fallbackSearch(query, options)
      }
      
      const endTime = Date.now()
      const queryTime = endTime - startTime
      
      // Process results
      const searchResults: VectorSearchResult[] = (results || []).map((item: any) => {
        const content = this.mapDbItemToContent(item)
        const vectorSimilarity = item.similarity || 0
        
        // Calculate additional relevance metrics
        const culturalMatch = this.calculateCulturalRelevance(
          options.culturalFilters || [],
          content.cultureTags
        )
        
        const therapeuticMatch = this.calculateTherapeuticRelevance(
          query,
          content.therapeuticThemes,
          content.targetIssues
        )
        
        // Combined relevance score
        const relevanceScore = (
          vectorSimilarity * 0.6 +
          culturalMatch * 0.25 +
          therapeuticMatch * 0.15
        )
        
        const result: VectorSearchResult = {
          content,
          relevanceScore,
          culturalMatch,
          therapeuticMatch,
          vectorSimilarity
        }
        
        if (options.includeMetadata) {
          result.searchMetadata = {
            queryTime,
            totalResults: results.length,
            filterMatches: results.length
          }
        }
        
        return result
      })
      
      console.log(`Vector search completed in ${queryTime}ms, found ${searchResults.length} results`)
      
      return searchResults
    } catch (error) {
      console.error('Semantic search failed:', error)
      return await this.fallbackSearch(query, options)
    }
  }

  /**
   * Find similar content to a given piece of content
   */
  async findSimilarContent(
    contentId: string,
    options: Omit<VectorSearchOptions, 'therapeuticFilters'> = {}
  ): Promise<VectorSearchResult[]> {
    try {
      // Get the content embedding
      const { data: sourceContent, error } = await this.supabase
        .from('cultural_content')
        .select('embedding, culture_tags, therapeutic_themes')
        .eq('id', contentId)
        .single()
      
      if (error || !sourceContent) {
        throw new Error('Source content not found')
      }
      
      const sourceEmbedding = JSON.parse(sourceContent.embedding)
      
      // Search for similar content using the embedding
      const similarityThreshold = options.similarityThreshold || 0.8
      const maxResults = options.maxResults || 5
      
      const { data: results, error: searchError } = await this.supabase.rpc('find_similar_content', {
        source_embedding: JSON.stringify(sourceEmbedding),
        source_content_id: contentId,
        similarity_threshold: similarityThreshold,
        max_results: maxResults,
        cultural_filters: options.culturalFilters || null
      })
      
      if (searchError) {
        throw searchError
      }
      
      // Process and return results
      return (results || []).map((item: any) => ({
        content: this.mapDbItemToContent(item),
        relevanceScore: item.similarity,
        culturalMatch: this.calculateCulturalRelevance(
          sourceContent.culture_tags,
          item.culture_tags
        ),
        therapeuticMatch: this.calculateTherapeuticRelevance(
          '',
          sourceContent.therapeutic_themes,
          item.therapeutic_themes
        ),
        vectorSimilarity: item.similarity
      }))
    } catch (error) {
      console.error('Failed to find similar content:', error)
      return []
    }
  }

  /**
   * Hybrid search combining vector similarity and keyword matching
   */
  async hybridSearch(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      // Perform both semantic and keyword searches
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(query, { ...options, maxResults: options.maxResults || 20 }),
        this.keywordSearch(query, options)
      ])
      
      // Combine and deduplicate results
      const combinedResults = new Map<string, VectorSearchResult>()
      
      // Add semantic results with weight
      semanticResults.forEach(result => {
        combinedResults.set(result.content.id, {
          ...result,
          relevanceScore: result.relevanceScore * 0.7 // Semantic weight
        })
      })
      
      // Merge keyword results
      keywordResults.forEach(result => {
        const existing = combinedResults.get(result.content.id)
        if (existing) {
          // Boost score for items found in both searches
          existing.relevanceScore = Math.min(1.0, existing.relevanceScore + result.relevanceScore * 0.3)
        } else {
          combinedResults.set(result.content.id, {
            ...result,
            relevanceScore: result.relevanceScore * 0.5 // Keyword-only weight
          })
        }
      })
      
      // Sort by combined relevance score
      const finalResults = Array.from(combinedResults.values())
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, options.maxResults || 10)
      
      return finalResults
    } catch (error) {
      console.error('Hybrid search failed:', error)
      return await this.fallbackSearch(query, options)
    }
  }

  /**
   * Get culturally relevant content recommendations
   */
  async getCulturalRecommendations(
    userCulturalTags: string[],
    therapeuticNeeds: string[],
    excludeContentIds: string[] = [],
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    try {
      // Create a query combining cultural and therapeutic needs
      const query = [...userCulturalTags, ...therapeuticNeeds].join(' ')
      
      const results = await this.semanticSearch(query, {
        culturalFilters: userCulturalTags,
        therapeuticFilters: therapeuticNeeds,
        maxResults: limit + excludeContentIds.length,
        similarityThreshold: 0.6
      })
      
      // Filter out excluded content
      const filteredResults = results.filter(
        result => !excludeContentIds.includes(result.content.id)
      )
      
      return filteredResults.slice(0, limit)
    } catch (error) {
      console.error('Failed to get cultural recommendations:', error)
      return []
    }
  }

  /**
   * Analyze cultural content for therapeutic applications
   */
  async analyzeTherapeuticPotential(
    contentId: string
  ): Promise<{
    therapeuticScore: number
    suggestedApplications: string[]
    targetIssues: string[]
    culturalSensitivity: number
    biasRisk: number
  }> {
    try {
      const { data: content, error } = await this.supabase
        .from('cultural_content')
        .select('*')
        .eq('id', contentId)
        .single()
      
      if (error || !content) {
        throw new Error('Content not found')
      }
      
      // Analyze therapeutic potential (simplified implementation)
      const therapeuticKeywords = ['healing', 'wisdom', 'growth', 'peace', 'strength', 'resilience']
      const contentText = (content.content + ' ' + content.title).toLowerCase()
      
      const therapeuticScore = therapeuticKeywords.reduce((score, keyword) => {
        return contentText.includes(keyword) ? score + 0.1 : score
      }, 0.3)
      
      // Generate suggestions based on content analysis
      const suggestedApplications = []
      if (contentText.includes('meditat')) suggestedApplications.push('Mindfulness therapy')
      if (contentText.includes('story') || contentText.includes('narrative')) suggestedApplications.push('Narrative therapy')
      if (contentText.includes('family') || contentText.includes('community')) suggestedApplications.push('Family systems therapy')
      if (contentText.includes('accept') || contentText.includes('surrender')) suggestedApplications.push('Acceptance therapy')
      
      const targetIssues = []
      if (contentText.includes('anxiety') || contentText.includes('worry')) targetIssues.push('Anxiety disorders')
      if (contentText.includes('depress') || contentText.includes('sad')) targetIssues.push('Depression')
      if (contentText.includes('trauma') || contentText.includes('wound')) targetIssues.push('Trauma recovery')
      if (contentText.includes('grief') || contentText.includes('loss')) targetIssues.push('Grief counseling')
      
      return {
        therapeuticScore: Math.min(1.0, therapeuticScore),
        suggestedApplications,
        targetIssues,
        culturalSensitivity: 1.0 - (content.bias_score || 0),
        biasRisk: content.bias_score || 0
      }
    } catch (error) {
      console.error('Failed to analyze therapeutic potential:', error)
      return {
        therapeuticScore: 0,
        suggestedApplications: [],
        targetIssues: [],
        culturalSensitivity: 0,
        biasRisk: 1.0
      }
    }
  }

  // Private helper methods

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (this.embeddingModel.provider === 'mock') {
        // Generate deterministic mock embedding for testing
        const hash = this.simpleHash(text)
        return Array.from({ length: this.embeddingModel.dimensions }, (_, i) => 
          Math.sin(hash + i) * 0.5 + 0.5
        )
      }
      
      // In production, integrate with Azure OpenAI
      // const response = await azureOpenAI.embeddings.create({
      //   model: this.embeddingModel.name,
      //   input: text
      // })
      // return response.data[0].embedding
      
      throw new Error('Embedding generation not implemented for non-mock providers')
    } catch (error) {
      console.error('Failed to generate embedding:', error)
      throw error
    }
  }

  private async keywordSearch(
    query: string,
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    try {
      const keywords = query.toLowerCase().split(' ').filter(word => word.length > 2)
      
      let dbQuery = this.supabase
        .from('cultural_content')
        .select('*')
      
      // Build keyword search conditions
      const searchConditions = keywords.map(keyword => 
        `content.ilike.%${keyword}% OR title.ilike.%${keyword}%`
      ).join(' OR ')
      
      if (searchConditions) {
        dbQuery = dbQuery.or(searchConditions)
      }
      
      // Apply filters
      if (options.culturalFilters && options.culturalFilters.length > 0) {
        dbQuery = dbQuery.overlaps('culture_tags', options.culturalFilters)
      }
      
      if (options.therapeuticFilters && options.therapeuticFilters.length > 0) {
        dbQuery = dbQuery.overlaps('therapeutic_themes', options.therapeuticFilters)
      }
      
      const { data: results, error } = await dbQuery
        .eq('expert_validated', true)
        .limit(options.maxResults || 10)
      
      if (error) {
        throw error
      }
      
      return (results || []).map(item => ({
        content: this.mapDbItemToContent(item),
        relevanceScore: this.calculateKeywordRelevance(query, item.content + ' ' + item.title),
        culturalMatch: this.calculateCulturalRelevance(
          options.culturalFilters || [],
          item.culture_tags
        ),
        therapeuticMatch: this.calculateTherapeuticRelevance(
          query,
          item.therapeutic_themes,
          item.target_issues
        ),
        vectorSimilarity: 0 // No vector similarity for keyword search
      }))
    } catch (error) {
      console.error('Keyword search failed:', error)
      return []
    }
  }

  private async fallbackSearch(
    query: string,
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    console.log('Using fallback search due to vector search failure')
    return await this.keywordSearch(query, options)
  }

  private calculateCulturalRelevance(queryTags: string[], contentTags: string[]): number {
    if (queryTags.length === 0) return 1.0
    
    const matchingTags = queryTags.filter(tag => 
      contentTags.some(contentTag => 
        contentTag.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(contentTag.toLowerCase())
      )
    )
    
    return matchingTags.length / queryTags.length
  }

  private calculateTherapeuticRelevance(
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

  private calculateKeywordRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2)
    const contentLower = content.toLowerCase()
    
    let score = 0
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        score += 1 / queryWords.length
      }
    }
    
    return score
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
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

  /**
   * Optimize vector search indexes for better performance
   */
  async optimizeSearchIndexes(
    indexType: 'ivfflat' | 'hnsw' = 'hnsw',
    parameters?: { lists?: number; m?: number; efConstruction?: number; efSearch?: number }
  ): Promise<void> {
    await this.searchOptimizer.optimizeIndexes(indexType, parameters)
  }

  /**
   * Get comprehensive search performance metrics
   */
  async getSearchMetrics(timeRange?: { start: Date; end: Date }): Promise<any> {
    return await this.searchOptimizer.getSearchPerformanceMetrics(timeRange)
  }

  /**
   * Update search indexes with new content
   */
  async updateSearchIndexes(contentIds: string[]): Promise<void> {
    return await this.searchOptimizer.updateIndex(contentIds)
  }

  /**
   * Health check for search optimization system
   */
  async searchHealthCheck(): Promise<any> {
    return await this.searchOptimizer.healthCheck()
  }
}
import { createClient } from '@/lib/supabase/client'
import { ProcessedQuery } from './query-processor'
import { RankingResult } from './ranking-engine'
import { CulturalContentType } from './content-database'
import Redis from 'ioredis'
import * as natural from 'natural'

export interface UserSearchProfile {
  userId: string
  culturalBackground: string[]
  preferredCultures: string[]
  preferredContentTypes: CulturalContentType[]
  therapeuticNeeds: string[]
  searchHistory: SearchHistoryItem[]
  interactionPatterns: InteractionPattern[]
  similarUsers: string[]
  personalizedWeights: PersonalizationWeights
  lastUpdated: Date
}

export interface SearchHistoryItem {
  query: string
  processedTerms: string[]
  selectedContent: string[]
  ratings: number[]
  culturalResonance: number[]
  therapeuticEffectiveness: number[]
  timestamp: Date
  sessionId: string
}

export interface InteractionPattern {
  contentType: CulturalContentType
  avgDwellTime: number
  avgRating: number
  engagementRate: number
  culturalPreference: string[]
  therapeuticContext: string[]
}

export interface PersonalizationWeights {
  semanticWeight: number
  culturalWeight: number
  therapeuticWeight: number
  popularityWeight: number
  recencyWeight: number
  diversityPreference: number
}

export interface CollaborativeFiltering {
  userId: string
  similarUsers: Array<{
    userId: string
    similarity: number
    sharedInteractions: number
  }>
  recommendations: Array<{
    contentId: string
    predictedRating: number
    confidence: number
    reason: string
  }>
}

export interface PersonalizationInsights {
  dominantCultures: string[]
  preferredThemes: string[]
  contentTypeDistribution: Record<CulturalContentType, number>
  searchPatterns: {
    avgQueryLength: number
    commonTerms: string[]
    preferredTime: string
    sessionDuration: number
  }
  therapeuticJourney: {
    primaryNeeds: string[]
    progressIndicators: string[]
    effectiveContent: string[]
  }
}

export class SearchPersonalization {
  private supabase: ReturnType<typeof createClient>
  private redis: Redis
  private profileCache: Map<string, UserSearchProfile> = new Map()
  private cacheExpiry: number = 30 * 60 * 1000 // 30 minutes
  private collaborativeModel: CollaborativeModel

  constructor() {
    this.supabase = createClient()
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    })
    this.collaborativeModel = new CollaborativeModel()
  }

  /**
   * Get or create user search profile with ML-powered insights
   */
  async getUserProfile(userId: string): Promise<UserSearchProfile> {
    try {
      // Check cache first
      const cached = this.profileCache.get(userId)
      if (cached && this.isCacheValid(cached.lastUpdated)) {
        return cached
      }

      // Try Redis cache
      const redisProfile = await this.redis.get(`profile:${userId}`)
      if (redisProfile) {
        const profile = JSON.parse(redisProfile) as UserSearchProfile
        this.profileCache.set(userId, profile)
        return profile
      }

      // Load from database and build profile
      const profile = await this.buildUserProfile(userId)
      
      // Cache the profile
      await this.cacheProfile(profile)
      
      return profile

    } catch (error) {
      console.error('Failed to get user profile:', error)
      return this.createDefaultProfile(userId)
    }
  }

  /**
   * Personalize search results based on user profile and behavior
   */
  async personalizeResults(
    results: RankingResult[],
    userProfile: UserSearchProfile,
    processedQuery: ProcessedQuery
  ): Promise<RankingResult[]> {
    try {
      if (results.length === 0) return []

      console.log(`Personalizing ${results.length} results for user: ${userProfile.userId}`)

      // Step 1: Apply collaborative filtering recommendations
      const collaborativeBoosts = await this.getCollaborativeBoosts(
        results,
        userProfile.similarUsers
      )

      // Step 2: Apply personal preference adjustments
      const personalizedResults = results.map(result => {
        const personalizedScore = this.calculatePersonalizedScore(
          result,
          userProfile,
          processedQuery,
          collaborativeBoosts.get(result.content.id) || 0
        )

        return {
          ...result,
          personalizedScore,
          rankingFactors: {
            ...result.rankingFactors,
            personalizedBoost: personalizedScore - result.relevanceScore
          }
        }
      })

      // Step 3: Apply session-based re-ranking
      const sessionAdjustedResults = await this.applySessionContext(
        personalizedResults,
        userProfile,
        processedQuery
      )

      // Step 4: Sort by personalized scores
      const finalResults = sessionAdjustedResults.sort((a, b) => 
        (b.personalizedScore || b.relevanceScore) - (a.personalizedScore || a.relevanceScore)
      )

      console.log(`Personalization completed with ${finalResults.length} results`)
      return finalResults

    } catch (error) {
      console.error('Result personalization failed:', error)
      return results
    }
  }

  /**
   * Update user profile with new search interaction
   */
  async updateUserProfile(
    userId: string,
    processedQuery: ProcessedQuery,
    selectedResults: RankingResult[],
    feedback?: {
      ratings?: number[]
      culturalResonance?: number[]
      therapeuticEffectiveness?: number[]
      dwellTimes?: number[]
    }
  ): Promise<void> {
    try {
      const profile = await this.getUserProfile(userId)
      
      // Add to search history
      const historyItem: SearchHistoryItem = {
        query: processedQuery.original,
        processedTerms: processedQuery.terms,
        selectedContent: selectedResults.map(r => r.content.id),
        ratings: feedback?.ratings || [],
        culturalResonance: feedback?.culturalResonance || [],
        therapeuticEffectiveness: feedback?.therapeuticEffectiveness || [],
        timestamp: new Date(),
        sessionId: `session-${Date.now()}`
      }

      profile.searchHistory.push(historyItem)
      
      // Keep only recent history (last 100 items)
      if (profile.searchHistory.length > 100) {
        profile.searchHistory = profile.searchHistory.slice(-100)
      }

      // Update interaction patterns
      await this.updateInteractionPatterns(profile, selectedResults, feedback)

      // Update therapeutic needs based on search patterns
      await this.updateTherapeuticNeeds(profile, processedQuery, selectedResults)

      // Update cultural preferences
      await this.updateCulturalPreferences(profile, selectedResults)

      // Recalculate personalization weights
      profile.personalizedWeights = await this.calculateOptimalWeights(profile)

      // Update similar users through collaborative filtering
      profile.similarUsers = await this.collaborativeModel.findSimilarUsers(
        userId,
        profile
      )

      profile.lastUpdated = new Date()

      // Save to database and cache
      await this.saveProfile(profile)
      await this.cacheProfile(profile)

      console.log(`Profile updated for user: ${userId}`)

    } catch (error) {
      console.error('Profile update failed:', error)
    }
  }

  /**
   * Generate personalized content recommendations
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<Array<{
    contentId: string
    personalizedScore: number
    reason: string
    culturalAlignment: number
    therapeuticFit: number
  }>> {
    try {
      const profile = await this.getUserProfile(userId)
      
      // Get collaborative recommendations
      const collaborativeRecs = await this.collaborativeModel.getRecommendations(
        userId,
        profile,
        limit * 2
      )

      // Get content-based recommendations
      const contentBasedRecs = await this.getContentBasedRecommendations(
        profile,
        limit * 2
      )

      // Combine and rank recommendations
      const allRecs = [...collaborativeRecs, ...contentBasedRecs]
      const uniqueRecs = this.deduplicateRecommendations(allRecs)
      
      // Sort by personalized score and limit
      return uniqueRecs
        .sort((a, b) => b.personalizedScore - a.personalizedScore)
        .slice(0, limit)

    } catch (error) {
      console.error('Personalized recommendations failed:', error)
      return []
    }
  }

  /**
   * Get user personalization insights for transparency
   */
  async getPersonalizationInsights(userId: string): Promise<PersonalizationInsights> {
    try {
      const profile = await this.getUserProfile(userId)
      
      // Analyze cultural preferences
      const culturalDistribution = new Map<string, number>()
      profile.searchHistory.forEach(item => {
        item.selectedContent.forEach(contentId => {
          // Would need to fetch content to get culture tags
          // Simplified for demo
        })
      })
      const dominantCultures = Array.from(culturalDistribution.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([culture]) => culture)

      // Analyze therapeutic themes
      const therapeuticThemes = this.extractTherapeuticThemes(profile)
      
      // Analyze content type preferences
      const contentTypeDistribution = this.analyzeContentTypePreferences(profile)

      // Analyze search patterns
      const searchPatterns = this.analyzeSearchPatterns(profile)

      // Analyze therapeutic journey
      const therapeuticJourney = this.analyzeTherapeuticJourney(profile)

      return {
        dominantCultures,
        preferredThemes: therapeuticThemes,
        contentTypeDistribution,
        searchPatterns,
        therapeuticJourney
      }

    } catch (error) {
      console.error('Failed to generate personalization insights:', error)
      return {
        dominantCultures: [],
        preferredThemes: [],
        contentTypeDistribution: {} as Record<CulturalContentType, number>,
        searchPatterns: {
          avgQueryLength: 0,
          commonTerms: [],
          preferredTime: 'morning',
          sessionDuration: 0
        },
        therapeuticJourney: {
          primaryNeeds: [],
          progressIndicators: [],
          effectiveContent: []
        }
      }
    }
  }

  /**
   * Export user profile data for transparency/portability
   */
  async exportUserProfile(userId: string): Promise<{
    profile: UserSearchProfile
    insights: PersonalizationInsights
    exportedAt: Date
  }> {
    try {
      const profile = await this.getUserProfile(userId)
      const insights = await this.getPersonalizationInsights(userId)

      // Remove sensitive data
      const exportProfile = {
        ...profile,
        userId: '[REDACTED]',
        searchHistory: profile.searchHistory.map(item => ({
          ...item,
          query: '[REDACTED]',
          selectedContent: []
        }))
      }

      return {
        profile: exportProfile,
        insights,
        exportedAt: new Date()
      }

    } catch (error) {
      console.error('Profile export failed:', error)
      throw error
    }
  }

  /**
   * Delete user profile and personalization data
   */
  async deleteUserProfile(userId: string): Promise<void> {
    try {
      // Delete from database
      await this.supabase
        .from('user_search_profiles')
        .delete()
        .eq('user_id', userId)

      await this.supabase
        .from('user_search_history')
        .delete()
        .eq('user_id', userId)

      // Remove from caches
      this.profileCache.delete(userId)
      await this.redis.del(`profile:${userId}`)

      console.log(`Profile deleted for user: ${userId}`)

    } catch (error) {
      console.error('Profile deletion failed:', error)
      throw error
    }
  }

  // Private helper methods

  private async buildUserProfile(userId: string): Promise<UserSearchProfile> {
    try {
      // Load existing profile data
      const { data: profileData } = await this.supabase
        .from('user_search_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      // Load search history
      const { data: historyData } = await this.supabase
        .from('user_search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      // Build profile from data or create new one
      if (profileData) {
        return {
          userId,
          culturalBackground: profileData.cultural_background || [],
          preferredCultures: profileData.preferred_cultures || [],
          preferredContentTypes: profileData.preferred_content_types || [],
          therapeuticNeeds: profileData.therapeutic_needs || [],
          searchHistory: (historyData || []).map(this.mapSearchHistoryItem),
          interactionPatterns: JSON.parse(profileData.interaction_patterns || '[]'),
          similarUsers: JSON.parse(profileData.similar_users || '[]'),
          personalizedWeights: JSON.parse(profileData.personalized_weights || '{}'),
          lastUpdated: new Date(profileData.updated_at)
        }
      } else {
        return this.createDefaultProfile(userId)
      }

    } catch (error) {
      console.error('Failed to build user profile:', error)
      return this.createDefaultProfile(userId)
    }
  }

  private createDefaultProfile(userId: string): UserSearchProfile {
    return {
      userId,
      culturalBackground: [],
      preferredCultures: [],
      preferredContentTypes: [],
      therapeuticNeeds: [],
      searchHistory: [],
      interactionPatterns: [],
      similarUsers: [],
      personalizedWeights: {
        semanticWeight: 0.4,
        culturalWeight: 0.25,
        therapeuticWeight: 0.2,
        popularityWeight: 0.1,
        recencyWeight: 0.05,
        diversityPreference: 0.3
      },
      lastUpdated: new Date()
    }
  }

  private calculatePersonalizedScore(
    result: RankingResult,
    userProfile: UserSearchProfile,
    processedQuery: ProcessedQuery,
    collaborativeBoost: number
  ): number {
    const weights = userProfile.personalizedWeights
    const content = result.content

    // Base score components
    const semanticScore = result.rankingFactors.semanticScore * weights.semanticWeight
    const culturalScore = this.calculateCulturalFit(content, userProfile) * weights.culturalWeight
    const therapeuticScore = this.calculateTherapeuticFit(content, userProfile) * weights.therapeuticWeight
    const popularityScore = result.rankingFactors.popularityBoost * weights.popularityWeight
    const recencyScore = result.rankingFactors.recencyBoost * weights.recencyWeight

    // Personal preference modifiers
    const contentTypeBoost = userProfile.preferredContentTypes.includes(content.contentType) ? 0.1 : 0
    const historicalBoost = this.calculateHistoricalPreferenceBoost(content, userProfile)

    // Collaborative boost
    const collabScore = collaborativeBoost * 0.15

    // Combine all factors
    const personalizedScore = semanticScore + culturalScore + therapeuticScore + 
      popularityScore + recencyScore + contentTypeBoost + historicalBoost + collabScore

    return Math.max(0, Math.min(1, personalizedScore))
  }

  private calculateCulturalFit(content: any, userProfile: UserSearchProfile): number {
    if (userProfile.preferredCultures.length === 0) return 0.5

    const matches = content.cultureTags.filter((tag: string) =>
      userProfile.preferredCultures.some(pref =>
        tag.toLowerCase().includes(pref.toLowerCase()) ||
        pref.toLowerCase().includes(tag.toLowerCase())
      )
    )

    return matches.length / Math.max(content.cultureTags.length, userProfile.preferredCultures.length)
  }

  private calculateTherapeuticFit(content: any, userProfile: UserSearchProfile): number {
    if (userProfile.therapeuticNeeds.length === 0) return 0.5

    const contentThemes = [...content.therapeuticThemes, ...content.targetIssues]
    const matches = contentThemes.filter((theme: string) =>
      userProfile.therapeuticNeeds.some(need =>
        theme.toLowerCase().includes(need.toLowerCase()) ||
        need.toLowerCase().includes(theme.toLowerCase())
      )
    )

    return matches.length / Math.max(contentThemes.length, userProfile.therapeuticNeeds.length)
  }

  private calculateHistoricalPreferenceBoost(content: any, userProfile: UserSearchProfile): number {
    // Analyze user's historical preferences for similar content
    let boost = 0

    // Content type preference based on history
    const contentTypeHistory = userProfile.interactionPatterns.find(
      pattern => pattern.contentType === content.contentType
    )
    if (contentTypeHistory && contentTypeHistory.avgRating > 4) {
      boost += 0.1
    }

    // Cultural preference based on history
    const culturalMatches = content.cultureTags.filter((tag: string) =>
      userProfile.searchHistory.some(item =>
        item.selectedContent.length > 0 && item.culturalResonance.some(score => score > 4)
      )
    )
    if (culturalMatches.length > 0) {
      boost += 0.05
    }

    return boost
  }

  private async applySessionContext(
    results: RankingResult[],
    userProfile: UserSearchProfile,
    processedQuery: ProcessedQuery
  ): Promise<RankingResult[]> {
    // Analyze recent session activity to adjust rankings
    const recentSearches = userProfile.searchHistory
      .filter(item => Date.now() - item.timestamp.getTime() < 3600000) // Last hour
      .slice(-5) // Last 5 searches

    if (recentSearches.length === 0) return results

    // Extract session patterns
    const sessionCultures = new Set<string>()
    const sessionThemes = new Set<string>()

    recentSearches.forEach(search => {
      search.processedTerms.forEach(term => {
        // Categorize terms (simplified)
        if (['chinese', 'japanese', 'african', 'buddhist', 'hindu'].includes(term)) {
          sessionCultures.add(term)
        }
        if (['anxiety', 'depression', 'healing', 'meditation'].includes(term)) {
          sessionThemes.add(term)
        }
      })
    })

    // Apply session-based boosts
    return results.map(result => {
      let sessionBoost = 0

      // Boost content matching session cultural focus
      if (sessionCultures.size > 0) {
        const culturalMatches = result.content.cultureTags.filter(tag =>
          Array.from(sessionCultures).some(culture =>
            tag.toLowerCase().includes(culture) || culture.includes(tag.toLowerCase())
          )
        )
        sessionBoost += culturalMatches.length * 0.05
      }

      // Boost content matching session therapeutic themes
      if (sessionThemes.size > 0) {
        const themeMatches = [...result.content.therapeuticThemes, ...result.content.targetIssues]
          .filter(theme =>
            Array.from(sessionThemes).some(sessionTheme =>
              theme.toLowerCase().includes(sessionTheme) || sessionTheme.includes(theme.toLowerCase())
            )
          )
        sessionBoost += themeMatches.length * 0.05
      }

      return {
        ...result,
        personalizedScore: (result.personalizedScore || result.relevanceScore) + sessionBoost
      }
    })
  }

  private async getCollaborativeBoosts(
    results: RankingResult[],
    similarUsers: string[]
  ): Promise<Map<string, number>> {
    const boosts = new Map<string, number>()

    if (similarUsers.length === 0) return boosts

    try {
      // Get ratings from similar users
      const { data: ratings, error } = await this.supabase
        .from('cultural_content_usage')
        .select('content_id, user_response_rating')
        .in('user_id', similarUsers)
        .gte('user_response_rating', 3)

      if (error) return boosts

      // Calculate collaborative boosts
      const contentRatings = new Map<string, number[]>()
      ratings?.forEach(rating => {
        if (!contentRatings.has(rating.content_id)) {
          contentRatings.set(rating.content_id, [])
        }
        contentRatings.get(rating.content_id)!.push(rating.user_response_rating)
      })

      contentRatings.forEach((ratingList, contentId) => {
        const avgRating = ratingList.reduce((sum, r) => sum + r, 0) / ratingList.length
        const boost = (avgRating - 3) / 2 * 0.2 // Normalize and scale
        boosts.set(contentId, Math.max(0, boost))
      })

    } catch (error) {
      console.error('Collaborative boost calculation failed:', error)
    }

    return boosts
  }

  private async updateInteractionPatterns(
    profile: UserSearchProfile,
    selectedResults: RankingResult[],
    feedback?: any
  ): Promise<void> {
    selectedResults.forEach(result => {
      const contentType = result.content.contentType
      let pattern = profile.interactionPatterns.find(p => p.contentType === contentType)

      if (!pattern) {
        pattern = {
          contentType,
          avgDwellTime: 0,
          avgRating: 0,
          engagementRate: 0,
          culturalPreference: [],
          therapeuticContext: []
        }
        profile.interactionPatterns.push(pattern)
      }

      // Update pattern with new interaction
      if (feedback?.dwellTimes) {
        const dwellTime = feedback.dwellTimes[0] || 0
        pattern.avgDwellTime = (pattern.avgDwellTime + dwellTime) / 2
      }

      if (feedback?.ratings) {
        const rating = feedback.ratings[0] || 0
        pattern.avgRating = (pattern.avgRating + rating) / 2
      }

      pattern.engagementRate += 1
      pattern.culturalPreference = [...new Set([...pattern.culturalPreference, ...result.content.cultureTags])]
      pattern.therapeuticContext = [...new Set([...pattern.therapeuticContext, ...result.content.therapeuticThemes])]
    })
  }

  private async updateTherapeuticNeeds(
    profile: UserSearchProfile,
    processedQuery: ProcessedQuery,
    selectedResults: RankingResult[]
  ): Promise<void> {
    // Extract therapeutic needs from query and selected content
    const therapeuticTerms = ['anxiety', 'depression', 'trauma', 'healing', 'stress', 'grief']
    const detectedNeeds = processedQuery.terms.filter(term =>
      therapeuticTerms.some(therapeutic => 
        term.includes(therapeutic) || therapeutic.includes(term)
      )
    )

    // Add to therapeutic needs if not already present
    detectedNeeds.forEach(need => {
      if (!profile.therapeuticNeeds.includes(need)) {
        profile.therapeuticNeeds.push(need)
      }
    })

    // Also extract from selected content themes
    selectedResults.forEach(result => {
      result.content.therapeuticThemes.forEach(theme => {
        if (!profile.therapeuticNeeds.includes(theme)) {
          profile.therapeuticNeeds.push(theme)
        }
      })
    })

    // Keep only most recent/relevant needs (limit to 10)
    profile.therapeuticNeeds = profile.therapeuticNeeds.slice(-10)
  }

  private async updateCulturalPreferences(
    profile: UserSearchProfile,
    selectedResults: RankingResult[]
  ): Promise<void> {
    const newCultures = new Set<string>()

    selectedResults.forEach(result => {
      result.content.cultureTags.forEach(tag => {
        newCultures.add(tag)
      })
    })

    // Add new cultures to preferences
    newCultures.forEach(culture => {
      if (!profile.preferredCultures.includes(culture)) {
        profile.preferredCultures.push(culture)
      }
    })

    // Keep most recent preferences (limit to 15)
    profile.preferredCultures = profile.preferredCultures.slice(-15)
  }

  private async calculateOptimalWeights(profile: UserSearchProfile): Promise<PersonalizationWeights> {
    // Analyze user behavior to optimize weights
    const interactionData = profile.interactionPatterns

    let culturalWeight = 0.25
    let therapeuticWeight = 0.2
    let diversityPreference = 0.3

    // Increase cultural weight if user shows strong cultural preferences
    const culturalEngagement = interactionData.reduce((sum, pattern) => 
      sum + pattern.culturalPreference.length, 0) / Math.max(interactionData.length, 1)
    
    if (culturalEngagement > 3) {
      culturalWeight += 0.1
    }

    // Increase therapeutic weight if user has specific therapeutic needs
    if (profile.therapeuticNeeds.length > 3) {
      therapeuticWeight += 0.1
    }

    // Adjust diversity preference based on search variety
    const contentTypeVariety = new Set(interactionData.map(p => p.contentType)).size
    if (contentTypeVariety > 3) {
      diversityPreference += 0.1
    }

    // Normalize weights to sum to 1.0
    const totalWeight = 0.4 + culturalWeight + therapeuticWeight + 0.1 + 0.05
    const normalizationFactor = 1.0 / totalWeight

    return {
      semanticWeight: 0.4 * normalizationFactor,
      culturalWeight: culturalWeight * normalizationFactor,
      therapeuticWeight: therapeuticWeight * normalizationFactor,
      popularityWeight: 0.1 * normalizationFactor,
      recencyWeight: 0.05 * normalizationFactor,
      diversityPreference
    }
  }

  private async getContentBasedRecommendations(
    profile: UserSearchProfile,
    limit: number
  ): Promise<Array<{
    contentId: string
    personalizedScore: number
    reason: string
    culturalAlignment: number
    therapeuticFit: number
  }>> {
    try {
      // Query content that matches user preferences
      let query = this.supabase
        .from('cultural_content')
        .select('*')
        .eq('expert_validated', true)
        .limit(limit)

      // Add cultural filters if user has preferences
      if (profile.preferredCultures.length > 0) {
        query = query.overlaps('culture_tags', profile.preferredCultures)
      }

      // Add therapeutic filters if user has needs
      if (profile.therapeuticNeeds.length > 0) {
        query = query.overlaps('therapeutic_themes', profile.therapeuticNeeds)
      }

      const { data: content, error } = await query

      if (error || !content) return []

      return content.map(item => ({
        contentId: item.id,
        personalizedScore: this.calculateContentBasedScore(item, profile),
        reason: this.generateRecommendationReason(item, profile),
        culturalAlignment: this.calculateCulturalFit(item, profile),
        therapeuticFit: this.calculateTherapeuticFit(item, profile)
      }))

    } catch (error) {
      console.error('Content-based recommendations failed:', error)
      return []
    }
  }

  private calculateContentBasedScore(content: any, profile: UserSearchProfile): number {
    const culturalFit = this.calculateCulturalFit(content, profile) * 0.4
    const therapeuticFit = this.calculateTherapeuticFit(content, profile) * 0.4
    const qualityScore = (content.expert_validated ? 0.2 : 0.1) + (1 - (content.bias_score || 0)) * 0.1
    
    return culturalFit + therapeuticFit + qualityScore
  }

  private generateRecommendationReason(content: any, profile: UserSearchProfile): string {
    const reasons = []

    if (profile.preferredCultures.some(culture => content.culture_tags.includes(culture))) {
      reasons.push('matches your cultural interests')
    }

    if (profile.therapeuticNeeds.some(need => content.therapeutic_themes.includes(need))) {
      reasons.push('addresses your therapeutic needs')
    }

    if (content.expert_validated) {
      reasons.push('expert validated content')
    }

    return reasons.join(', ') || 'recommended based on your profile'
  }

  private deduplicateRecommendations(
    recommendations: Array<{
      contentId: string
      personalizedScore: number
      reason: string
      culturalAlignment: number
      therapeuticFit: number
    }>
  ): Array<{
    contentId: string
    personalizedScore: number
    reason: string
    culturalAlignment: number
    therapeuticFit: number
  }> {
    const seen = new Set<string>()
    return recommendations.filter(rec => {
      if (seen.has(rec.contentId)) return false
      seen.add(rec.contentId)
      return true
    })
  }

  private async saveProfile(profile: UserSearchProfile): Promise<void> {
    try {
      const profileData = {
        user_id: profile.userId,
        cultural_background: profile.culturalBackground,
        preferred_cultures: profile.preferredCultures,
        preferred_content_types: profile.preferredContentTypes,
        therapeutic_needs: profile.therapeuticNeeds,
        interaction_patterns: JSON.stringify(profile.interactionPatterns),
        similar_users: JSON.stringify(profile.similarUsers),
        personalized_weights: JSON.stringify(profile.personalizedWeights),
        updated_at: new Date().toISOString()
      }

      await this.supabase
        .from('user_search_profiles')
        .upsert(profileData)

      // Save search history
      for (const historyItem of profile.searchHistory.slice(-10)) { // Save only recent history
        await this.supabase
          .from('user_search_history')
          .upsert({
            user_id: profile.userId,
            query: historyItem.query,
            processed_terms: historyItem.processedTerms,
            selected_content: historyItem.selectedContent,
            ratings: historyItem.ratings,
            cultural_resonance: historyItem.culturalResonance,
            therapeutic_effectiveness: historyItem.therapeuticEffectiveness,
            session_id: historyItem.sessionId,
            created_at: historyItem.timestamp.toISOString()
          })
      }

    } catch (error) {
      console.error('Profile save failed:', error)
    }
  }

  private async cacheProfile(profile: UserSearchProfile): Promise<void> {
    try {
      this.profileCache.set(profile.userId, profile)
      await this.redis.setex(
        `profile:${profile.userId}`,
        1800, // 30 minutes
        JSON.stringify(profile)
      )
    } catch (error) {
      console.error('Profile caching failed:', error)
    }
  }

  private isCacheValid(lastUpdated: Date): boolean {
    return Date.now() - lastUpdated.getTime() < this.cacheExpiry
  }

  private mapSearchHistoryItem(item: any): SearchHistoryItem {
    return {
      query: item.query,
      processedTerms: item.processed_terms || [],
      selectedContent: item.selected_content || [],
      ratings: item.ratings || [],
      culturalResonance: item.cultural_resonance || [],
      therapeuticEffectiveness: item.therapeutic_effectiveness || [],
      timestamp: new Date(item.created_at),
      sessionId: item.session_id
    }
  }

  private extractTherapeuticThemes(profile: UserSearchProfile): string[] {
    const themes = new Set<string>()
    profile.interactionPatterns.forEach(pattern => {
      pattern.therapeuticContext.forEach(context => themes.add(context))
    })
    return Array.from(themes).slice(0, 5)
  }

  private analyzeContentTypePreferences(profile: UserSearchProfile): Record<CulturalContentType, number> {
    const distribution: Partial<Record<CulturalContentType, number>> = {}
    
    profile.interactionPatterns.forEach(pattern => {
      distribution[pattern.contentType] = pattern.engagementRate
    })

    return distribution as Record<CulturalContentType, number>
  }

  private analyzeSearchPatterns(profile: UserSearchProfile): {
    avgQueryLength: number
    commonTerms: string[]
    preferredTime: string
    sessionDuration: number
  } {
    const avgQueryLength = profile.searchHistory.reduce(
      (sum, item) => sum + item.query.length, 0
    ) / Math.max(profile.searchHistory.length, 1)

    const termFreq = new Map<string, number>()
    profile.searchHistory.forEach(item => {
      item.processedTerms.forEach(term => {
        termFreq.set(term, (termFreq.get(term) || 0) + 1)
      })
    })

    const commonTerms = Array.from(termFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([term]) => term)

    return {
      avgQueryLength,
      commonTerms,
      preferredTime: 'morning',
      sessionDuration: 300
    }
  }

  private analyzeTherapeuticJourney(profile: UserSearchProfile): {
    primaryNeeds: string[]
    progressIndicators: string[]
    effectiveContent: string[]
  } {
    return {
      primaryNeeds: profile.therapeuticNeeds.slice(0, 3),
      progressIndicators: [],
      effectiveContent: []
    }
  }
}

// Helper class for collaborative filtering
class CollaborativeModel {
  async findSimilarUsers(userId: string, profile: UserSearchProfile): Promise<string[]> {
    // Implementation for finding similar users based on behavior patterns
    return []
  }

  async getRecommendations(
    userId: string,
    profile: UserSearchProfile,
    limit: number
  ): Promise<Array<{
    contentId: string
    personalizedScore: number
    reason: string
    culturalAlignment: number
    therapeuticFit: number
  }>> {
    // Implementation for collaborative filtering recommendations
    return []
  }
}
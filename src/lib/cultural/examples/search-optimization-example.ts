/**
 * Semantic Search Optimization System - Usage Examples
 * 
 * This file demonstrates how to use the comprehensive semantic search optimization
 * system for FACET's Cultural Intelligence platform.
 */

import { SemanticSearchOptimizer } from '../search-optimizer'
import { CulturalVectorSearch } from '../vector-search'
import { QueryProcessor } from '../query-processor'
import { SearchPersonalization } from '../search-personalization'
import { SearchAnalytics } from '../search-analytics'

/**
 * Example 1: Basic Optimized Search
 * Demonstrates the core search functionality with ML-powered enhancements
 */
export async function basicOptimizedSearchExample() {
  const searchOptimizer = new SemanticSearchOptimizer()
  
  console.log('🔍 Example 1: Basic Optimized Search')
  
  const query = 'meditation anxiety stress relief mindfulness'
  const options = {
    userId: 'user-123',
    culturalContext: ['Buddhist', 'Hindu'],
    therapeuticContext: ['anxiety', 'stress'],
    maxResults: 10,
    rankingStrategy: 'hybrid' as const,
    includePersonalization: true,
    enableCaching: true
  }
  
  try {
    const startTime = Date.now()
    const results = await searchOptimizer.optimizedSearch(query, options)
    const endTime = Date.now()
    
    console.log(`✅ Search completed in ${endTime - startTime}ms`)
    console.log(`📊 Found ${results.length} results`)
    
    if (results.length > 0) {
      const topResult = results[0]
      console.log(`🏆 Top result: "${topResult.content.title}"`)
      console.log(`📈 Personalized score: ${topResult.personalizedScore?.toFixed(3)}`)
      console.log(`🎯 Cultural match: ${topResult.culturalMatch.toFixed(3)}`)
      console.log(`💊 Therapeutic fit: ${topResult.therapeuticMatch.toFixed(3)}`)
      console.log(`🧠 Vector similarity: ${topResult.vectorSimilarity.toFixed(3)}`)
      console.log(`💾 Cache hit: ${topResult.cacheHit}`)
      
      console.log('\n🔬 Ranking factors:', {
        semantic: topResult.rankingFactors.semanticScore.toFixed(3),
        cultural: topResult.rankingFactors.culturalRelevance.toFixed(3),
        therapeutic: topResult.rankingFactors.therapeuticFit.toFixed(3),
        popularity: topResult.rankingFactors.popularityBoost.toFixed(3),
        personalization: topResult.rankingFactors.personalizedBoost.toFixed(3)
      })
    }
    
    return results
  } catch (error) {
    console.error('❌ Search failed:', error)
    throw error
  }
}

/**
 * Example 2: Advanced Query Processing
 * Shows ML-powered query understanding and expansion
 */
export async function advancedQueryProcessingExample() {
  const queryProcessor = new QueryProcessor()
  
  console.log('\n🧠 Example 2: Advanced Query Processing')
  
  const queries = [
    'mediation anxeity stres', // With typos
    'ubuntu healing community', // Cultural context
    'zen peace inner calm', // Philosophical query
    'trauma recovery help' // Therapeutic query
  ]
  
  for (const query of queries) {
    console.log(`\n📝 Processing: "${query}"`)
    
    try {
      const processed = await queryProcessor.processQuery(query, {
        culturalContext: ['African', 'Buddhist', 'Japanese'],
        enableExpansion: true,
        enableTypoCorrection: true,
        detectIntent: true,
        maxSynonyms: 5
      })
      
      console.log(`🎯 Intent: ${processed.intent} (confidence: ${processed.confidence.toFixed(2)})`)
      console.log(`🔧 Enhanced: "${processed.enhanced}"`)
      console.log(`📚 Key terms: [${processed.terms.join(', ')}]`)
      console.log(`🔄 Synonyms: [${processed.synonyms.slice(0, 3).join(', ')}]`)
      console.log(`🌍 Cultural variants: [${processed.culturalVariants.slice(0, 3).join(', ')}]`)
      
      if (processed.typosCorrected.length > 0) {
        console.log(`✏️ Typos corrected: [${processed.typosCorrected.join(', ')}]`)
      }
      
      if (processed.expandedQueries.length > 0) {
        console.log(`🚀 Expanded queries: [${processed.expandedQueries.slice(0, 2).join(', ')}]`)
      }
      
    } catch (error) {
      console.error(`❌ Query processing failed for "${query}":`, error)
    }
  }
}

/**
 * Example 3: Search Personalization
 * Demonstrates user profile creation and personalized recommendations
 */
export async function searchPersonalizationExample() {
  const personalization = new SearchPersonalization()
  
  console.log('\n👤 Example 3: Search Personalization')
  
  const userId = 'example-user-456'
  
  try {
    // Get user profile
    console.log('📊 Getting user profile...')
    const userProfile = await personalization.getUserProfile(userId)
    
    console.log(`🏷️ Preferred cultures: [${userProfile.preferredCultures.join(', ')}]`)
    console.log(`🎭 Preferred content types: [${userProfile.preferredContentTypes.join(', ')}]`)
    console.log(`💊 Therapeutic needs: [${userProfile.therapeuticNeeds.join(', ')}]`)
    console.log(`📈 Search history items: ${userProfile.searchHistory.length}`)
    console.log(`🤝 Similar users: ${userProfile.similarUsers.length}`)
    
    // Get personalized recommendations
    console.log('\n🎯 Getting personalized recommendations...')
    const recommendations = await personalization.getPersonalizedRecommendations(
      userId, 
      5
    )
    
    console.log(`💡 Found ${recommendations.length} personalized recommendations`)
    
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. Content ID: ${rec.contentId}`)
      console.log(`   📊 Score: ${rec.personalizedScore.toFixed(3)}`)
      console.log(`   🌍 Cultural alignment: ${rec.culturalAlignment.toFixed(3)}`)
      console.log(`   💊 Therapeutic fit: ${rec.therapeuticFit.toFixed(3)}`)
      console.log(`   💭 Reason: ${rec.reason}`)
    })
    
    // Get personalization insights
    console.log('\n🔍 Getting personalization insights...')
    const insights = await personalization.getPersonalizationInsights(userId)
    
    console.log(`🏛️ Dominant cultures: [${insights.dominantCultures.join(', ')}]`)
    console.log(`🎭 Preferred themes: [${insights.preferredThemes.join(', ')}]`)
    console.log(`📊 Avg query length: ${insights.searchPatterns.avgQueryLength.toFixed(1)} chars`)
    console.log(`🔤 Common terms: [${insights.searchPatterns.commonTerms.join(', ')}]`)
    console.log(`⏰ Preferred time: ${insights.searchPatterns.preferredTime}`)
    
    return { userProfile, recommendations, insights }
    
  } catch (error) {
    console.error('❌ Personalization example failed:', error)
    throw error
  }
}

/**
 * Example 4: Search Analytics and Performance Monitoring
 * Shows comprehensive analytics and monitoring capabilities
 */
export async function searchAnalyticsExample() {
  const analytics = new SearchAnalytics()
  
  console.log('\n📊 Example 4: Search Analytics and Monitoring')
  
  try {
    // Simulate recording some search metrics
    const sampleMetrics = [
      {
        searchId: 'search-1',
        query: 'meditation mindfulness',
        processedQuery: 'meditation mindfulness contemplation awareness',
        resultCount: 15,
        processingTime: 120,
        cacheHit: false,
        userId: 'user-1',
        sessionId: 'session-1',
        intent: 'therapeutic',
        culturalContext: ['Buddhist'],
        rankingStrategy: 'hybrid',
        timestamp: new Date()
      },
      {
        searchId: 'search-2',
        query: 'ubuntu community healing',
        processedQuery: 'ubuntu community healing collective togetherness',
        resultCount: 8,
        processingTime: 95,
        cacheHit: true,
        userId: 'user-2',
        sessionId: 'session-2',
        intent: 'informational',
        culturalContext: ['African'],
        rankingStrategy: 'semantic',
        timestamp: new Date()
      }
    ]
    
    // Record metrics
    console.log('📈 Recording search metrics...')
    for (const metrics of sampleMetrics) {
      await analytics.recordSearchMetrics(metrics)
    }
    
    // Get performance metrics
    console.log('\n⚡ Getting performance metrics...')
    const performanceMetrics = await analytics.getPerformanceMetrics()
    
    console.log(`⏱️ Average latency: ${performanceMetrics.averageLatency.toFixed(1)}ms`)
    console.log(`📊 P95 latency: ${performanceMetrics.p95Latency.toFixed(1)}ms`)
    console.log(`💾 Cache hit rate: ${(performanceMetrics.cacheHitRate * 100).toFixed(1)}%`)
    console.log(`🔍 Search volume: ${performanceMetrics.searchVolume}`)
    console.log(`🚀 Throughput: ${performanceMetrics.throughput.toFixed(2)} searches/sec`)
    
    if (performanceMetrics.popularQueries.length > 0) {
      console.log('\n🔥 Popular queries:')
      performanceMetrics.popularQueries.slice(0, 3).forEach((query, index) => {
        console.log(`   ${index + 1}. "${query.query}" (${query.count} times)`)
      })
    }
    
    // Get real-time metrics
    console.log('\n⚡ Real-time metrics:')
    const realTimeMetrics = analytics.getRealTimeMetrics()
    console.log(`🔄 Active searches: ${realTimeMetrics.activeSearches}`)
    console.log(`📈 Searches per minute: ${realTimeMetrics.searchesPerMinute}`)
    console.log(`⏱️ Avg latency: ${realTimeMetrics.avgLatency.toFixed(1)}ms`)
    console.log(`💾 Cache hit rate: ${(realTimeMetrics.cacheHitRate * 100).toFixed(1)}%`)
    console.log(`🚨 Active alerts: ${realTimeMetrics.alerts.length}`)
    
    // Generate analytics report
    console.log('\n📋 Generating analytics report...')
    const report = await analytics.generateAnalyticsReport('daily')
    
    console.log('📊 Report Summary:')
    console.log(`   Total searches: ${report.summary.totalSearches}`)
    console.log(`   Avg latency: ${report.summary.avgLatency.toFixed(1)}ms`)
    console.log(`   User satisfaction: ${(report.summary.userSatisfaction * 100).toFixed(1)}%`)
    console.log(`   Recommendations: ${report.recommendations.length}`)
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 System recommendations:')
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`)
      })
    }
    
    return { performanceMetrics, realTimeMetrics, report }
    
  } catch (error) {
    console.error('❌ Analytics example failed:', error)
    throw error
  }
}

/**
 * Example 5: Index Optimization and Performance Tuning
 * Demonstrates database index optimization for better search performance
 */
export async function indexOptimizationExample() {
  const searchOptimizer = new SemanticSearchOptimizer()
  const vectorSearch = new CulturalVectorSearch()
  
  console.log('\n⚙️ Example 5: Index Optimization')
  
  try {
    // Health check before optimization
    console.log('🏥 Performing health check...')
    const healthBefore = await vectorSearch.searchHealthCheck()
    
    console.log(`   Status: ${healthBefore.status}`)
    console.log(`   Components healthy: ${Object.values(healthBefore.components).filter(Boolean).length}/${Object.keys(healthBefore.components).length}`)
    console.log(`   Cache size: ${healthBefore.performance?.cacheHitRate || 0}`)
    
    // Optimize indexes
    console.log('\n🔧 Optimizing vector search indexes...')
    await vectorSearch.optimizeSearchIndexes('hnsw', {
      m: 16,
      efConstruction: 64,
      efSearch: 40
    })
    
    console.log('✅ HNSW index optimization completed')
    
    // Update indexes with sample content
    console.log('\n🔄 Updating indexes with new content...')
    const sampleContentIds = ['content-1', 'content-2', 'content-3']
    await vectorSearch.updateSearchIndexes(sampleContentIds)
    
    console.log('✅ Index updates completed')
    
    // Get performance metrics
    console.log('\n📊 Getting search performance metrics...')
    const performanceMetrics = await vectorSearch.getSearchMetrics({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date()
    })
    
    console.log('⚡ Performance metrics:')
    console.log(`   Average latency: ${performanceMetrics.averageLatency || 0}ms`)
    console.log(`   P95 latency: ${performanceMetrics.p95Latency || 0}ms`)
    console.log(`   Cache hit rate: ${((performanceMetrics.cacheHitRate || 0) * 100).toFixed(1)}%`)
    console.log(`   Index performance: ${performanceMetrics.indexPerformance?.length || 0} indexes`)
    
    // Health check after optimization
    console.log('\n🏥 Final health check...')
    const healthAfter = await vectorSearch.searchHealthCheck()
    
    console.log(`   Status: ${healthAfter.status}`)
    console.log(`   Performance improvement: ${healthAfter.status === 'healthy' ? '✅ Optimized' : '⚠️ Needs attention'}`)
    
    return { healthBefore, healthAfter, performanceMetrics }
    
  } catch (error) {
    console.error('❌ Index optimization failed:', error)
    throw error
  }
}

/**
 * Example 6: Complete End-to-End Workflow
 * Demonstrates the full search optimization pipeline
 */
export async function completeWorkflowExample() {
  console.log('\n🚀 Example 6: Complete End-to-End Workflow')
  
  const searchOptimizer = new SemanticSearchOptimizer()
  const analytics = new SearchAnalytics()
  const personalization = new SearchPersonalization()
  
  const userId = 'workflow-user-789'
  const sessionId = 'session-' + Date.now()
  
  try {
    console.log('🎬 Starting complete search workflow...')
    
    // Step 1: User initiates search
    const userQuery = 'Buddhist meditation anxiety relief mindfulness practice'
    console.log(`👤 User searches for: "${userQuery}"`)
    
    // Step 2: Optimized search with all features enabled
    console.log('🔍 Performing optimized search...')
    const searchResults = await searchOptimizer.optimizedSearch(userQuery, {
      userId,
      sessionId,
      culturalContext: ['Buddhist'],
      therapeuticContext: ['anxiety'],
      maxResults: 10,
      rankingStrategy: 'hybrid',
      includePersonalization: true,
      enableCaching: true,
      includeAnalytics: true
    })
    
    console.log(`📊 Search completed: ${searchResults.length} results in ${searchResults[0]?.processingTime || 0}ms`)
    
    if (searchResults.length > 0) {
      const topResult = searchResults[0]
      console.log(`🏆 Top result: "${topResult.content.title}"`)
      console.log(`   Score: ${topResult.personalizedScore?.toFixed(3)}`)
      console.log(`   Cache hit: ${topResult.cacheHit}`)
    }
    
    // Step 3: User interacts with results (simulate)
    console.log('\n👆 Simulating user interaction...')
    const selectedResults = searchResults.slice(0, 3) // User views top 3 results
    
    // Step 4: Record user feedback
    console.log('📝 Recording user feedback...')
    const feedback = {
      ratings: [5, 4, 3], // User ratings
      culturalResonance: [4.5, 4.0, 3.5], // Cultural relevance scores
      therapeuticEffectiveness: [4.8, 4.2, 3.8], // Therapeutic value scores
      dwellTimes: [120, 90, 45] // Time spent on each result (seconds)
    }
    
    // Step 5: Update user profile with behavior data
    console.log('👤 Updating user profile...')
    const processedQuery = {
      original: userQuery,
      enhanced: userQuery + ' contemplation awareness peace',
      terms: ['buddhist', 'meditation', 'anxiety', 'relief', 'mindfulness'],
      synonyms: ['contemplation', 'awareness', 'peace'],
      culturalVariants: ['zen', 'dharma'],
      intent: 'therapeutic' as const,
      confidence: 0.9
    }
    
    await personalization.updateUserProfile(
      userId,
      processedQuery,
      selectedResults,
      feedback
    )
    
    // Step 6: Record comprehensive analytics
    console.log('📊 Recording analytics...')
    await analytics.recordSearchMetrics({
      searchId: searchResults[0]?.searchId || 'workflow-search',
      query: userQuery,
      processedQuery: processedQuery.enhanced,
      resultCount: searchResults.length,
      processingTime: searchResults[0]?.processingTime || 0,
      cacheHit: searchResults[0]?.cacheHit || false,
      userId,
      sessionId,
      intent: 'therapeutic',
      culturalContext: ['Buddhist'],
      rankingStrategy: 'hybrid',
      timestamp: new Date()
    })
    
    // Step 7: Generate recommendations for next session
    console.log('🎯 Generating follow-up recommendations...')
    const recommendations = await personalization.getPersonalizedRecommendations(
      userId,
      5
    )
    
    console.log(`💡 Generated ${recommendations.length} personalized recommendations`)
    
    // Step 8: Performance summary
    console.log('\n📈 Workflow Performance Summary:')
    console.log(`   Search latency: ${searchResults[0]?.processingTime || 0}ms`)
    console.log(`   Results returned: ${searchResults.length}`)
    console.log(`   Cache utilization: ${searchResults[0]?.cacheHit ? 'Hit' : 'Miss'}`)
    console.log(`   User satisfaction: ${feedback.ratings.reduce((sum, r) => sum + r, 0) / feedback.ratings.length}/5`)
    console.log(`   Cultural resonance: ${(feedback.culturalResonance.reduce((sum, r) => sum + r, 0) / feedback.culturalResonance.length).toFixed(1)}/5`)
    console.log(`   Therapeutic effectiveness: ${(feedback.therapeuticEffectiveness.reduce((sum, r) => sum + r, 0) / feedback.therapeuticEffectiveness.length).toFixed(1)}/5`)
    console.log(`   Follow-up recommendations: ${recommendations.length}`)
    
    console.log('\n✅ Complete workflow executed successfully!')
    
    return {
      searchResults,
      recommendations,
      userFeedback: feedback,
      performance: {
        latency: searchResults[0]?.processingTime || 0,
        resultCount: searchResults.length,
        cacheHit: searchResults[0]?.cacheHit || false
      }
    }
    
  } catch (error) {
    console.error('❌ Complete workflow failed:', error)
    throw error
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🎯 Running Semantic Search Optimization Examples')
  console.log('=' .repeat(60))
  
  try {
    await basicOptimizedSearchExample()
    await advancedQueryProcessingExample()
    await searchPersonalizationExample()
    await searchAnalyticsExample()
    await indexOptimizationExample()
    await completeWorkflowExample()
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ All examples completed successfully!')
    console.log('🚀 Semantic Search Optimization System is ready for production')
    
  } catch (error) {
    console.error('\n❌ Example execution failed:', error)
    throw error
  }
}

// Export individual examples for selective testing
export {
  basicOptimizedSearchExample,
  advancedQueryProcessingExample,
  searchPersonalizationExample,
  searchAnalyticsExample,
  indexOptimizationExample,
  completeWorkflowExample
}

// Run examples if called directly
if (require.main === module) {
  runAllExamples().catch(console.error)
}
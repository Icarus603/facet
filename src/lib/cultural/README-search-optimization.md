# Semantic Search Optimization System

A comprehensive ML-powered search optimization system for FACET's Cultural Intelligence platform, designed to deliver sub-1s latency with improved relevance and personalization.

## 🎯 Key Features

### Core Capabilities
- **ML-Powered Query Understanding**: Advanced NLP with intent detection, synonym expansion, and typo correction
- **Multi-Strategy Ranking**: Hybrid BM25 + Vector similarity with learning-to-rank algorithms
- **Real-Time Personalization**: User behavior tracking with collaborative filtering
- **Performance Optimization**: HNSW indexing, intelligent caching, and connection pooling
- **Comprehensive Analytics**: Real-time monitoring, performance metrics, and quality insights
- **Cultural Intelligence**: Context-aware search with bias detection integration

### Performance Targets
- **P50 Latency**: <200ms
- **P95 Latency**: <1s
- **P99 Latency**: <2s
- **Concurrent Searches**: 100+ simultaneous users
- **Content Scale**: 10,000+ cultural content items
- **Cache Hit Rate**: >70%

## 🏗️ System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                Search Optimizer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │
│  │ Query       │ │ Ranking     │ │ Search          │    │
│  │ Processor   │ │ Engine      │ │ Personalization │    │
│  └─────────────┘ └─────────────┘ └─────────────────┘    │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │
│  │ Search      │ │ Vector      │ │ Cultural        │    │
│  │ Analytics   │ │ Database    │ │ Engine          │    │
│  └─────────────┘ └─────────────┘ └─────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Query Processing**: NLP enhancement, expansion, intent detection
2. **Multi-Strategy Search**: Parallel semantic, BM25, cultural, and collaborative search
3. **Advanced Ranking**: ML-powered result ranking with personalization
4. **Response Assembly**: Result formatting with performance metrics
5. **Analytics Recording**: Search metrics and user behavior tracking
6. **Profile Updates**: User preference learning and similarity computation

## 📦 Installation & Setup

### Dependencies

```bash
npm install compromise fuse.js natural stopword tensorflow
```

### Environment Variables

```env
# Azure OpenAI (for embeddings)
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_API_KEY=your_api_key

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Supabase (for database)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

### Database Setup

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create optimized HNSW index for vector search
CREATE INDEX CONCURRENTLY cultural_content_embedding_hnsw_idx
ON cultural_content
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create supporting tables for analytics
CREATE TABLE search_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id TEXT NOT NULL,
  query TEXT NOT NULL,
  processed_query TEXT,
  result_count INTEGER,
  processing_time INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  user_id TEXT,
  session_id TEXT,
  intent TEXT,
  cultural_context TEXT[],
  ranking_strategy TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_search_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  cultural_background TEXT[],
  preferred_cultures TEXT[],
  preferred_content_types TEXT[],
  therapeutic_needs TEXT[],
  interaction_patterns JSONB,
  similar_users JSONB,
  personalized_weights JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { SemanticSearchOptimizer } from '@/lib/cultural/search-optimizer'

const searchOptimizer = new SemanticSearchOptimizer()

// Perform optimized search
const results = await searchOptimizer.optimizedSearch(
  'Buddhist meditation anxiety relief', 
  {
    userId: 'user-123',
    culturalContext: ['Buddhist'],
    therapeuticContext: ['anxiety'],
    maxResults: 10,
    rankingStrategy: 'hybrid',
    includePersonalization: true,
    enableCaching: true
  }
)

console.log(`Found ${results.length} results in ${results[0]?.processingTime}ms`)
```

### Advanced Query Processing

```typescript
import { QueryProcessor } from '@/lib/cultural/query-processor'

const queryProcessor = new QueryProcessor()

const processedQuery = await queryProcessor.processQuery(
  'mediation anxeity stres', // With typos
  {
    culturalContext: ['Buddhist', 'Hindu'],
    enableExpansion: true,
    enableTypoCorrection: true,
    detectIntent: true,
    maxSynonyms: 5
  }
)

console.log(`Intent: ${processedQuery.intent}`)
console.log(`Enhanced: ${processedQuery.enhanced}`)
console.log(`Synonyms: ${processedQuery.synonyms}`)
```

### Search Personalization

```typescript
import { SearchPersonalization } from '@/lib/cultural/search-personalization'

const personalization = new SearchPersonalization()

// Get user profile
const userProfile = await personalization.getUserProfile('user-123')

// Get personalized recommendations
const recommendations = await personalization.getPersonalizedRecommendations(
  'user-123',
  5
)

// Update profile with search behavior
await personalization.updateUserProfile(
  'user-123',
  processedQuery,
  searchResults,
  {
    ratings: [5, 4, 3],
    culturalResonance: [4.5, 4.0, 3.5],
    therapeuticEffectiveness: [4.8, 4.2, 3.8]
  }
)
```

### Performance Monitoring

```typescript
import { SearchAnalytics } from '@/lib/cultural/search-analytics'

const analytics = new SearchAnalytics()

// Record search metrics
await analytics.recordSearchMetrics({
  searchId: 'search-123',
  query: 'meditation mindfulness',
  resultCount: 15,
  processingTime: 120,
  cacheHit: false,
  userId: 'user-1',
  timestamp: new Date()
})

// Get performance metrics
const metrics = await analytics.getPerformanceMetrics()
console.log(`P95 latency: ${metrics.p95Latency}ms`)
console.log(`Cache hit rate: ${metrics.cacheHitRate * 100}%`)

// Generate analytics report
const report = await analytics.generateAnalyticsReport('daily')
```

### Index Optimization

```typescript
import { CulturalVectorSearch } from '@/lib/cultural/vector-search'

const vectorSearch = new CulturalVectorSearch()

// Optimize vector indexes
await vectorSearch.optimizeSearchIndexes('hnsw', {
  m: 16,
  efConstruction: 64,
  efSearch: 40
})

// Update indexes with new content
await vectorSearch.updateSearchIndexes(['content-1', 'content-2'])

// Health check
const health = await vectorSearch.searchHealthCheck()
console.log(`System status: ${health.status}`)
```

## 🎛️ Configuration

### Ranking Strategies

- **`semantic`**: Vector similarity-based ranking
- **`bm25`**: Keyword relevance ranking
- **`hybrid`**: Combined semantic + BM25 + cultural factors
- **`collaborative`**: User behavior-based recommendations
- **`therapeutic`**: Therapeutic effectiveness-focused ranking

### Personalization Weights

```typescript
interface PersonalizationWeights {
  semanticWeight: number      // Default: 0.4
  culturalWeight: number      // Default: 0.25
  therapeuticWeight: number   // Default: 0.2
  popularityWeight: number    // Default: 0.1
  recencyWeight: number       // Default: 0.05
  diversityPreference: number // Default: 0.3
}
```

### Cache Settings

```typescript
// In-memory cache expiry (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000

// Redis cache TTL (5 minutes)
const REDIS_TTL = 300

// Max cache size (1000 entries)
const MAX_CACHE_SIZE = 1000
```

## 📊 Performance Optimization

### Vector Index Configuration

**HNSW (Recommended for < 1M vectors):**
```sql
CREATE INDEX cultural_content_embedding_hnsw_idx
ON cultural_content
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**IVFFlat (For larger datasets):**
```sql
CREATE INDEX cultural_content_embedding_ivf_idx
ON cultural_content
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Query Optimization

1. **Enable Connection Pooling**: Configure pgBouncer or similar
2. **Optimize Batch Size**: Process queries in batches of 10-50
3. **Cache Warming**: Pre-populate cache with common queries
4. **Index Maintenance**: Regular `REINDEX` for optimal performance

### Caching Strategy

```typescript
// Multi-layer caching
1. In-memory cache (fastest, limited size)
2. Redis cache (fast, larger capacity)
3. Query result caching (5-minute TTL)
4. User profile caching (30-minute TTL)
5. Popularity metrics caching (1-hour TTL)
```

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test src/lib/cultural/__tests__/search-optimization.test.ts

# Performance benchmarks
npm run test:performance

# Integration tests
npm run test:integration
```

### Example Usage

```bash
# Run all examples
npx tsx src/lib/cultural/examples/search-optimization-example.ts

# Run specific example
import { basicOptimizedSearchExample } from './examples/search-optimization-example'
await basicOptimizedSearchExample()
```

## 📈 Monitoring & Analytics

### Key Metrics

**Performance Metrics:**
- Average latency, P50, P95, P99 response times
- Cache hit rates and throughput
- Error rates and system availability
- Index performance and query optimization

**Quality Metrics:**
- Relevance scores and user satisfaction
- Cultural accuracy and therapeutic effectiveness
- Bias detection and content quality
- Result diversity and personalization effectiveness

**User Engagement:**
- Search volume and user retention
- Query patterns and session duration
- Content interaction and feedback scores
- Personalization effectiveness and similar user discovery

### Real-Time Alerts

```typescript
// Configure alert thresholds
analytics.setupAlerts({
  maxLatency: 1000,        // Alert if P95 > 1s
  minCacheHitRate: 0.7,    // Alert if cache hit < 70%
  maxErrorRate: 0.05,      // Alert if error rate > 5%
  maxActiveSearches: 1000  // Alert if concurrent searches > 1000
})

// Handle alerts
analytics.on('alert', (alert) => {
  console.log(`🚨 ${alert.severity.toUpperCase()} Alert: ${alert.message}`)
  // Send to monitoring system (PagerDuty, Slack, etc.)
})
```

### Dashboard Integration

```typescript
// Real-time metrics for dashboard
const realTimeMetrics = analytics.getRealTimeMetrics()

// Performance analytics
const performanceReport = await analytics.generateAnalyticsReport('daily')

// Export data for external analysis
const exportData = await analytics.exportAnalyticsData('json', {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
})
```

## 🔧 Advanced Features

### Learning-to-Rank Integration

```typescript
// Record user feedback for ML model training
await rankingEngine.recordUserFeedback({
  contentId: 'content-123',
  userId: 'user-456',
  queryId: 'search-789',
  rating: 5,
  clickPosition: 1,
  dwellTime: 120,
  feedback: 'positive',
  culturalResonance: 4.5,
  therapeuticEffectiveness: 4.8
})

// Optimize ranking parameters
const optimization = await rankingEngine.optimizeRankingParameters()
console.log(`Performance improvement: ${optimization.performanceImprovement * 100}%`)
```

### Cultural Intelligence Integration

```typescript
// Bias-aware search with content filtering
const results = await searchOptimizer.optimizedSearch(query, {
  biasThreshold: 0.3,        // Filter content with bias score > 0.3
  culturalContext: ['African', 'Indigenous'],
  requireExpertValidation: true // Only return expert-validated content
})

// Cultural sensitivity analysis
const sensitivity = await biasDetector.performRealTimeBiasCheck(
  partialQuery,
  ['Native American', 'Sacred']
)
```

### Multi-Language Support

```typescript
// Process non-English queries
const processedQuery = await queryProcessor.processMultiLingualQuery(
  '冥想 不安 治疗', // Chinese query
  'zh',              // Source language
  'en',              // Target language
  ['Chinese', 'Buddhist'] // Cultural context
)
```

## 🚨 Error Handling & Resilience

### Graceful Degradation

```typescript
// Automatic fallback chain
1. Optimized search (primary)
2. Basic vector search (if optimization fails)
3. Keyword search (if vector search fails)
4. Cached results (if all searches fail)
5. Empty results with error logging (final fallback)
```

### Circuit Breaker Pattern

```typescript
// Prevent cascade failures
class CircuitBreaker {
  private failures = 0
  private readonly threshold = 5
  private readonly timeout = 30000 // 30 seconds
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open')
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
}
```

### Health Checks

```typescript
// Comprehensive system health monitoring
const healthCheck = await searchOptimizer.healthCheck()

// Component-level health checks
if (!healthCheck.components.queryProcessor) {
  console.warn('Query processor is unhealthy - using basic processing')
}

if (healthCheck.status === 'critical') {
  // Trigger incident response
  alerting.triggerIncident('search-system-critical', healthCheck)
}
```

## 🔒 Security & Privacy

### Data Protection

- **User Data Encryption**: All personal data encrypted at rest and in transit
- **Query Anonymization**: Personal identifiers removed from analytics
- **GDPR Compliance**: User data export and deletion capabilities
- **Audit Logging**: Comprehensive activity logging for compliance

### Access Controls

```typescript
// Role-based access control
interface SearchPermissions {
  canAccessPersonalizedSearch: boolean
  canViewAnalytics: boolean
  canExportData: boolean
  canModifyIndexes: boolean
}

// Data retention policies
const RETENTION_POLICIES = {
  searchMetrics: 90, // days
  userProfiles: 365, // days
  analyticsData: 730 // days
}
```

## 📚 API Reference

### Main Classes

- **`SemanticSearchOptimizer`**: Primary search interface with ML enhancements
- **`QueryProcessor`**: Advanced NLP query processing and expansion
- **`RankingEngine`**: Multi-strategy ranking with learning-to-rank
- **`SearchPersonalization`**: User behavior tracking and personalized recommendations
- **`SearchAnalytics`**: Comprehensive monitoring and performance analytics
- **`CulturalVectorSearch`**: Enhanced vector search with optimization methods

### Key Interfaces

```typescript
interface OptimizedSearchOptions {
  userId?: string
  sessionId?: string
  culturalContext?: string[]
  therapeuticContext?: string[]
  maxResults?: number
  rankingStrategy?: 'hybrid' | 'semantic' | 'collaborative' | 'therapeutic'
  includePersonalization?: boolean
  enableCaching?: boolean
  searchTimeout?: number
}

interface OptimizedSearchResult extends VectorSearchResult {
  personalizedScore: number
  rankingFactors: RankingFactors
  searchId: string
  processingTime: number
  cacheHit: boolean
}
```

## 🤝 Contributing

1. **Code Style**: Follow TypeScript best practices and existing patterns
2. **Testing**: Add comprehensive tests for new features
3. **Performance**: Maintain sub-1s P95 latency requirements
4. **Documentation**: Update README and inline documentation
5. **Cultural Sensitivity**: Ensure cultural appropriateness and bias awareness

## 📄 License

This software is part of the FACET Cultural Intelligence platform. All rights reserved.

---

## 📞 Support

For technical support or questions about the Semantic Search Optimization system:

- **Email**: dev-team@facet-platform.com
- **Documentation**: [FACET Developer Portal](https://docs.facet-platform.com)
- **Issues**: Create GitHub issues for bugs and feature requests
- **Slack**: #facet-search-optimization (internal team channel)

---

**Built with ❤️ for culturally-aware therapeutic AI**
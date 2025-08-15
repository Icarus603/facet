/**
 * Memory System Types for FACET
 * Vector-based memory storage with Pinecone integration
 */

// Memory Types - Different kinds of memories we store
export type MemoryType = 'event' | 'insight' | 'pattern' | 'preference' | 'goal' | 'crisis';

// Sensitivity Levels for privacy and access control
export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';

// Core Memory Entry interface
export interface MemoryEntry {
  id: string;
  userId: string;
  content: string;
  summary: string;
  memoryType: MemoryType;
  importance: number; // 0.0 - 1.0
  emotionalValence: number; // -1.0 to 1.0 (negative to positive)
  categories: string[];
  relatedGoals: string[];
  therapeuticRelevance: number; // 0.0 - 1.0
  sensitivityLevel: SensitivityLevel;
  accessCount: number;
  lastAccessedAt: Date;
  retentionExpiresAt: Date;
  createdAt: Date;
  embeddingModel: string;
  embeddingDimension: number;
}

// User Memory interface for context
export interface UserMemory {
  userId: string;
  memories: MemoryEntry[];
  totalCount: number;
  memoryStats: UserMemoryStats;
}

// Memory statistics for user dashboard
export interface UserMemoryStats {
  userId: string;
  totalMemories: number;
  eventMemories: number;
  insightMemories: number;
  patternMemories: number;
  preferenceMemories: number;
  goalMemories: number;
  crisisMemories: number;
  avgImportance: number;
  avgTherapeuticRelevance: number;
  highImportanceMemories: number;
  mostAccessedMemoryId?: string;
  avgMemoryAgeDays: number;
  totalStorageKb: number;
  pineconeVectors: number;
  updatedAt: Date;
}

// Memory search and retrieval
export interface MemorySearchQuery {
  queryText: string;
  userId: string;
  memoryTypes?: MemoryType[];
  categories?: string[];
  relatedGoals?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  importanceThreshold?: number;
  sensitivityLevels?: SensitivityLevel[];
  topK?: number;
  similarityThreshold?: number;
}

// Memory search result
export interface MemorySearchResult {
  id: string;
  score: number; // Similarity score 0-1
  content: string;
  summary: string;
  memoryType: MemoryType;
  importance: number;
  createdAt: Date;
  categories: string[];
  therapeuticRelevance: number;
  sensitivityLevel: SensitivityLevel;
  accessCount: number;
}

// Memory search analytics
export interface MemorySearchAnalytics {
  id: string;
  userId: string;
  searchQuery: string;
  searchType: 'semantic' | 'contextual' | 'goal-related';
  resultsCount: number;
  topResultScore?: number;
  avgResultScore?: number;
  sessionId?: string;
  emotionalContext?: any;
  searchFilters?: any;
  searchDurationMs?: number;
  createdAt: Date;
}

// Memory consolidation and maintenance
export interface MemoryConsolidationJob {
  id: string;
  userId: string;
  jobType: 'cleanup_expired' | 'consolidate_similar' | 'update_importance' | 'recompute_relevance';
  status: 'pending' | 'running' | 'completed' | 'failed';
  memoriesProcessed: number;
  memoriesModified: number;
  memoriesDeleted: number;
  processingDurationMs?: number;
  errorMessage?: string;
  resultsSummary?: any;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Memory context for agents
export interface MemoryContext {
  relevantMemories: MemorySearchResult[];
  memoryStats: UserMemoryStats;
  searchQuery: string;
  retrievalMethod: string;
  contextualFactors: string[];
  emotionalRelevance: number;
  therapeuticValue: number;
}

// Memory creation request
export interface CreateMemoryRequest {
  userId: string;
  content: string;
  memoryType: MemoryType;
  emotionalContext?: {
    primaryEmotion?: string;
    intensity?: number;
    valence?: number;
    arousal?: number;
  };
  importance?: number;
  categories?: string[];
  relatedGoals?: string[];
  sensitivityOverride?: SensitivityLevel;
}

// Memory update request
export interface UpdateMemoryRequest {
  memoryId: string;
  importance?: number;
  categories?: string[];
  relatedGoals?: string[];
  therapeuticRelevance?: number;
  sensitivityLevel?: SensitivityLevel;
}

// Vector embedding interface
export interface MemoryEmbedding {
  id: string;
  values: number[];
  metadata: {
    userId: string;
    memoryType: MemoryType;
    importance: number;
    emotionalValence: number;
    createdAt: string;
    lastAccessedAt: string;
    accessCount: number;
    categories: string[];
    relatedGoals: string[];
    therapeuticRelevance: number;
    sensitivityLevel: SensitivityLevel;
    retentionDays: number;
    content: string;
    summary: string;
  };
}

// Memory retrieval configuration
export interface MemoryRetrievalConfig {
  maxMemories: number;
  similarityThreshold: number;
  includeExpired: boolean;
  sortBy: 'relevance' | 'recency' | 'importance' | 'access_frequency';
  groupBy?: 'type' | 'category' | 'goal' | 'sensitivity';
  emotionalFilter?: {
    valenceRange: [number, number];
    intensityThreshold: number;
  };
}

// Error types for memory operations
export interface MemoryError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  operation: string;
  userId?: string;
  memoryId?: string;
}

// Memory insights for therapeutic use
export interface MemoryInsight {
  type: 'pattern' | 'trend' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  confidence: number; // 0-1
  supportingMemories: string[]; // Memory IDs
  therapeuticValue: number; // 0-1
  actionable: boolean;
  recommendedActions?: string[];
  timeframe?: {
    start: Date;
    end: Date;
  };
}

// Memory retention policy
export interface MemoryRetentionPolicy {
  memoryType: MemoryType;
  baseDays: number;
  importanceMultiplier: number;
  sensitivityExtension: number;
  minRetentionDays: number;
  maxRetentionDays: number;
  autoCleanup: boolean;
}
/**
 * FACET Redis Cache Infrastructure
 * 
 * Agent result caching and session management for performance optimization
 * Implements SPECS.md lines 154-156 cache architecture requirements
 */

import Redis from 'ioredis'
import { AgentExecutionResult } from '@/lib/types/api-contract'

export interface CacheConfig {
  host: string
  port: number
  password?: string
  db: number
  keyPrefix: string
  defaultTTL: number // Time to live in seconds
}

export interface AgentCacheEntry {
  agentName: string
  inputHash: string
  result: AgentExecutionResult
  userId: string
  timestamp: number
  ttl: number
}

export interface SessionCacheEntry {
  userId: string
  sessionId: string
  conversationContext: any
  userPreferences: any
  lastActivity: number
}

export class FACETRedisCache {
  private redis: Redis
  private config: CacheConfig
  private connected: boolean = false

  constructor(config?: Partial<CacheConfig>) {
    // Default configuration with environment overrides
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'facet:',
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600'), // 1 hour
      ...config
    }

    this.redis = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      // Optimized for agent caching patterns
      connectTimeout: 5000,
      commandTimeout: 3000,
      // Connection pool for high throughput
      family: 4,
      keepAlive: 30000
    })

    this.setupEventHandlers()
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    try {
      await this.redis.connect()
      this.connected = true
      console.log('FACET Redis cache connected successfully')
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      this.connected = false
      throw error
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect()
      this.connected = false
      console.log('FACET Redis cache disconnected')
    } catch (error) {
      console.error('Error disconnecting from Redis:', error)
    }
  }

  /**
   * Cache agent execution result
   */
  async cacheAgentResult(
    agentName: string,
    inputData: any,
    result: AgentExecutionResult,
    userId: string,
    customTTL?: number
  ): Promise<void> {
    if (!this.connected) {
      console.warn('Redis not connected, skipping cache')
      return
    }

    try {
      const inputHash = this.generateInputHash(inputData)
      const cacheKey = this.getAgentCacheKey(agentName, inputHash, userId)
      
      const cacheEntry: AgentCacheEntry = {
        agentName,
        inputHash,
        result,
        userId,
        timestamp: Date.now(),
        ttl: customTTL || this.config.defaultTTL
      }

      await this.redis.setex(
        cacheKey,
        cacheEntry.ttl,
        JSON.stringify(cacheEntry)
      )

      // Track cache statistics
      await this.incrementCacheStats('agent_results', 'cached')
      
    } catch (error) {
      console.error('Failed to cache agent result:', error)
      // Don't throw - caching failure shouldn't break the request
    }
  }

  /**
   * Retrieve cached agent result
   */
  async getCachedAgentResult(
    agentName: string,
    inputData: any,
    userId: string
  ): Promise<AgentExecutionResult | null> {
    if (!this.connected) {
      return null
    }

    try {
      const inputHash = this.generateInputHash(inputData)
      const cacheKey = this.getAgentCacheKey(agentName, inputHash, userId)
      
      const cached = await this.redis.get(cacheKey)
      if (!cached) {
        await this.incrementCacheStats('agent_results', 'miss')
        return null
      }

      const cacheEntry: AgentCacheEntry = JSON.parse(cached)
      
      // Validate cache entry is still valid
      if (this.isCacheEntryValid(cacheEntry)) {
        await this.incrementCacheStats('agent_results', 'hit')
        return cacheEntry.result
      } else {
        // Remove invalid cache entry
        await this.redis.del(cacheKey)
        await this.incrementCacheStats('agent_results', 'expired')
        return null
      }
      
    } catch (error) {
      console.error('Failed to retrieve cached agent result:', error)
      await this.incrementCacheStats('agent_results', 'error')
      return null
    }
  }

  /**
   * Cache session data
   */
  async cacheSession(
    sessionId: string,
    userId: string,
    conversationContext: any,
    userPreferences: any,
    customTTL?: number
  ): Promise<void> {
    if (!this.connected) {
      console.warn('Redis not connected, skipping session cache')
      return
    }

    try {
      const cacheKey = this.getSessionCacheKey(sessionId)
      
      const sessionEntry: SessionCacheEntry = {
        userId,
        sessionId,
        conversationContext,
        userPreferences,
        lastActivity: Date.now()
      }

      const ttl = customTTL || (this.config.defaultTTL * 2) // Sessions live longer
      await this.redis.setex(cacheKey, ttl, JSON.stringify(sessionEntry))
      
      // Track session in user index
      await this.redis.sadd(`user_sessions:${userId}`, sessionId)
      await this.redis.expire(`user_sessions:${userId}`, ttl)
      
      await this.incrementCacheStats('sessions', 'cached')
      
    } catch (error) {
      console.error('Failed to cache session:', error)
    }
  }

  /**
   * Retrieve cached session data
   */
  async getCachedSession(sessionId: string): Promise<SessionCacheEntry | null> {
    if (!this.connected) {
      return null
    }

    try {
      const cacheKey = this.getSessionCacheKey(sessionId)
      const cached = await this.redis.get(cacheKey)
      
      if (!cached) {
        await this.incrementCacheStats('sessions', 'miss')
        return null
      }

      const sessionEntry: SessionCacheEntry = JSON.parse(cached)
      await this.incrementCacheStats('sessions', 'hit')
      return sessionEntry
      
    } catch (error) {
      console.error('Failed to retrieve cached session:', error)
      await this.incrementCacheStats('sessions', 'error')
      return null
    }
  }

  /**
   * Cache user preferences for fast access
   */
  async cacheUserPreferences(userId: string, preferences: any): Promise<void> {
    if (!this.connected) return

    try {
      const cacheKey = `user_prefs:${userId}`
      await this.redis.setex(
        cacheKey,
        this.config.defaultTTL * 4, // User prefs live longer
        JSON.stringify(preferences)
      )
    } catch (error) {
      console.error('Failed to cache user preferences:', error)
    }
  }

  /**
   * Get cached user preferences
   */
  async getCachedUserPreferences(userId: string): Promise<any | null> {
    if (!this.connected) return null

    try {
      const cacheKey = `user_prefs:${userId}`
      const cached = await this.redis.get(cacheKey)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Failed to retrieve cached user preferences:', error)
      return null
    }
  }

  /**
   * Cache orchestration strategy results for similar contexts
   */
  async cacheOrchestrationStrategy(
    contextHash: string,
    strategy: string,
    agentsUsed: string[],
    executionPattern: string
  ): Promise<void> {
    if (!this.connected) return

    try {
      const cacheKey = `orchestration:${contextHash}`
      const strategyData = {
        strategy,
        agentsUsed,
        executionPattern,
        timestamp: Date.now()
      }
      
      await this.redis.setex(
        cacheKey,
        this.config.defaultTTL / 2, // Shorter TTL for strategies
        JSON.stringify(strategyData)
      )
    } catch (error) {
      console.error('Failed to cache orchestration strategy:', error)
    }
  }

  /**
   * Get cached orchestration strategy
   */
  async getCachedOrchestrationStrategy(contextHash: string): Promise<any | null> {
    if (!this.connected) return null

    try {
      const cacheKey = `orchestration:${contextHash}`
      const cached = await this.redis.get(cacheKey)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Failed to retrieve cached orchestration strategy:', error)
      return null
    }
  }

  /**
   * Invalidate user-specific caches
   */
  async invalidateUserCache(userId: string): Promise<void> {
    if (!this.connected) return

    try {
      // Get all user sessions
      const userSessions = await this.redis.smembers(`user_sessions:${userId}`)
      
      // Delete session caches
      if (userSessions.length > 0) {
        const sessionKeys = userSessions.map(sessionId => this.getSessionCacheKey(sessionId))
        await this.redis.del(...sessionKeys)
      }
      
      // Delete user preferences cache
      await this.redis.del(`user_prefs:${userId}`)
      
      // Delete user sessions index
      await this.redis.del(`user_sessions:${userId}`)
      
      // Delete agent result caches for this user (pattern-based)
      const agentKeys = await this.redis.keys(`agent:*:${userId}`)
      if (agentKeys.length > 0) {
        await this.redis.del(...agentKeys)
      }
      
    } catch (error) {
      console.error('Failed to invalidate user cache:', error)
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    agentResults: { hits: number, misses: number, cached: number, errors: number }
    sessions: { hits: number, misses: number, cached: number, errors: number }
    memoryUsage: string
    connectedClients: number
  }> {
    if (!this.connected) {
      return {
        agentResults: { hits: 0, misses: 0, cached: 0, errors: 0 },
        sessions: { hits: 0, misses: 0, cached: 0, errors: 0 },
        memoryUsage: '0B',
        connectedClients: 0
      }
    }

    try {
      const [
        agentHits, agentMisses, agentCached, agentErrors,
        sessionHits, sessionMisses, sessionCached, sessionErrors,
        info
      ] = await Promise.all([
        this.redis.get('stats:agent_results:hit') || '0',
        this.redis.get('stats:agent_results:miss') || '0',
        this.redis.get('stats:agent_results:cached') || '0',
        this.redis.get('stats:agent_results:error') || '0',
        this.redis.get('stats:sessions:hit') || '0',
        this.redis.get('stats:sessions:miss') || '0',
        this.redis.get('stats:sessions:cached') || '0',
        this.redis.get('stats:sessions:error') || '0',
        this.redis.info('memory')
      ])

      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/)
      const clientsMatch = info.match(/connected_clients:(\d+)/)

      return {
        agentResults: {
          hits: parseInt(agentHits as string),
          misses: parseInt(agentMisses as string),
          cached: parseInt(agentCached as string),
          errors: parseInt(agentErrors as string)
        },
        sessions: {
          hits: parseInt(sessionHits as string),
          misses: parseInt(sessionMisses as string),
          cached: parseInt(sessionCached as string),
          errors: parseInt(sessionErrors as string)
        },
        memoryUsage: memoryMatch ? memoryMatch[1] : '0B',
        connectedClients: clientsMatch ? parseInt(clientsMatch[1]) : 0
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      throw error
    }
  }

  /**
   * Clear all cache data (use with caution)
   */
  async clearAll(): Promise<void> {
    if (!this.connected) return

    try {
      await this.redis.flushdb()
      console.log('All cache data cleared')
    } catch (error) {
      console.error('Failed to clear cache:', error)
      throw error
    }
  }

  // Private helper methods

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis connecting...')
    })

    this.redis.on('ready', () => {
      console.log('Redis ready for commands')
      this.connected = true
    })

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error)
      this.connected = false
    })

    this.redis.on('close', () => {
      console.log('Redis connection closed')
      this.connected = false
    })

    this.redis.on('reconnecting', () => {
      console.log('Redis reconnecting...')
    })
  }

  private generateInputHash(inputData: any): string {
    // Create a deterministic hash of input data for cache key
    const inputString = JSON.stringify(inputData, Object.keys(inputData).sort())
    
    // Simple hash function - in production, consider using crypto.createHash
    let hash = 0
    for (let i = 0; i < inputString.length; i++) {
      const char = inputString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private getAgentCacheKey(agentName: string, inputHash: string, userId: string): string {
    return `agent:${agentName}:${inputHash}:${userId}`
  }

  private getSessionCacheKey(sessionId: string): string {
    return `session:${sessionId}`
  }

  private isCacheEntryValid(entry: AgentCacheEntry): boolean {
    const age = Date.now() - entry.timestamp
    const maxAge = entry.ttl * 1000 // Convert to milliseconds
    return age < maxAge
  }

  private async incrementCacheStats(category: string, operation: string): Promise<void> {
    try {
      const key = `stats:${category}:${operation}`
      await this.redis.incr(key)
      // Set expiry to prevent stats from growing indefinitely
      await this.redis.expire(key, 86400) // 24 hours
    } catch (error) {
      // Don't log stats errors to avoid noise
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ connected: boolean, latency?: number, error?: string }> {
    if (!this.connected) {
      return { connected: false, error: 'Not connected' }
    }

    try {
      const start = Date.now()
      await this.redis.ping()
      const latency = Date.now() - start
      
      return { connected: true, latency }
    } catch (error) {
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

// Export singleton instance
export const redisCache = new FACETRedisCache()

// Utility functions for cache management
export const cacheUtils = {
  /**
   * Generate context hash for orchestration caching
   */
  generateContextHash(message: string, userId: string, preferences?: any): string {
    const context = {
      messageLength: message.length,
      messageType: message.includes('?') ? 'question' : 'statement',
      hasEmotionalWords: /feel|sad|happy|angry|anxious|stress|worry/.test(message.toLowerCase()),
      hasCrisisWords: /hurt|suicide|die|kill|end|hopeless/.test(message.toLowerCase()),
      userId: userId.slice(-8), // Use last 8 chars for privacy
      preferences: preferences ? JSON.stringify(preferences) : null
    }
    
    const contextString = JSON.stringify(context)
    let hash = 0
    for (let i = 0; i < contextString.length; i++) {
      const char = contextString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  },

  /**
   * Determine if agent result should be cached based on content
   */
  shouldCacheAgentResult(agentName: string, inputData: any, result: AgentExecutionResult): boolean {
    // Don't cache crisis-related results for privacy/safety
    if (agentName === 'crisis_monitor' && result.result?.riskLevel === 'crisis') {
      return false
    }
    
    // Don't cache highly personalized results
    if (result.influenceOnFinalResponse > 0.9) {
      return false
    }
    
    // Cache stable emotion analysis and general therapeutic advice
    if (agentName === 'emotion_analyzer' || agentName === 'therapy_advisor') {
      return result.confidence > 0.7
    }
    
    return true
  }
}
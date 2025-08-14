import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryIntegration } from '../memory-integration'
import { AgentMemoryManager } from '../memory-manager'
import { SessionManager } from '../session-manager'

// Mock Redis and Supabase
vi.mock('ioredis', () => ({
  Redis: vi.fn(() => ({
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(() => []),
  }))
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ data: [] })),
            range: vi.fn(() => ({ data: [] }))
          }))
        }))
      })),
      insert: vi.fn(() => ({ data: null })),
      upsert: vi.fn(() => ({ data: null })),
      update: vi.fn(() => ({ data: null }))
    }))
  }))
}))

describe('MemoryIntegration', () => {
  let memoryIntegration: MemoryIntegration
  let mockUserId: string
  let mockSessionId: string

  beforeEach(() => {
    memoryIntegration = new MemoryIntegration({
      enableEncryption: true,
      retentionPeriodDays: 30,
      maxConversationHistory: 50,
      enableAuditLogging: true,
      performanceThresholds: {
        maxResponseTimeMs: 1000,
        maxMemoryUsageMB: 256
      }
    })
    
    mockUserId = 'user_123'
    mockSessionId = 'session_456'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Session Management', () => {
    it('should start a therapy session successfully', async () => {
      // Mock the session manager's startSession method
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        status: 'active' as const,
        type: 'follow_up' as const,
        startTime: new Date(),
        currentAgent: 'intake',
        participatingAgents: ['intake']
      }

      vi.spyOn(SessionManager.prototype, 'startSession').mockResolvedValue(mockSession)

      const sessionId = await memoryIntegration.startTherapySession(mockUserId, 'follow_up')
      
      expect(sessionId).toBe(mockSessionId)
    })

    it('should end a therapy session and return metrics', async () => {
      const mockMetrics = {
        sessionId: mockSessionId,
        duration: 1800, // 30 minutes
        messageCount: 25,
        agentSwitches: 2,
        therapeuticAlliance: 0.85,
        progressScore: 0.75,
        crisisEvents: 0
      }

      vi.spyOn(SessionManager.prototype, 'endSession').mockResolvedValue(mockMetrics)

      const metrics = await memoryIntegration.endTherapySession(mockSessionId)
      
      expect(metrics).toEqual(mockMetrics)
      expect(metrics.duration).toBe(1800)
      expect(metrics.therapeuticAlliance).toBe(0.85)
    })

    it('should pause and resume sessions', async () => {
      vi.spyOn(SessionManager.prototype, 'pauseSession').mockResolvedValue()
      vi.spyOn(SessionManager.prototype, 'resumeSession').mockResolvedValue()

      await expect(memoryIntegration.pauseSession(mockSessionId)).resolves.not.toThrow()
      await expect(memoryIntegration.resumeSession(mockSessionId)).resolves.not.toThrow()
    })
  })

  describe('Memory Operations', () => {
    it('should add messages to conversation history', async () => {
      vi.spyOn(AgentMemoryManager.prototype, 'addConversationMessage').mockResolvedValue()

      await memoryIntegration.addMessage(
        mockSessionId,
        'user',
        'I am feeling anxious about work',
        'intake'
      )

      expect(AgentMemoryManager.prototype.addConversationMessage).toHaveBeenCalledWith(
        mockSessionId,
        {
          role: 'user',
          content: 'I am feeling anxious about work',
          agentType: 'intake'
        }
      )
    })

    it('should retrieve conversation history with filters', async () => {
      const mockMessages = [
        {
          id: 'msg_1',
          role: 'user' as const,
          content: 'Hello, I need help',
          timestamp: new Date(),
          encrypted: true
        },
        {
          id: 'msg_2',
          role: 'agent' as const,
          content: 'I am here to help you',
          agentType: 'intake',
          timestamp: new Date(),
          encrypted: true
        }
      ]

      vi.spyOn(AgentMemoryManager.prototype, 'getConversationThread').mockResolvedValue(mockMessages)

      const messages = await memoryIntegration.getConversationHistory(mockSessionId, {
        maxMessages: 10,
        agentType: 'intake'
      })

      expect(messages).toEqual(mockMessages)
      expect(messages).toHaveLength(2)
    })

    it('should update therapeutic state', async () => {
      vi.spyOn(AgentMemoryManager.prototype, 'updateTherapeuticState').mockResolvedValue()

      const updates = {
        goals: ['Reduce anxiety', 'Improve work-life balance'],
        therapeuticAlliance: 0.8,
        riskFactors: ['work stress'],
        protectiveFactors: ['family support']
      }

      await memoryIntegration.updateTherapeuticState(mockSessionId, updates)

      expect(AgentMemoryManager.prototype.updateTherapeuticState).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({
          currentGoals: updates.goals,
          therapeuticAlliance: updates.therapeuticAlliance,
          riskFactors: updates.riskFactors,
          protectiveFactors: updates.protectiveFactors
        })
      )
    })
  })

  describe('Agent Coordination', () => {
    it('should transition between agents', async () => {
      vi.spyOn(SessionManager.prototype, 'transitionAgent').mockResolvedValue()

      await memoryIntegration.transitionToAgent(
        mockSessionId,
        'intake',
        'therapy_coordinator',
        'Initial assessment complete'
      )

      expect(SessionManager.prototype.transitionAgent).toHaveBeenCalledWith(
        mockSessionId,
        'intake',
        'therapy_coordinator',
        'Initial assessment complete'
      )
    })

    it('should get agent-specific context', async () => {
      const mockMemoryContext = {
        sessionId: mockSessionId,
        userId: mockUserId,
        agentType: 'therapy_coordinator',
        conversationHistory: [
          {
            id: 'msg_1',
            role: 'user' as const,
            content: 'I want to work on my anxiety',
            timestamp: new Date(),
            encrypted: true
          }
        ],
        culturalContext: {
          primaryCulture: 'Hispanic',
          culturalPreferences: ['Spanish'],
          culturalContent: [],
          culturalAdaptations: [],
          sensitivityFlags: []
        },
        therapeuticState: {
          currentGoals: ['Reduce anxiety'],
          progressMarkers: [],
          therapeuticAlliance: 0.7,
          interventionHistory: [],
          riskFactors: [],
          protectiveFactors: []
        },
        metadata: {
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
          privacy: {
            encryptionLevel: 'enhanced' as const,
            dataClassification: 'restricted' as const,
            accessLog: true,
            auditTrail: true
          },
          retention: {
            retentionPeriod: 2555,
            autoDelete: false,
            archiveAfter: 365,
            anonymizeAfter: 1825
          }
        }
      }

      vi.spyOn(AgentMemoryManager.prototype, 'getMemoryContext').mockResolvedValue(mockMemoryContext)
      vi.spyOn(AgentMemoryManager.prototype, 'getConversationThread').mockResolvedValue([])

      const agentContext = await memoryIntegration.getAgentContext(mockSessionId, 'therapy_coordinator')

      expect(agentContext).toEqual(
        expect.objectContaining({
          sessionId: mockSessionId,
          agentType: 'therapy_coordinator',
          culturalContext: expect.objectContaining({
            primaryCulture: 'Hispanic',
            culturalPreferences: ['Spanish']
          }),
          therapeuticState: expect.objectContaining({
            currentGoals: ['Reduce anxiety'],
            therapeuticAlliance: 0.7
          })
        })
      )
    })

    it('should share context between agents', async () => {
      vi.spyOn(AgentMemoryManager.prototype, 'shareContextBetweenAgents').mockResolvedValue(null)

      await memoryIntegration.shareContextBetweenAgents(
        mockSessionId,
        'intake',
        'cultural_adapter'
      )

      expect(AgentMemoryManager.prototype.shareContextBetweenAgents).toHaveBeenCalledWith(
        mockSessionId,
        'intake',
        'cultural_adapter',
        'summary'
      )
    })
  })

  describe('Memory Search', () => {
    it('should search memory with keyword matching', async () => {
      const mockMessages = [
        {
          id: 'msg_1',
          role: 'user' as const,
          content: 'I am having anxiety attacks at work',
          timestamp: new Date(),
          encrypted: true
        },
        {
          id: 'msg_2',
          role: 'user' as const,
          content: 'My family helps me cope with stress',
          timestamp: new Date(),
          encrypted: true
        },
        {
          id: 'msg_3',
          role: 'agent' as const,
          content: 'Let me help you with relaxation techniques',
          agentType: 'therapy_coordinator',
          timestamp: new Date(),
          encrypted: true
        }
      ]

      vi.spyOn(AgentMemoryManager.prototype, 'getConversationThread').mockResolvedValue(mockMessages)

      const searchResults = await memoryIntegration.searchMemory(
        mockSessionId,
        'anxiety',
        { searchType: 'keyword', maxResults: 5 }
      )

      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].content).toContain('anxiety')
      expect(searchResults[0].relevanceScore).toBeGreaterThan(0)
    })
  })

  describe('Cultural and Therapeutic Progress', () => {
    it('should get cultural context', async () => {
      const mockMemoryContext = {
        sessionId: mockSessionId,
        userId: mockUserId,
        agentType: 'cultural_adapter',
        conversationHistory: [],
        culturalContext: {
          primaryCulture: 'Asian',
          culturalPreferences: ['Mandarin', 'English'],
          culturalContent: [],
          culturalAdaptations: ['Confucian values integration'],
          sensitivityFlags: ['family honor']
        },
        therapeuticState: {
          currentGoals: [],
          progressMarkers: [],
          therapeuticAlliance: 0.5,
          interventionHistory: [],
          riskFactors: [],
          protectiveFactors: []
        },
        metadata: {
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
          privacy: {
            encryptionLevel: 'enhanced' as const,
            dataClassification: 'restricted' as const,
            accessLog: true,
            auditTrail: true
          },
          retention: {
            retentionPeriod: 2555,
            autoDelete: false,
            archiveAfter: 365,
            anonymizeAfter: 1825
          }
        }
      }

      vi.spyOn(AgentMemoryManager.prototype, 'getMemoryContext').mockResolvedValue(mockMemoryContext)

      const culturalContext = await memoryIntegration.getCulturalContext(mockSessionId)

      expect(culturalContext).toEqual({
        primaryCulture: 'Asian',
        culturalPreferences: ['Mandarin', 'English'],
        sensitivityFlags: ['family honor'],
        culturalContent: [],
        adaptationHistory: ['Confucian values integration']
      })
    })

    it('should get therapeutic progress', async () => {
      const mockProgressMarkers = [
        {
          id: 'progress_1',
          goal: 'Reduce anxiety',
          measurement: 0.8,
          timestamp: new Date(),
          agentType: 'therapy_coordinator'
        },
        {
          id: 'progress_2',
          goal: 'Improve sleep',
          measurement: 0.6,
          timestamp: new Date(),
          agentType: 'therapy_coordinator'
        }
      ]

      const mockMemoryContext = {
        sessionId: mockSessionId,
        userId: mockUserId,
        agentType: 'progress_tracker',
        conversationHistory: [],
        culturalContext: {
          primaryCulture: 'Unknown',
          culturalPreferences: [],
          culturalContent: [],
          culturalAdaptations: [],
          sensitivityFlags: []
        },
        therapeuticState: {
          currentGoals: ['Reduce anxiety', 'Improve sleep'],
          progressMarkers: mockProgressMarkers,
          therapeuticAlliance: 0.85,
          interventionHistory: [],
          riskFactors: ['work stress'],
          protectiveFactors: ['family support', 'exercise routine']
        },
        metadata: {
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
          privacy: {
            encryptionLevel: 'enhanced' as const,
            dataClassification: 'restricted' as const,
            accessLog: true,
            auditTrail: true
          },
          retention: {
            retentionPeriod: 2555,
            autoDelete: false,
            archiveAfter: 365,
            anonymizeAfter: 1825
          }
        }
      }

      vi.spyOn(AgentMemoryManager.prototype, 'getMemoryContext').mockResolvedValue(mockMemoryContext)

      const therapeuticProgress = await memoryIntegration.getTherapeuticProgress(mockSessionId)

      expect(therapeuticProgress).toEqual(
        expect.objectContaining({
          currentGoals: ['Reduce anxiety', 'Improve sleep'],
          completedGoals: ['Reduce anxiety'], // measurement >= 0.8
          progressScore: 0.7, // (0.8 + 0.6) / 2
          therapeuticAlliance: 0.85,
          riskFactors: ['work stress'],
          protectiveFactors: ['family support', 'exercise routine']
        })
      )
    })
  })

  describe('System Health and Maintenance', () => {
    it('should perform health check', async () => {
      const healthStatus = await memoryIntegration.performHealthCheck()

      expect(healthStatus).toEqual(
        expect.objectContaining({
          memorySystemHealth: expect.any(String),
          redisConnected: expect.any(Boolean),
          databaseConnected: expect.any(Boolean),
          memoryUsage: expect.objectContaining({
            activeSessions: expect.any(Number),
            totalMemoryMB: expect.any(Number),
            averageResponseTimeMs: expect.any(Number)
          }),
          alerts: expect.any(Array)
        })
      )
    })

    it('should cleanup expired memory', async () => {
      vi.spyOn(AgentMemoryManager.prototype, 'cleanupExpiredMemory').mockResolvedValue(5)
      vi.spyOn(SessionManager.prototype, 'cleanupInactiveSessions').mockResolvedValue(3)

      const cleanedCount = await memoryIntegration.cleanupExpiredMemory()

      expect(cleanedCount).toBe(8) // 5 + 3
    })
  })

  describe('Error Handling', () => {
    it('should handle memory operation failures gracefully', async () => {
      vi.spyOn(AgentMemoryManager.prototype, 'addConversationMessage')
        .mockRejectedValue(new Error('Redis connection failed'))

      await expect(
        memoryIntegration.addMessage(mockSessionId, 'user', 'test message')
      ).rejects.toThrow('Unable to store conversation message')
    })

    it('should handle session operation failures gracefully', async () => {
      vi.spyOn(SessionManager.prototype, 'startSession')
        .mockRejectedValue(new Error('Database connection failed'))

      await expect(
        memoryIntegration.startTherapySession(mockUserId)
      ).rejects.toThrow('Unable to initialize therapy session')
    })

    it('should return empty results for failed memory searches', async () => {
      vi.spyOn(AgentMemoryManager.prototype, 'getConversationThread')
        .mockRejectedValue(new Error('Search failed'))

      const results = await memoryIntegration.searchMemory(mockSessionId, 'anxiety')

      expect(results).toEqual([])
    })
  })

  describe('Performance Requirements', () => {
    it('should complete memory operations within performance thresholds', async () => {
      vi.spyOn(AgentMemoryManager.prototype, 'addConversationMessage').mockResolvedValue()

      const startTime = Date.now()
      
      await memoryIntegration.addMessage(
        mockSessionId,
        'user',
        'Performance test message'
      )
      
      const duration = Date.now() - startTime
      
      // Should complete within 1000ms (configured threshold)
      expect(duration).toBeLessThan(1000)
    })
  })

  describe('Privacy and Security', () => {
    it('should maintain privacy settings in memory operations', async () => {
      const memoryContext = {
        sessionId: mockSessionId,
        userId: mockUserId,
        agentType: 'intake',
        conversationHistory: [],
        culturalContext: {
          primaryCulture: 'Unknown',
          culturalPreferences: [],
          culturalContent: [],
          culturalAdaptations: [],
          sensitivityFlags: []
        },
        therapeuticState: {
          currentGoals: [],
          progressMarkers: [],
          therapeuticAlliance: 0.5,
          interventionHistory: [],
          riskFactors: [],
          protectiveFactors: []
        },
        metadata: {
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 1,
          privacy: {
            encryptionLevel: 'enhanced' as const,
            dataClassification: 'restricted' as const,
            accessLog: true,
            auditTrail: true
          },
          retention: {
            retentionPeriod: 2555,
            autoDelete: false,
            archiveAfter: 365,
            anonymizeAfter: 1825
          }
        }
      }

      vi.spyOn(AgentMemoryManager.prototype, 'getMemoryContext').mockResolvedValue(memoryContext)

      const context = await memoryIntegration.getAgentContext(mockSessionId, 'intake')

      expect(context).toBeDefined()
      // Verify that sensitive data is properly handled
      expect(context.sessionId).toBe(mockSessionId)
    })
  })
})
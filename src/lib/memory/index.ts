// Main memory integration interface
export { MemoryIntegration } from './memory-integration'
export type {
  MemoryIntegrationConfig,
  AgentMemoryInterface,
  GetHistoryOptions,
  SearchOptions,
  MemorySearchResult,
  AgentContextView,
  CulturalMemoryView,
  TherapeuticProgressView,
  TherapeuticStateUpdate,
  MemoryHealthStatus,
  MemoryAlert
} from './memory-integration'

// Core memory manager
export { AgentMemoryManager } from './memory-manager'
export type {
  MemoryContext,
  ConversationMessage,
  CulturalMemory,
  TherapeuticMemory,
  MemoryMetadata,
  PrivacySettings,
  RetentionSettings
} from './memory-manager'

// Session management
export { SessionManager } from './session-manager'
export type {
  TherapySession,
  SessionTransition,
  SessionMetrics
} from './session-manager'

// Initialize memory system with default configuration
export const createMemorySystem = (config?: Partial<MemoryIntegrationConfig>) => {
  return new MemoryIntegration(config)
}

// Default memory configuration for HIPAA compliance
export const HIPAA_MEMORY_CONFIG: MemoryIntegrationConfig = {
  enableEncryption: true,
  retentionPeriodDays: 2555, // 7 years for medical records
  maxConversationHistory: 100,
  enableAuditLogging: true,
  performanceThresholds: {
    maxResponseTimeMs: 2000,
    maxMemoryUsageMB: 512
  }
}

// Development memory configuration
export const DEV_MEMORY_CONFIG: MemoryIntegrationConfig = {
  enableEncryption: false,
  retentionPeriodDays: 30,
  maxConversationHistory: 50,
  enableAuditLogging: true,
  performanceThresholds: {
    maxResponseTimeMs: 1000,
    maxMemoryUsageMB: 256
  }
}

// Memory system health check utility
export const checkMemorySystemHealth = async (memorySystem: MemoryIntegration) => {
  const health = await memorySystem.performHealthCheck()
  
  if (health.memorySystemHealth === 'critical') {
    console.error('Memory system is in critical state:', health.alerts)
    return false
  }
  
  if (health.memorySystemHealth === 'degraded') {
    console.warn('Memory system is degraded:', health.alerts)
  }
  
  return true
}

// Memory cleanup utility
export const performMemoryMaintenance = async (memorySystem: MemoryIntegration) => {
  try {
    const cleanedCount = await memorySystem.cleanupExpiredMemory()
    console.log(`Memory maintenance completed. Cleaned up ${cleanedCount} expired items.`)
    return cleanedCount
  } catch (error) {
    console.error('Memory maintenance failed:', error)
    return 0
  }
}
/**
 * FACET Security Audit Logging System
 * 
 * Comprehensive audit logging for security events, compliance tracking,
 * and forensic analysis. All security-related activities are logged
 * for monitoring, alerting, and regulatory compliance.
 * 
 * CRITICAL: This system MUST log all security events to ensure
 * complete audit trail for compliance and incident response.
 */

import { encryptionService } from './encryption-service'

// Audit event types
type AuditEventType = 
  | 'authentication_attempt'
  | 'authentication_success'
  | 'authentication_failure'
  | 'authorization_check'
  | 'input_validation_failure'
  | 'security_threat_detected'
  | 'rate_limit_exceeded'
  | 'data_access'
  | 'data_modification'
  | 'encryption_key_rotation'
  | 'crisis_protocol_triggered'
  | 'professional_referral_made'
  | 'emergency_contact_triggered'
  | 'gdpr_request'
  | 'data_export'
  | 'data_deletion'
  | 'system_configuration_change'
  | 'agent_orchestration_start'
  | 'agent_orchestration_complete'
  | 'conversation_message_stored'
  | 'conversation_message_accessed'

// Risk and compliance levels
type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
type ComplianceCategory = 'gdpr' | 'hipaa' | 'security' | 'therapeutic' | 'operational'

// Audit log entry structure
interface AuditLogEntry {
  // Core identification
  eventId: string
  timestamp: string
  eventType: AuditEventType
  
  // User and session context
  userId?: string
  sessionId?: string
  clientIP: string
  userAgent: string
  
  // Request context
  endpoint?: string
  method?: string
  conversationId?: string
  messageId?: string
  
  // Security context
  riskLevel: RiskLevel
  complianceCategories: ComplianceCategory[]
  securityFlags: string[]
  
  // Event details
  action: string
  description: string
  outcome: 'success' | 'failure' | 'blocked' | 'warning'
  
  // Data and metadata
  eventData: any
  sensitiveDataIndicators: string[]
  
  // Performance and timing
  processingTimeMs?: number
  
  // Compliance and legal
  dataRetentionCategory: 'standard' | 'extended' | 'legal_hold'
  complianceNotes?: string
  
  // Error and investigation
  errorCode?: string
  errorMessage?: string
  investigationRequired: boolean
  
  // Correlation and context
  correlationId?: string
  parentEventId?: string
  relatedEventIds: string[]
}

// Audit search and filtering
interface AuditSearchCriteria {
  userId?: string
  eventTypes?: AuditEventType[]
  riskLevels?: RiskLevel[]
  complianceCategories?: ComplianceCategory[]
  dateFrom?: string
  dateTo?: string
  clientIP?: string
  investigationRequired?: boolean
  limit?: number
  offset?: number
}

// Audit analytics
interface AuditAnalytics {
  totalEvents: number
  eventsByType: Record<AuditEventType, number>
  eventsByRiskLevel: Record<RiskLevel, number>
  eventsByOutcome: Record<string, number>
  investigationRequiredCount: number
  topUsersByEvents: Array<{ userId: string, eventCount: number }>
  topIPsByEvents: Array<{ clientIP: string, eventCount: number }>
  complianceMetrics: {
    gdprEvents: number
    hipaaEvents: number
    securityIncidents: number
    dataAccessEvents: number
    dataModificationEvents: number
  }
  timeSeriesData: Array<{
    date: string
    eventCount: number
    riskDistribution: Record<RiskLevel, number>
  }>
}

export class FACETAuditLogger {
  private auditLogs: AuditLogEntry[] = []
  private retentionPolicies = {
    standard: 365 * 24 * 60 * 60 * 1000,      // 1 year
    extended: 7 * 365 * 24 * 60 * 60 * 1000,  // 7 years
    legal_hold: Infinity                        // Indefinite
  }
  
  /**
   * Log authentication events
   */
  async logAuthenticationEvent(
    eventType: 'authentication_attempt' | 'authentication_success' | 'authentication_failure',
    userId: string,
    clientIP: string,
    userAgent: string,
    details: {
      method?: string
      reason?: string
      sessionId?: string
    }
  ): Promise<void> {
    const riskLevel: RiskLevel = eventType === 'authentication_failure' ? 'medium' : 'low'
    
    await this.logEvent({
      eventType,
      userId: eventType === 'authentication_success' ? userId : undefined,
      clientIP,
      userAgent,
      riskLevel,
      complianceCategories: ['security'],
      securityFlags: eventType === 'authentication_failure' ? ['auth_failure'] : [],
      action: `User ${eventType.replace('_', ' ')}`,
      description: `Authentication ${eventType.split('_')[1]} for user ${userId}`,
      outcome: eventType === 'authentication_success' ? 'success' : 'failure',
      eventData: details,
      sensitiveDataIndicators: ['user_credentials'],
      dataRetentionCategory: 'standard',
      investigationRequired: eventType === 'authentication_failure',
      sessionId: details.sessionId,
      errorMessage: eventType === 'authentication_failure' ? details.reason : undefined
    })
  }
  
  /**
   * Log security threat detection
   */
  async logSecurityThreat(
    threatType: string,
    riskLevel: RiskLevel,
    userId: string | undefined,
    clientIP: string,
    userAgent: string,
    details: {
      endpoint?: string
      method?: string
      threatDetails: any
      securityFlags: string[]
      blocked: boolean
      action: string
    }
  ): Promise<void> {
    await this.logEvent({
      eventType: 'security_threat_detected',
      userId,
      clientIP,
      userAgent,
      endpoint: details.endpoint,
      method: details.method,
      riskLevel,
      complianceCategories: ['security'],
      securityFlags: details.securityFlags,
      action: `Security threat detected: ${threatType}`,
      description: `${threatType} detected from ${clientIP}: ${details.action}`,
      outcome: details.blocked ? 'blocked' : 'warning',
      eventData: {
        threatType,
        threatDetails: details.threatDetails,
        mitigationAction: details.blocked ? 'request_blocked' : 'logged_for_monitoring'
      },
      sensitiveDataIndicators: ['security_threat_data'],
      dataRetentionCategory: 'extended',
      investigationRequired: riskLevel === 'critical' || riskLevel === 'high'
    })
  }
  
  /**
   * Log conversation and therapeutic events
   */
  async logTherapeuticEvent(
    eventType: 'agent_orchestration_start' | 'agent_orchestration_complete' | 'conversation_message_stored',
    userId: string,
    conversationId: string,
    messageId: string,
    details: {
      clientIP: string
      userAgent: string
      riskLevel?: RiskLevel
      securityFlags?: string[]
      orchestrationData?: any
      processingTimeMs?: number
      agentsInvolved?: string[]
      emergencyProtocolTriggered?: boolean
      professionalReferralMade?: boolean
    }
  ): Promise<void> {
    const riskLevel = details.riskLevel || 'low'
    const complianceCategories: ComplianceCategory[] = ['therapeutic', 'gdpr']
    if (details.emergencyProtocolTriggered) complianceCategories.push('hipaa')
    
    await this.logEvent({
      eventType,
      userId,
      clientIP: details.clientIP,
      userAgent: details.userAgent,
      conversationId,
      messageId,
      riskLevel,
      complianceCategories,
      securityFlags: details.securityFlags || [],
      action: this.getTherapeuticEventAction(eventType),
      description: this.getTherapeuticEventDescription(eventType, details),
      outcome: 'success',
      eventData: {
        orchestrationData: details.orchestrationData,
        agentsInvolved: details.agentsInvolved,
        emergencyProtocolTriggered: details.emergencyProtocolTriggered,
        professionalReferralMade: details.professionalReferralMade
      },
      sensitiveDataIndicators: ['therapeutic_content', 'personal_health_info'],
      processingTimeMs: details.processingTimeMs,
      dataRetentionCategory: 'extended',
      investigationRequired: details.emergencyProtocolTriggered || false
    })
  }
  
  /**
   * Log GDPR compliance events
   */
  async logGDPREvent(
    action: 'data_export' | 'data_deletion' | 'gdpr_request',
    userId: string,
    clientIP: string,
    details: {
      requestType?: string
      dataTypes?: string[]
      requestReason?: string
      userAgent: string
      outcome: 'success' | 'failure'
      errorMessage?: string
    }
  ): Promise<void> {
    await this.logEvent({
      eventType: 'gdpr_request',
      userId,
      clientIP,
      userAgent: details.userAgent,
      riskLevel: 'medium',
      complianceCategories: ['gdpr'],
      securityFlags: [],
      action: `GDPR ${action.replace('_', ' ')}`,
      description: `User ${userId} requested ${action}: ${details.requestType || 'general'}`,
      outcome: details.outcome,
      eventData: {
        requestType: details.requestType,
        dataTypes: details.dataTypes,
        requestReason: details.requestReason,
        processingDetails: 'GDPR compliance processing'
      },
      sensitiveDataIndicators: ['personal_data', 'gdpr_request'],
      dataRetentionCategory: 'legal_hold',
      investigationRequired: details.outcome === 'failure',
      errorMessage: details.errorMessage
    })
  }
  
  /**
   * Log crisis intervention events
   */
  async logCrisisEvent(
    action: 'crisis_protocol_triggered' | 'professional_referral_made' | 'emergency_contact_triggered',
    userId: string,
    conversationId: string,
    clientIP: string,
    details: {
      riskLevel: RiskLevel
      interventionType: string
      professionalContacted?: boolean
      emergencyServices?: boolean
      userAgent: string
      triggerDetails: any
    }
  ): Promise<void> {
    await this.logEvent({
      eventType: action,
      userId,
      clientIP,
      userAgent: details.userAgent,
      conversationId,
      riskLevel: details.riskLevel,
      complianceCategories: ['therapeutic', 'hipaa', 'security'],
      securityFlags: ['crisis_intervention'],
      action: `Crisis intervention: ${action.replace('_', ' ')}`,
      description: `Crisis intervention ${details.interventionType} activated for user ${userId}`,
      outcome: 'success',
      eventData: {
        interventionType: details.interventionType,
        professionalContacted: details.professionalContacted,
        emergencyServices: details.emergencyServices,
        triggerDetails: details.triggerDetails,
        protocolCompliance: 'Crisis intervention protocol followed'
      },
      sensitiveDataIndicators: ['crisis_data', 'mental_health_emergency'],
      dataRetentionCategory: 'legal_hold',
      investigationRequired: true,
      complianceNotes: 'Crisis intervention event - requires professional review'
    })
  }
  
  /**
   * Log data access events
   */
  async logDataAccess(
    userId: string,
    dataType: string,
    action: 'read' | 'modify' | 'delete',
    clientIP: string,
    userAgent: string,
    details: {
      endpoint?: string
      success: boolean
      dataSize?: number
      encryptionUsed: boolean
      errorMessage?: string
    }
  ): Promise<void> {
    await this.logEvent({
      eventType: action === 'read' ? 'data_access' : 'data_modification',
      userId,
      clientIP,
      userAgent,
      endpoint: details.endpoint,
      riskLevel: action === 'delete' ? 'high' : 'medium',
      complianceCategories: ['gdpr', 'security'],
      securityFlags: details.encryptionUsed ? [] : ['unencrypted_access'],
      action: `Data ${action} - ${dataType}`,
      description: `User ${userId} ${action} ${dataType} data`,
      outcome: details.success ? 'success' : 'failure',
      eventData: {
        dataType,
        dataSize: details.dataSize,
        encryptionUsed: details.encryptionUsed,
        accessMethod: 'API endpoint'
      },
      sensitiveDataIndicators: [dataType, 'personal_data'],
      dataRetentionCategory: 'extended',
      investigationRequired: !details.success || action === 'delete',
      errorMessage: details.errorMessage
    })
  }
  
  /**
   * Search audit logs
   */
  async searchAuditLogs(criteria: AuditSearchCriteria): Promise<{
    logs: AuditLogEntry[]
    totalCount: number
    hasMore: boolean
  }> {
    let filteredLogs = this.auditLogs
    
    // Apply filters
    if (criteria.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === criteria.userId)
    }
    
    if (criteria.eventTypes) {
      filteredLogs = filteredLogs.filter(log => criteria.eventTypes!.includes(log.eventType))
    }
    
    if (criteria.riskLevels) {
      filteredLogs = filteredLogs.filter(log => criteria.riskLevels!.includes(log.riskLevel))
    }
    
    if (criteria.complianceCategories) {
      filteredLogs = filteredLogs.filter(log => 
        log.complianceCategories.some(cat => criteria.complianceCategories!.includes(cat))
      )
    }
    
    if (criteria.dateFrom) {
      const fromDate = new Date(criteria.dateFrom).getTime()
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() >= fromDate)
    }
    
    if (criteria.dateTo) {
      const toDate = new Date(criteria.dateTo).getTime()
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() <= toDate)
    }
    
    if (criteria.clientIP) {
      filteredLogs = filteredLogs.filter(log => log.clientIP === criteria.clientIP)
    }
    
    if (criteria.investigationRequired !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.investigationRequired === criteria.investigationRequired)
    }
    
    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    const totalCount = filteredLogs.length
    const offset = criteria.offset || 0
    const limit = criteria.limit || 100
    
    const paginatedLogs = filteredLogs.slice(offset, offset + limit)
    const hasMore = offset + limit < totalCount
    
    return {
      logs: paginatedLogs,
      totalCount,
      hasMore
    }
  }
  
  /**
   * Get audit analytics
   */
  getAuditAnalytics(days: number = 30): AuditAnalytics {
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
    const recentLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp) >= cutoffDate
    )
    
    // Event counts by type
    const eventsByType = recentLogs.reduce((acc, log) => {
      acc[log.eventType] = (acc[log.eventType] || 0) + 1
      return acc
    }, {} as Record<AuditEventType, number>)
    
    // Risk level distribution
    const eventsByRiskLevel = recentLogs.reduce((acc, log) => {
      acc[log.riskLevel] = (acc[log.riskLevel] || 0) + 1
      return acc
    }, {} as Record<RiskLevel, number>)
    
    // Outcome distribution
    const eventsByOutcome = recentLogs.reduce((acc, log) => {
      acc[log.outcome] = (acc[log.outcome] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Top users by event count
    const userEventCounts = recentLogs.reduce((acc, log) => {
      if (log.userId) {
        acc[log.userId] = (acc[log.userId] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
    
    const topUsersByEvents = Object.entries(userEventCounts)
      .map(([userId, eventCount]) => ({ userId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10)
    
    // Top IPs by event count
    const ipEventCounts = recentLogs.reduce((acc, log) => {
      acc[log.clientIP] = (acc[log.clientIP] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const topIPsByEvents = Object.entries(ipEventCounts)
      .map(([clientIP, eventCount]) => ({ clientIP, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10)
    
    // Compliance metrics
    const complianceMetrics = {
      gdprEvents: recentLogs.filter(log => log.complianceCategories.includes('gdpr')).length,
      hipaaEvents: recentLogs.filter(log => log.complianceCategories.includes('hipaa')).length,
      securityIncidents: recentLogs.filter(log => log.riskLevel === 'critical' || log.riskLevel === 'high').length,
      dataAccessEvents: recentLogs.filter(log => log.eventType === 'data_access').length,
      dataModificationEvents: recentLogs.filter(log => log.eventType === 'data_modification').length
    }
    
    return {
      totalEvents: recentLogs.length,
      eventsByType,
      eventsByRiskLevel,
      eventsByOutcome,
      investigationRequiredCount: recentLogs.filter(log => log.investigationRequired).length,
      topUsersByEvents,
      topIPsByEvents,
      complianceMetrics,
      timeSeriesData: [] // Would be populated with daily aggregations
    }
  }
  
  /**
   * Clean up expired audit logs based on retention policies
   */
  async cleanupExpiredLogs(): Promise<{
    deletedCount: number
    retainedCount: number
    cleanupErrors: string[]
  }> {
    const now = Date.now()
    const errors: string[] = []
    let deletedCount = 0
    
    this.auditLogs = this.auditLogs.filter(log => {
      try {
        const logAge = now - new Date(log.timestamp).getTime()
        const retentionPeriod = this.retentionPolicies[log.dataRetentionCategory]
        
        if (logAge > retentionPeriod) {
          deletedCount++
          return false
        }
        return true
      } catch (error) {
        errors.push(`Error processing log ${log.eventId}: ${error}`)
        return true // Keep log on error
      }
    })
    
    return {
      deletedCount,
      retainedCount: this.auditLogs.length,
      cleanupErrors: errors
    }
  }
  
  // Private helper methods
  
  private async logEvent(eventData: Omit<AuditLogEntry, 'eventId' | 'timestamp' | 'relatedEventIds'>): Promise<void> {
    const auditLog: AuditLogEntry = {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      relatedEventIds: [],
      ...eventData
    }
    
    // Store the audit log
    this.auditLogs.push(auditLog)
    
    // Keep only last 10,000 logs in memory (in production, would store in database)
    if (this.auditLogs.length > 10000) {
      this.auditLogs.shift()
    }
    
    // Log to console for immediate visibility
    if (auditLog.riskLevel === 'critical' || auditLog.investigationRequired) {
      console.error('CRITICAL AUDIT EVENT:', {
        eventId: auditLog.eventId,
        eventType: auditLog.eventType,
        action: auditLog.action,
        riskLevel: auditLog.riskLevel,
        userId: auditLog.userId,
        clientIP: auditLog.clientIP
      })
    } else if (auditLog.riskLevel === 'high') {
      console.warn('HIGH RISK AUDIT EVENT:', {
        eventId: auditLog.eventId,
        eventType: auditLog.eventType,
        action: auditLog.action
      })
    } else {
      console.log('Audit Event:', {
        eventId: auditLog.eventId,
        eventType: auditLog.eventType,
        outcome: auditLog.outcome
      })
    }
  }
  
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
  
  private getTherapeuticEventAction(eventType: string): string {
    switch (eventType) {
      case 'agent_orchestration_start':
        return 'AI agent orchestration initiated'
      case 'agent_orchestration_complete':
        return 'AI agent orchestration completed'
      case 'conversation_message_stored':
        return 'Therapeutic conversation stored'
      default:
        return 'Therapeutic event'
    }
  }
  
  private getTherapeuticEventDescription(eventType: string, details: any): string {
    switch (eventType) {
      case 'agent_orchestration_start':
        return `Multi-agent therapeutic system initiated for user interaction`
      case 'agent_orchestration_complete':
        return `Multi-agent therapeutic response generated (${details.processingTimeMs}ms)`
      case 'conversation_message_stored':
        return `Therapeutic conversation securely stored with encryption`
      default:
        return 'Therapeutic system event'
    }
  }
}

// Export singleton instance
export const auditLogger = new FACETAuditLogger()

// Export types
export type { 
  AuditLogEntry, 
  AuditEventType, 
  RiskLevel, 
  ComplianceCategory,
  AuditSearchCriteria,
  AuditAnalytics
}
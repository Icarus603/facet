/**
 * FACET Data Retention and Lifecycle Management
 * 
 * Automated data retention policy enforcement, lifecycle management,
 * and compliance with GDPR data minimization principles.
 * 
 * CRITICAL: Implements GDPR Article 5(1)(e) - data minimization and
 * storage limitation principles for mental health data.
 */

import { auditLogger } from '@/lib/security/audit-logger'
import { encryptionService } from '@/lib/security/encryption-service'
import { createClient } from '@/lib/supabase/client'

// Data retention policies
interface RetentionPolicy {
  dataCategory: string
  retentionPeriod: number          // Days
  automaticDeletion: boolean
  anonymizationAllowed: boolean
  legalBasisForRetention: string
  
  // Special considerations
  userControlled: boolean          // User can request earlier deletion
  legalHoldExempt: boolean        // Can be held longer for legal reasons
  minimumRetention?: number       // Minimum days (for legal compliance)
  maximumRetention?: number       // Maximum days (for data minimization)
  
  // Lifecycle stages
  stages: RetentionStage[]
}

interface RetentionStage {
  stage: 'active' | 'archived' | 'anonymized' | 'deleted'
  triggerAfterDays: number
  description: string
  actions: string[]
  reversible: boolean
  userNotification: boolean
}

// Data lifecycle record
interface DataLifecycleRecord {
  recordId: string
  userId: string
  dataCategory: string
  dataType: string
  
  // Lifecycle tracking
  createdAt: string
  lastAccessedAt: string
  scheduledDeletionAt: string
  actualDeletionAt?: string
  
  // Retention status
  currentStage: 'active' | 'archived' | 'anonymized' | 'deleted'
  retentionPolicyApplied: string
  userRequestedDeletion: boolean
  legalHoldActive: boolean
  
  // Compliance tracking
  gdprBasis: string
  retentionReason: string
  anonymizationEligible: boolean
  deletionEligible: boolean
  
  // Metadata
  dataSize: number
  encryptionStatus: boolean
  lastModifiedAt: string
  accessCount: number
}

// Retention enforcement result
interface RetentionEnforcementResult {
  totalRecordsProcessed: number
  recordsDeleted: number
  recordsAnonymized: number
  recordsArchived: number
  recordsRetained: number
  
  // Compliance metrics
  gdprComplianceAchieved: boolean
  dataMinimizationApplied: boolean
  userNotificationsSent: number
  
  // Details
  processingErrors: string[]
  policyViolations: string[]
  legalHoldsRespected: number
  
  // Timing
  processingStartTime: string
  processingEndTime: string
  totalProcessingTimeMs: number
}

export class DataRetentionManager {
  private supabase = createClient()
  private retentionPolicies: Map<string, RetentionPolicy> = new Map()
  private lifecycleRecords: DataLifecycleRecord[] = []
  
  constructor() {
    this.initializeRetentionPolicies()
  }
  
  /**
   * Initialize default retention policies for mental health data
   */
  private initializeRetentionPolicies(): void {
    // Therapeutic conversations - 7 years (medical records standard)
    this.retentionPolicies.set('therapeutic_conversations', {
      dataCategory: 'therapeutic_conversations',
      retentionPeriod: 2555, // 7 years
      automaticDeletion: true,
      anonymizationAllowed: true,
      legalBasisForRetention: 'Medical records retention requirement',
      userControlled: true,
      legalHoldExempt: false,
      minimumRetention: 1095, // 3 years minimum
      maximumRetention: 3650, // 10 years maximum
      stages: [
        {
          stage: 'active',
          triggerAfterDays: 0,
          description: 'Active therapeutic data available for AI processing',
          actions: ['full_access', 'ai_processing', 'analytics'],
          reversible: true,
          userNotification: false
        },
        {
          stage: 'archived',
          triggerAfterDays: 1095, // 3 years
          description: 'Archived for reference and legal compliance',
          actions: ['limited_access', 'legal_compliance'],
          reversible: true,
          userNotification: true
        },
        {
          stage: 'anonymized',
          triggerAfterDays: 2190, // 6 years
          description: 'Anonymized for research and improvement',
          actions: ['anonymization', 'research_use'],
          reversible: false,
          userNotification: true
        },
        {
          stage: 'deleted',
          triggerAfterDays: 2555, // 7 years
          description: 'Permanently deleted',
          actions: ['secure_deletion', 'audit_log'],
          reversible: false,
          userNotification: true
        }
      ]
    })
    
    // Crisis assessments - 10 years (legal requirement)
    this.retentionPolicies.set('crisis_assessments', {
      dataCategory: 'crisis_assessments',
      retentionPeriod: 3650, // 10 years
      automaticDeletion: false,
      anonymizationAllowed: false,
      legalBasisForRetention: 'Legal obligation for crisis intervention records',
      userControlled: false,
      legalHoldExempt: true,
      minimumRetention: 3650, // 10 years minimum
      stages: [
        {
          stage: 'active',
          triggerAfterDays: 0,
          description: 'Active crisis assessment data',
          actions: ['full_access', 'professional_review'],
          reversible: true,
          userNotification: false
        },
        {
          stage: 'archived',
          triggerAfterDays: 1095, // 3 years
          description: 'Archived crisis records for legal compliance',
          actions: ['legal_access_only'],
          reversible: false,
          userNotification: false
        },
        {
          stage: 'deleted',
          triggerAfterDays: 3650, // 10 years
          description: 'Securely deleted after legal retention period',
          actions: ['secure_deletion', 'audit_log'],
          reversible: false,
          userNotification: false
        }
      ]
    })
    
    // User profile data - Account lifetime + 3 years
    this.retentionPolicies.set('user_profile', {
      dataCategory: 'user_profile',
      retentionPeriod: 1095, // 3 years after account closure
      automaticDeletion: true,
      anonymizationAllowed: true,
      legalBasisForRetention: 'Contract performance and legal compliance',
      userControlled: true,
      legalHoldExempt: false,
      minimumRetention: 30, // 30 days minimum
      stages: [
        {
          stage: 'active',
          triggerAfterDays: 0,
          description: 'Active user profile during account lifetime',
          actions: ['full_access', 'personalization'],
          reversible: true,
          userNotification: false
        },
        {
          stage: 'archived',
          triggerAfterDays: 30, // 30 days after account closure
          description: 'Archived for potential account recovery',
          actions: ['limited_access', 'account_recovery'],
          reversible: true,
          userNotification: true
        },
        {
          stage: 'anonymized',
          triggerAfterDays: 365, // 1 year after account closure
          description: 'Anonymized for analytics and improvement',
          actions: ['anonymization', 'analytics'],
          reversible: false,
          userNotification: true
        },
        {
          stage: 'deleted',
          triggerAfterDays: 1095, // 3 years after account closure
          description: 'Permanently deleted',
          actions: ['secure_deletion'],
          reversible: false,
          userNotification: false
        }
      ]
    })
    
    // Usage analytics - 2 years
    this.retentionPolicies.set('usage_analytics', {
      dataCategory: 'usage_analytics',
      retentionPeriod: 730, // 2 years
      automaticDeletion: true,
      anonymizationAllowed: true,
      legalBasisForRetention: 'Legitimate interests for service improvement',
      userControlled: true,
      legalHoldExempt: false,
      stages: [
        {
          stage: 'active',
          triggerAfterDays: 0,
          description: 'Active analytics data for personalization',
          actions: ['analytics', 'personalization'],
          reversible: true,
          userNotification: false
        },
        {
          stage: 'anonymized',
          triggerAfterDays: 365, // 1 year
          description: 'Anonymized for trend analysis',
          actions: ['anonymization', 'trend_analysis'],
          reversible: false,
          userNotification: false
        },
        {
          stage: 'deleted',
          triggerAfterDays: 730, // 2 years
          description: 'Permanently deleted',
          actions: ['secure_deletion'],
          reversible: false,
          userNotification: false
        }
      ]
    })
    
    console.log(`Initialized ${this.retentionPolicies.size} data retention policies`)
  }
  
  /**
   * Register data for lifecycle management
   */
  async registerDataForRetention(
    userId: string,
    dataCategory: string,
    dataType: string,
    dataSize: number,
    gdprBasis: string
  ): Promise<string> {
    const recordId = this.generateRecordId()
    const policy = this.retentionPolicies.get(dataCategory)
    
    if (!policy) {
      throw new Error(`No retention policy found for data category: ${dataCategory}`)
    }
    
    const now = new Date()
    const scheduledDeletion = new Date(now.getTime() + (policy.retentionPeriod * 24 * 60 * 60 * 1000))
    
    const lifecycleRecord: DataLifecycleRecord = {
      recordId,
      userId,
      dataCategory,
      dataType,
      createdAt: now.toISOString(),
      lastAccessedAt: now.toISOString(),
      scheduledDeletionAt: scheduledDeletion.toISOString(),
      currentStage: 'active',
      retentionPolicyApplied: dataCategory,
      userRequestedDeletion: false,
      legalHoldActive: false,
      gdprBasis,
      retentionReason: policy.legalBasisForRetention,
      anonymizationEligible: policy.anonymizationAllowed,
      deletionEligible: policy.userControlled,
      dataSize,
      encryptionStatus: true,
      lastModifiedAt: now.toISOString(),
      accessCount: 0
    }
    
    this.lifecycleRecords.push(lifecycleRecord)
    
    console.log(`Registered data for retention: ${recordId} (${dataCategory})`)
    return recordId
  }
  
  /**
   * Enforce retention policies across all data
   */
  async enforceRetentionPolicies(): Promise<RetentionEnforcementResult> {
    const startTime = new Date()
    
    let totalRecordsProcessed = 0
    let recordsDeleted = 0
    let recordsAnonymized = 0
    let recordsArchived = 0
    let recordsRetained = 0
    let userNotificationsSent = 0
    
    const processingErrors: string[] = []
    const policyViolations: string[] = []
    let legalHoldsRespected = 0
    
    try {
      for (const record of this.lifecycleRecords) {
        totalRecordsProcessed++
        
        try {
          // Skip if legal hold is active
          if (record.legalHoldActive) {
            legalHoldsRespected++
            recordsRetained++
            continue
          }
          
          // Get retention policy
          const policy = this.retentionPolicies.get(record.dataCategory)
          if (!policy) {
            processingErrors.push(`No policy found for ${record.dataCategory}`)
            continue
          }
          
          // Calculate data age
          const dataAge = Date.now() - new Date(record.createdAt).getTime()
          const dataAgeDays = dataAge / (24 * 60 * 60 * 1000)
          
          // Determine current stage
          const currentStage = this.determineCurrentStage(policy, dataAgeDays)
          
          if (currentStage !== record.currentStage) {
            // Stage transition needed
            const result = await this.transitionDataStage(record, currentStage, policy)
            
            if (result.success) {
              switch (currentStage) {
                case 'deleted':
                  recordsDeleted++
                  break
                case 'anonymized':
                  recordsAnonymized++
                  break
                case 'archived':
                  recordsArchived++
                  break
                default:
                  recordsRetained++
              }
              
              if (result.userNotified) {
                userNotificationsSent++
              }
            } else {
              processingErrors.push(`Failed to transition ${record.recordId}: ${result.error}`)
            }
          } else {
            recordsRetained++
          }
          
        } catch (error) {
          processingErrors.push(`Error processing ${record.recordId}: ${error}`)
        }
      }
      
      const endTime = new Date()
      const totalProcessingTimeMs = endTime.getTime() - startTime.getTime()
      
      // Audit log for retention enforcement
      await auditLogger.logGDPREvent(
        'gdpr_request',
        'system',
        'system',
        {
          requestType: 'retention_enforcement',
          userAgent: 'system',
          outcome: 'success'
        }
      )
      
      const result: RetentionEnforcementResult = {
        totalRecordsProcessed,
        recordsDeleted,
        recordsAnonymized,
        recordsArchived,
        recordsRetained,
        gdprComplianceAchieved: processingErrors.length === 0,
        dataMinimizationApplied: recordsDeleted > 0 || recordsAnonymized > 0,
        userNotificationsSent,
        processingErrors,
        policyViolations,
        legalHoldsRespected,
        processingStartTime: startTime.toISOString(),
        processingEndTime: endTime.toISOString(),
        totalProcessingTimeMs
      }
      
      console.log('Retention policy enforcement completed:', {
        processed: totalRecordsProcessed,
        deleted: recordsDeleted,
        anonymized: recordsAnonymized,
        archived: recordsArchived,
        retained: recordsRetained,
        errors: processingErrors.length
      })
      
      return result
      
    } catch (error) {
      console.error('Retention policy enforcement failed:', error)
      throw error
    }
  }
  
  /**
   * Request immediate data deletion for user
   */
  async requestUserDataDeletion(
    userId: string,
    dataCategories?: string[]
  ): Promise<{ deletedRecords: number, retainedRecords: number, errors: string[] }> {
    const userRecords = this.lifecycleRecords.filter(record => record.userId === userId)
    
    let deletedRecords = 0
    let retainedRecords = 0
    const errors: string[] = []
    
    for (const record of userRecords) {
      // Check if data category is requested for deletion
      if (dataCategories && !dataCategories.includes(record.dataCategory)) {
        continue
      }
      
      try {
        const policy = this.retentionPolicies.get(record.dataCategory)
        if (!policy) {
          errors.push(`No policy found for ${record.dataCategory}`)
          continue
        }
        
        // Check if user-controlled deletion is allowed
        if (!policy.userControlled) {
          retainedRecords++
          errors.push(`User deletion not allowed for ${record.dataCategory}`)
          continue
        }
        
        // Check legal hold
        if (record.legalHoldActive) {
          retainedRecords++
          errors.push(`Legal hold prevents deletion of ${record.recordId}`)
          continue
        }
        
        // Check minimum retention period
        if (policy.minimumRetention) {
          const dataAge = Date.now() - new Date(record.createdAt).getTime()
          const dataAgeDays = dataAge / (24 * 60 * 60 * 1000)
          
          if (dataAgeDays < policy.minimumRetention) {
            retainedRecords++
            errors.push(`Minimum retention period not met for ${record.recordId}`)
            continue
          }
        }
        
        // Perform deletion
        const result = await this.deleteDataRecord(record)
        if (result.success) {
          deletedRecords++
          record.userRequestedDeletion = true
          record.currentStage = 'deleted'
          record.actualDeletionAt = new Date().toISOString()
        } else {
          errors.push(`Deletion failed for ${record.recordId}: ${result.error}`)
          retainedRecords++
        }
        
      } catch (error) {
        errors.push(`Error processing ${record.recordId}: ${error}`)
        retainedRecords++
      }
    }
    
    // Audit log for user-requested deletion
    await auditLogger.logGDPREvent(
      'data_deletion',
      userId,
      'user_request',
      {
        requestType: 'user_data_deletion',
        dataTypes: dataCategories,
        userAgent: 'user_request',
        outcome: 'success'
      }
    )
    
    return { deletedRecords, retainedRecords, errors }
  }
  
  /**
   * Get retention status for user data
   */
  async getUserRetentionStatus(userId: string): Promise<{
    totalRecords: number
    recordsByCategory: Record<string, number>
    recordsByStage: Record<string, number>
    upcomingActions: Array<{
      recordId: string
      dataCategory: string
      nextAction: string
      scheduledDate: string
    }>
    deletionEligible: number
    legalHoldsActive: number
  }> {
    const userRecords = this.lifecycleRecords.filter(record => record.userId === userId)
    
    const recordsByCategory: Record<string, number> = {}
    const recordsByStage: Record<string, number> = {}
    const upcomingActions: any[] = []
    
    let deletionEligible = 0
    let legalHoldsActive = 0
    
    for (const record of userRecords) {
      // Count by category
      recordsByCategory[record.dataCategory] = (recordsByCategory[record.dataCategory] || 0) + 1
      
      // Count by stage
      recordsByStage[record.currentStage] = (recordsByStage[record.currentStage] || 0) + 1
      
      // Check eligibility
      if (record.deletionEligible && !record.legalHoldActive) {
        deletionEligible++
      }
      
      if (record.legalHoldActive) {
        legalHoldsActive++
      }
      
      // Calculate upcoming actions
      const policy = this.retentionPolicies.get(record.dataCategory)
      if (policy) {
        const dataAge = Date.now() - new Date(record.createdAt).getTime()
        const dataAgeDays = dataAge / (24 * 60 * 60 * 1000)
        
        const nextStage = this.getNextStage(policy, dataAgeDays)
        if (nextStage) {
          upcomingActions.push({
            recordId: record.recordId,
            dataCategory: record.dataCategory,
            nextAction: nextStage.stage,
            scheduledDate: new Date(
              new Date(record.createdAt).getTime() + 
              (nextStage.triggerAfterDays * 24 * 60 * 60 * 1000)
            ).toISOString()
          })
        }
      }
    }
    
    return {
      totalRecords: userRecords.length,
      recordsByCategory,
      recordsByStage,
      upcomingActions: upcomingActions.sort((a, b) => 
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      ),
      deletionEligible,
      legalHoldsActive
    }
  }
  
  // Private helper methods
  
  private generateRecordId(): string {
    return `retention_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
  
  private determineCurrentStage(policy: RetentionPolicy, dataAgeDays: number): 'active' | 'archived' | 'anonymized' | 'deleted' {
    // Find the appropriate stage based on data age
    let currentStage: 'active' | 'archived' | 'anonymized' | 'deleted' = 'active'
    
    for (const stage of policy.stages) {
      if (dataAgeDays >= stage.triggerAfterDays) {
        currentStage = stage.stage
      }
    }
    
    return currentStage
  }
  
  private getNextStage(policy: RetentionPolicy, dataAgeDays: number): RetentionStage | null {
    // Find the next stage that hasn't been triggered yet
    for (const stage of policy.stages) {
      if (dataAgeDays < stage.triggerAfterDays) {
        return stage
      }
    }
    return null
  }
  
  private async transitionDataStage(
    record: DataLifecycleRecord,
    newStage: 'active' | 'archived' | 'anonymized' | 'deleted',
    policy: RetentionPolicy
  ): Promise<{ success: boolean, error?: string, userNotified: boolean }> {
    try {
      const stageConfig = policy.stages.find(s => s.stage === newStage)
      if (!stageConfig) {
        return { success: false, error: 'Stage configuration not found', userNotified: false }
      }
      
      // Perform stage-specific actions
      switch (newStage) {
        case 'archived':
          await this.archiveDataRecord(record)
          break
        case 'anonymized':
          await this.anonymizeDataRecord(record)
          break
        case 'deleted':
          await this.deleteDataRecord(record)
          break
      }
      
      // Update record
      record.currentStage = newStage
      record.lastModifiedAt = new Date().toISOString()
      
      if (newStage === 'deleted') {
        record.actualDeletionAt = new Date().toISOString()
      }
      
      // Send user notification if required
      let userNotified = false
      if (stageConfig.userNotification) {
        await this.sendUserNotification(record, newStage, stageConfig)
        userNotified = true
      }
      
      return { success: true, userNotified }
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        userNotified: false
      }
    }
  }
  
  private async archiveDataRecord(record: DataLifecycleRecord): Promise<void> {
    // TODO: Implement actual archiving logic
    console.log(`Archiving data record: ${record.recordId}`)
  }
  
  private async anonymizeDataRecord(record: DataLifecycleRecord): Promise<void> {
    // TODO: Implement actual anonymization logic
    console.log(`Anonymizing data record: ${record.recordId}`)
  }
  
  private async deleteDataRecord(record: DataLifecycleRecord): Promise<{ success: boolean, error?: string }> {
    try {
      // TODO: Implement actual deletion logic
      console.log(`Deleting data record: ${record.recordId}`)
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Deletion failed'
      }
    }
  }
  
  private async sendUserNotification(
    record: DataLifecycleRecord,
    newStage: string,
    stageConfig: RetentionStage
  ): Promise<void> {
    // TODO: Implement user notification system
    console.log(`Sending user notification for ${record.recordId}: ${newStage}`)
  }
}

// Export singleton instance
export const dataRetentionManager = new DataRetentionManager()

// Export types
export type { RetentionPolicy, DataLifecycleRecord, RetentionEnforcementResult }
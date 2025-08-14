import { createClient } from '@/lib/supabase/client'
import { CulturalContent } from './content-database'
import { BiasDetectionResult } from './bias-detection'

export interface ExpertValidator {
  id: string
  name: string
  email: string
  credentials: string[]
  culturalExpertise: string[]
  validationCount: number
  averageScore: number
  isActive: boolean
  createdAt: Date
}

export interface ValidationRequest {
  id: string
  contentId: string
  content: CulturalContent
  biasDetectionResult: BiasDetectionResult
  requestedBy: string
  assignedExpert?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'assigned' | 'in_review' | 'completed' | 'rejected'
  requestedAt: Date
  assignedAt?: Date
  completedAt?: Date
  dueDate: Date
}

export interface ExpertValidationResult {
  id: string
  requestId: string
  expertId: string
  validationResult: 'approved' | 'rejected' | 'needs_revision'
  culturalAccuracyScore: number
  biasScore: number
  appropriatenessScore: number
  recommendations: string[]
  requiredChanges?: string[]
  culturalInsights: string[]
  additionalNotes?: string
  confidenceLevel: number
  validatedAt: Date
}

export interface ExpertFeedback {
  contentQuality: number
  culturalAuthenticity: number
  biasDetectionAccuracy: number
  mlModelSuggestions: string[]
  generalComments: string
}

export interface ValidationWorkflow {
  autoAssignment: boolean
  requireSecondOpinion: boolean
  escalationRules: EscalationRule[]
  notificationSettings: NotificationSettings
  qualityGates: QualityGate[]
}

export interface EscalationRule {
  condition: 'high_bias_score' | 'expert_disagreement' | 'sensitive_content' | 'timeout'
  threshold?: number
  action: 'assign_senior_expert' | 'require_committee_review' | 'notify_admin'
  targetRole?: string
}

export interface NotificationSettings {
  emailEnabled: boolean
  slackEnabled: boolean
  urgentNotificationThreshold: number
  reminderIntervals: number[] // in hours
}

export interface QualityGate {
  name: string
  requiredScore: number
  blocksPublication: boolean
}

/**
 * Expert validation workflow management
 * Handles routing content to cultural experts for validation
 */
export class ExpertValidationSystem {
  private supabase: ReturnType<typeof createClient>
  private workflow: ValidationWorkflow
  private expertPool: Map<string, ExpertValidator> = new Map()

  constructor(workflow: Partial<ValidationWorkflow> = {}) {
    this.supabase = createClient()
    
    this.workflow = {
      autoAssignment: true,
      requireSecondOpinion: false,
      escalationRules: [],
      notificationSettings: {
        emailEnabled: true,
        slackEnabled: false,
        urgentNotificationThreshold: 0.8,
        reminderIntervals: [24, 48, 72]
      },
      qualityGates: [
        { name: 'cultural_accuracy', requiredScore: 0.8, blocksPublication: true },
        { name: 'bias_score', requiredScore: 0.3, blocksPublication: true },
        { name: 'appropriateness', requiredScore: 0.7, blocksPublication: false }
      ],
      ...workflow
    }

    this.initializeExpertPool()
  }

  /**
   * Submit content for expert validation
   */
  async submitForValidation(
    content: CulturalContent,
    biasDetectionResult: BiasDetectionResult,
    requestedBy: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<ValidationRequest> {
    try {
      // Calculate due date based on priority
      const dueDate = this.calculateDueDate(priority)
      
      // Create validation request
      const request: Omit<ValidationRequest, 'id'> = {
        contentId: content.id,
        content,
        biasDetectionResult,
        requestedBy,
        priority,
        status: 'pending',
        requestedAt: new Date(),
        dueDate
      }

      // Store in database
      const { data: validationRequest, error } = await this.supabase
        .from('expert_validation_requests')
        .insert({
          content_id: request.contentId,
          content_data: request.content,
          bias_detection_result: request.biasDetectionResult,
          requested_by: request.requestedBy,
          priority: request.priority,
          status: request.status,
          requested_at: request.requestedAt.toISOString(),
          due_date: request.dueDate.toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create validation request: ${error.message}`)
      }

      const fullRequest: ValidationRequest = {
        id: validationRequest.id,
        ...request
      }

      // Auto-assign expert if enabled
      if (this.workflow.autoAssignment) {
        await this.autoAssignExpert(fullRequest)
      }

      // Send notifications
      await this.sendNotifications(fullRequest, 'submitted')

      console.log(`Validation request created: ${fullRequest.id} for content: ${content.title}`)
      return fullRequest

    } catch (error) {
      console.error('Failed to submit content for validation:', error)
      throw error
    }
  }

  /**
   * Assign expert to validation request
   */
  async assignExpert(
    requestId: string,
    expertId: string,
    assignedBy?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('expert_validation_requests')
        .update({
          assigned_expert: expertId,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) {
        throw new Error(`Failed to assign expert: ${error.message}`)
      }

      // Notify expert of assignment
      const request = await this.getValidationRequest(requestId)
      if (request) {
        await this.sendNotifications(request, 'assigned')
      }

      console.log(`Expert ${expertId} assigned to validation request ${requestId}`)

    } catch (error) {
      console.error('Failed to assign expert:', error)
      throw error
    }
  }

  /**
   * Submit expert validation result
   */
  async submitValidationResult(
    requestId: string,
    expertId: string,
    result: Omit<ExpertValidationResult, 'id' | 'requestId' | 'expertId' | 'validatedAt'>
  ): Promise<ExpertValidationResult> {
    try {
      const validationResult: ExpertValidationResult = {
        id: '', // Will be set by database
        requestId,
        expertId,
        validatedAt: new Date(),
        ...result
      }

      // Store validation result
      const { data: storedResult, error } = await this.supabase
        .from('expert_validation_results')
        .insert({
          request_id: requestId,
          expert_id: expertId,
          validation_result: result.validationResult,
          cultural_accuracy_score: result.culturalAccuracyScore,
          bias_score: result.biasScore,
          appropriateness_score: result.appropriatenessScore,
          recommendations: result.recommendations,
          required_changes: result.requiredChanges,
          cultural_insights: result.culturalInsights,
          additional_notes: result.additionalNotes,
          confidence_level: result.confidenceLevel,
          validated_at: validationResult.validatedAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to store validation result: ${error.message}`)
      }

      validationResult.id = storedResult.id

      // Update request status
      await this.supabase
        .from('expert_validation_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      // Process quality gates
      await this.processQualityGates(requestId, validationResult)

      // Check if second opinion is required
      if (this.workflow.requireSecondOpinion && !await this.hasSecondOpinion(requestId)) {
        await this.requestSecondOpinion(requestId)
      }

      // Update expert metrics
      await this.updateExpertMetrics(expertId, validationResult)

      // Send completion notifications
      const request = await this.getValidationRequest(requestId)
      if (request) {
        await this.sendNotifications(request, 'completed')
      }

      console.log(`Validation completed for request ${requestId} by expert ${expertId}`)
      return validationResult

    } catch (error) {
      console.error('Failed to submit validation result:', error)
      throw error
    }
  }

  /**
   * Get validation requests for expert dashboard
   */
  async getExpertValidationQueue(
    expertId: string,
    status?: string[]
  ): Promise<ValidationRequest[]> {
    try {
      let query = this.supabase
        .from('expert_validation_requests')
        .select('*')
        .eq('assigned_expert', expertId)
        .order('priority', { ascending: false })
        .order('requested_at', { ascending: true })

      if (status && status.length > 0) {
        query = query.in('status', status)
      }

      const { data: requests, error } = await query

      if (error) {
        throw new Error(`Failed to get validation queue: ${error.message}`)
      }

      return requests?.map(this.mapDbToValidationRequest) || []

    } catch (error) {
      console.error('Failed to get expert validation queue:', error)
      return []
    }
  }

  /**
   * Get validation analytics and metrics
   */
  async getValidationAnalytics(
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalRequests: number
    completedValidations: number
    averageResponseTime: number
    expertPerformance: Array<{
      expertId: string
      name: string
      validationsCompleted: number
      averageScore: number
      averageResponseTime: number
    }>
    qualityMetrics: {
      averageCulturalAccuracy: number
      averageBiasScore: number
      averageAppropriateness: number
    }
    statusDistribution: Record<string, number>
  }> {
    try {
      let requestQuery = this.supabase
        .from('expert_validation_requests')
        .select('*')

      let resultQuery = this.supabase
        .from('expert_validation_results')
        .select('*')

      if (timeRange) {
        requestQuery = requestQuery
          .gte('requested_at', timeRange.start.toISOString())
          .lte('requested_at', timeRange.end.toISOString())
        
        resultQuery = resultQuery
          .gte('validated_at', timeRange.start.toISOString())
          .lte('validated_at', timeRange.end.toISOString())
      }

      const [
        { data: requests },
        { data: results }
      ] = await Promise.all([
        requestQuery,
        resultQuery
      ])

      const totalRequests = requests?.length || 0
      const completedValidations = results?.length || 0

      // Calculate average response time
      const responseTimes = results?.map(r => {
        const request = requests?.find(req => req.id === r.request_id)
        if (request && request.assigned_at) {
          return new Date(r.validated_at).getTime() - new Date(request.assigned_at).getTime()
        }
        return 0
      }).filter(time => time > 0) || []

      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / (1000 * 60 * 60) // Convert to hours
        : 0

      // Expert performance metrics
      const expertStats = new Map<string, {
        validationsCompleted: number
        totalScore: number
        totalResponseTime: number
      }>()

      results?.forEach(result => {
        const request = requests?.find(req => req.id === result.request_id)
        if (request && request.assigned_expert) {
          const stats = expertStats.get(request.assigned_expert) || {
            validationsCompleted: 0,
            totalScore: 0,
            totalResponseTime: 0
          }
          
          stats.validationsCompleted++
          stats.totalScore += result.cultural_accuracy_score || 0
          
          if (request.assigned_at) {
            stats.totalResponseTime += new Date(result.validated_at).getTime() - new Date(request.assigned_at).getTime()
          }
          
          expertStats.set(request.assigned_expert, stats)
        }
      })

      const expertPerformance = Array.from(expertStats.entries()).map(([expertId, stats]) => {
        const expert = this.expertPool.get(expertId)
        return {
          expertId,
          name: expert?.name || 'Unknown',
          validationsCompleted: stats.validationsCompleted,
          averageScore: stats.validationsCompleted > 0 ? stats.totalScore / stats.validationsCompleted : 0,
          averageResponseTime: stats.validationsCompleted > 0 ? 
            (stats.totalResponseTime / stats.validationsCompleted) / (1000 * 60 * 60) : 0 // Hours
        }
      })

      // Quality metrics
      const qualityMetrics = {
        averageCulturalAccuracy: results?.length ? 
          results.reduce((sum, r) => sum + (r.cultural_accuracy_score || 0), 0) / results.length : 0,
        averageBiasScore: results?.length ?
          results.reduce((sum, r) => sum + (r.bias_score || 0), 0) / results.length : 0,
        averageAppropriateness: results?.length ?
          results.reduce((sum, r) => sum + (r.appropriateness_score || 0), 0) / results.length : 0
      }

      // Status distribution
      const statusDistribution: Record<string, number> = {}
      requests?.forEach(request => {
        statusDistribution[request.status] = (statusDistribution[request.status] || 0) + 1
      })

      return {
        totalRequests,
        completedValidations,
        averageResponseTime,
        expertPerformance,
        qualityMetrics,
        statusDistribution
      }

    } catch (error) {
      console.error('Failed to get validation analytics:', error)
      return {
        totalRequests: 0,
        completedValidations: 0,
        averageResponseTime: 0,
        expertPerformance: [],
        qualityMetrics: {
          averageCulturalAccuracy: 0,
          averageBiasScore: 0,
          averageAppropriateness: 0
        },
        statusDistribution: {}
      }
    }
  }

  /**
   * Provide feedback to improve ML bias detection
   */
  async provideMLFeedback(
    requestId: string,
    expertId: string,
    feedback: ExpertFeedback
  ): Promise<void> {
    try {
      await this.supabase
        .from('ml_model_feedback')
        .insert({
          request_id: requestId,
          expert_id: expertId,
          content_quality: feedback.contentQuality,
          cultural_authenticity: feedback.culturalAuthenticity,
          bias_detection_accuracy: feedback.biasDetectionAccuracy,
          ml_model_suggestions: feedback.mlModelSuggestions,
          general_comments: feedback.generalComments,
          provided_at: new Date().toISOString()
        })

      console.log(`ML feedback provided by expert ${expertId} for request ${requestId}`)

    } catch (error) {
      console.error('Failed to provide ML feedback:', error)
      throw error
    }
  }

  // Private methods

  private async autoAssignExpert(request: ValidationRequest): Promise<void> {
    try {
      // Find best expert based on cultural expertise and availability
      const suitableExperts = await this.findSuitableExperts(request.content.cultureTags)
      
      if (suitableExperts.length > 0) {
        // Select expert with lowest current workload
        const expertWorkloads = await this.getExpertWorkloads(suitableExperts.map(e => e.id))
        const selectedExpert = suitableExperts.reduce((best, current) => {
          const currentWorkload = expertWorkloads.get(current.id) || 0
          const bestWorkload = expertWorkloads.get(best.id) || 0
          return currentWorkload < bestWorkload ? current : best
        })

        await this.assignExpert(request.id, selectedExpert.id, 'system')
      } else {
        console.warn(`No suitable experts found for cultures: ${request.content.cultureTags.join(', ')}`)
      }

    } catch (error) {
      console.error('Auto-assignment failed:', error)
    }
  }

  private async findSuitableExperts(cultureTags: string[]): Promise<ExpertValidator[]> {
    try {
      const { data: experts, error } = await this.supabase
        .from('expert_validators')
        .select('*')
        .eq('is_active', true)

      if (error) {
        throw new Error(`Failed to find experts: ${error.message}`)
      }

      // Filter experts by cultural expertise
      return experts?.filter(expert => {
        const expertise = expert.cultural_expertise || []
        return cultureTags.some(tag => 
          expertise.some((exp: string) => 
            exp.toLowerCase().includes(tag.toLowerCase()) ||
            tag.toLowerCase().includes(exp.toLowerCase())
          )
        )
      }).map(this.mapDbToExpertValidator) || []

    } catch (error) {
      console.error('Failed to find suitable experts:', error)
      return []
    }
  }

  private async getExpertWorkloads(expertIds: string[]): Promise<Map<string, number>> {
    try {
      const { data: workloads, error } = await this.supabase
        .from('expert_validation_requests')
        .select('assigned_expert')
        .in('assigned_expert', expertIds)
        .in('status', ['assigned', 'in_review'])

      if (error) {
        throw new Error(`Failed to get expert workloads: ${error.message}`)
      }

      const workloadMap = new Map<string, number>()
      workloads?.forEach(item => {
        const expertId = item.assigned_expert
        workloadMap.set(expertId, (workloadMap.get(expertId) || 0) + 1)
      })

      return workloadMap

    } catch (error) {
      console.error('Failed to get expert workloads:', error)
      return new Map()
    }
  }

  private calculateDueDate(priority: 'low' | 'medium' | 'high' | 'urgent'): Date {
    const now = new Date()
    const hoursToAdd = {
      urgent: 24,
      high: 48,
      medium: 72,
      low: 168 // 1 week
    }
    
    return new Date(now.getTime() + hoursToAdd[priority] * 60 * 60 * 1000)
  }

  private async processQualityGates(
    requestId: string,
    result: ExpertValidationResult
  ): Promise<void> {
    const failedGates: string[] = []

    for (const gate of this.workflow.qualityGates) {
      let score = 0
      
      switch (gate.name) {
        case 'cultural_accuracy':
          score = result.culturalAccuracyScore
          break
        case 'bias_score':
          score = 1 - result.biasScore // Invert bias score (lower is better)
          break
        case 'appropriateness':
          score = result.appropriatenessScore
          break
      }

      if (score < gate.requiredScore) {
        failedGates.push(gate.name)
        
        if (gate.blocksPublication) {
          await this.blockContentPublication(requestId, gate.name, score, gate.requiredScore)
        }
      }
    }

    if (failedGates.length > 0) {
      console.log(`Quality gates failed for request ${requestId}: ${failedGates.join(', ')}`)
    }
  }

  private async blockContentPublication(
    requestId: string,
    gateName: string,
    actualScore: number,
    requiredScore: number
  ): Promise<void> {
    try {
      await this.supabase
        .from('content_publication_blocks')
        .insert({
          request_id: requestId,
          gate_name: gateName,
          actual_score: actualScore,
          required_score: requiredScore,
          blocked_at: new Date().toISOString()
        })

      console.log(`Content publication blocked for request ${requestId} due to ${gateName} gate failure`)

    } catch (error) {
      console.error('Failed to block content publication:', error)
    }
  }

  private async hasSecondOpinion(requestId: string): Promise<boolean> {
    try {
      const { data: results, error } = await this.supabase
        .from('expert_validation_results')
        .select('id')
        .eq('request_id', requestId)

      if (error) {
        throw new Error(`Failed to check second opinion: ${error.message}`)
      }

      return (results?.length || 0) >= 2

    } catch (error) {
      console.error('Failed to check second opinion:', error)
      return false
    }
  }

  private async requestSecondOpinion(requestId: string): Promise<void> {
    // Implementation would create a second validation request
    console.log(`Second opinion requested for validation request ${requestId}`)
  }

  private async updateExpertMetrics(
    expertId: string,
    result: ExpertValidationResult
  ): Promise<void> {
    try {
      // This would update expert performance metrics
      console.log(`Updated metrics for expert ${expertId}`)

    } catch (error) {
      console.error('Failed to update expert metrics:', error)
    }
  }

  private async sendNotifications(
    request: ValidationRequest,
    event: 'submitted' | 'assigned' | 'completed'
  ): Promise<void> {
    try {
      if (this.workflow.notificationSettings.emailEnabled) {
        // Implementation would send email notifications
        console.log(`Email notification sent for request ${request.id}: ${event}`)
      }

      if (this.workflow.notificationSettings.slackEnabled) {
        // Implementation would send Slack notifications
        console.log(`Slack notification sent for request ${request.id}: ${event}`)
      }

    } catch (error) {
      console.error('Failed to send notifications:', error)
    }
  }

  private async getValidationRequest(requestId: string): Promise<ValidationRequest | null> {
    try {
      const { data: request, error } = await this.supabase
        .from('expert_validation_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (error) {
        throw new Error(`Failed to get validation request: ${error.message}`)
      }

      return request ? this.mapDbToValidationRequest(request) : null

    } catch (error) {
      console.error('Failed to get validation request:', error)
      return null
    }
  }

  private mapDbToValidationRequest(dbItem: any): ValidationRequest {
    return {
      id: dbItem.id,
      contentId: dbItem.content_id,
      content: dbItem.content_data,
      biasDetectionResult: dbItem.bias_detection_result,
      requestedBy: dbItem.requested_by,
      assignedExpert: dbItem.assigned_expert,
      priority: dbItem.priority,
      status: dbItem.status,
      requestedAt: new Date(dbItem.requested_at),
      assignedAt: dbItem.assigned_at ? new Date(dbItem.assigned_at) : undefined,
      completedAt: dbItem.completed_at ? new Date(dbItem.completed_at) : undefined,
      dueDate: new Date(dbItem.due_date)
    }
  }

  private mapDbToExpertValidator(dbItem: any): ExpertValidator {
    return {
      id: dbItem.id,
      name: dbItem.name,
      email: dbItem.email,
      credentials: dbItem.credentials || [],
      culturalExpertise: dbItem.cultural_expertise || [],
      validationCount: dbItem.validation_count || 0,
      averageScore: dbItem.average_score || 0,
      isActive: dbItem.is_active,
      createdAt: new Date(dbItem.created_at)
    }
  }

  private async initializeExpertPool(): Promise<void> {
    try {
      const { data: experts, error } = await this.supabase
        .from('expert_validators')
        .select('*')
        .eq('is_active', true)

      if (error) {
        console.error('Failed to initialize expert pool:', error)
        return
      }

      experts?.forEach(expert => {
        this.expertPool.set(expert.id, this.mapDbToExpertValidator(expert))
      })

      console.log(`Initialized expert pool with ${this.expertPool.size} active experts`)

    } catch (error) {
      console.error('Failed to initialize expert pool:', error)
    }
  }
}
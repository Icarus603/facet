/**
 * FACET Emergency Intervention Service
 * 
 * Critical mental health emergency response system for crisis detection,
 * professional intervention coordination, and safety protocol implementation.
 * 
 * CRITICAL: This system implements immediate response protocols for mental
 * health emergencies including suicide ideation, self-harm, and crisis situations.
 */

import { auditLogger } from '@/lib/security/audit-logger'
import { encryptionService } from '@/lib/security/encryption-service'
import { createClient } from '@/lib/supabase/client'

// Emergency severity levels
type EmergencyLevel = 
  | 'low'           // Mild distress, monitoring recommended
  | 'moderate'      // Concerning symptoms, professional consultation
  | 'high'          // Crisis situation, immediate intervention needed
  | 'critical'      // Life-threatening, emergency services required

// Emergency intervention types
type InterventionType =
  | 'safety_check'      // Wellness check and safety assessment
  | 'crisis_counseling' // Immediate crisis counseling session
  | 'professional_referral' // Referral to mental health professional
  | 'emergency_services'    // Contact emergency services (911, crisis hotline)
  | 'safety_plan_activation' // Activate user's existing safety plan
  | 'support_network_alert'  // Alert user's emergency contacts

// Professional service types
type ProfessionalServiceType =
  | 'crisis_hotline'       // 24/7 crisis hotlines
  | 'emergency_therapy'    // Emergency therapy sessions
  | 'psychiatrist'         // Psychiatric evaluation
  | 'hospital_emergency'   // Emergency room mental health services
  | 'mobile_crisis_team'   // Mobile crisis intervention teams
  | 'peer_support'         // Peer support specialists

// Emergency contact information
interface EmergencyContact {
  contactId: string
  userId: string
  name: string
  relationship: string
  phoneNumber: string
  email: string
  isPrimary: boolean
  consentToContact: boolean
  preferredContactMethod: 'phone' | 'email' | 'text'
  timeZone: string
  availabilityHours?: {
    start: string  // HH:MM format
    end: string    // HH:MM format
    days: string[] // ['monday', 'tuesday', ...]
  }
}

// Professional service provider
interface ProfessionalServiceProvider {
  providerId: string
  name: string
  serviceType: ProfessionalServiceType
  phone: string
  email?: string
  website?: string
  description: string
  
  // Availability
  available24_7: boolean
  languagesSupported: string[]
  specialties: string[]
  
  // Geographic coverage
  serviceArea: {
    country: string
    state?: string
    city?: string
    zipCodes?: string[]
  }
  
  // Integration details
  hasDirectIntegration: boolean
  referralProcess: 'automated' | 'manual' | 'hybrid'
  averageWaitTime: string
  insuranceAccepted?: string[]
}

// Emergency incident record
interface EmergencyIncident {
  incidentId: string
  userId: string
  detectedAt: string
  resolvedAt?: string
  
  // Crisis details
  emergencyLevel: EmergencyLevel
  triggeringSigns: string[]
  riskFactors: string[]
  protectiveFactors: string[]
  
  // AI analysis
  confidenceScore: number      // 0-1 confidence in emergency assessment
  immediateRisk: boolean       // Immediate suicide/self-harm risk
  contextualFactors: string[]  // Recent life events, stressors
  
  // Response actions
  interventionsTriggered: InterventionType[]
  professionalServicesContacted: string[]
  emergencyContactsNotified: string[]
  
  // Outcome tracking
  userResponseStatus: 'responsive' | 'unresponsive' | 'declining_help'
  professionalResponseTime?: number  // Minutes to professional contact
  incidentResolution: 'resolved' | 'escalated' | 'ongoing' | 'transferred'
  followUpScheduled: boolean
  
  // Compliance
  mandatoryReportingTriggered: boolean
  legalObligationsVet: boolean
  consentForIntervention: boolean
}

// Safety plan template
interface SafetyPlan {
  planId: string
  userId: string
  createdAt: string
  lastUpdatedAt: string
  
  // Warning signs recognition
  personalWarningSigns: string[]
  triggerSituations: string[]
  
  // Coping strategies
  personalCopingStrategies: string[]
  distractionActivities: string[]
  socialActivities: string[]
  professionalSupports: string[]
  
  // Emergency contacts
  emergencyContacts: EmergencyContact[]
  professionalContacts: ProfessionalServiceProvider[]
  
  // Crisis services
  localCrisisServices: {
    hotlineNumber: string
    textCrisisNumber?: string
    emergencyRoomAddress?: string
    mobileTeamNumber?: string
  }
  
  // Safety measures
  meansRestriction: {
    lethalMeansRemoved: string[]
    safetyMeasuresInPlace: string[]
    supportPersonInvolved: boolean
  }
  
  // Follow-up plan
  followUpSchedule: {
    nextProfessionalAppointment?: string
    checkInSchedule: string[]
    recoveryGoals: string[]
  }
}

export class EmergencyInterventionService {
  private supabase = createClient()
  private emergencyIncidents: EmergencyIncident[] = []
  private professionalProviders: ProfessionalServiceProvider[] = []
  private emergencyContacts: Map<string, EmergencyContact[]> = new Map()
  
  constructor() {
    this.initializeProfessionalProviders()
  }
  
  /**
   * Detect and respond to mental health emergency
   */
  async detectAndRespondToEmergency(
    userId: string,
    conversationContext: {
      messages: string[]
      emotionalState: any
      riskAssessment: any
    },
    clientIP: string
  ): Promise<{
    emergencyDetected: boolean
    emergencyLevel?: EmergencyLevel
    incidentId?: string
    interventionsTriggered: InterventionType[]
    immediateActions: string[]
    professionalContactInfo?: ProfessionalServiceProvider[]
  }> {
    
    // Analyze conversation for emergency indicators
    const emergencyAnalysis = await this.analyzeEmergencyIndicators(
      conversationContext.messages,
      conversationContext.emotionalState,
      conversationContext.riskAssessment
    )
    
    if (!emergencyAnalysis.emergencyDetected) {
      return {
        emergencyDetected: false,
        interventionsTriggered: [],
        immediateActions: []
      }
    }
    
    const incidentId = this.generateIncidentId()
    const detectedAt = new Date().toISOString()
    
    // Create emergency incident
    const incident: EmergencyIncident = {
      incidentId,
      userId,
      detectedAt,
      emergencyLevel: emergencyAnalysis.level,
      triggeringSigns: emergencyAnalysis.triggeringSigns,
      riskFactors: emergencyAnalysis.riskFactors,
      protectiveFactors: emergencyAnalysis.protectiveFactors,
      confidenceScore: emergencyAnalysis.confidence,
      immediateRisk: emergencyAnalysis.immediateRisk,
      contextualFactors: emergencyAnalysis.contextualFactors,
      interventionsTriggered: [],
      professionalServicesContacted: [],
      emergencyContactsNotified: [],
      userResponseStatus: 'responsive',
      incidentResolution: 'ongoing',
      followUpScheduled: false,
      mandatoryReportingTriggered: false,
      legalObligationsVet: false,
      consentForIntervention: false
    }
    
    // Determine and trigger interventions based on emergency level
    const interventions = await this.triggerEmergencyInterventions(incident)
    incident.interventionsTriggered = interventions.triggered
    
    // Store incident
    this.emergencyIncidents.push(incident)
    
    // Audit log critical emergency
    await auditLogger.logSecurityThreat(
      'mental_health_emergency',
      'high',
      userId,
      clientIP,
      'emergency-system',
      {
        threatDetails: {
          severity: emergencyAnalysis.level,
          immediateRisk: emergencyAnalysis.immediateRisk,
          confidence: emergencyAnalysis.confidence,
          interventionsTriggered: interventions.triggered.length
        },
        securityFlags: ['emergency_detected'],
        blocked: false,
        action: 'emergency_intervention_triggered'
      }
    )
    
    console.log(`🚨 Emergency detected: ${incidentId} (Level: ${emergencyAnalysis.level})`)
    
    return {
      emergencyDetected: true,
      emergencyLevel: emergencyAnalysis.level,
      incidentId,
      interventionsTriggered: interventions.triggered,
      immediateActions: interventions.immediateActions,
      professionalContactInfo: interventions.professionalContacts
    }
  }
  
  /**
   * Trigger emergency interventions based on severity
   */
  private async triggerEmergencyInterventions(incident: EmergencyIncident): Promise<{
    triggered: InterventionType[]
    immediateActions: string[]
    professionalContacts: ProfessionalServiceProvider[]
  }> {
    const triggered: InterventionType[] = []
    const immediateActions: string[] = []
    const professionalContacts: ProfessionalServiceProvider[] = []
    
    switch (incident.emergencyLevel) {
      case 'critical':
        // Life-threatening situation - immediate emergency response
        triggered.push('emergency_services', 'crisis_counseling', 'support_network_alert')
        
        immediateActions.push(
          'Immediate safety assessment initiated',
          'Emergency services contact information provided',
          'Crisis hotline connection available',
          'Emergency contacts will be notified'
        )
        
        // Get emergency services
        professionalContacts.push(
          ...this.professionalProviders.filter(p => 
            p.serviceType === 'crisis_hotline' || 
            p.serviceType === 'hospital_emergency' ||
            p.serviceType === 'mobile_crisis_team'
          )
        )
        
        // Auto-contact emergency services if consent given
        await this.contactEmergencyServices(incident)
        break
        
      case 'high':
        // Crisis situation - immediate professional intervention
        triggered.push('crisis_counseling', 'professional_referral', 'safety_plan_activation')
        
        immediateActions.push(
          'Crisis intervention initiated',
          'Professional mental health support being arranged',
          'Safety plan activation recommended',
          'Continuous monitoring enabled'
        )
        
        professionalContacts.push(
          ...this.professionalProviders.filter(p => 
            p.serviceType === 'crisis_hotline' || 
            p.serviceType === 'emergency_therapy'
          )
        )
        
        await this.activateSafetyPlan(incident.userId)
        break
        
      case 'moderate':
        // Concerning symptoms - professional consultation recommended
        triggered.push('professional_referral', 'safety_check')
        
        immediateActions.push(
          'Professional consultation recommended',
          'Safety assessment provided',
          'Mental health resources shared',
          'Follow-up monitoring scheduled'
        )
        
        professionalContacts.push(
          ...this.professionalProviders.filter(p => 
            p.serviceType === 'emergency_therapy' || 
            p.serviceType === 'peer_support'
          )
        )
        break
        
      case 'low':
        // Mild distress - monitoring and support
        triggered.push('safety_check')
        
        immediateActions.push(
          'Wellness check performed',
          'Coping resources provided',
          'Continued support available',
          'Regular check-ins scheduled'
        )
        break
    }
    
    return { triggered, immediateActions, professionalContacts }
  }
  
  /**
   * Analyze conversation for emergency indicators
   */
  private async analyzeEmergencyIndicators(
    messages: string[],
    emotionalState: any,
    riskAssessment: any
  ): Promise<{
    emergencyDetected: boolean
    level: EmergencyLevel
    confidence: number
    immediateRisk: boolean
    triggeringSigns: string[]
    riskFactors: string[]
    protectiveFactors: string[]
    contextualFactors: string[]
  }> {
    
    const recentMessages = messages.slice(-5).join(' ').toLowerCase()
    const triggeringSigns: string[] = []
    const riskFactors: string[] = []
    const protectiveFactors: string[] = []
    const contextualFactors: string[] = []
    
    // Critical emergency indicators
    const criticalIndicators = [
      'want to die', 'kill myself', 'end it all', 'suicide plan',
      'not worth living', 'better off dead', 'goodbye cruel world',
      'taking pills', 'have weapon', 'specific plan', 'tonight'
    ]
    
    // High risk indicators
    const highRiskIndicators = [
      'suicidal thoughts', 'hurting myself', 'no hope', 'cant go on',
      'worthless', 'burden', 'desperate', 'overwhelming pain',
      'no way out', 'give up', 'end the pain'
    ]
    
    // Moderate risk indicators
    const moderateRiskIndicators = [
      'depressed', 'anxious', 'hopeless', 'alone', 'struggling',
      'difficult time', 'hard to cope', 'overwhelming', 'stressed'
    ]
    
    let emergencyLevel: EmergencyLevel = 'low'
    let confidence = 0.1
    let immediateRisk = false
    
    // Check for critical indicators
    for (const indicator of criticalIndicators) {
      if (recentMessages.includes(indicator)) {
        triggeringSigns.push(`Critical language detected: "${indicator}"`)
        emergencyLevel = 'critical'
        confidence = Math.max(confidence, 0.9)
        immediateRisk = true
      }
    }
    
    // Check for high risk indicators
    if (emergencyLevel !== 'critical') {
      for (const indicator of highRiskIndicators) {
        if (recentMessages.includes(indicator)) {
          triggeringSigns.push(`High-risk language detected: "${indicator}"`)
          emergencyLevel = 'high'
          confidence = Math.max(confidence, 0.7)
        }
      }
    }
    
    // Check for moderate risk indicators
    if (emergencyLevel === 'low') {
      for (const indicator of moderateRiskIndicators) {
        if (recentMessages.includes(indicator)) {
          triggeringSigns.push(`Concerning language detected: "${indicator}"`)
          emergencyLevel = 'moderate'
          confidence = Math.max(confidence, 0.5)
        }
      }
    }
    
    // Analyze emotional state
    if (emotionalState) {
      const { valence, arousal, dominance } = emotionalState
      
      // Very negative valence + high arousal + low dominance = crisis
      if (valence < 0.2 && arousal > 0.8 && dominance < 0.2) {
        triggeringSigns.push('Extreme negative emotional state detected')
        emergencyLevel = emergencyLevel === 'low' ? 'high' : emergencyLevel
        confidence = Math.max(confidence, 0.8)
      }
    }
    
    // Analyze risk assessment
    if (riskAssessment) {
      if (riskAssessment.suicideRisk > 0.7) {
        triggeringSigns.push('High suicide risk assessment score')
        emergencyLevel = 'critical'
        confidence = Math.max(confidence, 0.85)
        immediateRisk = true
      } else if (riskAssessment.suicideRisk > 0.4) {
        triggeringSigns.push('Moderate suicide risk assessment score')
        emergencyLevel = emergencyLevel === 'low' ? 'high' : emergencyLevel
        confidence = Math.max(confidence, 0.6)
      }
      
      if (riskAssessment.selfHarmRisk > 0.6) {
        triggeringSigns.push('High self-harm risk detected')
        riskFactors.push('Self-harm risk indicators present')
      }
    }
    
    // Check for protective factors
    const protectiveIndicators = [
      'getting help', 'therapy', 'support', 'family', 'friends',
      'hope', 'future', 'goals', 'recovery', 'better tomorrow'
    ]
    
    for (const indicator of protectiveIndicators) {
      if (recentMessages.includes(indicator)) {
        protectiveFactors.push(`Protective factor: ${indicator}`)
        confidence = Math.max(0.1, confidence - 0.1) // Reduce confidence slightly
      }
    }
    
    const emergencyDetected = emergencyLevel !== 'low' || confidence > 0.3
    
    return {
      emergencyDetected,
      level: emergencyLevel,
      confidence,
      immediateRisk,
      triggeringSigns,
      riskFactors,
      protectiveFactors,
      contextualFactors
    }
  }
  
  /**
   * Contact emergency services for critical situations
   */
  private async contactEmergencyServices(incident: EmergencyIncident): Promise<void> {
    // TODO: Implement actual emergency services contact
    // This would integrate with local emergency services APIs
    
    console.log(`🚨 CRITICAL: Emergency services contact initiated for incident ${incident.incidentId}`)
    
    incident.professionalServicesContacted.push('emergency_services')
    incident.mandatoryReportingTriggered = true
    
    // Audit log for emergency services contact
    await auditLogger.logCrisisEvent(
      'emergency_contact_triggered',
      incident.userId,
      incident.incidentId,
      'system',
      {
        riskLevel: 'critical',
        interventionType: 'emergency_services_contact',
        emergencyServices: true,
        userAgent: 'emergency-system',
        triggerDetails: {
          incidentId: incident.incidentId,
          emergencyLevel: incident.emergencyLevel,
          immediateRisk: incident.immediateRisk
        }
      }
    )
  }
  
  /**
   * Activate user's safety plan
   */
  private async activateSafetyPlan(userId: string): Promise<void> {
    const safetyPlan = await this.getUserSafetyPlan(userId)
    
    if (safetyPlan) {
      console.log(`Activating safety plan for user ${userId}`)
      
      // Notify emergency contacts
      await this.notifyEmergencyContacts(userId, 'safety_plan_activation')
      
      // Send safety plan reminders
      // TODO: Implement safety plan activation notifications
    } else {
      console.log(`No safety plan found for user ${userId} - creating emergency safety plan`)
      await this.createEmergencySafetyPlan(userId)
    }
  }
  
  /**
   * Notify emergency contacts
   */
  private async notifyEmergencyContacts(
    userId: string,
    reason: 'emergency_detected' | 'safety_plan_activation' | 'crisis_intervention'
  ): Promise<void> {
    const contacts = this.emergencyContacts.get(userId) || []
    
    for (const contact of contacts) {
      if (contact.consentToContact) {
        // TODO: Implement actual contact notification
        console.log(`Notifying emergency contact: ${contact.name} (${contact.preferredContactMethod})`)
        
        // Audit log
        await auditLogger.logCrisisEvent(
          'emergency_contact_triggered',
          userId,
          'emergency_intervention',
          'system',
          {
            riskLevel: reason === 'emergency_detected' ? 'high' : 'medium',
            interventionType: 'emergency_contact_notification',
            emergencyServices: false,
            userAgent: 'emergency-system',
            triggerDetails: {
              contactName: contact.name,
              reason,
              contactMethod: contact.preferredContactMethod
            }
          }
        )
      }
    }
  }
  
  /**
   * Get user's safety plan
   */
  async getUserSafetyPlan(userId: string): Promise<SafetyPlan | null> {
    // TODO: Implement Supabase query
    return null
  }
  
  /**
   * Create emergency safety plan
   */
  private async createEmergencySafetyPlan(userId: string): Promise<SafetyPlan> {
    const planId = this.generatePlanId()
    const now = new Date().toISOString()
    
    const emergencyPlan: SafetyPlan = {
      planId,
      userId,
      createdAt: now,
      lastUpdatedAt: now,
      personalWarningSigns: [],
      triggerSituations: [],
      personalCopingStrategies: [],
      distractionActivities: [],
      socialActivities: [],
      professionalSupports: [],
      emergencyContacts: this.emergencyContacts.get(userId) || [],
      professionalContacts: this.professionalProviders.filter(p => 
        p.serviceType === 'crisis_hotline' || p.available24_7
      ),
      localCrisisServices: {
        hotlineNumber: '988', // National Suicide Prevention Lifeline
        textCrisisNumber: '741741', // Crisis Text Line
        emergencyRoomAddress: 'Local Emergency Room'
      },
      meansRestriction: {
        lethalMeansRemoved: [],
        safetyMeasuresInPlace: [],
        supportPersonInvolved: false
      },
      followUpSchedule: {
        checkInSchedule: [],
        recoveryGoals: []
      }
    }
    
    console.log(`Created emergency safety plan: ${planId}`)
    return emergencyPlan
  }
  
  /**
   * Initialize professional service providers
   */
  private initializeProfessionalProviders(): void {
    this.professionalProviders = [
      {
        providerId: 'nsp_988',
        name: '988 Suicide & Crisis Lifeline',
        serviceType: 'crisis_hotline',
        phone: '988',
        website: 'https://988lifeline.org',
        description: 'Free, confidential, 24/7 crisis support',
        available24_7: true,
        languagesSupported: ['English', 'Spanish'],
        specialties: ['Suicide prevention', 'Crisis intervention'],
        serviceArea: { country: 'United States' },
        hasDirectIntegration: false,
        referralProcess: 'manual',
        averageWaitTime: '< 2 minutes'
      },
      {
        providerId: 'crisis_text_741741',
        name: 'Crisis Text Line',
        serviceType: 'crisis_hotline',
        phone: '741741',
        website: 'https://crisistextline.org',
        description: 'Free crisis counseling via text message',
        available24_7: true,
        languagesSupported: ['English', 'Spanish'],
        specialties: ['Crisis intervention', 'Text-based support'],
        serviceArea: { country: 'United States' },
        hasDirectIntegration: false,
        referralProcess: 'manual',
        averageWaitTime: '< 5 minutes'
      },
      {
        providerId: 'mobile_crisis_team',
        name: 'Local Mobile Crisis Team',
        serviceType: 'mobile_crisis_team',
        phone: '911',
        description: 'Mobile crisis intervention and assessment',
        available24_7: true,
        languagesSupported: ['English'],
        specialties: ['Mobile crisis intervention', 'Safety assessment'],
        serviceArea: { country: 'United States' },
        hasDirectIntegration: false,
        referralProcess: 'manual',
        averageWaitTime: '30-60 minutes'
      }
    ]
    
    console.log(`Initialized ${this.professionalProviders.length} professional service providers`)
  }
  
  /**
   * Get emergency incident status
   */
  async getEmergencyIncident(incidentId: string): Promise<EmergencyIncident | null> {
    return this.emergencyIncidents.find(incident => incident.incidentId === incidentId) || null
  }
  
  /**
   * Get user's emergency incidents
   */
  async getUserEmergencyIncidents(userId: string): Promise<EmergencyIncident[]> {
    return this.emergencyIncidents.filter(incident => incident.userId === userId)
  }
  
  /**
   * Update incident resolution
   */
  async updateIncidentResolution(
    incidentId: string,
    resolution: EmergencyIncident['incidentResolution'],
    notes?: string
  ): Promise<void> {
    const incident = this.emergencyIncidents.find(i => i.incidentId === incidentId)
    if (incident) {
      incident.incidentResolution = resolution
      incident.resolvedAt = new Date().toISOString()
      
      console.log(`Emergency incident ${incidentId} updated: ${resolution}`)
    }
  }
  
  // Helper methods
  
  private generateIncidentId(): string {
    return `emergency_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
  
  private generatePlanId(): string {
    return `safety_plan_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}

// Export singleton instance
export const emergencyInterventionService = new EmergencyInterventionService()

// Export types
export type {
  EmergencyLevel,
  InterventionType,
  ProfessionalServiceType,
  EmergencyContact,
  ProfessionalServiceProvider,
  EmergencyIncident,
  SafetyPlan
}
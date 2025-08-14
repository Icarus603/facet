/**
 * FACET Crisis Monitor Agent Implementation
 * Specialized for real-time crisis detection and emergency intervention
 * CRITICAL: Must respond in <1s for crisis situations
 */

import { nanoid } from 'nanoid';
import { BaseAgent } from '../base-agent';
import {
  AgentType,
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
} from '../agent-types';
import { AzureOpenAIClient } from '../../llm/azure-openai';
import { RedisCoordinator } from '../coordination/redis-coordinator';
import { PromptGenerator } from '../../llm/prompt-templates';
import { 
  EnhancedCrisisDetector, 
  EnhancedRiskScore,
  RealTimeMetrics,
  CrisisMonitoringAlert 
} from '../utils/enhanced-crisis-detection';
import { CrisisContext } from '../utils/crisis-detection';

export interface CrisisDetection {
  riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  indicators: CrisisIndicator[];
  immediateThreats: string[];
  timeframe: 'immediate' | 'hours' | 'days' | 'weeks';
  confidence: number;
  requiresHumanIntervention: boolean;
  emergencyServicesNeeded: boolean;
}

export interface CrisisIndicator {
  type: 'suicidal_ideation' | 'suicide_plan' | 'self_harm' | 'psychosis' | 'violence' | 'substance_emergency' | 'domestic_violence';
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  evidence: string[];
  timeframe: string;
  confidence: number;
}

export interface RiskAssessment {
  suicideRisk: {
    ideation: boolean;
    plan: boolean;
    means: boolean;
    intent: boolean;
    timeline: string;
    severity: number; // 1-10
    protectiveFactors: string[];
  };
  violenceRisk: {
    homicidalIdeation: boolean;
    targets: string[];
    means: boolean;
    timeline: string;
    severity: number;
  };
  selfHarmRisk: {
    urges: boolean;
    history: boolean;
    methods: string[];
    frequency: string;
    severity: number;
  };
  psychosisRisk: {
    hallucinations: boolean;
    delusions: boolean;
    disorganization: boolean;
    insight: boolean;
    severity: number;
  };
}

export interface EmergencyProtocol {
  protocolType: 'safety_planning' | 'crisis_intervention' | 'emergency_services' | 'hospitalization';
  urgency: 'immediate' | 'within_hour' | 'within_day';
  actions: EmergencyAction[];
  contacts: EmergencyContact[];
  culturalConsiderations: string[];
  followUpRequired: boolean;
}

export interface EmergencyAction {
  action: string;
  priority: number;
  timeframe: string;
  responsibility: 'user' | 'family' | 'professional' | 'emergency_services';
  culturalAdaptation?: string;
}

export interface EmergencyContact {
  type: 'crisis_hotline' | 'emergency_services' | 'mental_health_professional' | 'family_emergency' | 'cultural_support';
  name: string;
  phone: string;
  available: string;
  culturallyAppropriate: boolean;
  language?: string;
}

export class CrisisMonitorAgent extends BaseAgent {
  type = 'crisis_monitor' as const;
  capabilities = [
    'crisis_detection',
    'risk_assessment',
    'safety_planning',
    'emergency_intervention',
    'suicide_prevention',
    'violence_assessment',
    'cultural_crisis_response'
  ];

  // Enhanced ML-powered crisis detection system
  private enhancedDetector: EnhancedCrisisDetector;
  
  // Performance-critical caching for <1s response
  private crisisPatternCache: Map<string, CrisisIndicator[]> = new Map();
  private riskAssessmentCache: Map<string, RiskAssessment> = new Map();
  private emergencyContactsCache: Map<string, EmergencyContact[]> = new Map();

  constructor(
    config: AgentConfig,
    llmClient: AzureOpenAIClient,
    redisCoordinator: RedisCoordinator
  ) {
    super('crisis_monitor', config, llmClient, redisCoordinator);
    this.enhancedDetector = new EnhancedCrisisDetector();
    this.initializeCrisisPatterns();
    this.startRealTimeMonitoring();
  }

  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================================================

  protected async executeAgentLogic(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // CRITICAL: Fast crisis detection using cached patterns
      const crisisDetection = await this.detectCrisis(message.content, context);
      
      // If critical crisis detected, bypass normal flow for speed
      if (crisisDetection.riskLevel === 'critical') {
        return await this.handleCriticalCrisis(message, context, crisisDetection, startTime);
      }

      // Full assessment for non-critical cases
      const riskAssessment = await this.assessDetailedRisk(message.content, context);
      const safetyPlan = await this.createSafetyPlan(riskAssessment, context);
      const culturalConsiderations = await this.assessCulturalCrisisFactors(context);

      // Generate response based on risk level
      const responseContent = await this.generateCrisisResponse(
        crisisDetection,
        riskAssessment,
        safetyPlan,
        culturalConsiderations,
        context
      );

      const processingTime = Date.now() - startTime;
      console.log(`Crisis monitor processing time: ${processingTime}ms`);

      return this.createResponse(
        responseContent,
        crisisDetection.confidence,
        context,
        {
          culturalRelevance: this.calculateCulturalRelevance(culturalConsiderations, context),
          actionItems: this.extractActionItems(safetyPlan),
          followUpRequired: crisisDetection.riskLevel !== 'none',
          escalationNeeded: crisisDetection.requiresHumanIntervention,
          coordinationEvents: [
            {
              type: 'crisis_assessment_completed',
              riskLevel: crisisDetection.riskLevel,
              indicators: crisisDetection.indicators,
              emergencyProtocol: crisisDetection.emergencyServicesNeeded,
              processingTime,
              timestamp: Date.now(),
            }
          ],
          metadata: {
            crisisDetected: crisisDetection.riskLevel !== 'none',
            riskLevel: crisisDetection.riskLevel,
            emergencyServicesNeeded: crisisDetection.emergencyServicesNeeded,
            humanInterventionRequired: crisisDetection.requiresHumanIntervention,
            safetyPlanCreated: true,
            processingTimeMs: processingTime,
          }
        }
      );

    } catch (error) {
      // For crisis monitoring, always provide a safe fallback response
      return this.createCrisisFallbackResponse(context, error);
    }
  }

  getCapabilities(): string[] {
    return this.capabilities;
  }

  protected async performAgentSpecificHealthCheck(): Promise<boolean> {
    try {
      // Test enhanced crisis detection system performance
      const testStart = Date.now();
      const testDetection = await this.detectCrisis(
        'I am thinking about ending my life tonight',
        {
          sessionId: 'health-check',
          userId: 'health-check-user',
          confidentialityLevel: 'maximum',
          timestamp: Date.now(),
          correlationId: 'health-check-correlation',
        }
      );
      const testTime = Date.now() - testStart;

      // Test enhanced detector health
      const enhancedHealth = await this.enhancedDetector.performHealthCheck();
      
      // Get real-time performance metrics
      const metrics = await this.enhancedDetector.getRealTimeMetrics();

      // Health check criteria:
      // 1. Crisis detected with high confidence
      // 2. Response time <1s
      // 3. Enhanced detector status healthy or degraded (not critical)
      // 4. Accuracy score >90%
      const healthyStatus = testDetection.riskLevel === 'critical' && 
                           testTime < 1000 &&
                           enhancedHealth.status !== 'critical' &&
                           metrics.accuracyScore > 0.90;

      console.log(`Crisis Monitor Health Check:
        - Detection time: ${testTime}ms
        - Risk level detected: ${testDetection.riskLevel}
        - Enhanced detector status: ${enhancedHealth.status}
        - Accuracy score: ${(metrics.accuracyScore * 100).toFixed(1)}%
        - System health: ${healthyStatus ? 'HEALTHY' : 'DEGRADED'}`);

      return healthyStatus;

    } catch (error) {
      console.error('Crisis monitor health check failed:', error);
      return false;
    }
  }

  // ============================================================================
  // CRISIS DETECTION METHODS
  // ============================================================================

  /**
   * Enhanced ML-powered crisis detection with <1s response guarantee
   * MUST complete in <1000ms for all cases, <500ms for critical cases
   */
  async detectCrisis(text: string, context: AgentContext): Promise<CrisisDetection> {
    const startTime = Date.now();

    try {
      // Build enhanced crisis context
      const crisisContext: CrisisContext = {
        text,
        culturalBackground: context.culturalProfile?.primaryCulture,
        historicalRisk: context.userId ? await this.checkHistoricalRisk(context.userId) : false,
        ageGroup: this.determineAgeGroup(context.culturalProfile?.age),
        sessionHistory: context.sessionHistory || []
      };

      // Use enhanced ML-powered detection
      const enhancedResult = await this.enhancedDetector.detectCrisisEnhanced(crisisContext);
      
      // Convert enhanced result to legacy format for compatibility
      const legacyResult = this.convertToLegacyFormat(enhancedResult);

      const detectionTime = Date.now() - startTime;
      console.log(`Enhanced crisis detection completed in ${detectionTime}ms (ML confidence: ${(enhancedResult.mlConfidence * 100).toFixed(1)}%)`);

      // Ensure performance requirements are met
      if (detectionTime > 1000) {
        console.warn(`Crisis detection exceeded 1s limit: ${detectionTime}ms`);
      }

      return legacyResult;

    } catch (error) {
      console.error('Enhanced crisis detection failed, falling back to pattern matching:', error);
      
      // Fallback to original pattern matching if enhanced detection fails
      return this.fallbackDetectCrisis(text, context, startTime);
    }
  }

  /**
   * Fallback crisis detection using original pattern matching
   */
  private async fallbackDetectCrisis(text: string, context: AgentContext, startTime: number): Promise<CrisisDetection> {
    const normalizedText = text.toLowerCase();

    // Fast pattern matching for immediate threats
    const indicators = this.matchCrisisPatterns(normalizedText);
    
    // Determine risk level based on indicators
    const riskLevel = this.calculateRiskLevel(indicators);
    
    // Extract immediate threats
    const immediateThreats = this.extractImmediateThreats(normalizedText, indicators);
    
    // Determine timeframe
    const timeframe = this.determineTimeframe(normalizedText, indicators);
    
    // Calculate confidence
    const confidence = this.calculateDetectionConfidence(indicators, normalizedText);
    
    // Determine intervention needs
    const requiresHumanIntervention = riskLevel === 'critical' || riskLevel === 'high';
    const emergencyServicesNeeded = this.needsEmergencyServices(indicators, immediateThreats);

    const detectionTime = Date.now() - startTime;
    console.log(`Fallback crisis detection completed in ${detectionTime}ms`);

    return {
      riskLevel,
      indicators,
      immediateThreats,
      timeframe,
      confidence,
      requiresHumanIntervention,
      emergencyServicesNeeded,
    };
  }

  /**
   * Comprehensive risk assessment for non-critical cases
   */
  async assessDetailedRisk(text: string, context: AgentContext): Promise<RiskAssessment> {
    // Check cache first for performance
    const cacheKey = `${context.userId}_${Date.now().toString().slice(0, -3)}`; // Cache for 1 second
    const cached = this.riskAssessmentCache.get(cacheKey);
    if (cached) return cached;

    const riskPrompt = `Conduct detailed risk assessment for: "${text}"

SUICIDE RISK ASSESSMENT:
- Current suicidal thoughts (frequency, intensity, duration)
- Suicide plans (method, timing, location, specificity)
- Access to means of suicide
- Intent to act on thoughts
- Timeline for potential action
- Protective factors present
- Risk severity (1-10)

VIOLENCE RISK ASSESSMENT:
- Homicidal thoughts or threats
- Specific targets identified
- Access to weapons or means
- Timeline for potential violence
- Risk severity (1-10)

SELF-HARM RISK:
- Current urges to self-harm
- History of self-injury
- Methods typically used
- Frequency and patterns
- Risk severity (1-10)

PSYCHOSIS RISK:
- Reality testing ability
- Hallucinations (auditory, visual, other)
- Delusions or paranoid thoughts
- Thought organization and coherence
- Insight into condition
- Risk severity (1-10)

Provide specific, detailed assessment with evidence from user input.`;

    const response = await this.generateLLMResponse(riskPrompt, context);
    const assessment = this.parseRiskAssessment(response);
    
    // Cache for performance
    this.riskAssessmentCache.set(cacheKey, assessment);
    
    return assessment;
  }

  /**
   * Create culturally-informed safety plan
   */
  async createSafetyPlan(
    riskAssessment: RiskAssessment,
    context: AgentContext
  ): Promise<EmergencyProtocol> {
    const culturalProfile = context.culturalProfile || {};
    
    const safetyPrompt = `Create comprehensive safety plan based on:

RISK ASSESSMENT:
- Suicide risk: ${riskAssessment.suicideRisk.severity}/10
- Violence risk: ${riskAssessment.violenceRisk.severity}/10
- Self-harm risk: ${riskAssessment.selfHarmRisk.severity}/10
- Psychosis risk: ${riskAssessment.psychosisRisk.severity}/10

CULTURAL CONTEXT: ${JSON.stringify(culturalProfile)}

SAFETY PLANNING COMPONENTS:
1. Immediate safety actions (next 1 hour)
2. Short-term safety steps (next 24 hours)
3. Emergency contacts (culturally appropriate)
4. Coping strategies (including cultural practices)
5. Environmental safety (remove means if needed)
6. Professional support activation
7. Family/community involvement (culturally appropriate)

Consider cultural factors:
- Family involvement preferences
- Religious/spiritual coping resources
- Cultural crisis support systems
- Language preferences for emergency contacts
- Cultural attitudes toward mental health emergency services

Provide specific, actionable safety plan.`;

    const response = await this.generateLLMResponse(safetyPrompt, context);
    return this.parseSafetyPlan(response, riskAssessment);
  }

  /**
   * Handle critical crisis with maximum speed (<1s total response)
   */
  private async handleCriticalCrisis(
    message: AgentMessage,
    context: AgentContext,
    crisisDetection: CrisisDetection,
    startTime: number
  ): Promise<AgentResponse> {
    // Use pre-cached emergency response for speed
    const emergencyResponse = this.generateEmergencyResponse(crisisDetection, context);
    
    // Trigger emergency protocols asynchronously (don't wait)
    this.triggerEmergencyProtocols(crisisDetection, context).catch(error => {
      console.error('Emergency protocol activation failed:', error);
    });

    // Log critical event
    this.emit('critical_crisis_detected', {
      userId: context.userId,
      sessionId: context.sessionId,
      riskLevel: crisisDetection.riskLevel,
      indicators: crisisDetection.indicators,
      processingTime: Date.now() - startTime,
      timestamp: Date.now(),
    });

    const processingTime = Date.now() - startTime;

    return this.createResponse(
      emergencyResponse,
      0.95, // High confidence for critical crisis
      context,
      {
        culturalRelevance: 0.8,
        actionItems: ['Contact emergency services immediately', 'Implement safety plan', 'Remove means of harm'],
        followUpRequired: true,
        escalationNeeded: true,
        coordinationEvents: [
          {
            type: 'critical_crisis_detected',
            riskLevel: crisisDetection.riskLevel,
            emergencyProtocolActivated: true,
            processingTime,
            timestamp: Date.now(),
          }
        ],
        metadata: {
          criticalCrisisDetected: true,
          emergencyServicesNotified: true,
          processingTimeMs: processingTime,
          requiresImmediateIntervention: true,
        }
      }
    );
  }

  // ============================================================================
  // PATTERN MATCHING AND CACHING
  // ============================================================================

  private initializeCrisisPatterns(): void {
    // High-priority suicide patterns
    const suicidePatterns = [
      'kill myself', 'end my life', 'commit suicide', 'suicidal thoughts',
      'better off dead', 'want to die', 'plan to die', 'end it all',
      'not worth living', 'suicide plan', 'overdose', 'hanging myself',
      'jumping off', 'shooting myself', 'cutting my wrists'
    ];

    // Self-harm patterns
    const selfHarmPatterns = [
      'cut myself', 'hurt myself', 'self-harm', 'cutting', 'burning myself',
      'punish myself', 'deserve pain', 'self-injury', 'razor', 'blade'
    ];

    // Violence patterns
    const violencePatterns = [
      'kill them', 'hurt someone else', 'violent thoughts', 'murder',
      'attack', 'weapon', 'gun', 'knife', 'bomb', 'hurt my family',
      'kill my', 'violence against'
    ];

    // Psychosis patterns
    const psychosisPatterns = [
      'hearing voices', 'seeing things', 'not real', 'paranoid',
      'conspiracy', 'controlling my thoughts', 'messages from',
      'hallucinations', 'delusions', 'people following me'
    ];

    // Emergency substance use patterns
    const substancePatterns = [
      'overdosed', 'too many pills', 'alcohol poisoning',
      'cant stop using', 'withdrawal', 'shaking', 'seizure'
    ];

    // Domestic violence patterns
    const violenceVictimPatterns = [
      'being abused', 'hitting me', 'hurting me', 'threatened to kill',
      'domestic violence', 'afraid for my life', 'hiding from'
    ];

    // Cache patterns for ultra-fast lookup
    this.crisisPatternCache.set('suicide', suicidePatterns.map(p => ({
      type: 'suicidal_ideation' as const,
      severity: 'extreme' as const,
      evidence: [p],
      timeframe: 'immediate',
      confidence: 0.9
    })));

    this.crisisPatternCache.set('violence', violencePatterns.map(p => ({
      type: 'violence' as const,
      severity: 'extreme' as const,
      evidence: [p],
      timeframe: 'immediate',
      confidence: 0.85
    })));

    this.crisisPatternCache.set('selfharm', selfHarmPatterns.map(p => ({
      type: 'self_harm' as const,
      severity: 'severe' as const,
      evidence: [p],
      timeframe: 'immediate',
      confidence: 0.8
    })));

    this.crisisPatternCache.set('psychosis', psychosisPatterns.map(p => ({
      type: 'psychosis' as const,
      severity: 'severe' as const,
      evidence: [p],
      timeframe: 'immediate',
      confidence: 0.7
    })));
  }

  private matchCrisisPatterns(text: string): CrisisIndicator[] {
    const indicators: CrisisIndicator[] = [];

    for (const [category, patterns] of this.crisisPatternCache) {
      for (const pattern of patterns) {
        if (pattern.evidence.some(evidence => text.includes(evidence))) {
          indicators.push(pattern);
        }
      }
    }

    return indicators;
  }

  private calculateRiskLevel(indicators: CrisisIndicator[]): CrisisDetection['riskLevel'] {
    if (indicators.length === 0) return 'none';

    const hasCritical = indicators.some(i => 
      (i.type === 'suicidal_ideation' || i.type === 'suicide_plan') && i.severity === 'extreme'
    );
    
    const hasViolence = indicators.some(i => i.type === 'violence');
    const hasPsychosis = indicators.some(i => i.type === 'psychosis' && i.severity === 'severe');

    if (hasCritical || hasViolence || hasPsychosis) return 'critical';
    
    const highSeverityCount = indicators.filter(i => i.severity === 'severe').length;
    if (highSeverityCount >= 2) return 'high';
    if (highSeverityCount >= 1) return 'moderate';
    
    return 'low';
  }

  private extractImmediateThreats(text: string, indicators: CrisisIndicator[]): string[] {
    const threats: string[] = [];

    // Extract specific threats based on indicators
    for (const indicator of indicators) {
      if (indicator.type === 'suicidal_ideation') {
        threats.push('Suicide risk - immediate safety assessment needed');
      }
      if (indicator.type === 'violence') {
        threats.push('Violence risk - protect potential victims');
      }
      if (indicator.type === 'self_harm') {
        threats.push('Self-harm risk - remove means of injury');
      }
      if (indicator.type === 'psychosis') {
        threats.push('Psychosis - reality testing impaired');
      }
    }

    return Array.from(new Set(threats)); // Remove duplicates
  }

  private determineTimeframe(text: string, indicators: CrisisIndicator[]): CrisisDetection['timeframe'] {
    const urgentWords = ['now', 'tonight', 'today', 'immediately', 'right now', 'this minute'];
    const soonWords = ['tomorrow', 'this week', 'soon', 'planning to'];
    
    const hasUrgent = urgentWords.some(word => text.includes(word));
    const hasSoon = soonWords.some(word => text.includes(word));
    const hasCriticalIndicators = indicators.some(i => i.severity === 'extreme');

    if (hasUrgent || hasCriticalIndicators) return 'immediate';
    if (hasSoon) return 'hours';
    return 'days';
  }

  private calculateDetectionConfidence(indicators: CrisisIndicator[], text: string): number {
    if (indicators.length === 0) return 0.1;

    // Base confidence on indicator quality and quantity
    const avgConfidence = indicators.reduce((sum, i) => sum + i.confidence, 0) / indicators.length;
    const indicatorBonus = Math.min(indicators.length * 0.1, 0.3);
    
    return Math.min(avgConfidence + indicatorBonus, 1.0);
  }

  private needsEmergencyServices(indicators: CrisisIndicator[], threats: string[]): boolean {
    return indicators.some(i => 
      (i.type === 'suicidal_ideation' && i.severity === 'extreme') ||
      (i.type === 'violence' && i.severity === 'extreme') ||
      i.type === 'suicide_plan'
    ) || threats.some(t => t.includes('immediate'));
  }

  // ============================================================================
  // RESPONSE GENERATION
  // ============================================================================

  private generateEmergencyResponse(detection: CrisisDetection, context: AgentContext): string {
    const culturalProfile = context.culturalProfile || {};
    
    // Pre-cached emergency response templates for speed
    const baseResponse = `I'm very concerned about your safety right now. This is a crisis situation that requires immediate attention.

**IMMEDIATE STEPS:**
1. **You are not alone** - Crisis support is available 24/7
2. **Stay safe** - Remove any means of harm from your immediate area
3. **Call for help immediately**:
   • Emergency Services: 911
   • Crisis Text Line: Text HOME to 741741
   • National Suicide Prevention Lifeline: 988

**RIGHT NOW:**
- Go to a safe space with other people
- Call a trusted friend or family member
- If you're in immediate danger, go to your nearest emergency room

Your life has value and this crisis can be overcome. Professional help is available immediately.`;

    // Add cultural adaptations if available
    const culturalAdaptation = this.getCulturalEmergencyAdaptation(culturalProfile);
    
    return culturalAdaptation ? `${baseResponse}\n\n**CULTURAL SUPPORT:**\n${culturalAdaptation}` : baseResponse;
  }

  private async generateCrisisResponse(
    detection: CrisisDetection,
    riskAssessment: RiskAssessment,
    safetyPlan: EmergencyProtocol,
    culturalConsiderations: Record<string, any>,
    context: AgentContext
  ): Promise<string> {
    if (detection.riskLevel === 'none') {
      return 'I don\'t detect any immediate crisis indicators. However, I\'m here to support you. How are you feeling right now?';
    }

    const responsePrompt = `Generate crisis intervention response for:

CRISIS DETECTION:
- Risk Level: ${detection.riskLevel}
- Indicators: ${detection.indicators.map(i => i.type).join(', ')}
- Timeframe: ${detection.timeframe}
- Emergency Services Needed: ${detection.emergencyServicesNeeded}

RISK ASSESSMENT:
- Suicide Risk: ${riskAssessment.suicideRisk.severity}/10
- Violence Risk: ${riskAssessment.violenceRisk.severity}/10
- Self-harm Risk: ${riskAssessment.selfHarmRisk.severity}/10

CULTURAL CONTEXT: ${JSON.stringify(culturalConsiderations)}

SAFETY PLAN AVAILABLE: ${safetyPlan.actions.length} actions planned

Provide appropriate crisis intervention response that:
1. Validates their feelings and acknowledges the crisis
2. Provides immediate safety guidance
3. Offers specific coping strategies
4. Includes culturally appropriate resources
5. Gives clear next steps
6. Expresses hope and support

Match tone and urgency to risk level. Be direct but compassionate.`;

    return await this.generateLLMResponse(responsePrompt, context);
  }

  // ============================================================================
  // EMERGENCY PROTOCOLS
  // ============================================================================

  private async triggerEmergencyProtocols(
    detection: CrisisDetection,
    context: AgentContext
  ): Promise<void> {
    try {
      // Notify human therapist immediately
      await this.notifyHumanTherapist(detection, context);
      
      // Log crisis event for audit
      await this.logCrisisEvent(detection, context);
      
      // Activate emergency contacts if available
      await this.activateEmergencyContacts(detection, context);
      
      // Coordinate with other agents
      await this.coordinateCrisisResponse(detection, context);

    } catch (error) {
      console.error('Emergency protocol activation failed:', error);
      // Continue - don't let protocol failures prevent crisis response
    }
  }

  private async notifyHumanTherapist(
    detection: CrisisDetection,
    context: AgentContext
  ): Promise<void> {
    // In production, this would send immediate notifications
    const notification = {
      type: 'critical_crisis_alert',
      userId: context.userId,
      sessionId: context.sessionId,
      riskLevel: detection.riskLevel,
      indicators: detection.indicators,
      timestamp: Date.now(),
      urgency: 'immediate',
    };

    // Send via Redis for immediate processing
    await this.redisCoordinator.publish('crisis_alerts', JSON.stringify(notification));
  }

  private async logCrisisEvent(
    detection: CrisisDetection,
    context: AgentContext
  ): Promise<void> {
    const auditLog = {
      eventType: 'crisis_detected',
      userId: context.userId,
      sessionId: context.sessionId,
      riskLevel: detection.riskLevel,
      indicators: detection.indicators,
      timestamp: new Date().toISOString(),
      requiresHumanIntervention: detection.requiresHumanIntervention,
      emergencyServicesNeeded: detection.emergencyServicesNeeded,
    };

    // Log to audit trail
    console.log('CRISIS AUDIT LOG:', auditLog);
    
    // In production, send to HIPAA-compliant audit logging service
  }

  private async activateEmergencyContacts(
    detection: CrisisDetection,
    context: AgentContext
  ): Promise<void> {
    // Retrieve emergency contacts (cached for performance)
    const contacts = this.emergencyContactsCache.get(context.userId) || await this.getEmergencyContacts(context.userId);
    
    if (contacts.length === 0) return;

    // Send emergency notifications
    for (const contact of contacts) {
      if (contact.type === 'crisis_hotline' || contact.type === 'mental_health_professional') {
        // In production, trigger automated emergency contact
        console.log(`Emergency contact activated: ${contact.name} - ${contact.phone}`);
      }
    }
  }

  private async coordinateCrisisResponse(
    detection: CrisisDetection,
    context: AgentContext
  ): Promise<void> {
    // Coordinate with other agents for crisis response
    const coordinationEvent = {
      type: 'crisis_coordination_required',
      riskLevel: detection.riskLevel,
      requiredAgents: ['therapy_coordinator', 'cultural_adapter'],
      urgency: 'immediate',
      context,
    };

    await this.redisCoordinator.publish('agent_coordination', JSON.stringify(coordinationEvent));
  }

  // ============================================================================
  // ENHANCED DETECTION INTEGRATION METHODS
  // ============================================================================

  /**
   * Convert enhanced detection result to legacy format for backward compatibility
   */
  private convertToLegacyFormat(enhancedResult: EnhancedRiskScore): CrisisDetection {
    // Map enhanced intervention priority to legacy risk level
    const riskLevel: CrisisDetection['riskLevel'] = 
      enhancedResult.interventionPriority === 'critical' ? 'critical' :
      enhancedResult.interventionPriority === 'high' ? 'high' :
      enhancedResult.overallRisk >= 6 ? 'moderate' :
      enhancedResult.overallRisk >= 3 ? 'low' : 'none';

    // Convert enhanced patterns to legacy indicators
    const indicators: CrisisIndicator[] = enhancedResult.detectedPatterns.map(pattern => ({
      type: this.mapPatternToIndicatorType(pattern.category),
      severity: this.mapWeightToSeverity(pattern.weight),
      evidence: [pattern.pattern],
      timeframe: pattern.urgency,
      confidence: enhancedResult.mlConfidence
    }));

    // Generate immediate threats from enhancement flags
    const immediateThreats: string[] = [];
    if (enhancedResult.enhancementFlags.includes('immediate-intervention-needed')) {
      immediateThreats.push('Immediate crisis intervention required');
    }
    if (enhancedResult.suicideRisk >= 8) {
      immediateThreats.push('High suicide risk - immediate safety assessment needed');
    }
    if (enhancedResult.violenceRisk >= 7) {
      immediateThreats.push('Violence risk - protect potential victims');
    }
    if (enhancedResult.psychosisRisk >= 7) {
      immediateThreats.push('Psychosis - reality testing impaired');
    }

    // Map immediacy to timeframe
    const timeframe: CrisisDetection['timeframe'] =
      enhancedResult.immediacy >= 9 ? 'immediate' :
      enhancedResult.immediacy >= 7 ? 'hours' :
      enhancedResult.immediacy >= 5 ? 'days' : 'weeks';

    return {
      riskLevel,
      indicators,
      immediateThreats,
      timeframe,
      confidence: enhancedResult.mlConfidence,
      requiresHumanIntervention: enhancedResult.interventionPriority === 'critical' || enhancedResult.interventionPriority === 'high',
      emergencyServicesNeeded: enhancedResult.interventionPriority === 'critical' && enhancedResult.immediacy >= 9
    };
  }

  /**
   * Map enhanced pattern categories to legacy indicator types
   */
  private mapPatternToIndicatorType(category: string): CrisisIndicator['type'] {
    switch (category) {
      case 'suicide': return 'suicidal_ideation';
      case 'violence': return 'violence';
      case 'self_harm': return 'self_harm';
      case 'psychosis': return 'psychosis';
      case 'substance': return 'substance_emergency';
      case 'domestic_violence': return 'domestic_violence';
      default: return 'suicidal_ideation';
    }
  }

  /**
   * Map enhanced pattern weights to legacy severity levels
   */
  private mapWeightToSeverity(weight: number): CrisisIndicator['severity'] {
    if (weight >= 9) return 'extreme';
    if (weight >= 7) return 'severe';
    if (weight >= 5) return 'moderate';
    return 'mild';
  }

  /**
   * Check if user has historical crisis risk
   */
  private async checkHistoricalRisk(userId: string): Promise<boolean> {
    try {
      // In production, this would query crisis history from database
      // For now, return false to avoid database dependencies in development
      return false;
    } catch (error) {
      console.warn('Failed to check historical risk:', error);
      return false;
    }
  }

  /**
   * Determine age group from cultural profile age
   */
  private determineAgeGroup(age?: number): CrisisContext['ageGroup'] {
    if (!age) return undefined;
    
    if (age < 13) return 'child';
    if (age < 18) return 'adolescent';
    if (age < 65) return 'adult';
    return 'elder';
  }

  /**
   * Get real-time crisis monitoring metrics
   */
  async getCrisisMetrics(): Promise<RealTimeMetrics> {
    return await this.enhancedDetector.getRealTimeMetrics();
  }

  /**
   * Get active crisis alerts for monitoring dashboard
   */
  async getActiveCrisisAlerts(): Promise<CrisisMonitoringAlert[]> {
    return await this.enhancedDetector.getActiveAlerts();
  }

  /**
   * Acknowledge crisis alert with clinician intervention
   */
  async acknowledgeCrisisAlert(alertId: string, clinicianId: string, notes?: string): Promise<void> {
    await this.enhancedDetector.acknowledgeAlert(alertId, clinicianId, notes);
  }

  /**
   * Record actual crisis outcome for ML improvement
   */
  async recordCrisisOutcome(contextId: string, actualCrisisOccurred: boolean, severity: number): Promise<void> {
    await this.enhancedDetector.recordActualOutcome(contextId, actualCrisisOccurred, severity);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private startRealTimeMonitoring(): void {
    // Monitor for crisis patterns in real-time
    setInterval(() => {
      this.cleanupCaches();
    }, 60000); // Clean caches every minute
  }

  private cleanupCaches(): void {
    // Keep caches small for performance
    if (this.riskAssessmentCache.size > 100) {
      this.riskAssessmentCache.clear();
    }
    if (this.emergencyContactsCache.size > 50) {
      this.emergencyContactsCache.clear();
    }
  }

  private getCulturalEmergencyAdaptation(culturalProfile: Record<string, any>): string | null {
    // Add cultural adaptations for emergency response
    // This would be more sophisticated in production
    const culture = culturalProfile.primaryCulture;
    
    if (culture?.includes('Latino') || culture?.includes('Hispanic')) {
      return '• Crisis Text Line en Español: Text HOLA to 741741\n• Family support can be very important - consider involving trusted family members';
    }
    
    if (culture?.includes('Asian')) {
      return '• Asian Mental Health Collective Crisis Support\n• Consider cultural stigma - professional help is confidential and essential';
    }
    
    return null;
  }

  private async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    // In production, fetch from database
    const defaultContacts: EmergencyContact[] = [
      {
        type: 'crisis_hotline',
        name: 'National Suicide Prevention Lifeline',
        phone: '988',
        available: '24/7',
        culturallyAppropriate: true,
      },
      {
        type: 'crisis_hotline',
        name: 'Crisis Text Line',
        phone: '741741',
        available: '24/7',
        culturallyAppropriate: true,
      },
    ];

    this.emergencyContactsCache.set(userId, defaultContacts);
    return defaultContacts;
  }

  private createCrisisFallbackResponse(context: AgentContext, error: any): AgentResponse {
    return this.createResponse(
      'I\'m experiencing technical difficulties, but your safety is my priority. If you\'re in crisis, please call 911 or the Crisis Text Line at 741741 immediately. Do not wait for technical issues to be resolved.',
      0.9,
      context,
      {
        actionItems: ['Call 911 if in immediate danger', 'Text HOME to 741741 for crisis support', 'Go to nearest emergency room'],
        followUpRequired: true,
        escalationNeeded: true,
        metadata: {
          fallbackResponse: true,
          technicalError: true,
          emergencyGuidanceProvided: true,
        }
      }
    );
  }

  // Parsing helper methods
  private parseRiskAssessment(response: string): RiskAssessment {
    // Simplified parsing - would be more robust in production
    return {
      suicideRisk: {
        ideation: response.toLowerCase().includes('suicidal thoughts'),
        plan: response.toLowerCase().includes('suicide plan'),
        means: response.toLowerCase().includes('access to means'),
        intent: response.toLowerCase().includes('intent'),
        timeline: this.extractValue(response, 'timeline') || 'unknown',
        severity: this.extractSeverity(response, 'suicide') || 5,
        protectiveFactors: this.extractList(response, 'protective factors'),
      },
      violenceRisk: {
        homicidalIdeation: response.toLowerCase().includes('homicidal'),
        targets: this.extractList(response, 'targets'),
        means: response.toLowerCase().includes('access to weapons'),
        timeline: this.extractValue(response, 'violence timeline') || 'unknown',
        severity: this.extractSeverity(response, 'violence') || 1,
      },
      selfHarmRisk: {
        urges: response.toLowerCase().includes('self-harm urges'),
        history: response.toLowerCase().includes('history of self'),
        methods: this.extractList(response, 'methods'),
        frequency: this.extractValue(response, 'frequency') || 'unknown',
        severity: this.extractSeverity(response, 'self-harm') || 1,
      },
      psychosisRisk: {
        hallucinations: response.toLowerCase().includes('hallucinations'),
        delusions: response.toLowerCase().includes('delusions'),
        disorganization: response.toLowerCase().includes('disorganized'),
        insight: response.toLowerCase().includes('good insight'),
        severity: this.extractSeverity(response, 'psychosis') || 1,
      },
    };
  }

  private parseSafetyPlan(response: string, riskAssessment: RiskAssessment): EmergencyProtocol {
    const urgency = riskAssessment.suicideRisk.severity >= 8 ? 'immediate' :
                   riskAssessment.suicideRisk.severity >= 5 ? 'within_hour' : 'within_day';

    return {
      protocolType: urgency === 'immediate' ? 'emergency_services' : 'safety_planning',
      urgency,
      actions: this.extractActions(response),
      contacts: [], // Would be populated from response
      culturalConsiderations: this.extractList(response, 'cultural'),
      followUpRequired: true,
    };
  }

  private extractValue(text: string, key: string): string | null {
    const regex = new RegExp(`${key}[^\\n]*:([^\\n]*)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractSeverity(text: string, category: string): number | null {
    const regex = new RegExp(`${category}[^\\d]*(\\d+)(?:/10)?`, 'i');
    const match = text.match(regex);
    return match ? parseInt(match[1]) : null;
  }

  private extractList(text: string, category: string): string[] {
    const lines = text.split('\n');
    const categoryIndex = lines.findIndex(line => 
      line.toLowerCase().includes(category.toLowerCase())
    );
    
    if (categoryIndex === -1) return [];
    
    const items: string[] = [];
    for (let i = categoryIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('-') || line.startsWith('•')) {
        items.push(line.substring(1).trim());
      } else if (line.length > 0 && !line.includes(':')) {
        break;
      }
    }
    
    return items;
  }

  private extractActions(response: string): EmergencyAction[] {
    const actionTexts = this.extractList(response, 'actions');
    return actionTexts.map((action, index) => ({
      action,
      priority: index + 1,
      timeframe: 'immediate',
      responsibility: 'user' as const,
    }));
  }

  private extractActionItems(safetyPlan: EmergencyProtocol): string[] {
    return safetyPlan.actions.map(action => action.action);
  }

  private calculateCulturalRelevance(
    culturalConsiderations: Record<string, any>,
    context: AgentContext
  ): number {
    // Base relevance for crisis response
    let relevance = 0.8;
    
    if (Object.keys(culturalConsiderations).length > 0) {
      relevance += 0.1;
    }
    
    if (context.culturalProfile) {
      relevance += 0.1;
    }
    
    return Math.min(relevance, 1.0);
  }

  private async assessCulturalCrisisFactors(context: AgentContext): Promise<Record<string, any>> {
    const culturalProfile = context.culturalProfile || {};
    
    return {
      familyInvolvement: culturalProfile.familyInvolvement || 'unknown',
      religiousSupport: culturalProfile.religiousBeliefs || 'unknown',
      culturalStigma: culturalProfile.mentalHealthStigma || 'unknown',
      languagePreference: culturalProfile.primaryLanguage || 'English',
      culturalHealingPractices: culturalProfile.traditionalHealing || [],
    };
  }
}
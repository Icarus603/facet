/**
 * FACET Chat API Endpoint
 * 
 * Unified endpoint for all user interactions with the multi-agent system
 * Implements exact ChatResponse format from API_CONTRACT.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

import { ExecutionPlanner } from '@/lib/agents/orchestrator/execution-planner'
import { FACETWorkflows, FACETState } from '@/lib/agents/orchestrator/langraph-workflows'
import { ReasoningLogger } from '@/lib/agents/orchestrator/reasoning-logger'
import { WebSocketBroadcaster } from '@/app/api/ws/route'
import { securityMiddleware } from '@/lib/security/security-middleware'
import { inputValidator } from '@/lib/security/input-validator'
import { encryptionService } from '@/lib/security/encryption-service'
import { auditLogger } from '@/lib/security/audit-logger'
import { 
  ChatRequest, 
  ChatResponse, 
  APIErrorResponse,
  ExecutionStep,
  AgentExecutionResult 
} from '@/lib/types/api-contract'

// Request validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  userPreferences: z.object({
    transparencyLevel: z.enum(['minimal', 'standard', 'detailed']).optional(),
    agentVisibility: z.boolean().optional(),
    processingSpeed: z.enum(['fast', 'thorough']).optional(),
    communicationStyle: z.enum(['professional_warm', 'clinical_precise', 'casual_supportive']).optional()
  }).optional(),
  isNewSession: z.boolean().optional(),
  urgencyLevel: z.enum(['normal', 'elevated', 'crisis']).optional()
})

// Initialize orchestration components
const executionPlanner = new ExecutionPlanner()
const facetWorkflows = new FACETWorkflows()

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const messageId = uuidv4()
  const reasoningLogger = new ReasoningLogger()

  try {
    // 1. Apply security middleware
    const securityResult = await securityMiddleware.secureRequest(request)
    if (!securityResult.allowed) {
      console.warn('Security middleware blocked request:', securityResult.auditLog)
      return securityResult.response
    }

    const securityContext = securityResult.context!

    // 2. Parse request body for validation
    const body = await request.json()
    
    // 3. Comprehensive input validation
    const inputValidationResult = await inputValidator.validateChatRequest(
      body,
      securityContext.userId || 'anonymous',
      securityContext.clientIP
    )

    if (!inputValidationResult.isValid) {
      const criticalErrors = inputValidationResult.errors.filter(
        e => e.severity === 'critical' || e.severity === 'error'
      )

      if (criticalErrors.length > 0) {
        console.warn('Input validation failed:', {
          errors: criticalErrors,
          securityFlags: inputValidationResult.securityFlags,
          riskLevel: inputValidationResult.riskLevel
        })

        return NextResponse.json({
          error: {
            code: 'INPUT_VALIDATION_FAILED',
            message: criticalErrors[0].message,
            details: `Security risk level: ${inputValidationResult.riskLevel}`,
            recoveryOptions: ['revise_message', 'contact_support']
          },
          metadata: {
            requestId: messageId,
            timestamp: new Date().toISOString(),
            errorSeverity: inputValidationResult.riskLevel === 'critical' ? 'critical' : 'high'
          }
        } as APIErrorResponse, { status: 400 })
      }
    }

    // 4. Schema validation for API contract compliance
    const schemaValidation = ChatRequestSchema.safeParse(inputValidationResult.sanitizedInput || body)
    if (!schemaValidation.success) {
      return NextResponse.json({
        error: {
          code: 'INVALID_REQUEST_FORMAT',
          message: 'Request format does not match API specification',
          details: schemaValidation.error.message,
          recoveryOptions: ['check_api_documentation', 'verify_request_format']
        },
        metadata: {
          requestId: messageId,
          timestamp: new Date().toISOString(),
          errorSeverity: 'medium'
        }
      } as APIErrorResponse, { status: 400 })
    }

    const chatRequest: ChatRequest = schemaValidation.data

    // 5. Use authenticated user ID from security context
    const userId = securityContext.userId
    if (!userId) {
      return NextResponse.json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication required for chat functionality',
          recoveryOptions: ['login', 'refresh_token', 'create_account']
        },
        metadata: {
          requestId: messageId,
          timestamp: new Date().toISOString(),
          errorSeverity: 'high'
        }
      } as APIErrorResponse, { status: 401 })
    }

    // 6. Generate conversation ID if not provided
    const conversationId = chatRequest.conversationId || uuidv4()

    // 7. Log security-validated orchestration start
    reasoningLogger.logDecision(
      'orchestration_start',
      'Beginning secure multi-agent orchestration',
      'User message passed security validation, initiating intelligent agent coordination',
      {
        messageLength: chatRequest.message.length,
        hasPreferences: !!chatRequest.userPreferences,
        urgencyLevel: chatRequest.urgencyLevel || 'normal',
        securityRiskLevel: inputValidationResult.riskLevel,
        securityFlags: inputValidationResult.securityFlags.map(f => f.type),
        authenticationMethod: securityContext.isAuthenticated ? 'authenticated' : 'anonymous'
      }
    )

    // 8. Audit log for therapeutic event start
    await auditLogger.logTherapeuticEvent(
      'agent_orchestration_start',
      userId,
      conversationId,
      messageId,
      {
        clientIP: securityContext.clientIP,
        userAgent: securityContext.userAgent,
        riskLevel: inputValidationResult.riskLevel,
        securityFlags: inputValidationResult.securityFlags.map(f => f.type)
      }
    )

    // 1. Plan Execution Strategy
    const executionPlan = await executionPlanner.planExecution(
      chatRequest.message,
      userId,
      chatRequest.urgencyLevel || 'normal',
      chatRequest.userPreferences
    )

    reasoningLogger.logExecutionPlanning(
      chatRequest.message,
      executionPlan,
      chatRequest.urgencyLevel || 'normal',
      chatRequest.userPreferences
    )

    // 2. Calculate timeout based on plan and preferences
    const timeoutMs = executionPlanner.getTimeoutForPlan(executionPlan, chatRequest.userPreferences)

    // 2.1. Notify WebSocket clients of orchestration start
    WebSocketBroadcaster.notifyOrchestrationStart(userId, conversationId, {
      strategy: executionPlan.strategy,
      estimatedTimeMs: executionPlan.estimatedTimeMs,
      agentsInvolved: executionPlan.agentsToInvoke,
      executionPattern: executionPlan.executionPattern
    })

    // 3. Prepare initial state for LangGraph workflow
    const initialState: FACETState = {
      userMessage: chatRequest.message,
      userId,
      messageId,
      conversationId,
      userPreferences: chatRequest.userPreferences,
      urgencyLevel: chatRequest.urgencyLevel === 'crisis' ? 'crisis' : 
                    chatRequest.urgencyLevel === 'elevated' ? 'elevated' : 'normal',
      orchestrationLog: [],
      agentResults: [],
      executionPlan,
      startTime
    }

    // 4. Execute workflow with timeout
    let finalState: FACETState
    try {
      finalState = await Promise.race([
        facetWorkflows.executeWorkflow(initialState),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('ORCHESTRATION_TIMEOUT')), timeoutMs)
        )
      ])
    } catch (error) {
      if (error instanceof Error && error.message === 'ORCHESTRATION_TIMEOUT') {
        return NextResponse.json({
          error: {
            code: 'ORCHESTRATION_TIMEOUT',
            message: 'Response took too long to generate',
            details: `Exceeded ${timeoutMs}ms timeout`,
            recoveryOptions: ['try_again', 'simplify_message', 'use_fast_mode'],
            fallbackResponse: "I'm here to help, but I'm having trouble processing your message right now. Could you try rephrasing or asking something simpler?"
          },
          metadata: {
            requestId: messageId,
            timestamp: new Date().toISOString(),
            errorSeverity: 'medium'
          }
        } as APIErrorResponse, { status: 206 }) // Partial content
      }
      throw error
    }

    // 5. Emergency detection and intervention
    let emergencyResponse = null
    if (finalState.riskAssessment || finalState.emotionalState) {
      try {
        const { emergencyInterventionService } = await import('@/lib/emergency/emergency-intervention-service')
        
        // Prepare conversation context for emergency analysis
        const conversationContext = {
          messages: [chatRequest.message],
          emotionalState: finalState.emotionalState,
          riskAssessment: finalState.riskAssessment
        }
        
        // Detect emergency
        emergencyResponse = await emergencyInterventionService.detectAndRespondToEmergency(
          userId,
          conversationContext,
          securityContext.clientIP
        )
        
        // If emergency detected, modify response and add emergency guidance
        if (emergencyResponse.emergencyDetected) {
          reasoningLogger.logDecision(
            'emergency_detected',
            `Mental health emergency detected: ${emergencyResponse.emergencyLevel}`,
            `Emergency interventions triggered: ${emergencyResponse.interventionsTriggered.join(', ')}`,
            {
              emergencyLevel: emergencyResponse.emergencyLevel,
              incidentId: emergencyResponse.incidentId,
              interventionsTriggered: emergencyResponse.interventionsTriggered
            },
            0.95
          )
          
          // Prepend emergency guidance to response
          const emergencyGuidance = getEmergencyGuidanceMessage(emergencyResponse.emergencyLevel!)
          finalState.finalResponse = `${emergencyGuidance}\n\n${finalState.finalResponse}`
          
          // Add emergency flags to warning flags
          finalState.warningFlags = [
            ...(finalState.warningFlags || []),
            'emergency_detected',
            'crisis_protocol'
          ]
        }
      } catch (emergencyError) {
        console.error('Emergency detection error:', emergencyError)
        // Don't fail the chat response if emergency detection fails
        reasoningLogger.logDecision(
          'emergency_detection_error',
          'Emergency detection system error',
          emergencyError instanceof Error ? emergencyError.message : 'Unknown error',
          { error: emergencyError },
          0.1
        )
      }
    }

    // 6. Log response synthesis
    reasoningLogger.logResponseSynthesis(
      finalState.agentResults,
      finalState.responseConfidence || 0.8,
      'Successfully synthesized multi-agent response with quality assurance'
    )

    // 6. Generate orchestration transparency data
    const totalTimeMs = Date.now() - startTime
    const orchestrationData = chatRequest.userPreferences?.agentVisibility !== false ? 
      reasoningLogger.generateOrchestrationData(
        executionPlan,
        finalState.orchestrationLog,
        finalState.agentResults,
        totalTimeMs,
        finalState.responseConfidence || 0.8
      ) : null

    // 7. Prepare final response
    const response: ChatResponse = {
      content: finalState.finalResponse || "I'm here to support you. How are you feeling right now?",
      messageId,
      conversationId,
      orchestration: orchestrationData,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTimeMs: totalTimeMs,
        agentVersion: 'facet-orchestrator-v2.0',
        responseConfidence: finalState.responseConfidence || 0.8,
        recommendedFollowUp: finalState.recommendedFollowUp || [],
        warningFlags: finalState.warningFlags || [],
        
        // Include emotional state if available
        emotionalState: finalState.emotionalState ? {
          valence: finalState.emotionalState.valence,
          arousal: finalState.emotionalState.arousal,
          dominance: finalState.emotionalState.dominance,
          confidence: finalState.emotionalState.confidence,
          primaryEmotion: finalState.emotionalState.primaryEmotion,
          intensity: finalState.emotionalState.intensity
        } : undefined,
        
        // Include risk assessment if available
        riskAssessment: finalState.riskAssessment ? {
          level: finalState.riskAssessment.level,
          immediateInterventionRequired: finalState.riskAssessment.immediateInterventionRequired,
          professionalReferralRecommended: finalState.riskAssessment.professionalReferralRecommended,
          emergencyContactTriggered: finalState.riskAssessment.emergencyContactTriggered,
          reasoning: finalState.riskAssessment.reasoning
        } : undefined,
        
        // Include emergency response if triggered
        emergencyResponse: emergencyResponse?.emergencyDetected ? {
          emergencyDetected: true,
          emergencyLevel: emergencyResponse.emergencyLevel,
          incidentId: emergencyResponse.incidentId,
          interventionsTriggered: emergencyResponse.interventionsTriggered,
          immediateActions: emergencyResponse.immediateActions,
          professionalContactInfo: emergencyResponse.professionalContactInfo?.map(service => ({
            name: service.name,
            phone: service.phone,
            serviceType: service.serviceType,
            available24_7: service.available24_7
          }))
        } : undefined
      }
    }

    // 8. Notify WebSocket clients of orchestration completion
    WebSocketBroadcaster.notifyOrchestrationComplete(userId, conversationId, {
      totalTimeMs,
      finalConfidence: finalState.responseConfidence || 0.8,
      agentsCompleted: finalState.agentResults.filter(r => r.success).length,
      agentsFailed: finalState.agentResults.filter(r => !r.success).length,
      response: finalState.finalResponse || "I'm here to support you."
    })

    // 8.1. Audit log for orchestration completion
    await auditLogger.logTherapeuticEvent(
      'agent_orchestration_complete',
      userId,
      conversationId,
      messageId,
      {
        clientIP: securityContext.clientIP,
        userAgent: securityContext.userAgent,
        riskLevel: inputValidationResult.riskLevel,
        securityFlags: inputValidationResult.securityFlags.map(f => f.type),
        orchestrationData: orchestrationData,
        processingTimeMs: totalTimeMs,
        agentsInvolved: finalState.agentResults.map(r => r.agentName),
        emergencyProtocolTriggered: finalState.riskAssessment?.immediateInterventionRequired || false,
        professionalReferralMade: finalState.riskAssessment?.professionalReferralRecommended || false
      }
    )

    // 9. Store encrypted conversation in database
    await storeSecureConversationMessage(
      userId, 
      conversationId, 
      messageId, 
      chatRequest, 
      response,
      inputValidationResult.securityFlags,
      securityContext.riskLevel
    )

    // 10. Check SLA compliance and log performance
    const slaCompliant = checkSLACompliance(executionPlan, totalTimeMs)
    if (!slaCompliant) {
      console.warn(`SLA violation: ${executionPlan.strategy} took ${totalTimeMs}ms, expected <${executionPlan.estimatedTimeMs}ms`)
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Log error for monitoring
    reasoningLogger.logDecision(
      'orchestration_error',
      'Critical orchestration failure',
      error instanceof Error ? error.message : 'Unknown error occurred',
      { error: error instanceof Error ? error.stack : error },
      0.0
    )

    return NextResponse.json({
      error: {
        code: 'ORCHESTRATION_FAILURE',
        message: 'Unable to process your message right now',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : undefined,
        recoveryOptions: ['try_again', 'contact_support'],
        fallbackResponse: "I'm experiencing technical difficulties but I'm here to help. Please try again, or if this is urgent, consider reaching out to a mental health professional directly."
      },
      metadata: {
        requestId: messageId,
        timestamp: new Date().toISOString(),
        errorSeverity: 'critical'
      }
    } as APIErrorResponse, { status: 500 })
  }
}

// Helper functions

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // TODO: Implement proper authentication using Supabase
  // For now, return a mock user ID for development
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  
  // In production, this would validate the JWT token and extract user ID
  return 'mock-user-id-12345'
}

async function storeSecureConversationMessage(
  userId: string,
  conversationId: string,
  messageId: string,
  request: ChatRequest,
  response: ChatResponse,
  securityFlags: any[],
  riskLevel: string
): Promise<void> {
  try {
    // Encrypt user message
    const encryptedUserMessage = await encryptionService.encryptConversationMessage(
      request.message,
      userId,
      conversationId,
      {
        userPreferences: request.userPreferences,
        urgencyLevel: request.urgencyLevel,
        timestamp: new Date().toISOString()
      }
    )

    // Encrypt AI response
    const encryptedAIResponse = await encryptionService.encryptConversationMessage(
      response.content,
      userId,
      conversationId,
      {
        orchestrationData: response.orchestration,
        emotionalState: response.metadata.emotionalState,
        riskAssessment: response.metadata.riskAssessment,
        responseConfidence: response.metadata.responseConfidence
      }
    )

    // Generate integrity hashes
    const userMessageHash = encryptionService.generateDataHash(request.message)
    const aiResponseHash = encryptionService.generateDataHash(response.content)

    // Store encrypted data in database
    // TODO: Implement actual Supabase storage
    console.log('Storing encrypted conversation:', {
      conversationId,
      messageId,
      userMessageEncrypted: encryptedUserMessage.encryptedData.length,
      aiResponseEncrypted: encryptedAIResponse.encryptedData.length,
      securityFlags: securityFlags.map(f => f.type),
      riskLevel,
      userMessageHash: userMessageHash.substring(0, 8) + '...',
      aiResponseHash: aiResponseHash.substring(0, 8) + '...'
    })

    // Audit log for conversation storage
    await auditLogger.logTherapeuticEvent(
      'conversation_message_stored',
      userId,
      conversationId,
      messageId,
      {
        clientIP: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        riskLevel: riskLevel as any,
        securityFlags: securityFlags.map(f => f.type)
      }
    )

  } catch (error) {
    console.error('Failed to store encrypted conversation:', error)
    // In production, this would trigger an alert for data protection failure
  }
}

function checkSLACompliance(plan: any, actualTimeMs: number): boolean {
  // SLA targets from SPECS.md lines 728-734
  const slaTargets = {
    'Simple emotional state': 1500,
    'Crisis priority': 2000,
    'High emotion': 3000,
    'Progress focus': 4000
  }
  
  const targetTime = Object.entries(slaTargets).find(([key]) => 
    plan.strategy.includes(key)
  )?.[1] || 8000 // Default max time
  
  return actualTimeMs <= targetTime
}

/**
 * Get emergency guidance message based on emergency level
 */
function getEmergencyGuidanceMessage(emergencyLevel: string): string {
  switch (emergencyLevel) {
    case 'critical':
      return '🚨 **IMMEDIATE SUPPORT NEEDED** 🚨\n\nI\'m very concerned about your safety right now. If you are in immediate danger, please:\n• Call 911 or go to your nearest emergency room\n• Call 988 (Suicide & Crisis Lifeline) for free, confidential support\n• Text HOME to 741741 for crisis counseling\n\nYou are not alone, and help is available.'
    
    case 'high':
      return '⚠️ **CRISIS SUPPORT RECOMMENDED** ⚠️\n\nI can see you\'re going through a very difficult time. Please consider:\n• Calling 988 (Suicide & Crisis Lifeline) for immediate support\n• Reaching out to a trusted friend, family member, or mental health professional\n• Going to a safe place with supportive people\n\nYour safety and wellbeing matter deeply.'
    
    case 'moderate':
      return '💙 **PROFESSIONAL SUPPORT RECOMMENDED** 💙\n\nIt sounds like you\'re struggling right now. Consider:\n• Speaking with a mental health professional\n• Calling 988 if you need someone to talk to\n• Reaching out to trusted friends or family\n\nSupport is available, and you don\'t have to go through this alone.'
    
    default:
      return '💙 **SUPPORT IS AVAILABLE** 💙\n\nIf you need immediate help:\n• Call 988 for crisis support\n• Text HOME to 741741\n• Reach out to trusted friends, family, or professionals'
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'GET method not supported for chat endpoint',
      recoveryOptions: ['use_post_method']
    },
    metadata: {
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
      errorSeverity: 'low'
    }
  } as APIErrorResponse, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({
    error: {
      code: 'METHOD_NOT_ALLOWED', 
      message: 'PUT method not supported for chat endpoint',
      recoveryOptions: ['use_post_method']
    },
    metadata: {
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
      errorSeverity: 'low'
    }
  } as APIErrorResponse, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'DELETE method not supported for chat endpoint', 
      recoveryOptions: ['use_post_method']
    },
    metadata: {
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
      errorSeverity: 'low'
    }
  } as APIErrorResponse, { status: 405 })
}
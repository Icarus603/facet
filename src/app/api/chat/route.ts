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
import { FACETOrchestrator } from '@/lib/agents/orchestrator/langchain-orchestrator'
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
const facetOrchestrator = new FACETOrchestrator()

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const messageId = uuidv4()
  const reasoningLogger = new ReasoningLogger()

  console.log('🚀 API CHAT REQUEST RECEIVED:', {
    method: request.method,
    url: request.url,
    messageId,
    timestamp: new Date().toISOString()
  })

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

    // 2. Log execution plan for monitoring
    console.log('📋 Execution plan:', {
      strategy: executionPlan.strategy,
      baseEstimate: executionPlan.estimatedTimeMs,
      processingSpeed: chatRequest.userPreferences?.processingSpeed,
      agentsToInvoke: executionPlan.agentsToInvoke
    })

    // 2.1. Notify WebSocket clients of orchestration start
    WebSocketBroadcaster.notifyOrchestrationStart(userId, conversationId, {
      strategy: executionPlan.strategy,
      estimatedTimeMs: executionPlan.estimatedTimeMs,
      agentsInvolved: executionPlan.agentsToInvoke,
      executionPattern: executionPlan.executionPattern
    })

    // FACETOrchestrator will handle all the state management internally

    // 4. Execute orchestrator - let therapeutic responses complete naturally
    let orchestratorResponse: ChatResponse
    try {
      orchestratorResponse = await facetOrchestrator.processMessage(chatRequest, userId)
    } catch (error) {
      throw error
    }

    // FACETOrchestrator has already handled emergency detection and all orchestration logic

    // FACETOrchestrator has already built the complete ChatResponse
    const totalTimeMs = Date.now() - startTime
    
    // Update timing metadata to reflect actual processing time
    orchestratorResponse.metadata.processingTimeMs = totalTimeMs

    // 🔍 CRITICAL DEBUG: Log exact response content before returning
    console.log('🚨 CRITICAL API RESPONSE DEBUG:', {
      messageId,
      hasContent: !!orchestratorResponse.content,
      contentType: typeof orchestratorResponse.content,
      contentLength: orchestratorResponse.content?.length,
      actualContent: orchestratorResponse.content,
      orchestrationPresent: !!orchestratorResponse.orchestration,
      metadataPresent: !!orchestratorResponse.metadata,
      responseStructure: Object.keys(orchestratorResponse)
    })

    // 8. Notify WebSocket clients of orchestration completion
    WebSocketBroadcaster.notifyOrchestrationComplete(userId, conversationId, {
      totalTimeMs,
      finalConfidence: orchestratorResponse.metadata.responseConfidence,
      agentsCompleted: orchestratorResponse.orchestration?.agentResults?.filter(r => r.success).length || 0,
      agentsFailed: orchestratorResponse.orchestration?.agentResults?.filter(r => !r.success).length || 0,
      response: orchestratorResponse.content
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
        orchestrationData: orchestratorResponse.orchestration,
        processingTimeMs: totalTimeMs,
        agentsInvolved: orchestratorResponse.orchestration?.agentResults?.map(r => r.agentName) || [],
        emergencyProtocolTriggered: orchestratorResponse.metadata.riskAssessment?.immediateInterventionRequired || false,
        professionalReferralMade: orchestratorResponse.metadata.riskAssessment?.professionalReferralRecommended || false
      }
    )

    // 9. Store encrypted conversation in database
    await storeSecureConversationMessage(
      userId, 
      conversationId, 
      messageId, 
      chatRequest, 
      orchestratorResponse,
      inputValidationResult.securityFlags,
      securityContext.riskLevel,
      securityContext
    )

    // 10. Check SLA compliance and log performance
    const slaCompliant = checkSLACompliance(executionPlan, totalTimeMs)
    if (!slaCompliant) {
      console.warn(`SLA violation: ${executionPlan.strategy} took ${totalTimeMs}ms, expected <${executionPlan.estimatedTimeMs}ms`)
    }

    return NextResponse.json(orchestratorResponse)

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
  riskLevel: string,
  securityContext: any
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
        clientIP: securityContext.clientIP || 'unknown',
        userAgent: securityContext.userAgent || 'unknown',
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
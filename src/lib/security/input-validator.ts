/**
 * FACET Input Validation & Security System
 * 
 * Comprehensive validation system for all user inputs to ensure security,
 * safety, and therapeutic appropriateness of interactions with the AI system.
 * 
 * CRITICAL: This system MUST validate all inputs before agent processing
 * to prevent injection attacks, inappropriate content, and system abuse.
 */

import { z } from 'zod'
import { ChatRequest } from '@/lib/types/api-contract'

// Security configuration
const SECURITY_CONFIG = {
  MAX_MESSAGE_LENGTH: 4000,
  MIN_MESSAGE_LENGTH: 1,
  MAX_REQUESTS_PER_MINUTE: 30,
  MAX_REQUESTS_PER_HOUR: 200,
  BLOCKED_KEYWORDS: [
    // Harmful instructions
    'ignore previous instructions',
    'ignore system prompt',
    'forget everything',
    'new instructions:',
    'system:',
    'admin:',
    'developer:',
    
    // Injection attempts
    'SELECT * FROM',
    'DROP TABLE',
    'UPDATE users SET',
    'DELETE FROM',
    '<script>',
    'javascript:',
    'eval(',
    'document.cookie',
    
    // Inappropriate therapeutic content
    'provide medical diagnosis',
    'prescribe medication',
    'replace therapy',
    'medical advice',
    'legal advice',
    
    // System manipulation
    'change your personality',
    'pretend to be',
    'roleplay as',
    'act as if you are'
  ],
  
  SUSPICIOUS_PATTERNS: [
    /(\b(?:sql|union|select|insert|delete|update|drop|create|alter|exec|execute)\b.*){2,}/i,
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:[^"']*/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /\{\{.*?\}\}/g, // Template injection attempts
    /\$\{.*?\}/g,  // JavaScript template literals
    /<\?php.*?\?>/gi,
    /<%.*?%>/gi,   // Server-side includes
  ]
}

// Validation schemas
const MessageSchema = z.object({
  message: z.string()
    .min(SECURITY_CONFIG.MIN_MESSAGE_LENGTH, 'Message is too short')
    .max(SECURITY_CONFIG.MAX_MESSAGE_LENGTH, 'Message is too long')
    .refine((msg) => msg.trim().length > 0, 'Message cannot be empty or whitespace only'),
  
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  isNewSession: z.boolean().optional(),
  urgencyLevel: z.enum(['normal', 'elevated', 'crisis']).optional()
})

const UserPreferencesSchema = z.object({
  transparencyLevel: z.enum(['minimal', 'standard', 'detailed']).optional(),
  agentVisibility: z.boolean().optional(),
  processingSpeed: z.enum(['fast', 'thorough']).optional(),
  communicationStyle: z.enum(['professional_warm', 'clinical_precise', 'casual_supportive']).optional()
}).optional()

const ChatRequestSchema = MessageSchema.extend({
  userPreferences: UserPreferencesSchema
})

// Validation result types
interface ValidationResult {
  isValid: boolean
  sanitizedInput?: ChatRequest
  errors: ValidationError[]
  securityFlags: SecurityFlag[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

interface ValidationError {
  field: string
  code: string
  message: string
  severity: 'warning' | 'error' | 'critical'
}

interface SecurityFlag {
  type: 'injection_attempt' | 'prohibited_content' | 'suspicious_pattern' | 'rate_limit' | 'content_policy'
  description: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  automaticAction: 'log' | 'sanitize' | 'block' | 'escalate'
}

// Content safety categories
interface ContentSafetyResult {
  isSafe: boolean
  categories: {
    selfHarm: { detected: boolean, confidence: number }
    harassment: { detected: boolean, confidence: number }
    hateSpeech: { detected: boolean, confidence: number }
    violence: { detected: boolean, confidence: number }
    inappropriate: { detected: boolean, confidence: number }
  }
  overallRiskScore: number // 0.0-1.0
  recommendedAction: 'allow' | 'sanitize' | 'block' | 'escalate'
}

export class FACETInputValidator {
  private rateLimitCache = new Map<string, { count: number, lastReset: number }>()
  
  /**
   * Comprehensive validation of chat request
   */
  async validateChatRequest(input: any, userId: string, clientIP: string): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const securityFlags: SecurityFlag[] = []
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    
    try {
      // 1. Schema validation
      const schemaValidation = this.validateSchema(input)
      if (!schemaValidation.isValid) {
        errors.push(...schemaValidation.errors)
        riskLevel = this.escalateRiskLevel(riskLevel, 'medium')
      }
      
      // 2. Rate limiting validation
      const rateLimitValidation = this.validateRateLimit(userId, clientIP)
      if (!rateLimitValidation.isValid) {
        errors.push(...rateLimitValidation.errors)
        securityFlags.push(...rateLimitValidation.securityFlags)
        riskLevel = this.escalateRiskLevel(riskLevel, 'high')
      }
      
      // 3. Content security validation
      if (input.message) {
        const contentValidation = await this.validateMessageContent(input.message)
        if (!contentValidation.isValid) {
          errors.push(...contentValidation.errors)
          securityFlags.push(...contentValidation.securityFlags)
          riskLevel = this.escalateRiskLevel(riskLevel, contentValidation.riskLevel)
        }
      }
      
      // 4. Content safety validation
      if (input.message) {
        const safetyValidation = await this.validateContentSafety(input.message)
        if (!safetyValidation.isSafe) {
          const safetyError: ValidationError = {
            field: 'message',
            code: 'CONTENT_SAFETY_VIOLATION',
            message: 'Message contains content that may not be appropriate for therapeutic context',
            severity: safetyValidation.overallRiskScore > 0.8 ? 'critical' : 'warning'
          }
          errors.push(safetyError)
          
          const safetyFlag: SecurityFlag = {
            type: 'content_policy',
            description: `Content safety violation detected (risk: ${safetyValidation.overallRiskScore.toFixed(2)})`,
            riskLevel: safetyValidation.overallRiskScore > 0.8 ? 'critical' : 'medium',
            automaticAction: safetyValidation.recommendedAction as any
          }
          securityFlags.push(safetyFlag)
          
          if (safetyValidation.overallRiskScore > 0.8) {
            riskLevel = this.escalateRiskLevel(riskLevel, 'critical')
          }
        }
      }
      
      // 5. User context validation
      const contextValidation = this.validateUserContext(userId)
      if (!contextValidation.isValid) {
        errors.push(...contextValidation.errors)
        securityFlags.push(...contextValidation.securityFlags)
      }
      
      // Determine final validation result
      const isValid = errors.filter(e => e.severity === 'critical' || e.severity === 'error').length === 0
      const sanitizedInput = isValid ? this.sanitizeInput(input) : undefined
      
      return {
        isValid,
        sanitizedInput,
        errors,
        securityFlags,
        riskLevel
      }
      
    } catch (error) {
      console.error('Input validation error:', error)
      
      return {
        isValid: false,
        errors: [{
          field: 'system',
          code: 'VALIDATION_SYSTEM_ERROR',
          message: 'Internal validation error occurred',
          severity: 'critical'
        }],
        securityFlags: [{
          type: 'injection_attempt',
          description: 'Validation system error - possible attack',
          riskLevel: 'critical',
          automaticAction: 'escalate'
        }],
        riskLevel: 'critical'
      }
    }
  }
  
  /**
   * Schema validation using Zod
   */
  private validateSchema(input: any): { isValid: boolean, errors: ValidationError[] } {
    try {
      ChatRequestSchema.parse(input)
      return { isValid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          code: 'SCHEMA_VALIDATION_ERROR',
          message: err.message,
          severity: 'error' as const
        }))
        return { isValid: false, errors }
      }
      
      return {
        isValid: false,
        errors: [{
          field: 'input',
          code: 'SCHEMA_PARSE_ERROR',
          message: 'Invalid input format',
          severity: 'error'
        }]
      }
    }
  }
  
  /**
   * Rate limiting validation
   */
  private validateRateLimit(userId: string, clientIP: string): {
    isValid: boolean
    errors: ValidationError[]
    securityFlags: SecurityFlag[]
  } {
    const errors: ValidationError[] = []
    const securityFlags: SecurityFlag[] = []
    
    // Check user rate limit
    const userLimit = this.checkRateLimit(`user:${userId}`, SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE, 60000)
    if (!userLimit.allowed) {
      errors.push({
        field: 'rate_limit',
        code: 'USER_RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please wait ${Math.ceil(userLimit.resetTime / 1000)} seconds.`,
        severity: 'error'
      })
      
      securityFlags.push({
        type: 'rate_limit',
        description: `User ${userId} exceeded rate limit`,
        riskLevel: 'medium',
        automaticAction: 'block'
      })
    }
    
    // Check IP rate limit
    const ipLimit = this.checkRateLimit(`ip:${clientIP}`, SECURITY_CONFIG.MAX_REQUESTS_PER_HOUR, 3600000)
    if (!ipLimit.allowed) {
      errors.push({
        field: 'rate_limit',
        code: 'IP_RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from your location. Please try again later.',
        severity: 'error'
      })
      
      securityFlags.push({
        type: 'rate_limit',
        description: `IP ${clientIP} exceeded hourly rate limit`,
        riskLevel: 'high',
        automaticAction: 'block'
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      securityFlags
    }
  }
  
  /**
   * Message content security validation
   */
  private async validateMessageContent(message: string): Promise<{
    isValid: boolean
    errors: ValidationError[]
    securityFlags: SecurityFlag[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  }> {
    const errors: ValidationError[] = []
    const securityFlags: SecurityFlag[] = []
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    
    const lowerMessage = message.toLowerCase()
    
    // Check for blocked keywords
    for (const keyword of SECURITY_CONFIG.BLOCKED_KEYWORDS) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        errors.push({
          field: 'message',
          code: 'PROHIBITED_CONTENT',
          message: 'Message contains prohibited content',
          severity: 'error'
        })
        
        securityFlags.push({
          type: 'prohibited_content',
          description: `Blocked keyword detected: ${keyword}`,
          riskLevel: 'high',
          automaticAction: 'block'
        })
        
        riskLevel = this.escalateRiskLevel(riskLevel, 'high')
      }
    }
    
    // Check for suspicious patterns
    for (const pattern of SECURITY_CONFIG.SUSPICIOUS_PATTERNS) {
      if (pattern.test(message)) {
        errors.push({
          field: 'message',
          code: 'SUSPICIOUS_PATTERN',
          message: 'Message contains suspicious patterns',
          severity: 'warning'
        })
        
        securityFlags.push({
          type: 'suspicious_pattern',
          description: `Suspicious pattern matched: ${pattern.source}`,
          riskLevel: 'medium',
          automaticAction: 'log'
        })
        
        riskLevel = this.escalateRiskLevel(riskLevel, 'medium')
      }
    }
    
    // Check for potential injection attempts
    if (this.detectInjectionAttempt(message)) {
      errors.push({
        field: 'message',
        code: 'INJECTION_ATTEMPT',
        message: 'Potential security threat detected',
        severity: 'critical'
      })
      
      securityFlags.push({
        type: 'injection_attempt',
        description: 'Potential code/prompt injection attempt',
        riskLevel: 'critical',
        automaticAction: 'escalate'
      })
      
      riskLevel = 'critical'
    }
    
    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'error').length === 0,
      errors,
      securityFlags,
      riskLevel
    }
  }
  
  /**
   * Content safety validation (simulated - would integrate with content moderation API)
   */
  private async validateContentSafety(message: string): Promise<ContentSafetyResult> {
    // Simulate content safety analysis
    // In production, this would integrate with Azure Content Safety, Google Cloud AI, or similar
    
    const lowerMessage = message.toLowerCase()
    let overallRiskScore = 0.0
    
    const categories = {
      selfHarm: this.detectSelfHarm(lowerMessage),
      harassment: this.detectHarassment(lowerMessage),
      hateSpeech: this.detectHateSpeech(lowerMessage),
      violence: this.detectViolence(lowerMessage),
      inappropriate: this.detectInappropriateMedical(lowerMessage)
    }
    
    // Calculate overall risk score
    Object.values(categories).forEach(category => {
      if (category.detected) {
        overallRiskScore = Math.max(overallRiskScore, category.confidence)
      }
    })
    
    let recommendedAction: 'allow' | 'sanitize' | 'block' | 'escalate' = 'allow'
    if (overallRiskScore > 0.9) recommendedAction = 'escalate'
    else if (overallRiskScore > 0.7) recommendedAction = 'block'
    else if (overallRiskScore > 0.4) recommendedAction = 'sanitize'
    
    return {
      isSafe: overallRiskScore < 0.4,
      categories,
      overallRiskScore,
      recommendedAction
    }
  }
  
  /**
   * User context validation
   */
  private validateUserContext(userId: string): {
    isValid: boolean
    errors: ValidationError[]
    securityFlags: SecurityFlag[]
  } {
    // This would check user account status, permissions, etc.
    // For now, basic validation
    
    const errors: ValidationError[] = []
    const securityFlags: SecurityFlag[] = []
    
    if (!userId || userId.length < 10) {
      errors.push({
        field: 'userId',
        code: 'INVALID_USER_ID',
        message: 'Invalid user identifier',
        severity: 'error'
      })
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      securityFlags
    }
  }
  
  /**
   * Sanitize input for safe processing
   */
  private sanitizeInput(input: any): ChatRequest {
    return {
      ...input,
      message: this.sanitizeMessage(input.message),
      conversationId: input.conversationId || undefined,
      messageId: input.messageId || undefined,
      userPreferences: input.userPreferences || undefined,
      isNewSession: input.isNewSession || false,
      urgencyLevel: input.urgencyLevel || 'normal'
    }
  }
  
  /**
   * Sanitize message content
   */
  private sanitizeMessage(message: string): string {
    if (!message) return ''
    
    // Remove suspicious characters and patterns
    let sanitized = message
      .replace(/<script[^>]*>.*?<\/script>/gi, '[removed]')
      .replace(/javascript:[^"']*/gi, '[removed]')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '[removed]')
      .trim()
    
    // Limit length
    if (sanitized.length > SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
      sanitized = sanitized.substring(0, SECURITY_CONFIG.MAX_MESSAGE_LENGTH) + '...'
    }
    
    return sanitized
  }
  
  // Helper methods for security checks
  private checkRateLimit(key: string, maxRequests: number, windowMs: number): {
    allowed: boolean
    resetTime: number
  } {
    const now = Date.now()
    const entry = this.rateLimitCache.get(key)
    
    if (!entry || now - entry.lastReset > windowMs) {
      this.rateLimitCache.set(key, { count: 1, lastReset: now })
      return { allowed: true, resetTime: windowMs }
    }
    
    if (entry.count >= maxRequests) {
      return { allowed: false, resetTime: windowMs - (now - entry.lastReset) }
    }
    
    entry.count++
    return { allowed: true, resetTime: windowMs - (now - entry.lastReset) }
  }
  
  private detectInjectionAttempt(message: string): boolean {
    const injectionPatterns = [
      /\b(union|select|insert|delete|update|drop)\b.*\b(from|where|into)\b/i,
      /['"]\s*;\s*(drop|delete|update|insert)/i,
      /\{\{.*\}\}|\$\{.*\}|<%.*%>/,
      /(ignore|forget|override).*instructions/i,
      /system\s*[:=]\s*["'].*["']/i
    ]
    
    return injectionPatterns.some(pattern => pattern.test(message))
  }
  
  private detectSelfHarm(message: string): { detected: boolean, confidence: number } {
    const selfHarmKeywords = [
      'hurt myself', 'kill myself', 'end my life', 'suicide', 'self harm',
      'want to die', 'better off dead', 'end it all', 'take my own life'
    ]
    
    const matches = selfHarmKeywords.filter(keyword => message.includes(keyword)).length
    const confidence = Math.min(matches * 0.3, 1.0)
    
    return { detected: confidence > 0.3, confidence }
  }
  
  private detectHarassment(message: string): { detected: boolean, confidence: number } {
    const harassmentKeywords = ['threat', 'harass', 'stalk', 'abuse', 'intimidate']
    const matches = harassmentKeywords.filter(keyword => message.includes(keyword)).length
    const confidence = Math.min(matches * 0.25, 1.0)
    
    return { detected: confidence > 0.25, confidence }
  }
  
  private detectHateSpeech(message: string): { detected: boolean, confidence: number } {
    // Basic detection - in production would use specialized models
    const hateSpeechIndicators = ['hate', 'discrimination', 'prejudice']
    const matches = hateSpeechIndicators.filter(keyword => message.includes(keyword)).length
    const confidence = Math.min(matches * 0.2, 1.0)
    
    return { detected: confidence > 0.2, confidence }
  }
  
  private detectViolence(message: string): { detected: boolean, confidence: number } {
    const violenceKeywords = ['violence', 'attack', 'assault', 'fight', 'hurt others']
    const matches = violenceKeywords.filter(keyword => message.includes(keyword)).length
    const confidence = Math.min(matches * 0.3, 1.0)
    
    return { detected: confidence > 0.3, confidence }
  }
  
  private detectInappropriateMedical(message: string): { detected: boolean, confidence: number } {
    const medicalKeywords = [
      'prescribe medication', 'medical diagnosis', 'drug dosage',
      'stop taking medication', 'medical advice', 'replace doctor'
    ]
    const matches = medicalKeywords.filter(keyword => message.includes(keyword)).length
    const confidence = Math.min(matches * 0.4, 1.0)
    
    return { detected: confidence > 0.4, confidence }
  }
  
  private escalateRiskLevel(
    current: 'low' | 'medium' | 'high' | 'critical',
    proposed: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 }
    const currentLevel = levels[current]
    const proposedLevel = levels[proposed]
    
    if (proposedLevel > currentLevel) {
      return proposed
    }
    return current
  }
}

// Export singleton instance
export const inputValidator = new FACETInputValidator()

// Export types for use in other modules
export type {
  ValidationResult,
  ValidationError,
  SecurityFlag,
  ContentSafetyResult
}
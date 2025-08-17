/**
 * FACET Security Middleware System
 * 
 * Comprehensive security middleware for protecting API endpoints with
 * authentication, authorization, rate limiting, and threat detection.
 * 
 * CRITICAL: This middleware MUST be applied to all API endpoints to ensure
 * security compliance and protect against various attack vectors.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inputValidator, ValidationResult } from './input-validator'

// Security configuration
const SECURITY_CONFIG = {
  // Rate limiting
  RATE_LIMITS: {
    ANONYMOUS: { requests: 10, windowMs: 60000 }, // 10 requests per minute
    AUTHENTICATED: { requests: 30, windowMs: 60000 }, // 30 requests per minute
    PREMIUM: { requests: 100, windowMs: 60000 } // 100 requests per minute
  },
  
  // Authentication requirements
  AUTH_REQUIRED_ENDPOINTS: [
    '/api/chat',
    '/api/user/preferences',
    '/api/user/insights',
    '/api/conversations'
  ],
  
  // CORS settings
  CORS_ORIGINS: [
    'http://localhost:3000',
    'https://facet.vercel.app',
    'https://facet-app.com'
  ],
  
  // Security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  }
}

// Security context interface
interface SecurityContext {
  userId?: string
  userRole?: 'user' | 'premium' | 'admin'
  isAuthenticated: boolean
  clientIP: string
  userAgent: string
  endpoint: string
  method: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  securityFlags: string[]
}

// Security audit log entry
interface SecurityAuditLog {
  timestamp: string
  userId?: string
  clientIP: string
  endpoint: string
  method: string
  action: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  details: any
  blocked: boolean
  reason?: string
}

export class FACETSecurityMiddleware {
  private rateLimitCache = new Map<string, { count: number, lastReset: number }>()
  private suspiciousIPs = new Set<string>()
  private securityAuditLogs: SecurityAuditLog[] = []
  
  /**
   * Main security middleware function
   */
  async secureRequest(request: NextRequest): Promise<{
    allowed: boolean
    response?: NextResponse
    context?: SecurityContext
    auditLog?: SecurityAuditLog
  }> {
    const startTime = Date.now()
    
    try {
      // 1. Extract request context
      const context = await this.extractSecurityContext(request)
      
      // 2. Apply security headers
      const response = this.applySecurityHeaders(new NextResponse())
      
      // 3. CORS validation
      const corsValidation = this.validateCORS(request)
      if (!corsValidation.allowed) {
        return this.blockRequest(context, 'CORS_VIOLATION', corsValidation.reason, response)
      }
      
      // 4. Rate limiting
      const rateLimitValidation = this.validateRateLimit(context)
      if (!rateLimitValidation.allowed) {
        return this.blockRequest(context, 'RATE_LIMIT_EXCEEDED', rateLimitValidation.reason, response)
      }
      
      // 5. Authentication validation
      const authValidation = await this.validateAuthentication(request, context)
      if (!authValidation.allowed) {
        return this.blockRequest(context, 'AUTHENTICATION_FAILED', authValidation.reason, response)
      }
      
      // Update context with auth info
      context.userId = authValidation.userId
      context.userRole = authValidation.userRole
      context.isAuthenticated = authValidation.isAuthenticated
      
      // 6. Authorization validation
      const authzValidation = this.validateAuthorization(context)
      if (!authzValidation.allowed) {
        return this.blockRequest(context, 'AUTHORIZATION_FAILED', authzValidation.reason, response)
      }
      
      // 7. Threat detection
      const threatValidation = await this.detectThreats(request, context)
      if (!threatValidation.allowed) {
        return this.blockRequest(context, 'THREAT_DETECTED', threatValidation.reason, response)
      }
      
      // 8. Input validation (for requests with body)
      if (['POST', 'PUT', 'PATCH'].includes(context.method)) {
        const inputValidation = await this.validateRequestInput(request, context)
        if (!inputValidation.allowed) {
          return this.blockRequest(context, 'INPUT_VALIDATION_FAILED', inputValidation.reason, response)
        }
      }
      
      // 9. Update security context with final risk assessment
      context.riskLevel = this.calculateOverallRiskLevel(context)
      
      // 10. Log successful security validation
      const auditLog = this.createAuditLog(context, 'REQUEST_ALLOWED', {
        processingTimeMs: Date.now() - startTime,
        securityChecks: ['cors', 'rate_limit', 'auth', 'authz', 'threat', 'input']
      }, false)
      
      this.logSecurityEvent(auditLog)
      
      return {
        allowed: true,
        response,
        context,
        auditLog
      }
      
    } catch (error) {
      console.error('Security middleware error:', error)
      
      const context = await this.extractSecurityContext(request).catch(() => ({
        isAuthenticated: false,
        clientIP: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: request.nextUrl.pathname,
        method: request.method,
        riskLevel: 'critical' as const,
        securityFlags: ['system_error']
      }))
      
      return this.blockRequest(context, 'SECURITY_SYSTEM_ERROR', 'Internal security error', new NextResponse())
    }
  }
  
  /**
   * Extract security context from request
   */
  private async extractSecurityContext(request: NextRequest): Promise<SecurityContext> {
    const clientIP = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const endpoint = request.nextUrl.pathname
    const method = request.method
    
    return {
      isAuthenticated: false,
      clientIP,
      userAgent,
      endpoint,
      method,
      riskLevel: 'low',
      securityFlags: []
    }
  }
  
  /**
   * Apply security headers to response
   */
  private applySecurityHeaders(response: NextResponse): NextResponse {
    Object.entries(SECURITY_CONFIG.SECURITY_HEADERS).forEach(([header, value]) => {
      response.headers.set(header, value)
    })
    
    // Add HSTS only in production
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }
    
    return response
  }
  
  /**
   * Validate CORS
   */
  private validateCORS(request: NextRequest): { allowed: boolean, reason?: string } {
    const origin = request.headers.get('origin')
    
    // Allow same-origin requests
    if (!origin) {
      return { allowed: true }
    }
    
    // Check allowed origins
    if (SECURITY_CONFIG.CORS_ORIGINS.includes(origin)) {
      return { allowed: true }
    }
    
    // Allow localhost in development
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return { allowed: true }
    }
    
    return { allowed: false, reason: `Origin ${origin} not allowed` }
  }
  
  /**
   * Validate rate limiting
   */
  private validateRateLimit(context: SecurityContext): { allowed: boolean, reason?: string } {
    const key = context.userId ? `user:${context.userId}` : `ip:${context.clientIP}`
    
    // Determine rate limit based on user role
    let limit = SECURITY_CONFIG.RATE_LIMITS.ANONYMOUS
    if (context.isAuthenticated) {
      limit = context.userRole === 'premium' 
        ? SECURITY_CONFIG.RATE_LIMITS.PREMIUM 
        : SECURITY_CONFIG.RATE_LIMITS.AUTHENTICATED
    }
    
    const now = Date.now()
    const entry = this.rateLimitCache.get(key)
    
    if (!entry || now - entry.lastReset > limit.windowMs) {
      this.rateLimitCache.set(key, { count: 1, lastReset: now })
      return { allowed: true }
    }
    
    if (entry.count >= limit.requests) {
      const resetTime = Math.ceil((limit.windowMs - (now - entry.lastReset)) / 1000)
      return { 
        allowed: false, 
        reason: `Rate limit exceeded. Try again in ${resetTime} seconds.` 
      }
    }
    
    entry.count++
    return { allowed: true }
  }
  
  /**
   * Validate authentication
   */
  private async validateAuthentication(request: NextRequest, context: SecurityContext): Promise<{
    allowed: boolean
    reason?: string
    userId?: string
    userRole?: 'user' | 'premium' | 'admin'
    isAuthenticated: boolean
  }> {
    // Check if endpoint requires authentication
    const requiresAuth = SECURITY_CONFIG.AUTH_REQUIRED_ENDPOINTS.some(endpoint => 
      context.endpoint.startsWith(endpoint)
    )
    
    if (!requiresAuth) {
      return { allowed: true, isAuthenticated: false }
    }
    
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return { 
          allowed: false, 
          reason: 'Authentication required',
          isAuthenticated: false
        }
      }
      
      // Check if user account is active
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('status, user_role')
        .eq('user_id', user.id)
        .single()
      
      if (profile?.status === 'suspended') {
        return { 
          allowed: false, 
          reason: 'Account suspended',
          isAuthenticated: false
        }
      }
      
      return {
        allowed: true,
        userId: user.id,
        userRole: profile?.user_role || 'user',
        isAuthenticated: true
      }
      
    } catch (error) {
      console.error('Authentication validation error:', error)
      return { 
        allowed: false, 
        reason: 'Authentication system error',
        isAuthenticated: false
      }
    }
  }
  
  /**
   * Validate authorization
   */
  private validateAuthorization(context: SecurityContext): { allowed: boolean, reason?: string } {
    // Basic authorization logic
    if (context.endpoint.includes('/admin') && context.userRole !== 'admin') {
      return { allowed: false, reason: 'Admin access required' }
    }
    
    if (context.endpoint.includes('/premium') && !['premium', 'admin'].includes(context.userRole || '')) {
      return { allowed: false, reason: 'Premium access required' }
    }
    
    return { allowed: true }
  }
  
  /**
   * Detect threats and suspicious behavior
   */
  private async detectThreats(request: NextRequest, context: SecurityContext): Promise<{
    allowed: boolean
    reason?: string
  }> {
    const threats: string[] = []
    
    // Check suspicious IP
    if (this.suspiciousIPs.has(context.clientIP)) {
      threats.push('Suspicious IP detected')
    }
    
    // Check suspicious user agent
    if (this.isSuspiciousUserAgent(context.userAgent)) {
      threats.push('Suspicious user agent')
    }
    
    // Check for bot patterns
    if (this.detectBotBehavior(context)) {
      threats.push('Bot behavior detected')
    }
    
    // Check request patterns
    if (this.detectSuspiciousRequestPattern(context)) {
      threats.push('Suspicious request pattern')
    }
    
    if (threats.length > 0) {
      context.securityFlags.push(...threats)
      context.riskLevel = 'high'
      
      return { allowed: false, reason: threats.join(', ') }
    }
    
    return { allowed: true }
  }
  
  /**
   * Validate request input
   */
  private async validateRequestInput(request: NextRequest, context: SecurityContext): Promise<{
    allowed: boolean
    reason?: string
    validationResult?: ValidationResult
  }> {
    try {
      const body = await request.json()
      
      // Use input validator for comprehensive validation
      const validationResult = await inputValidator.validateChatRequest(
        body,
        context.userId || 'anonymous',
        context.clientIP
      )
      
      if (!validationResult.isValid) {
        // Check for critical errors
        const criticalErrors = validationResult.errors.filter(
          e => e.severity === 'critical' || e.severity === 'error'
        )
        
        if (criticalErrors.length > 0) {
          context.securityFlags.push(...validationResult.securityFlags.map(f => f.type))
          context.riskLevel = validationResult.riskLevel
          
          return {
            allowed: false,
            reason: criticalErrors[0].message,
            validationResult
          }
        }
      }
      
      // Update context with validation flags
      context.securityFlags.push(...validationResult.securityFlags.map(f => f.type))
      if (validationResult.riskLevel !== 'low') {
        context.riskLevel = this.escalateRiskLevel(context.riskLevel, validationResult.riskLevel)
      }
      
      return { allowed: true, validationResult }
      
    } catch (error) {
      return { 
        allowed: false, 
        reason: 'Invalid request format' 
      }
    }
  }
  
  /**
   * Calculate overall risk level
   */
  private calculateOverallRiskLevel(context: SecurityContext): 'low' | 'medium' | 'high' | 'critical' {
    if (context.securityFlags.includes('injection_attempt') || 
        context.securityFlags.includes('system_error')) {
      return 'critical'
    }
    
    if (context.securityFlags.includes('rate_limit') || 
        context.securityFlags.includes('prohibited_content')) {
      return 'high'
    }
    
    if (context.securityFlags.length > 2) {
      return 'medium'
    }
    
    return context.riskLevel || 'low'
  }
  
  /**
   * Block request and create audit log
   */
  private blockRequest(
    context: SecurityContext,
    action: string,
    reason: string,
    response: NextResponse
  ): {
    allowed: false
    response: NextResponse
    context: SecurityContext
    auditLog: SecurityAuditLog
  } {
    // Create blocked response
    const blockedResponse = NextResponse.json(
      {
        error: {
          code: action,
          message: 'Request blocked for security reasons',
          details: reason
        }
      },
      { status: 403 }
    )
    
    // Apply security headers to blocked response
    const secureResponse = this.applySecurityHeaders(blockedResponse)
    
    // Create audit log
    const auditLog = this.createAuditLog(context, action, { reason }, true, reason)
    this.logSecurityEvent(auditLog)
    
    // Flag suspicious IP if critical risk
    if (context.riskLevel === 'critical') {
      this.suspiciousIPs.add(context.clientIP)
    }
    
    return {
      allowed: false,
      response: secureResponse,
      context,
      auditLog
    }
  }
  
  /**
   * Create security audit log
   */
  private createAuditLog(
    context: SecurityContext,
    action: string,
    details: any,
    blocked: boolean,
    reason?: string
  ): SecurityAuditLog {
    return {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      clientIP: context.clientIP,
      endpoint: context.endpoint,
      method: context.method,
      action,
      riskLevel: context.riskLevel,
      details,
      blocked,
      reason
    }
  }
  
  /**
   * Log security event
   */
  private logSecurityEvent(auditLog: SecurityAuditLog): void {
    // Store in memory (in production, would store in database)
    this.securityAuditLogs.push(auditLog)
    
    // Keep only last 1000 logs in memory
    if (this.securityAuditLogs.length > 1000) {
      this.securityAuditLogs.shift()
    }
    
    // Log to console based on risk level
    if (auditLog.riskLevel === 'critical' || auditLog.blocked) {
      console.error('Security Alert:', auditLog)
    } else if (auditLog.riskLevel === 'high') {
      console.warn('Security Warning:', auditLog)
    } else {
      console.log('Security Event:', auditLog)
    }
  }
  
  /**
   * Get security analytics
   */
  getSecurityAnalytics(): {
    totalRequests: number
    blockedRequests: number
    riskDistribution: Record<string, number>
    topThreats: Array<{ threat: string, count: number }>
    suspiciousIPs: string[]
  } {
    const totalRequests = this.securityAuditLogs.length
    const blockedRequests = this.securityAuditLogs.filter(log => log.blocked).length
    
    const riskDistribution = this.securityAuditLogs.reduce((acc, log) => {
      acc[log.riskLevel] = (acc[log.riskLevel] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const threatCounts = this.securityAuditLogs
      .filter(log => log.blocked)
      .reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    
    const topThreats = Object.entries(threatCounts)
      .map(([threat, count]) => ({ threat, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return {
      totalRequests,
      blockedRequests,
      riskDistribution,
      topThreats,
      suspiciousIPs: Array.from(this.suspiciousIPs)
    }
  }
  
  // Helper methods
  private getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0] || 
           request.headers.get('x-real-ip') || 
           'unknown'
  }
  
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot|crawler|spider|scraper/i,
      /curl|wget|python|php/i,
      /automated|script|tool/i
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }
  
  private detectBotBehavior(context: SecurityContext): boolean {
    // Check for rapid sequential requests (would be more sophisticated in production)
    const recentLogs = this.securityAuditLogs
      .filter(log => log.clientIP === context.clientIP)
      .slice(-10)
    
    // If more than 5 requests in last minute from same IP
    const oneMinuteAgo = Date.now() - 60000
    const recentCount = recentLogs.filter(log => 
      new Date(log.timestamp).getTime() > oneMinuteAgo
    ).length
    
    return recentCount > 5
  }
  
  private detectSuspiciousRequestPattern(context: SecurityContext): boolean {
    // Check for suspicious endpoint patterns
    const suspiciousPatterns = [
      /\/admin/,
      /\/\.well-known/,
      /\/wp-admin/,
      /\/phpmyadmin/,
      /\.(php|asp|jsp)$/
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(context.endpoint))
  }
  
  private escalateRiskLevel(
    current: 'low' | 'medium' | 'high' | 'critical',
    proposed: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 }
    const currentLevel = levels[current]
    const proposedLevel = levels[proposed]
    
    return proposedLevel > currentLevel ? proposed : current
  }
}

// Export singleton instance
export const securityMiddleware = new FACETSecurityMiddleware()

// Export types
export type { SecurityContext, SecurityAuditLog }
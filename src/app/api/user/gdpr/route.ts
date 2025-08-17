/**
 * FACET GDPR Compliance API Endpoints
 * 
 * REST API for GDPR data protection rights including data access,
 * erasure, rectification, portability, and consent management.
 * 
 * Complies with GDPR Articles 12-22 requirements for user rights.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { gdprComplianceService, GDPRRequestType, DataCategory } from '@/lib/gdpr/gdpr-compliance-service'
import { securityMiddleware } from '@/lib/security/security-middleware'
import { auditLogger } from '@/lib/security/audit-logger'

// Request validation schemas
const GDPRRequestSchema = z.object({
  requestType: z.enum([
    'data_access',
    'data_portability', 
    'data_rectification',
    'data_erasure',
    'processing_restriction',
    'consent_withdrawal',
    'data_objection'
  ]),
  dataCategories: z.array(z.enum([
    'personal_identity',
    'therapeutic_content',
    'health_data',
    'usage_analytics',
    'technical_data',
    'preference_data'
  ])).optional(),
  specificDataRequested: z.array(z.string()).optional(),
  reasonForRequest: z.string().optional(),
  preferredFormat: z.enum(['json', 'csv', 'pdf']).optional(),
  deliveryMethod: z.enum(['download', 'email']).optional()
})

const ConsentUpdateSchema = z.object({
  therapeuticDataProcessing: z.boolean().optional(),
  analyticsAndImprovement: z.boolean().optional(),
  researchParticipation: z.boolean().optional(),
  marketingCommunications: z.boolean().optional(),
  healthDataProcessing: z.boolean().optional()
})

/**
 * POST /api/user/gdpr - Submit GDPR request
 */
export async function POST(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResult = await securityMiddleware.secureRequest(request)
    if (!securityResult.allowed) {
      return securityResult.response
    }

    const securityContext = securityResult.context!
    const userId = securityContext.userId

    if (!userId) {
      return NextResponse.json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication required for GDPR requests'
        }
      }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const validation = GDPRRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid GDPR request format',
          details: validation.error.errors
        }
      }, { status: 400 })
    }

    const gdprRequest = validation.data

    // Submit GDPR request
    const result = await gdprComplianceService.submitGDPRRequest(
      userId,
      gdprRequest.requestType as GDPRRequestType,
      {
        dataCategories: gdprRequest.dataCategories as DataCategory[],
        specificDataRequested: gdprRequest.specificDataRequested,
        reasonForRequest: gdprRequest.reasonForRequest,
        preferredFormat: gdprRequest.preferredFormat || 'json',
        deliveryMethod: gdprRequest.deliveryMethod || 'download'
      },
      securityContext.clientIP,
      securityContext.userAgent
    )

    // Audit log
    await auditLogger.logGDPREvent(
      'gdpr_request',
      userId,
      securityContext.clientIP,
      {
        requestType: gdprRequest.requestType,
        dataTypes: gdprRequest.dataCategories,
        userAgent: securityContext.userAgent,
        outcome: 'success'
      }
    )

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      estimatedCompletion: result.estimatedCompletion,
      message: `GDPR ${gdprRequest.requestType} request submitted successfully`,
      timeline: {
        submitted: new Date().toISOString(),
        deadline: result.estimatedCompletion,
        maxProcessingTime: '90 days (if complex request)'
      },
      nextSteps: [
        'You will receive an email confirmation within 24 hours',
        'Identity verification may be required for security',
        'Request will be processed within the legal timeframe',
        'You will be notified when processing is complete'
      ]
    })

  } catch (error) {
    console.error('GDPR request submission error:', error)

    return NextResponse.json({
      error: {
        code: 'GDPR_REQUEST_FAILED',
        message: 'Failed to submit GDPR request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

/**
 * GET /api/user/gdpr - Get user's GDPR requests and status
 */
export async function GET(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResult = await securityMiddleware.secureRequest(request)
    if (!securityResult.allowed) {
      return securityResult.response
    }

    const securityContext = securityResult.context!
    const userId = securityContext.userId

    if (!userId) {
      return NextResponse.json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication required'
        }
      }, { status: 401 })
    }

    // Get user's GDPR requests
    const requests = await gdprComplianceService.getUserGDPRRequests(userId)
    
    // Get current consent preferences
    const consentPreferences = await gdprComplianceService.getConsentPreferences(userId)

    // Audit log for data access
    await auditLogger.logDataAccess(
      userId,
      'gdpr_requests',
      'read',
      securityContext.clientIP,
      securityContext.userAgent,
      {
        success: true,
        encryptionUsed: true
      }
    )

    return NextResponse.json({
      requests: requests.map(req => ({
        requestId: req.requestId,
        requestType: req.requestType,
        status: req.status,
        submittedAt: req.submittedAt,
        completedAt: req.completedAt,
        estimatedCompletion: req.processingInfo.estimatedCompletionDate,
        dataCategories: req.requestDetails.dataCategories,
        results: req.status === 'completed' ? {
          recordsModified: req.results?.recordsModified || 0,
          recordsDeleted: req.results?.recordsDeleted || 0,
          dataExported: !!req.results?.dataExported,
          processingRestricted: req.results?.processingRestricted || false
        } : undefined
      })),
      consentPreferences,
      gdprRights: {
        dataAccess: {
          description: 'Request a copy of all your personal data',
          article: 'GDPR Article 15',
          processingTime: '30 days'
        },
        dataPortability: {
          description: 'Receive your data in a structured, machine-readable format',
          article: 'GDPR Article 20',
          processingTime: '30 days'
        },
        dataRectification: {
          description: 'Correct inaccurate or incomplete personal data',
          article: 'GDPR Article 16',
          processingTime: '30 days'
        },
        dataErasure: {
          description: 'Delete your personal data (Right to be forgotten)',
          article: 'GDPR Article 17',
          processingTime: '30 days',
          limitations: 'Some data may be retained for legal compliance'
        },
        processingRestriction: {
          description: 'Limit how your data is processed',
          article: 'GDPR Article 18',
          processingTime: '30 days'
        },
        consentWithdrawal: {
          description: 'Withdraw consent for data processing',
          article: 'GDPR Article 7',
          processingTime: 'Immediate'
        },
        dataObjection: {
          description: 'Object to data processing based on legitimate interests',
          article: 'GDPR Article 21',
          processingTime: '30 days'
        }
      }
    })

  } catch (error) {
    console.error('GDPR requests retrieval error:', error)

    return NextResponse.json({
      error: {
        code: 'GDPR_RETRIEVAL_FAILED',
        message: 'Failed to retrieve GDPR information',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

/**
 * PUT /api/user/gdpr - Update consent preferences
 */
export async function PUT(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResult = await securityMiddleware.secureRequest(request)
    if (!securityResult.allowed) {
      return securityResult.response
    }

    const securityContext = securityResult.context!
    const userId = securityContext.userId

    if (!userId) {
      return NextResponse.json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication required'
        }
      }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const validation = ConsentUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: {
          code: 'INVALID_CONSENT_UPDATE',
          message: 'Invalid consent update format',
          details: validation.error.errors
        }
      }, { status: 400 })
    }

    const consentUpdates = validation.data

    // Get current consent preferences
    const currentConsent = await gdprComplianceService.getConsentPreferences(userId)
    if (!currentConsent) {
      return NextResponse.json({
        error: {
          code: 'CONSENT_NOT_FOUND',
          message: 'Current consent preferences not found'
        }
      }, { status: 404 })
    }

    // Update consent preferences
    const updatedAt = new Date().toISOString()
    
    if (consentUpdates.therapeuticDataProcessing !== undefined) {
      currentConsent.therapeuticDataProcessing.granted = consentUpdates.therapeuticDataProcessing
      if (consentUpdates.therapeuticDataProcessing) {
        currentConsent.therapeuticDataProcessing.grantedAt = updatedAt
        delete currentConsent.therapeuticDataProcessing.withdrawnAt
      } else {
        currentConsent.therapeuticDataProcessing.withdrawnAt = updatedAt
      }
    }

    if (consentUpdates.analyticsAndImprovement !== undefined) {
      currentConsent.analyticsAndImprovement.granted = consentUpdates.analyticsAndImprovement
      if (consentUpdates.analyticsAndImprovement) {
        currentConsent.analyticsAndImprovement.grantedAt = updatedAt
        delete currentConsent.analyticsAndImprovement.withdrawnAt
      } else {
        currentConsent.analyticsAndImprovement.withdrawnAt = updatedAt
      }
    }

    if (consentUpdates.researchParticipation !== undefined) {
      currentConsent.researchParticipation.granted = consentUpdates.researchParticipation
      if (consentUpdates.researchParticipation) {
        currentConsent.researchParticipation.grantedAt = updatedAt
        delete currentConsent.researchParticipation.withdrawnAt
      } else {
        currentConsent.researchParticipation.withdrawnAt = updatedAt
      }
    }

    if (consentUpdates.marketingCommunications !== undefined) {
      currentConsent.marketingCommunications.granted = consentUpdates.marketingCommunications
      if (consentUpdates.marketingCommunications) {
        currentConsent.marketingCommunications.grantedAt = updatedAt
        delete currentConsent.marketingCommunications.withdrawnAt
      } else {
        currentConsent.marketingCommunications.withdrawnAt = updatedAt
      }
    }

    if (consentUpdates.healthDataProcessing !== undefined) {
      currentConsent.healthDataProcessing.granted = consentUpdates.healthDataProcessing
      if (consentUpdates.healthDataProcessing) {
        currentConsent.healthDataProcessing.grantedAt = updatedAt
        delete currentConsent.healthDataProcessing.withdrawnAt
      } else {
        currentConsent.healthDataProcessing.withdrawnAt = updatedAt
      }
    }

    currentConsent.updatedAt = updatedAt

    // Save updated consent preferences
    await gdprComplianceService.updateConsentPreferences(userId, currentConsent)

    // Audit log for consent changes
    await auditLogger.logGDPREvent(
      'gdpr_request',
      userId,
      securityContext.clientIP,
      {
        requestType: 'consent_update',
        userAgent: securityContext.userAgent,
        outcome: 'success'
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Consent preferences updated successfully',
      updatedAt,
      consentPreferences: currentConsent,
      effectiveImmediately: true,
      notes: [
        'Consent changes take effect immediately',
        'Withdrawn consent will stop future data processing',
        'Previously processed data may be retained for legal compliance',
        'You can withdraw consent at any time'
      ]
    })

  } catch (error) {
    console.error('Consent update error:', error)

    return NextResponse.json({
      error: {
        code: 'CONSENT_UPDATE_FAILED',
        message: 'Failed to update consent preferences',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

/**
 * Handle unsupported methods
 */
export async function DELETE() {
  return NextResponse.json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Use POST with requestType "data_erasure" for deletion requests'
    }
  }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Use PUT for consent preference updates'
    }
  }, { status: 405 })
}
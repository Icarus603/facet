/**
 * FACET GDPR Request Status and Download API
 * 
 * Individual GDPR request management including status checking,
 * data downloads, and request cancellation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { gdprComplianceService } from '@/lib/gdpr/gdpr-compliance-service'
import { securityMiddleware } from '@/lib/security/security-middleware'
import { auditLogger } from '@/lib/security/audit-logger'
import { encryptionService } from '@/lib/security/encryption-service'

interface RequestParams {
  params: {
    requestId: string
  }
}

/**
 * GET /api/user/gdpr/[requestId] - Get GDPR request status and details
 */
export async function GET(request: NextRequest, { params }: RequestParams) {
  try {
    // Apply security middleware
    const securityResult = await securityMiddleware.secureRequest(request)
    if (!securityResult.allowed) {
      return securityResult.response
    }

    const securityContext = securityResult.context!
    const userId = securityContext.userId
    const { requestId } = params

    if (!userId) {
      return NextResponse.json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication required'
        }
      }, { status: 401 })
    }

    // Get GDPR request details
    const gdprRequest = await gdprComplianceService.getGDPRRequestStatus(requestId)

    if (!gdprRequest) {
      return NextResponse.json({
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'GDPR request not found'
        }
      }, { status: 404 })
    }

    // Verify request belongs to authenticated user
    if (gdprRequest.userId !== userId) {
      return NextResponse.json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this GDPR request'
        }
      }, { status: 403 })
    }

    // Check if download is requested
    const url = new URL(request.url)
    const downloadRequested = url.searchParams.get('download') === 'true'

    if (downloadRequested && gdprRequest.status === 'completed' && gdprRequest.results?.dataExported) {
      return await handleDataDownload(gdprRequest, securityContext)
    }

    // Audit log for status check
    await auditLogger.logDataAccess(
      userId,
      'gdpr_request_status',
      'read',
      securityContext.clientIP,
      securityContext.userAgent,
      {
        success: true,
        encryptionUsed: true
      }
    )

    // Calculate progress percentage
    const progress = calculateRequestProgress(gdprRequest)

    return NextResponse.json({
      requestId: gdprRequest.requestId,
      requestType: gdprRequest.requestType,
      status: gdprRequest.status,
      progress,
      
      // Timeline information
      timeline: {
        submittedAt: gdprRequest.submittedAt,
        deadlineDate: gdprRequest.complianceTracking.deadlineDate,
        estimatedCompletionDate: gdprRequest.processingInfo.estimatedCompletionDate,
        completedAt: gdprRequest.completedAt,
        processingTimeRemaining: gdprRequest.status !== 'completed' 
          ? calculateTimeRemaining(gdprRequest.complianceTracking.deadlineDate)
          : null
      },
      
      // Request details
      requestDetails: {
        dataCategories: gdprRequest.requestDetails.dataCategories,
        specificDataRequested: gdprRequest.requestDetails.specificDataRequested,
        reasonForRequest: gdprRequest.requestDetails.reasonForRequest,
        preferredFormat: gdprRequest.requestDetails.preferredFormat,
        deliveryMethod: gdprRequest.requestDetails.deliveryMethod
      },
      
      // Processing information
      processingInfo: {
        complexityLevel: gdprRequest.processingInfo.complexityLevel,
        assignedTo: gdprRequest.processingInfo.assignedTo,
        actualProcessingTime: gdprRequest.processingInfo.actualProcessingTime
      },
      
      // Compliance tracking
      complianceInfo: {
        extensionGranted: gdprRequest.complianceTracking.extensionGranted,
        extensionReason: gdprRequest.complianceTracking.extensionReason,
        legalBasisReviewed: gdprRequest.complianceTracking.legalBasisReview,
        withinDeadline: new Date() <= new Date(gdprRequest.complianceTracking.deadlineDate)
      },
      
      // Results (if completed)
      results: gdprRequest.status === 'completed' ? {
        recordsModified: gdprRequest.results?.recordsModified || 0,
        recordsDeleted: gdprRequest.results?.recordsDeleted || 0,
        dataExportAvailable: !!gdprRequest.results?.dataExported,
        processingRestricted: gdprRequest.results?.processingRestricted || false,
        downloadUrl: gdprRequest.results?.dataExported 
          ? `/api/user/gdpr/${requestId}?download=true`
          : null,
        errorMessage: gdprRequest.results?.errorMessage
      } : null,
      
      // Status-specific information
      statusInfo: getStatusInfo(gdprRequest.status),
      
      // User actions available
      availableActions: getAvailableActions(gdprRequest.status)
    })

  } catch (error) {
    console.error('GDPR request status error:', error)

    return NextResponse.json({
      error: {
        code: 'REQUEST_STATUS_ERROR',
        message: 'Failed to retrieve GDPR request status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

/**
 * DELETE /api/user/gdpr/[requestId] - Cancel GDPR request (if cancellable)
 */
export async function DELETE(request: NextRequest, { params }: RequestParams) {
  try {
    // Apply security middleware
    const securityResult = await securityMiddleware.secureRequest(request)
    if (!securityResult.allowed) {
      return securityResult.response
    }

    const securityContext = securityResult.context!
    const userId = securityContext.userId
    const { requestId } = params

    if (!userId) {
      return NextResponse.json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication required'
        }
      }, { status: 401 })
    }

    // Get GDPR request details
    const gdprRequest = await gdprComplianceService.getGDPRRequestStatus(requestId)

    if (!gdprRequest) {
      return NextResponse.json({
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'GDPR request not found'
        }
      }, { status: 404 })
    }

    // Verify request belongs to authenticated user
    if (gdprRequest.userId !== userId) {
      return NextResponse.json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this GDPR request'
        }
      }, { status: 403 })
    }

    // Check if request can be cancelled
    if (!['submitted', 'under_review', 'identity_verification_required'].includes(gdprRequest.status)) {
      return NextResponse.json({
        error: {
          code: 'CANCELLATION_NOT_ALLOWED',
          message: `Request cannot be cancelled in ${gdprRequest.status} status`,
          details: 'Only submitted or under review requests can be cancelled'
        }
      }, { status: 400 })
    }

    // Cancel the request
    gdprRequest.status = 'rejected'
    gdprRequest.completedAt = new Date().toISOString()
    if (gdprRequest.results) {
      gdprRequest.results.errorMessage = 'Request cancelled by user'
    }

    // Audit log for cancellation
    await auditLogger.logGDPREvent(
      'gdpr_request',
      userId,
      securityContext.clientIP,
      {
        requestType: 'request_cancellation',
        userAgent: securityContext.userAgent,
        outcome: 'success'
      }
    )

    return NextResponse.json({
      success: true,
      message: 'GDPR request cancelled successfully',
      requestId,
      cancelledAt: gdprRequest.completedAt,
      refundInfo: 'No charges applied for cancelled requests',
      alternativeActions: [
        'You can submit a new request at any time',
        'Contact privacy@facet.com for assistance',
        'Review our privacy policy for data handling information'
      ]
    })

  } catch (error) {
    console.error('GDPR request cancellation error:', error)

    return NextResponse.json({
      error: {
        code: 'CANCELLATION_FAILED',
        message: 'Failed to cancel GDPR request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

/**
 * Handle data download for completed requests
 */
async function handleDataDownload(gdprRequest: any, securityContext: any): Promise<NextResponse> {
  try {
    // Verify request is completed and has export data
    if (gdprRequest.status !== 'completed' || !gdprRequest.results?.dataExported) {
      return NextResponse.json({
        error: {
          code: 'DOWNLOAD_NOT_AVAILABLE',
          message: 'Data download not available for this request'
        }
      }, { status: 400 })
    }

    // In production, this would fetch the actual export file
    // For now, generate a mock export response
    const exportData = {
      exportInfo: {
        requestId: gdprRequest.requestId,
        exportedAt: new Date().toISOString(),
        dataCategories: gdprRequest.requestDetails.dataCategories,
        format: gdprRequest.requestDetails.preferredFormat || 'json'
      },
      userData: {
        personalData: {
          userId: gdprRequest.userId,
          exportNote: 'This is a mock GDPR data export for development purposes'
        },
        therapeuticData: {
          conversations: [],
          insights: [],
          note: 'Actual therapeutic data would be included here'
        },
        complianceInfo: {
          legalBases: {
            therapeutic_content: 'consent',
            personal_identity: 'contract'
          },
          retentionPeriods: {
            therapeutic_content: '7 years',
            personal_identity: '3 years after account closure'
          },
          dataControllerInfo: {
            name: 'FACET Mental Health Platform',
            contact: 'privacy@facet.com',
            dpo: 'dpo@facet.com'
          }
        }
      }
    }

    // Audit log for data download
    await auditLogger.logDataAccess(
      gdprRequest.userId,
      'gdpr_data_export',
      'read',
      securityContext.clientIP,
      securityContext.userAgent,
      {
        success: true,
        dataSize: JSON.stringify(exportData).length,
        encryptionUsed: true
      }
    )

    // Return the export data
    const response = NextResponse.json(exportData)
    
    // Set appropriate headers for download
    response.headers.set(
      'Content-Disposition', 
      `attachment; filename="facet-gdpr-export-${gdprRequest.requestId}.json"`
    )
    response.headers.set('Content-Type', 'application/json')
    
    return response

  } catch (error) {
    console.error('Data download error:', error)
    return NextResponse.json({
      error: {
        code: 'DOWNLOAD_FAILED',
        message: 'Failed to generate data download',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

/**
 * Calculate request progress percentage
 */
function calculateRequestProgress(gdprRequest: any): number {
  switch (gdprRequest.status) {
    case 'submitted':
      return 10
    case 'under_review':
      return 25
    case 'identity_verification_required':
      return 35
    case 'processing':
      return 70
    case 'completed':
      return 100
    case 'rejected':
      return 100
    case 'partially_completed':
      return 90
    default:
      return 0
  }
}

/**
 * Calculate time remaining until deadline
 */
function calculateTimeRemaining(deadlineDate: string): string {
  const deadline = new Date(deadlineDate)
  const now = new Date()
  const timeDiff = deadline.getTime() - now.getTime()
  
  if (timeDiff <= 0) {
    return 'Deadline passed'
  }
  
  const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
  return `${days} days remaining`
}

/**
 * Get status-specific information
 */
function getStatusInfo(status: string): any {
  const statusMap = {
    'submitted': {
      description: 'Your request has been received and is in queue for processing',
      nextStep: 'Request will be reviewed within 72 hours',
      estimatedTime: '1-3 business days'
    },
    'under_review': {
      description: 'Your request is being reviewed by our privacy team',
      nextStep: 'Identity verification may be required',
      estimatedTime: '5-7 business days'
    },
    'identity_verification_required': {
      description: 'Identity verification required to proceed with your request',
      nextStep: 'Check your email for verification instructions',
      estimatedTime: 'Pending your response'
    },
    'processing': {
      description: 'Your request is being processed',
      nextStep: 'Data collection and preparation in progress',
      estimatedTime: '7-14 business days'
    },
    'completed': {
      description: 'Your request has been completed successfully',
      nextStep: 'Download your data or review the results',
      estimatedTime: 'Completed'
    },
    'rejected': {
      description: 'Your request could not be completed',
      nextStep: 'Review rejection reason and contact support if needed',
      estimatedTime: 'Completed'
    },
    'partially_completed': {
      description: 'Your request was partially completed',
      nextStep: 'Review available results and contact support for assistance',
      estimatedTime: 'Completed'
    }
  }
  
  return statusMap[status as keyof typeof statusMap] || {
    description: 'Unknown status',
    nextStep: 'Contact support for assistance',
    estimatedTime: 'Unknown'
  }
}

/**
 * Get available user actions based on status
 */
function getAvailableActions(status: string): string[] {
  switch (status) {
    case 'submitted':
    case 'under_review':
    case 'identity_verification_required':
      return ['cancel_request', 'contact_support']
    case 'processing':
      return ['contact_support']
    case 'completed':
      return ['download_data', 'submit_new_request', 'contact_support']
    case 'rejected':
    case 'partially_completed':
      return ['submit_new_request', 'contact_support']
    default:
      return ['contact_support']
  }
}
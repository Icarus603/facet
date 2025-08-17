/**
 * FACET Emergency Intervention API
 * 
 * Critical API endpoints for mental health emergency response including
 * crisis detection, professional intervention coordination, and safety protocols.
 * 
 * CRITICAL: These endpoints handle life-threatening situations and must
 * maintain maximum availability and response speed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emergencyInterventionService, EmergencyLevel } from '@/lib/emergency/emergency-intervention-service'
import { securityMiddleware } from '@/lib/security/security-middleware'
import { auditLogger } from '@/lib/security/audit-logger'

// Request validation schemas
const EmergencyAssessmentSchema = z.object({
  conversationContext: z.object({
    messages: z.array(z.string()),
    emotionalState: z.object({
      valence: z.number().min(0).max(1),
      arousal: z.number().min(0).max(1),
      dominance: z.number().min(0).max(1)
    }).optional(),
    riskAssessment: z.object({
      suicideRisk: z.number().min(0).max(1),
      selfHarmRisk: z.number().min(0).max(1),
      crisisRisk: z.number().min(0).max(1)
    }).optional()
  }),
  urgentAssessment: z.boolean().optional().default(false)
})

const IncidentUpdateSchema = z.object({
  incidentId: z.string(),
  userResponse: z.enum(['responsive', 'unresponsive', 'declining_help']).optional(),
  resolution: z.enum(['resolved', 'escalated', 'ongoing', 'transferred']).optional(),
  notes: z.string().optional()
})

/**
 * POST /api/emergency/intervention - Assess and respond to potential emergency
 */
export async function POST(request: NextRequest) {
  try {
    // Apply security middleware with emergency priority
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
          message: 'User authentication required for emergency assessment'
        }
      }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const validation = EmergencyAssessmentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: {
          code: 'INVALID_EMERGENCY_REQUEST',
          message: 'Invalid emergency assessment request',
          details: validation.error.errors
        }
      }, { status: 400 })
    }

    const { conversationContext, urgentAssessment } = validation.data

    // Detect and respond to emergency
    const emergencyResponse = await emergencyInterventionService.detectAndRespondToEmergency(
      userId,
      {
        messages: conversationContext.messages,
        emotionalState: conversationContext.emotionalState || null,
        riskAssessment: conversationContext.riskAssessment || null
      },
      securityContext.clientIP
    )

    // Audit log for emergency assessment
    await auditLogger.logSecurityThreat(
      'emergency_assessment',
      'medium',
      userId,
      securityContext.clientIP,
      securityContext.userAgent,
      {
        threatDetails: {
          emergencyDetected: emergencyResponse.emergencyDetected,
          level: emergencyResponse.emergencyLevel,
          interventions: emergencyResponse.interventionsTriggered.length,
          urgent: urgentAssessment
        },
        securityFlags: emergencyResponse.emergencyDetected ? ['emergency_detected'] : [],
        blocked: false,
        action: 'emergency_assessment_completed'
      }
    )

    if (emergencyResponse.emergencyDetected) {
      console.log(`🚨 Emergency detected for user ${userId}: ${emergencyResponse.emergencyLevel}`)
      
      return NextResponse.json({
        emergency: {
          detected: true,
          level: emergencyResponse.emergencyLevel,
          incidentId: emergencyResponse.incidentId,
          confidence: 'high', // Simplified for API response
          immediateRisk: emergencyResponse.emergencyLevel === 'critical'
        },
        interventions: {
          triggered: emergencyResponse.interventionsTriggered,
          immediateActions: emergencyResponse.immediateActions,
          professionalServices: emergencyResponse.professionalContactInfo?.map(service => ({
            name: service.name,
            phone: service.phone,
            description: service.description,
            available24_7: service.available24_7,
            serviceType: service.serviceType
          }))
        },
        userGuidance: {
          primaryMessage: getEmergencyMessage(emergencyResponse.emergencyLevel!),
          actionItems: emergencyResponse.immediateActions,
          supportResources: [
            {
              name: '988 Suicide & Crisis Lifeline',
              phone: '988',
              description: 'Free, confidential, 24/7 crisis support',
              priority: 'high'
            },
            {
              name: 'Crisis Text Line',
              phone: '741741',
              description: 'Text HOME to 741741 for crisis counseling',
              priority: 'high'
            }
          ]
        },
        followUp: {
          incidentId: emergencyResponse.incidentId,
          statusCheckRequired: true,
          professionalFollowUpRecommended: emergencyResponse.emergencyLevel !== 'low',
          emergencyContactsNotified: emergencyResponse.interventionsTriggered.includes('support_network_alert')
        }
      })
    } else {
      return NextResponse.json({
        emergency: {
          detected: false,
          level: 'low',
          riskFactors: []
        },
        preventiveSupport: {
          copingStrategies: [
            'Practice deep breathing exercises',
            'Reach out to a trusted friend or family member',
            'Engage in a favorite activity or hobby',
            'Consider scheduling a check-in with a mental health professional'
          ],
          resources: [
            {
              name: 'Mental Health Resources',
              description: 'Access to self-help tools and professional resources'
            }
          ]
        }
      })
    }

  } catch (error) {
    console.error('Emergency intervention error:', error)

    // For emergency endpoints, always return a safe response even on error
    return NextResponse.json({
      emergency: {
        detected: true,
        level: 'moderate' as EmergencyLevel,
        systemError: true
      },
      interventions: {
        triggered: ['professional_referral'],
        immediateActions: [
          'System error detected - professional support recommended',
          'Please contact crisis services directly if in immediate danger'
        ],
        professionalServices: [
          {
            name: '988 Suicide & Crisis Lifeline',
            phone: '988',
            description: 'Free, confidential, 24/7 crisis support',
            available24_7: true,
            serviceType: 'crisis_hotline'
          }
        ]
      },
      userGuidance: {
        primaryMessage: 'If you are in immediate danger, please call 911 or go to your nearest emergency room.',
        actionItems: [
          'Contact emergency services if immediate risk',
          'Reach out to crisis hotline for support',
          'Contact trusted friend or family member'
        ]
      },
      error: {
        code: 'EMERGENCY_SYSTEM_ERROR',
        message: 'Emergency system error - professional help recommended',
        supportContact: '988'
      }
    }, { status: 500 })
  }
}

/**
 * PUT /api/emergency/intervention - Update emergency incident status
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
    const validation = IncidentUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: {
          code: 'INVALID_UPDATE_REQUEST',
          message: 'Invalid incident update request',
          details: validation.error.errors
        }
      }, { status: 400 })
    }

    const { incidentId, userResponse, resolution, notes } = validation.data

    // Get incident to verify ownership
    const incident = await emergencyInterventionService.getEmergencyIncident(incidentId)
    if (!incident) {
      return NextResponse.json({
        error: {
          code: 'INCIDENT_NOT_FOUND',
          message: 'Emergency incident not found'
        }
      }, { status: 404 })
    }

    if (incident.userId !== userId) {
      return NextResponse.json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this emergency incident'
        }
      }, { status: 403 })
    }

    // Update incident
    if (resolution) {
      await emergencyInterventionService.updateIncidentResolution(incidentId, resolution, notes)
    }

    // Audit log for incident update
    await auditLogger.logSecurityThreat(
      'emergency_incident_update',
      'low',
      userId,
      securityContext.clientIP,
      securityContext.userAgent,
      {
        threatDetails: {
          incidentId,
          userResponse,
          resolution,
          hasNotes: !!notes
        },
        securityFlags: ['incident_update'],
        blocked: false,
        action: 'emergency_incident_updated'
      }
    )

    return NextResponse.json({
      success: true,
      incidentId,
      updatedAt: new Date().toISOString(),
      status: resolution || incident.incidentResolution,
      message: 'Emergency incident updated successfully',
      followUpRecommended: resolution === 'resolved' ? false : true,
      nextSteps: getNextSteps(resolution || incident.incidentResolution)
    })

  } catch (error) {
    console.error('Emergency incident update error:', error)

    return NextResponse.json({
      error: {
        code: 'INCIDENT_UPDATE_FAILED',
        message: 'Failed to update emergency incident',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

/**
 * GET /api/emergency/intervention - Get user's emergency incidents
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

    // Get user's emergency incidents
    const incidents = await emergencyInterventionService.getUserEmergencyIncidents(userId)

    // Filter sensitive information for client response
    const sanitizedIncidents = incidents.map(incident => ({
      incidentId: incident.incidentId,
      detectedAt: incident.detectedAt,
      resolvedAt: incident.resolvedAt,
      emergencyLevel: incident.emergencyLevel,
      incidentResolution: incident.incidentResolution,
      interventionsTriggered: incident.interventionsTriggered,
      followUpScheduled: incident.followUpScheduled
    }))

    return NextResponse.json({
      incidents: sanitizedIncidents,
      summary: {
        totalIncidents: incidents.length,
        resolvedIncidents: incidents.filter(i => i.incidentResolution === 'resolved').length,
        ongoingIncidents: incidents.filter(i => i.incidentResolution === 'ongoing').length,
        lastIncident: incidents.length > 0 ? incidents[incidents.length - 1].detectedAt : null
      },
      emergencyResources: [
        {
          name: '988 Suicide & Crisis Lifeline',
          phone: '988',
          description: 'Free, confidential, 24/7 crisis support',
          available24_7: true
        },
        {
          name: 'Crisis Text Line',
          phone: '741741',
          description: 'Text HOME to 741741 for crisis counseling',
          available24_7: true
        }
      ]
    })

  } catch (error) {
    console.error('Emergency incidents retrieval error:', error)

    return NextResponse.json({
      error: {
        code: 'INCIDENTS_RETRIEVAL_FAILED',
        message: 'Failed to retrieve emergency incidents',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

// Helper functions

function getEmergencyMessage(level: EmergencyLevel): string {
  switch (level) {
    case 'critical':
      return 'IMMEDIATE HELP NEEDED: If you are in immediate danger, please call 911 or go to your nearest emergency room. You are not alone and help is available.'
    case 'high':
      return 'Crisis support is available. Please reach out to a crisis hotline or mental health professional immediately. Your safety and wellbeing matter.'
    case 'moderate':
      return 'It sounds like you\'re going through a difficult time. Professional support is recommended to help you through this.'
    case 'low':
      return 'Thank you for sharing. While this seems manageable, professional support is always available if you need it.'
    default:
      return 'Help is available. If you need immediate support, please contact crisis services.'
  }
}

function getNextSteps(resolution: string): string[] {
  switch (resolution) {
    case 'resolved':
      return [
        'Continue with regular therapy sessions',
        'Monitor your wellbeing',
        'Reach out if you need support'
      ]
    case 'escalated':
      return [
        'Follow up with professional services',
        'Maintain contact with support network',
        'Attend scheduled appointments'
      ]
    case 'ongoing':
      return [
        'Continue monitoring and support',
        'Regular check-ins recommended',
        'Professional follow-up scheduled'
      ]
    case 'transferred':
      return [
        'Follow professional care plan',
        'Maintain emergency contact information',
        'Continue therapy as recommended'
      ]
    default:
      return [
        'Follow up with mental health professionals',
        'Monitor your safety and wellbeing',
        'Use available support resources'
      ]
  }
}
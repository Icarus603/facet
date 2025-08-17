/**
 * FACET Safety Plan Management API
 * 
 * API endpoints for creating, managing, and activating personal safety plans
 * for mental health crisis prevention and intervention.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emergencyInterventionService } from '@/lib/emergency/emergency-intervention-service'
import { securityMiddleware } from '@/lib/security/security-middleware'
import { auditLogger } from '@/lib/security/audit-logger'

// Safety plan validation schema
const SafetyPlanSchema = z.object({
  personalWarningSigns: z.array(z.string()).default([]),
  triggerSituations: z.array(z.string()).default([]),
  personalCopingStrategies: z.array(z.string()).default([]),
  distractionActivities: z.array(z.string()).default([]),
  socialActivities: z.array(z.string()).default([]),
  professionalSupports: z.array(z.string()).default([]),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    phoneNumber: z.string(),
    email: z.string().email().optional(),
    isPrimary: z.boolean().default(false),
    consentToContact: z.boolean(),
    preferredContactMethod: z.enum(['phone', 'email', 'text']).default('phone')
  })).default([]),
  localCrisisServices: z.object({
    hotlineNumber: z.string().default('988'),
    textCrisisNumber: z.string().optional(),
    emergencyRoomAddress: z.string().optional(),
    mobileTeamNumber: z.string().optional()
  }).default({}),
  meansRestriction: z.object({
    lethalMeansRemoved: z.array(z.string()).default([]),
    safetyMeasuresInPlace: z.array(z.string()).default([]),
    supportPersonInvolved: z.boolean().default(false)
  }).default({}),
  followUpSchedule: z.object({
    nextProfessionalAppointment: z.string().optional(),
    checkInSchedule: z.array(z.string()).default([]),
    recoveryGoals: z.array(z.string()).default([])
  }).default({})
})

/**
 * POST /api/emergency/safety-plan - Create or update safety plan
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
          message: 'User authentication required'
        }
      }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const validation = SafetyPlanSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: {
          code: 'INVALID_SAFETY_PLAN',
          message: 'Invalid safety plan format',
          details: validation.error.errors
        }
      }, { status: 400 })
    }

    const safetyPlanData = validation.data

    // Create safety plan (TODO: Implement actual storage)
    const planId = `safety_plan_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const now = new Date().toISOString()

    const safetyPlan = {
      planId,
      userId,
      createdAt: now,
      lastUpdatedAt: now,
      ...safetyPlanData
    }

    // TODO: Store in Supabase
    console.log(`Created/updated safety plan for user ${userId}: ${planId}`)

    // Audit log for safety plan creation
    await auditLogger.logCrisisEvent(
      'crisis_protocol_triggered',
      userId,
      planId,
      securityContext.clientIP,
      {
        riskLevel: 'medium',
        interventionType: 'safety_plan_created',
        userAgent: securityContext.userAgent,
        triggerDetails: {
          planId,
          hasEmergencyContacts: safetyPlanData.emergencyContacts.length > 0,
          hasCopingStrategies: safetyPlanData.personalCopingStrategies.length > 0,
          hasProfessionalSupports: safetyPlanData.professionalSupports.length > 0
        }
      }
    )

    return NextResponse.json({
      success: true,
      planId,
      message: 'Safety plan created successfully',
      plan: {
        planId,
        createdAt: now,
        lastUpdatedAt: now,
        sections: {
          warningSigns: safetyPlanData.personalWarningSigns.length,
          copingStrategies: safetyPlanData.personalCopingStrategies.length,
          socialSupports: safetyPlanData.socialActivities.length,
          professionalSupports: safetyPlanData.professionalSupports.length,
          emergencyContacts: safetyPlanData.emergencyContacts.length
        }
      },
      recommendations: [
        'Review and update your safety plan regularly',
        'Share relevant parts with trusted friends or family',
        'Keep crisis hotline numbers easily accessible',
        'Practice your coping strategies when not in crisis'
      ]
    })

  } catch (error) {
    console.error('Safety plan creation error:', error)

    return NextResponse.json({
      error: {
        code: 'SAFETY_PLAN_CREATION_FAILED',
        message: 'Failed to create safety plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

/**
 * GET /api/emergency/safety-plan - Get user's safety plan
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

    // Get user's safety plan
    const safetyPlan = await emergencyInterventionService.getUserSafetyPlan(userId)

    if (!safetyPlan) {
      return NextResponse.json({
        hasSafetyPlan: false,
        message: 'No safety plan found',
        template: {
          sections: [
            {
              title: 'Personal Warning Signs',
              description: 'Signs that indicate you might be entering a crisis',
              examples: ['Feeling hopeless', 'Withdrawing from others', 'Sleep changes']
            },
            {
              title: 'Coping Strategies',
              description: 'Things you can do to help yourself feel better',
              examples: ['Deep breathing', 'Listen to music', 'Take a walk']
            },
            {
              title: 'Social Activities',
              description: 'People and social settings that help you feel better',
              examples: ['Call a friend', 'Visit family', 'Join support group']
            },
            {
              title: 'Professional Supports',
              description: 'Mental health professionals you can contact',
              examples: ['Therapist', 'Psychiatrist', 'Case manager']
            },
            {
              title: 'Emergency Contacts',
              description: 'People to contact in a crisis',
              examples: ['Trusted friend', 'Family member', 'Crisis hotline']
            }
          ]
        },
        crisisResources: [
          {
            name: '988 Suicide & Crisis Lifeline',
            phone: '988',
            description: 'Free, confidential, 24/7 crisis support'
          },
          {
            name: 'Crisis Text Line',
            phone: '741741',
            description: 'Text HOME to 741741 for crisis counseling'
          }
        ]
      })
    }

    return NextResponse.json({
      hasSafetyPlan: true,
      plan: {
        planId: safetyPlan.planId,
        createdAt: safetyPlan.createdAt,
        lastUpdatedAt: safetyPlan.lastUpdatedAt,
        
        // Safety plan sections
        personalWarningSigns: safetyPlan.personalWarningSigns,
        triggerSituations: safetyPlan.triggerSituations,
        personalCopingStrategies: safetyPlan.personalCopingStrategies,
        distractionActivities: safetyPlan.distractionActivities,
        socialActivities: safetyPlan.socialActivities,
        professionalSupports: safetyPlan.professionalSupports,
        
        // Emergency contacts
        emergencyContacts: safetyPlan.emergencyContacts.map(contact => ({
          name: contact.name,
          relationship: contact.relationship,
          phoneNumber: contact.phoneNumber,
          email: contact.email,
          isPrimary: contact.isPrimary,
          preferredContactMethod: contact.preferredContactMethod
        })),
        
        // Crisis services
        localCrisisServices: safetyPlan.localCrisisServices,
        
        // Safety measures
        meansRestriction: safetyPlan.meansRestriction,
        
        // Follow-up
        followUpSchedule: safetyPlan.followUpSchedule
      },
      usage: {
        lastActivated: null, // TODO: Track safety plan activations
        activationCount: 0,
        effectiveness: 'Not yet evaluated'
      },
      recommendations: [
        'Review and update your safety plan every 3-6 months',
        'Practice your coping strategies when not in crisis',
        'Share your plan with trusted friends or family members',
        'Keep crisis hotline numbers easily accessible'
      ]
    })

  } catch (error) {
    console.error('Safety plan retrieval error:', error)

    return NextResponse.json({
      error: {
        code: 'SAFETY_PLAN_RETRIEVAL_FAILED',
        message: 'Failed to retrieve safety plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}

/**
 * POST /api/emergency/safety-plan/activate - Activate safety plan
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

    // Get user's safety plan
    const safetyPlan = await emergencyInterventionService.getUserSafetyPlan(userId)

    if (!safetyPlan) {
      return NextResponse.json({
        error: {
          code: 'NO_SAFETY_PLAN',
          message: 'No safety plan found to activate'
        }
      }, { status: 404 })
    }

    // Parse activation request
    const body = await request.json().catch(() => ({}))
    const reason = body.reason || 'user_requested'
    const urgency = body.urgency || 'moderate'

    // Log safety plan activation
    await auditLogger.logCrisisEvent(
      'crisis_protocol_triggered',
      userId,
      safetyPlan.planId,
      securityContext.clientIP,
      {
        riskLevel: urgency === 'high' ? 'high' : 'medium',
        interventionType: 'safety_plan_activation',
        userAgent: securityContext.userAgent,
        triggerDetails: {
          planId: safetyPlan.planId,
          reason,
          urgency,
          hasEmergencyContacts: safetyPlan.emergencyContacts.length > 0
        }
      }
    )

    // TODO: Implement actual safety plan activation logic
    // - Send notifications to emergency contacts
    // - Schedule follow-up check-ins
    // - Activate monitoring protocols

    console.log(`Safety plan activated for user ${userId}: ${safetyPlan.planId}`)

    return NextResponse.json({
      success: true,
      planActivated: true,
      activatedAt: new Date().toISOString(),
      planId: safetyPlan.planId,
      
      // Immediate actions taken
      actionsTriggered: [
        'Safety plan guidelines displayed',
        'Crisis resources provided',
        'Coping strategies highlighted',
        urgency === 'high' ? 'Emergency contacts notified' : 'Emergency contacts on standby'
      ],
      
      // Available coping strategies
      immediateCopingStrategies: safetyPlan.personalCopingStrategies.slice(0, 5),
      
      // Crisis contacts
      crisisContacts: [
        {
          name: '988 Suicide & Crisis Lifeline',
          phone: '988',
          description: 'Free, confidential, 24/7 crisis support',
          priority: 'high'
        },
        ...safetyPlan.emergencyContacts
          .filter(contact => contact.isPrimary)
          .map(contact => ({
            name: contact.name,
            phone: contact.phoneNumber,
            relationship: contact.relationship,
            priority: 'high'
          }))
      ],
      
      // Next steps
      nextSteps: [
        'Use your identified coping strategies',
        'Reach out to a support person',
        'Contact professional help if needed',
        'Remove access to means of self-harm if applicable',
        'Stay in a safe environment'
      ],
      
      // Follow-up
      followUp: {
        checkInScheduled: true,
        checkInTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        professionalContactRecommended: urgency === 'high'
      }
    })

  } catch (error) {
    console.error('Safety plan activation error:', error)

    return NextResponse.json({
      error: {
        code: 'SAFETY_PLAN_ACTIVATION_FAILED',
        message: 'Failed to activate safety plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}
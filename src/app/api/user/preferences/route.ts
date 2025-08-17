/**
 * FACET User Preferences API Endpoint
 * 
 * Manage user preferences for agent orchestration and communication
 * Implements exact UserPreferences format from API_CONTRACT.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

import { APIErrorResponse } from '@/lib/types/api-contract'

// User preferences interface from API_CONTRACT.md
interface UserPreferences {
  transparencyLevel: 'minimal' | 'standard' | 'detailed'
  agentVisibility: boolean
  processingSpeed: 'fast' | 'thorough'
  communicationStyle: 'professional_warm' | 'clinical_precise' | 'casual_supportive'
  notificationSettings: {
    agentUpdates: boolean
    progressMilestones: boolean
    emergencyAlerts: boolean
    weeklyInsights: boolean
  }
  therapyGoals: string[]
  copingStrategies: string[]
  triggers: string[]
  supportNetworkContacts: Array<{
    name: string
    relationship: string
    phoneNumber?: string
    emergencyContact: boolean
  }>
  privacySettings: {
    shareDataWithResearchers: boolean
    allowAnonymousUsageStats: boolean
    dataRetentionPeriod: '1_year' | '2_years' | '5_years' | 'indefinite'
  }
  accessibilitySettings: {
    fontSize: 'small' | 'medium' | 'large'
    highContrast: boolean
    screenReader: boolean
    keyboardNavigation: boolean
  }
}

// Request validation schemas
const UserPreferencesSchema = z.object({
  transparencyLevel: z.enum(['minimal', 'standard', 'detailed']),
  agentVisibility: z.boolean(),
  processingSpeed: z.enum(['fast', 'thorough']),
  communicationStyle: z.enum(['professional_warm', 'clinical_precise', 'casual_supportive']),
  notificationSettings: z.object({
    agentUpdates: z.boolean(),
    progressMilestones: z.boolean(),
    emergencyAlerts: z.boolean(),
    weeklyInsights: z.boolean()
  }),
  therapyGoals: z.array(z.string()).max(10),
  copingStrategies: z.array(z.string()).max(20),
  triggers: z.array(z.string()).max(15),
  supportNetworkContacts: z.array(z.object({
    name: z.string().min(1).max(100),
    relationship: z.string().min(1).max(50),
    phoneNumber: z.string().optional(),
    emergencyContact: z.boolean()
  })).max(10),
  privacySettings: z.object({
    shareDataWithResearchers: z.boolean(),
    allowAnonymousUsageStats: z.boolean(),
    dataRetentionPeriod: z.enum(['1_year', '2_years', '5_years', 'indefinite'])
  }),
  accessibilitySettings: z.object({
    fontSize: z.enum(['small', 'medium', 'large']),
    highContrast: z.boolean(),
    screenReader: z.boolean(),
    keyboardNavigation: z.boolean()
  })
})

// Simulated user preferences store - in production this would use Supabase
const userPreferencesStore = new Map<string, UserPreferences>()

// Default preferences for new users
const getDefaultPreferences = (): UserPreferences => ({
  transparencyLevel: 'standard',
  agentVisibility: true,
  processingSpeed: 'thorough',
  communicationStyle: 'professional_warm',
  notificationSettings: {
    agentUpdates: true,
    progressMilestones: true,
    emergencyAlerts: true,
    weeklyInsights: false
  },
  therapyGoals: [],
  copingStrategies: [],
  triggers: [],
  supportNetworkContacts: [],
  privacySettings: {
    shareDataWithResearchers: false,
    allowAnonymousUsageStats: true,
    dataRetentionPeriod: '2_years'
  },
  accessibilitySettings: {
    fontSize: 'medium',
    highContrast: false,
    screenReader: false,
    keyboardNavigation: false
  }
})

// GET /api/user/preferences - Retrieve user preferences
export async function GET(request: NextRequest) {
  const requestId = uuidv4()
  
  try {
    // Get user ID from authentication
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication required',
          recoveryOptions: ['login', 'refresh_token']
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          errorSeverity: 'high'
        }
      } as APIErrorResponse, { status: 401 })
    }

    // Get preferences from store or create defaults
    let preferences = userPreferencesStore.get(userId)
    if (!preferences) {
      preferences = getDefaultPreferences()
      userPreferencesStore.set(userId, preferences)
    }

    return NextResponse.json({
      preferences,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    })

  } catch (error) {
    console.error('Get preferences error:', error)
    
    return NextResponse.json({
      error: {
        code: 'PREFERENCES_RETRIEVAL_FAILED',
        message: 'Unable to retrieve user preferences',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : undefined,
        recoveryOptions: ['try_again', 'use_default_preferences']
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        errorSeverity: 'medium'
      }
    } as APIErrorResponse, { status: 500 })
  }
}

// PUT /api/user/preferences - Update user preferences
export async function PUT(request: NextRequest) {
  const requestId = uuidv4()
  
  try {
    // Get user ID from authentication
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication required',
          recoveryOptions: ['login', 'refresh_token']
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          errorSeverity: 'high'
        }
      } as APIErrorResponse, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = UserPreferencesSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: {
          code: 'INVALID_PREFERENCES',
          message: 'Invalid preferences format',
          details: validationResult.error.message,
          recoveryOptions: ['check_preferences_format', 'use_partial_update']
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          errorSeverity: 'medium'
        }
      } as APIErrorResponse, { status: 400 })
    }

    const newPreferences = validationResult.data

    // Validate business rules
    const validationErrors = validatePreferencesBusinessRules(newPreferences)
    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: {
          code: 'PREFERENCES_VALIDATION_FAILED',
          message: 'Preferences validation failed',
          details: `Validation errors: ${validationErrors.join(', ')}`,
          recoveryOptions: ['correct_validation_errors', 'use_default_values']
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          errorSeverity: 'medium'
        }
      } as APIErrorResponse, { status: 400 })
    }

    // Update preferences in store
    userPreferencesStore.set(userId, newPreferences)

    // Store in database (simplified for now)
    await storeUserPreferencesInDatabase(userId, newPreferences)

    // Log preference changes for analytics
    await logPreferenceChanges(userId, newPreferences)

    return NextResponse.json({
      preferences: newPreferences,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        updated: true,
        version: '1.0.0'
      }
    })

  } catch (error) {
    console.error('Update preferences error:', error)
    
    return NextResponse.json({
      error: {
        code: 'PREFERENCES_UPDATE_FAILED',
        message: 'Unable to update user preferences',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : undefined,
        recoveryOptions: ['try_again', 'contact_support']
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        errorSeverity: 'high'
      }
    } as APIErrorResponse, { status: 500 })
  }
}

// PATCH /api/user/preferences - Partial update of user preferences
export async function PATCH(request: NextRequest) {
  const requestId = uuidv4()
  
  try {
    // Get user ID from authentication
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User authentication required',
          recoveryOptions: ['login', 'refresh_token']
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          errorSeverity: 'high'
        }
      } as APIErrorResponse, { status: 401 })
    }

    // Get existing preferences
    let existingPreferences = userPreferencesStore.get(userId)
    if (!existingPreferences) {
      existingPreferences = getDefaultPreferences()
    }

    // Parse partial update
    const body = await request.json()
    
    // Merge with existing preferences
    const updatedPreferences = deepMergePreferences(existingPreferences, body)

    // Validate merged preferences
    const validationResult = UserPreferencesSchema.safeParse(updatedPreferences)
    if (!validationResult.success) {
      return NextResponse.json({
        error: {
          code: 'INVALID_PREFERENCES_UPDATE',
          message: 'Invalid preferences update',
          details: validationResult.error.message,
          recoveryOptions: ['check_update_format', 'use_put_for_full_update']
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          errorSeverity: 'medium'
        }
      } as APIErrorResponse, { status: 400 })
    }

    // Update preferences
    userPreferencesStore.set(userId, validationResult.data)
    await storeUserPreferencesInDatabase(userId, validationResult.data)

    return NextResponse.json({
      preferences: validationResult.data,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        updated: true,
        updateType: 'partial',
        version: '1.0.0'
      }
    })

  } catch (error) {
    console.error('Patch preferences error:', error)
    
    return NextResponse.json({
      error: {
        code: 'PREFERENCES_PATCH_FAILED',
        message: 'Unable to update preferences',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Unknown error') : undefined,
        recoveryOptions: ['try_again', 'use_put_method']
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        errorSeverity: 'medium'
      }
    } as APIErrorResponse, { status: 500 })
  }
}

// Helper functions

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // TODO: Implement proper authentication using Supabase
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  
  // Mock user ID for development
  return 'mock-user-id-12345'
}

function validatePreferencesBusinessRules(preferences: UserPreferences): string[] {
  const errors: string[] = []
  
  // Emergency contacts validation
  const emergencyContacts = preferences.supportNetworkContacts.filter(c => c.emergencyContact)
  if (emergencyContacts.length === 0) {
    errors.push('At least one emergency contact is recommended for safety')
  }
  
  // Phone number validation for emergency contacts
  emergencyContacts.forEach((contact, index) => {
    if (!contact.phoneNumber) {
      errors.push(`Emergency contact "${contact.name}" should have a phone number`)
    }
  })
  
  // Processing speed vs transparency level compatibility
  if (preferences.processingSpeed === 'fast' && preferences.transparencyLevel === 'detailed') {
    errors.push('Fast processing speed is not compatible with detailed transparency level')
  }
  
  // Crisis notification requirements
  if (!preferences.notificationSettings.emergencyAlerts) {
    errors.push('Emergency alerts should be enabled for user safety')
  }
  
  return errors
}

async function storeUserPreferencesInDatabase(userId: string, preferences: UserPreferences): Promise<void> {
  // TODO: Implement database storage using Supabase
  console.log(`Storing preferences for user ${userId}:`, JSON.stringify(preferences, null, 2))
  
  // In production, this would update the user_preferences table
  // const { error } = await supabase
  //   .from('user_preferences')
  //   .upsert({ user_id: userId, preferences, updated_at: new Date() })
}

async function logPreferenceChanges(userId: string, newPreferences: UserPreferences): Promise<void> {
  // TODO: Implement preference change logging for analytics
  console.log(`Preference changes logged for user ${userId}`)
  
  // This would log changes to analytics service for insights
  // await analytics.track('preferences_updated', {
  //   userId,
  //   timestamp: new Date(),
  //   preferences: newPreferences
  // })
}

function deepMergePreferences(existing: UserPreferences, updates: any): UserPreferences {
  const merged = { ...existing }
  
  for (const [key, value] of Object.entries(updates)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Deep merge nested objects
      (merged as any)[key] = {
        ...(merged[key as keyof UserPreferences] as any),
        ...value
      }
    } else {
      // Direct assignment for primitives and arrays
      (merged as any)[key] = value
    }
  }
  
  return merged
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json({
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'POST method not supported. Use PUT for full update or PATCH for partial update.',
      recoveryOptions: ['use_put_method', 'use_patch_method']
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
      message: 'DELETE method not supported. Preferences cannot be deleted, only reset to defaults.',
      recoveryOptions: ['use_put_with_defaults', 'contact_support_for_account_deletion']
    },
    metadata: {
      requestId: uuidv4(),
      timestamp: new Date().toISOString(),
      errorSeverity: 'low'
    }
  } as APIErrorResponse, { status: 405 })
}
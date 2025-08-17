/**
 * FACET Orchestration Database Setup
 * 
 * Developer A: AI Systems Engineer - Database table creation for orchestration logging
 * Implements schema from SPECS.md lines 639-724
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

interface SchemaSetupResult {
  success: boolean
  tablesCreated: string[]
  indexesCreated: string[]
  viewsCreated: string[]
  errors: string[]
}

/**
 * Set up orchestration database tables and indexes
 * This should be run during deployment or database migration
 */
export async function setupOrchestrationTables(): Promise<SchemaSetupResult> {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const result: SchemaSetupResult = {
    success: false,
    tablesCreated: [],
    indexesCreated: [],
    viewsCreated: [],
    errors: []
  }

  try {
    // Read the SQL schema file
    const schemaPath = join(process.cwd(), 'src/lib/database/orchestration-schema.sql')
    const schemaSql = readFileSync(schemaPath, 'utf-8')

    // Split SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    // Execute each SQL statement
    for (const statement of statements) {
      try {
        // Skip comment-only statements
        if (statement.startsWith('--') || statement.startsWith('/*')) {
          continue
        }

        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          console.error(`Error executing SQL statement: ${statement.substring(0, 100)}...`)
          console.error(error)
          result.errors.push(`SQL Error: ${error.message}`)
          continue
        }

        // Track what was created
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          const tableName = extractTableName(statement)
          if (tableName) result.tablesCreated.push(tableName)
        } else if (statement.toUpperCase().includes('CREATE INDEX')) {
          const indexName = extractIndexName(statement)
          if (indexName) result.indexesCreated.push(indexName)
        } else if (statement.toUpperCase().includes('CREATE VIEW')) {
          const viewName = extractViewName(statement)
          if (viewName) result.viewsCreated.push(viewName)
        }

      } catch (sqlError) {
        console.error(`Failed to execute SQL: ${statement.substring(0, 100)}...`)
        console.error(sqlError)
        result.errors.push(`Execution Error: ${sqlError instanceof Error ? sqlError.message : 'Unknown error'}`)
      }
    }

    // Verify tables were created successfully
    const verificationResult = await verifyTablesExist(supabase)
    if (!verificationResult.success) {
      result.errors.push(...verificationResult.errors)
    }

    result.success = result.errors.length === 0

    return result

  } catch (error) {
    console.error('Failed to setup orchestration tables:', error)
    result.errors.push(`Setup Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return result
  }
}

/**
 * Verify that all required tables exist
 */
async function verifyTablesExist(supabase: any): Promise<{ success: boolean, errors: string[] }> {
  const requiredTables = [
    'agent_orchestration_logs',
    'agent_performance_metrics', 
    'user_agent_preferences',
    'execution_steps'
  ]

  const errors: string[] = []

  for (const tableName of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (error) {
        errors.push(`Table ${tableName} verification failed: ${error.message}`)
      }
    } catch (err) {
      errors.push(`Table ${tableName} does not exist or is not accessible`)
    }
  }

  return {
    success: errors.length === 0,
    errors
  }
}

/**
 * Initialize default user preferences for existing users
 */
export async function initializeDefaultUserPreferences(): Promise<{ success: boolean, usersUpdated: number, errors: string[] }> {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const errors: string[] = []
  let usersUpdated = 0

  try {
    // Get all users who don't have agent preferences yet
    const { data: usersWithoutPrefs, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .not('id', 'in', 
        supabase
          .from('user_agent_preferences')
          .select('user_id')
      )

    if (fetchError) {
      errors.push(`Failed to fetch users: ${fetchError.message}`)
      return { success: false, usersUpdated: 0, errors }
    }

    // Create default preferences for users without them
    if (usersWithoutPrefs && usersWithoutPrefs.length > 0) {
      const defaultPreferences = usersWithoutPrefs.map(user => ({
        user_id: user.id,
        transparency_level: 'standard',
        show_agent_reasoning: true,
        show_execution_timeline: true,
        show_confidence_scores: false,
        show_agent_personalities: true,
        response_speed_preference: 'balanced',
        parallel_processing_enabled: true,
        max_wait_time_seconds: 8,
        communication_style: 'professional_warm',
        verbosity_level: 'standard',
        include_insights_in_responses: true,
        mention_agent_names: false,
        enable_personalization: true,
        enable_agent_learning: true,
        share_anonymous_analytics: true,
        data_retention_days: 730,
        allow_crisis_sharing: true,
        reduced_motion: false,
        high_contrast: false,
        larger_text: false,
        audio_descriptions: false,
        agent_preferences: {}
      }))

      const { error: insertError } = await supabase
        .from('user_agent_preferences')
        .insert(defaultPreferences)

      if (insertError) {
        errors.push(`Failed to insert default preferences: ${insertError.message}`)
      } else {
        usersUpdated = defaultPreferences.length
      }
    }

    return {
      success: errors.length === 0,
      usersUpdated,
      errors
    }

  } catch (error) {
    errors.push(`Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { success: false, usersUpdated: 0, errors }
  }
}

/**
 * Clean up old orchestration data based on retention policies
 */
export async function cleanupOrchestrationData(): Promise<{ success: boolean, recordsDeleted: number, errors: string[] }> {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const errors: string[] = []

  try {
    // Call the cleanup function defined in the schema
    const { data, error } = await supabase.rpc('cleanup_orchestration_data')

    if (error) {
      errors.push(`Cleanup failed: ${error.message}`)
      return { success: false, recordsDeleted: 0, errors }
    }

    return {
      success: true,
      recordsDeleted: data || 0,
      errors: []
    }

  } catch (error) {
    errors.push(`Cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { success: false, recordsDeleted: 0, errors }
  }
}

// Helper functions to extract names from SQL statements
function extractTableName(statement: string): string | null {
  const match = statement.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i)
  return match ? match[1] : null
}

function extractIndexName(statement: string): string | null {
  const match = statement.match(/CREATE INDEX(?:\s+IF NOT EXISTS)?\s+(\w+)/i)
  return match ? match[1] : null
}

function extractViewName(statement: string): string | null {
  const match = statement.match(/CREATE(?:\s+OR REPLACE)?\s+VIEW\s+(\w+)/i)
  return match ? match[1] : null
}

/**
 * Development helper: Reset all orchestration tables (WARNING: Data loss!)
 */
export async function resetOrchestrationTables(): Promise<SchemaSetupResult> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot reset tables in production environment')
  }

  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const result: SchemaSetupResult = {
    success: false,
    tablesCreated: [],
    indexesCreated: [],
    viewsCreated: [],
    errors: []
  }

  try {
    // Drop tables in reverse dependency order
    const dropStatements = [
      'DROP VIEW IF EXISTS user_orchestration_patterns CASCADE',
      'DROP VIEW IF EXISTS orchestration_strategy_effectiveness CASCADE', 
      'DROP VIEW IF EXISTS agent_effectiveness_summary CASCADE',
      'DROP TABLE IF EXISTS execution_steps CASCADE',
      'DROP TABLE IF EXISTS agent_performance_metrics CASCADE',
      'DROP TABLE IF EXISTS user_agent_preferences CASCADE',
      'DROP TABLE IF EXISTS agent_orchestration_logs CASCADE',
      'DROP FUNCTION IF EXISTS cleanup_orchestration_data() CASCADE',
      'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE'
    ]

    for (const statement of dropStatements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      if (error) {
        console.warn(`Warning during table reset: ${error.message}`)
      }
    }

    // Now recreate everything
    return await setupOrchestrationTables()

  } catch (error) {
    result.errors.push(`Reset error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return result
  }
}
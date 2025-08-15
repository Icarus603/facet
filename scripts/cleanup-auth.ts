import { createClient } from '@supabase/supabase-js'

// This script cleans up test auth users
// Run with: npx tsx scripts/cleanup-auth.ts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanupAuthUsers() {
  try {
    console.log('🧹 Cleaning up auth users...')
    
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }
    
    console.log(`Found ${users.users.length} users`)
    
    // Delete all users
    for (const user of users.users) {
      console.log(`Deleting user: ${user.email}`)
      
      // First delete from custom tables
      await supabase.from('users').delete().eq('id', user.id)
      await supabase.from('user_mental_health_profiles').delete().eq('user_id', user.id)
      
      // Then delete from auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) {
        console.error(`Error deleting user ${user.email}:`, deleteError)
      } else {
        console.log(`✅ Deleted user: ${user.email}`)
      }
    }
    
    console.log('🎉 Cleanup complete!')
    
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
}

cleanupAuthUsers()
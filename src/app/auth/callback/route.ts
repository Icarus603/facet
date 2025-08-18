import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectTo = searchParams.get('redirect_to') ?? '/chat/new'

  if (code) {
    const supabase = await createClient()
    
    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(new URL('/auth/signin?error=auth_error', request.url))
      }
      
      // Successful authentication - redirect to chat
      return NextResponse.redirect(new URL('/chat/new', request.url))
      
    } catch (error) {
      console.error('Error during auth callback:', error)
      return NextResponse.redirect(new URL('/auth/signin?error=auth_error', request.url))
    }
  }

  // No code provided - redirect to signin
  return NextResponse.redirect(new URL('/auth/signin', request.url))
}
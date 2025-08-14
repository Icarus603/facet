import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from './lib/supabase/database.types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Check if Supabase is properly configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl === 'your-supabase-url' || 
      supabaseAnonKey === 'your-supabase-anon-key') {
    // Supabase not configured - skip auth middleware in development
    console.warn('Supabase not configured - skipping auth middleware')
    return res
  }
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient<Database>({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes configuration
  const protectedRoutes = ['/dashboard', '/therapy', '/profile', '/admin']
  const adminRoutes = ['/admin']
  const crisisRoutes = ['/crisis']
  const professionalRoutes = ['/professional']
  
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )
  
  // Redirect unauthenticated users to sign in
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/auth/signin', req.url)
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Role-based access control
  if (session) {
    const { data: profile } = await supabase
      .from('users')
      .select('profile')
      .eq('id', session.user.id)
      .single()

    const userRole = profile?.profile?.role || 'user'

    // Admin route protection
    if (adminRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
      if (userRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Crisis responder route protection
    if (crisisRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
      if (userRole !== 'crisis_responder' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Professional route protection
    if (professionalRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
      if (userRole !== 'professional' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
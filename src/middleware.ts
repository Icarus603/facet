import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './lib/supabase/database.types'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Check if Supabase is properly configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl === 'your-supabase-url' || 
      supabaseAnonKey === 'your-supabase-anon-key') {
    // Supabase not configured - skip auth middleware in development
    console.warn('Supabase not configured - skipping auth middleware')
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes configuration
  const protectedRoutes = ['/dashboard', '/therapy', '/profile', '/admin']
  const adminRoutes = ['/admin']
  const crisisRoutes = ['/crisis']
  const professionalRoutes = ['/professional']
  
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  // Redirect unauthenticated users to sign in
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Role-based access control
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('profile')
      .eq('id', user.id)
      .single()

    const userRole = profile?.profile?.role || 'user'

    // Admin route protection
    if (adminRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
      if (userRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Crisis responder route protection
    if (crisisRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
      if (userRole !== 'crisis_responder' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Professional route protection
    if (professionalRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
      if (userRole !== 'professional' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return supabaseResponse
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
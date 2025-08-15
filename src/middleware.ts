import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()
  
  const isSignInUpPage = request.nextUrl.pathname.startsWith('/auth/signin') || request.nextUrl.pathname.startsWith('/auth/signup')
  const isForgotPasswordPage = request.nextUrl.pathname.startsWith('/auth/forgot-password')
  const isPublicPage = request.nextUrl.pathname === '/' || 
                      request.nextUrl.pathname.startsWith('/about') ||
                      request.nextUrl.pathname.startsWith('/how-it-works') ||
                      request.nextUrl.pathname.startsWith('/privacy-policy') ||
                      request.nextUrl.pathname.startsWith('/terms')
  
  // Handle email confirmation on homepage
  const hasAuthCode = request.nextUrl.searchParams.has('code')
  if (request.nextUrl.pathname === '/' && hasAuthCode) {
    return NextResponse.redirect(new URL('/auth/callback' + request.nextUrl.search, request.url))
  }
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isProtectedPage = !isAuthPage && !isPublicPage

  // Redirect authenticated users away from signin/signup/forgot-password pages
  if (user && (isSignInUpPage || isForgotPasswordPage)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users to auth
  if (!user && isProtectedPage) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // No more onboarding - users go directly to their destination!

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
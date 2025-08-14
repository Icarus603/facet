import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const access_token = searchParams.get('access_token');
  const refresh_token = searchParams.get('refresh_token');
  const redirectedFrom = searchParams.get('redirectedFrom') || '/dashboard';

  if (access_token) {
    // In a real app, you'd validate and store these tokens
    // For demo purposes, we'll just redirect to the dashboard
    const redirectUrl = new URL(redirectedFrom, request.url);
    
    // Set mock session cookie for demo
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('supabase-auth-token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
    });
    
    return response;
  }

  // If no tokens, redirect to signin with error
  const signinUrl = new URL('/auth/signin', request.url);
  signinUrl.searchParams.set('error', 'Authentication failed');
  return NextResponse.redirect(signinUrl);
}
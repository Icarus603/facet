import { NextRequest, NextResponse } from 'next/server';

// Mock Supabase OAuth authorize endpoint for development
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');
  const redirect_to = searchParams.get('redirect_to') || '/dashboard';

  // Simulate OAuth flow by redirecting to callback with mock data
  const callbackUrl = new URL('/auth/callback', request.url);
  callbackUrl.searchParams.set('access_token', `mock-oauth-token-${Date.now()}`);
  callbackUrl.searchParams.set('refresh_token', `mock-oauth-refresh-${Date.now()}`);
  callbackUrl.searchParams.set('expires_in', '3600');
  callbackUrl.searchParams.set('token_type', 'bearer');
  callbackUrl.searchParams.set('type', 'signup');
  
  return NextResponse.redirect(callbackUrl);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
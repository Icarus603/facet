import { NextRequest, NextResponse } from 'next/server';

// Mock Supabase signin endpoint for development
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, grant_type } = body;

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (grant_type === 'password') {
      // Mock successful signin response
      return NextResponse.json({
        access_token: `mock-access-token-${Date.now()}`,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: `mock-refresh-token-${Date.now()}`,
        user: {
          id: `mock-user-${email.replace('@', '-').replace('.', '-')}`,
          email,
          email_confirmed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      { error: { message: 'Invalid grant type' } },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: { message: 'Mock signin failed' } },
      { status: 400 }
    );
  }
}
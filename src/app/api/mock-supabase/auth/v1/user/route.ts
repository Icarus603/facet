import { NextRequest, NextResponse } from 'next/server';

// Mock Supabase user session endpoint for development
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: { message: 'No authorization header' } },
      { status: 401 }
    );
  }

  // Mock user session response
  return NextResponse.json({
    user: {
      id: 'mock-user-12345',
      email: 'demo@facet.com',
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
}
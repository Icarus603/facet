import { NextRequest, NextResponse } from 'next/server';

// Mock Supabase signup endpoint for development
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful signup response
    return NextResponse.json({
      user: {
        id: `mock-user-${Date.now()}`,
        email,
        email_confirmed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      session: null, // No session until email is confirmed
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: 'Mock signup failed' } },
      { status: 400 }
    );
  }
}
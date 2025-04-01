import { NextRequest } from 'next/server';

// Force dynamic behavior for this endpoint
export const dynamic = 'force-dynamic';

// POST handler to check for completed research
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { topic } = body;

    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // In a production environment, this would query a database or cache
    // For now, we'll simulate a check by returning a "not found" response
    // In the future, we could implement this with a real database check
    
    return new Response(
      JSON.stringify({ found: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking for research:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 
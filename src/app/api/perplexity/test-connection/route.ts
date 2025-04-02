import { NextRequest } from 'next/server';

// Set a short maximum duration for this route - well under Vercel's limits
export const maxDuration = 30; // 30 seconds max
export const dynamic = 'force-dynamic';

// Simple endpoint to test Perplexity API connectivity
export async function GET(req: NextRequest) {
  console.log('[DIAG] Testing Perplexity API connection at', new Date().toISOString());
  
  try {
    // Get API key from environment variables
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      console.error('[DIAG] Perplexity API key not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Perplexity API key not configured' 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Create a simple test query that won't require complex processing
    const testQuery = 'What is 2+2? Just answer with the number, nothing else.';
    console.log('[DIAG] Test query:', testQuery);
    
    // Start timer
    const startTime = Date.now();
    console.log('[DIAG] Sending test query to Perplexity API');
    
    // Use a timeout to ensure we don't exceed Vercel's limits
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API test timeout after 20 seconds')), 20000);
    });
    
    // Make a direct API call with very limited scope
    const apiPromise = fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        messages: [{ role: 'user', content: testQuery }],
        max_tokens: 10, // Very small limit for quick response
        temperature: 0
      })
    });
    
    // Race the API call against the timeout
    const response = await Promise.race([apiPromise, timeoutPromise]) as Response;
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Calculate time taken
    const timeTaken = Date.now() - startTime;
    console.log('[DIAG] Perplexity API responded in', timeTaken, 'ms');
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Perplexity API connection successful',
        timeTaken
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('[DIAG] Error testing Perplexity API:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
} 
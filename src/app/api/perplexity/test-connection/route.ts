import { NextRequest } from 'next/server';
import { PerplexityClient } from '@/lib/api/perplexityClient';

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
    
    // Create a simple test query
    const testQuery = 'What is today\'s date? Answer in one short sentence.';
    console.log('[DIAG] Test query:', testQuery);
    
    // Initialize client
    const perplexity = new PerplexityClient(apiKey);
    console.log('[DIAG] Perplexity client initialized');
    
    // Start timer
    const startTime = Date.now();
    console.log('[DIAG] Sending test query to Perplexity API');
    
    // Send a simple query to test the connection
    const response = await perplexity.generateResearch(testQuery);
    
    // Calculate time taken
    const timeTaken = Date.now() - startTime;
    console.log('[DIAG] Perplexity API responded in', timeTaken, 'ms');
    console.log('[DIAG] Response:', response);
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Perplexity API connection successful',
        response,
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
        error: error.message || 'Unknown error occurred', 
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
} 
/**
 * Perplexity API Test Connection Route
 * 
 * This route is used to test the connection to the Perplexity API
 * and validate the API key configuration.
 */

import { NextRequest } from 'next/server';
import { PerplexityClient } from '@/lib/api/perplexityClient';

// Make route fully dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log('[TEST] Testing Perplexity API connection');
  
  // Get API key from environment variables
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.error('[TEST] Perplexity API key not configured');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'API key not configured',
        message: 'The PERPLEXITY_API_KEY environment variable is not set.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Verify key format
  if (!apiKey.startsWith('pplx-')) {
    console.error('[TEST] Perplexity API key has invalid format');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid API key format',
        message: 'The API key does not start with "pplx-" as required by Perplexity.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Create Perplexity client
    const perplexity = new PerplexityClient(apiKey);
    
    // Make a simple test request
    const testPrompt = "What is the current date? Keep your answer very short.";
    const options = {
      maxTokens: 100,
      temperature: 0.1
    };
    
    console.log('[TEST] Making test request to Perplexity API');
    const startTime = Date.now();
    
    // Set a timeout for the request
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out after 15 seconds')), 15000);
    });
    
    // Make the request with a timeout
    const response = await Promise.race<string>([
      perplexity.generateResearch(testPrompt, options),
      timeoutPromise
    ]);
    
    const duration = Date.now() - startTime;
    
    console.log(`[TEST] Perplexity API test successful in ${duration}ms`);
    console.log(`[TEST] Response: ${response}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Perplexity API connection successful',
        details: {
          apiKeyValid: true,
          responseTime: `${duration}ms`,
          sampleResponse: response.substring(0, 100) + (response.length > 100 ? '...' : ''),
          model: 'sonar-deep-research'
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[TEST] Perplexity API test failed:', error);
    
    // Try to extract useful error information
    const errorMessage = error.message || 'Unknown error';
    let errorType = 'unknown';
    
    if (errorMessage.includes('401')) {
      errorType = 'authentication';
    } else if (errorMessage.includes('429')) {
      errorType = 'rate_limit';
    } else if (errorMessage.includes('timeout')) {
      errorType = 'timeout';
    } else if (errorMessage.includes('network')) {
      errorType = 'network';
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorType,
        message: errorMessage,
        details: {
          stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Also handle POST requests for cross-origin compatibility
export async function POST(request: NextRequest) {
  return GET(request);
} 
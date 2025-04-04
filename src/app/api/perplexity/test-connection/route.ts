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
  // Get API key from environment variables
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
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
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'API error',
        message: error.message || 'Unknown error',
        details: {
          errorType: error.name || 'Error',
          apiKeyFormat: apiKey.startsWith('pplx-') ? 'valid' : 'invalid'
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
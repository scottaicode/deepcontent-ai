/**
 * Perplexity Deep Research API Route
 * 
 * This API route handles integration with Perplexity's Deep Research API.
 * It takes a topic and context, performs deep research using Perplexity's API,
 * and returns structured research results.
 */

import { NextRequest } from 'next/server';
import { PerplexityClient } from '@/lib/api/perplexityClient';
import { getPromptForTopic } from '@/lib/api/promptBuilder';

// Set the maximum duration for this route
export const maxDuration = 300; // 5 minutes max (allowed on Pro plan)

// Ensure dynamic behavior
export const dynamic = 'force-dynamic';

// POST handler for direct research requests
export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const requestId = request.headers.get('X-Request-ID') || requestUrl.searchParams.get('requestId') || 'unknown';
  console.log(`[DIAG] [${requestId}] Received research request at ${new Date().toISOString()}`);
  
  try {
    // Parse the request body
    let body;
    try {
      body = await request.json();
      console.log(`[DIAG] [${requestId}] Request body parsed successfully`);
      console.log(`[DIAG] [${requestId}] Research topic: "${body.topic}"`);
    } catch (err) {
      console.error(`[DIAG] [${requestId}] Error parsing request body:`, err);
      return new Response(
        JSON.stringify({ error: 'Invalid request format. Please check your request body.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { 
      topic, 
      context, 
      sources = ['recent', 'scholar'], 
      language = 'en',
      companyName,
      websiteContent
    } = body;
    
    if (!topic) {
      console.error(`[DIAG] [${requestId}] Missing required parameter: topic`);
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Extract audience, content type, and platform from context
    let audience = 'general audience';
    let contentType = 'article';
    let platform = 'general';
    
    if (context) {
      const audienceMatch = context.match(/Target Audience: ([^,]+)/i);
      if (audienceMatch && audienceMatch[1]) {
        audience = audienceMatch[1].trim();
      }
      
      const contentTypeMatch = context.match(/Content Type: ([^,]+)/i);
      if (contentTypeMatch && contentTypeMatch[1]) {
        contentType = contentTypeMatch[1].trim();
      }
      
      const platformMatch = context.match(/Platform: ([^,]+)/i);
      if (platformMatch && platformMatch[1]) {
        platform = platformMatch[1].trim();
      }
    }
    
    console.log(`[DIAG] [${requestId}] Research parameters:`, {
      topic,
      language,
      audience,
      contentType,
      platform,
      hasCompanyInfo: !!companyName,
      hasWebsiteContent: !!websiteContent
    });
    
    // Get API key from environment variables
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      console.error(`[DIAG] [${requestId}] Perplexity API key not configured`);
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured. Please contact support.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Build the prompt
    const promptText = getPromptForTopic(topic, {
      audience,
      contentType,
      platform,
      sources,
      language,
      companyName,
      websiteContent
    });
    
    console.log(`[DIAG] [${requestId}] Prompt built, length: ${promptText.length} characters`);
    
    try {
      // Create Perplexity client
      const perplexity = new PerplexityClient(apiKey);
      console.log(`[DIAG] [${requestId}] Perplexity client initialized successfully`);
      
      // Track time for research generation
      const startTime = Date.now();
      console.log(`[DIAG] [${requestId}] Starting Perplexity API call at ${new Date().toISOString()}`);
      
      // Track periodic updates for long-running calls
      const diagInterval = setInterval(() => {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        console.log(`[DIAG] [${requestId}] Still processing at ${elapsedSeconds}s elapsed`);
      }, 30000); // Log every 30 seconds
      
      // Call Perplexity API
      const research = await perplexity.generateResearch(promptText);
      
      // Clear diagnostic interval
      clearInterval(diagInterval);
      
      // Calculate time taken
      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      console.log(`[DIAG] [${requestId}] Research generated in ${timeTaken}ms (${Math.floor(timeTaken/1000)}s)`);
      console.log(`[DIAG] [${requestId}] Research length: ${research?.length || 0} characters`);
      
      // Return the research data
      return new Response(
        JSON.stringify({ research }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error(`[DIAG] [${requestId}] Error calling Perplexity API:`, error);
      
      // Handle specific error types for better user experience
      let statusCode = 500;
      let errorMessage = error.message || 'Unknown error occurred while generating research';
      
      if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
        statusCode = 504; // Gateway Timeout
        errorMessage = 'The research generation timed out. Please try again with a more specific topic.';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        statusCode = 429; // Too Many Requests
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        statusCode = 401; // Unauthorized
        errorMessage = 'Authentication error with research service. Please check your API key.';
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: statusCode, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error: any) {
    console.error(`[DIAG] [${requestId}] Unhandled error in research API:`, error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
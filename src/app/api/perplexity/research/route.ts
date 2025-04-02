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

// Use optional chaining with kv to handle environments where it's not available
let kv: any;
try {
  kv = require('@vercel/kv');
} catch (e) {
  console.warn('KV storage not available, caching will be disabled');
  kv = null;
}

// Set the maximum duration for this route to avoid timeouts
// Use the absolute maximum allowed on Pro plan (300s/5min)
export const maxDuration = 300; // 5 minutes max

// Ensure dynamic behavior
export const dynamic = 'force-dynamic';

// Add improved logging for the chunked approach
const logSection = (requestId: string, section: string, message: string) => {
  console.log(`[DIAG] [${requestId}] [${section}] ${message}`);
};

// Utility function to create a cache key from research parameters
const createCacheKey = (topic: string, contentType: string, platform: string, language: string): string => {
  // Normalize and sanitize inputs
  const normalizedTopic = topic.trim().toLowerCase().replace(/[^a-z0-9]/gi, '-').substring(0, 100);
  const normalizedType = contentType.trim().toLowerCase().replace(/[^a-z0-9]/gi, '-');
  const normalizedPlatform = platform.trim().toLowerCase().replace(/[^a-z0-9]/gi, '-');
  
  return `research:${normalizedTopic}:${normalizedType}:${normalizedPlatform}:${language}`;
};

// Utility function to create a simplified topic key for fallback lookup
const createSimplifiedTopicKey = (topic: string): string => {
  return `research:${topic.trim().toLowerCase().replace(/[^a-z0-9]/gi, '-').substring(0, 50)}`;
};

// POST handler for direct research requests
export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const requestId = request.headers.get('X-Request-ID') || requestUrl.searchParams.get('requestId') || `req_${Date.now()}`;
  logSection(requestId, 'INIT', `Received research request at ${new Date().toISOString()}`);
  
  // Initialize interval reference variable
  let diagInterval: NodeJS.Timeout | null = null;
  
  try {
    // Parse the request body
    let body;
    try {
      body = await request.json();
      logSection(requestId, 'PARSE', 'Request body parsed successfully');
      logSection(requestId, 'TOPIC', `Research topic: "${body.topic}"`);
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
      websiteContent,
      contentType = 'article',
      platform = 'general'
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
    let extractedContentType = contentType || 'article';
    let extractedPlatform = platform || 'general';
    
    if (context) {
      const audienceMatch = context.match(/Target Audience: ([^,]+)/i);
      if (audienceMatch && audienceMatch[1]) {
        audience = audienceMatch[1].trim();
      }
      
      const contentTypeMatch = context.match(/Content Type: ([^,]+)/i);
      if (contentTypeMatch && contentTypeMatch[1]) {
        extractedContentType = contentTypeMatch[1].trim();
      }
      
      const platformMatch = context.match(/Platform: ([^,]+)/i);
      if (platformMatch && platformMatch[1]) {
        extractedPlatform = platformMatch[1].trim();
      }
    }
    
    logSection(requestId, 'PARAMS', JSON.stringify({
      topic,
      language,
      audience,
      contentType: extractedContentType,
      platform: extractedPlatform,
      hasCompanyInfo: !!companyName,
      hasWebsiteContent: !!websiteContent
    }));
    
    // Get API key from environment variables
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      console.error(`[DIAG] [${requestId}] Perplexity API key not configured`);
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured. Please contact support.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a cache key for this research request
    const cacheKey = createCacheKey(topic, extractedContentType, extractedPlatform, language);
    logSection(requestId, 'CACHE', `Cache key: ${cacheKey}`);
    
    // Check if research is already cached
    let cachedResult = null;
    try {
      if (kv) {
        // Try to get the exact cache match
        cachedResult = await kv.get(cacheKey);
        
        // If exact match not found, try a simplified key lookup
        if (!cachedResult) {
          const simplifiedKey = createSimplifiedTopicKey(topic);
          logSection(requestId, 'CACHE', `Exact cache miss, trying simplified key: ${simplifiedKey}`);
          
          // Try to get any keys that start with the simplified pattern
          try {
            const keys = await kv.keys(`${simplifiedKey}*`);
            if (keys && keys.length > 0) {
              logSection(requestId, 'CACHE', `Found ${keys.length} potential matches with simplified key pattern`);
              // Get the first match (could improve this to get the most recent one)
              cachedResult = await kv.get(keys[0]);
              if (cachedResult) {
                logSection(requestId, 'CACHE', `Found partial match with key: ${keys[0]}`);
              }
            }
          } catch (err) {
            console.warn(`[DIAG] [${requestId}] Error searching for partial matches:`, err);
          }
        }
        
        // Return cached result if found
        if (cachedResult) {
          logSection(requestId, 'CACHE', `Found cached research result, length: ${(cachedResult as string).length}`);
          return new Response(
            JSON.stringify({ 
              research: cachedResult,
              fromCache: true,
              cacheKey 
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } else {
          logSection(requestId, 'CACHE', `No cached research found, proceeding with live generation`);
        }
      }
    } catch (err) {
      console.warn(`[DIAG] [${requestId}] Cache check failed, continuing with live research:`, err);
    }
    
    // Build the prompt
    const promptText = getPromptForTopic(topic, {
      audience,
      contentType: extractedContentType,
      platform: extractedPlatform,
      sources,
      language,
      companyName,
      websiteContent
    });
    
    logSection(requestId, 'PROMPT', `Prompt built, length: ${promptText.length} characters`);
    
    try {
      // Create Perplexity client
      const perplexity = new PerplexityClient(apiKey);
      logSection(requestId, 'CLIENT', `Perplexity client initialized successfully`);
      
      // Track time for research generation
      const startTime = Date.now();
      logSection(requestId, 'EXECUTE', `Starting chunked research generation at ${new Date().toISOString()}`);
      
      // Track periodic updates for long-running calls
      diagInterval = setInterval(() => {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        logSection(requestId, 'PROGRESS', `Still processing at ${elapsedSeconds}s elapsed`);
      }, 30000); // Log every 30 seconds
      
      // Call Perplexity API with chunked approach
      const research = await perplexity.generateResearch(promptText);
      
      // Clear diagnostic interval
      if (diagInterval) {
        clearInterval(diagInterval);
        diagInterval = null;
      }
      
      // Calculate time taken
      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      logSection(requestId, 'COMPLETE', `Research generated in ${timeTaken}ms (${Math.floor(timeTaken/1000)}s)`);
      logSection(requestId, 'COMPLETE', `Research length: ${research?.length || 0} characters`);
      
      // Cache the successful result if possible
      try {
        if (kv && research) {
          await kv.set(cacheKey, research, { ex: 86400 }); // Cache for 24 hours
          logSection(requestId, 'CACHE', `Cached research result with key ${cacheKey}`);
          
          // Also create a simplified key entry pointing to the same research
          const simplifiedKey = createSimplifiedTopicKey(topic);
          if (simplifiedKey !== cacheKey) {
            await kv.set(`${simplifiedKey}:${Date.now()}`, research, { ex: 86400 });
            logSection(requestId, 'CACHE', `Also cached with simplified key ${simplifiedKey}`);
          }
        }
      } catch (err) {
        console.warn(`[DIAG] [${requestId}] Failed to cache research:`, err);
      }
      
      // Return the research data
      return new Response(
        JSON.stringify({ research }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      // Clear diagnostic interval if it's still running
      if (diagInterval) {
        clearInterval(diagInterval);
        diagInterval = null;
      }
      
      console.error(`[DIAG] [${requestId}] Error calling Perplexity API:`, error);
      
      // Check if a previous attempt was cached but with a different key
      let fallbackResult = null;
      try {
        if (kv) {
          // Try to find a partial match in cache with various approaches
          
          // Approach 1: Try the simplified key
          const simplifiedKey = createSimplifiedTopicKey(topic);
          logSection(requestId, 'FALLBACK', `Trying fallback cache lookup with simplified key pattern: ${simplifiedKey}`);
          
          // Try to get any keys that start with the simplified pattern
          const keys = await kv.keys(`${simplifiedKey}*`);
          if (keys && keys.length > 0) {
            logSection(requestId, 'FALLBACK', `Found ${keys.length} potential fallback matches`);
            // Get the first match
            fallbackResult = await kv.get(keys[0]);
            if (fallbackResult) {
              logSection(requestId, 'FALLBACK', `Found fallback match with key: ${keys[0]}`);
              return new Response(
                JSON.stringify({ 
                  research: fallbackResult, 
                  isFallback: true,
                  fallbackKey: keys[0]
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              );
            }
          }
          
          // Approach 2: Try keywords from the topic
          if (!fallbackResult) {
            const keywords: string[] = topic.toLowerCase().split(' ').filter((word: string) => word.length > 4);
            for (const keyword of keywords) {
              const keywordPattern = `research:*${keyword}*`;
              logSection(requestId, 'FALLBACK', `Trying keyword pattern: ${keywordPattern}`);
              try {
                const keywordKeys = await kv.keys(keywordPattern);
                if (keywordKeys && keywordKeys.length > 0) {
                  logSection(requestId, 'FALLBACK', `Found ${keywordKeys.length} keyword matches`);
                  fallbackResult = await kv.get(keywordKeys[0]);
                  if (fallbackResult) {
                    logSection(requestId, 'FALLBACK', `Found keyword fallback with key: ${keywordKeys[0]}`);
                    return new Response(
                      JSON.stringify({ 
                        research: fallbackResult, 
                        isFallback: true,
                        fallbackKey: keywordKeys[0],
                        fallbackType: 'keyword'
                      }),
                      { status: 200, headers: { 'Content-Type': 'application/json' } }
                    );
                  }
                }
              } catch (err) {
                console.warn(`[DIAG] [${requestId}] Keyword fallback lookup failed for ${keyword}:`, err);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[DIAG] [${requestId}] Fallback cache lookup failed:`, err);
      }
      
      // Handle specific error types for better user experience
      let statusCode = 500;
      let errorMessage = error.message || 'Unknown error occurred while generating research';
      
      if (error.name === 'AbortError' || errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        statusCode = 504; // Gateway Timeout
        errorMessage = 'Research generation timed out. Please try again with a more specific topic or try later when the service is less busy.';
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
    // Clean up interval if still running
    if (diagInterval) {
      clearInterval(diagInterval);
    }
    
    console.error(`[DIAG] [${requestId}] Unhandled error in research API:`, error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Handler for GET requests to check if research is already available
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const topic = url.searchParams.get('topic');
  const contentType = url.searchParams.get('contentType') || 'article';
  const platform = url.searchParams.get('platform') || 'general';
  const language = url.searchParams.get('language') || 'en';
  
  if (!topic) {
    return new Response(
      JSON.stringify({ error: 'Topic parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // Create a cache key for this research request
    const cacheKey = createCacheKey(topic, contentType, platform, language);
    
    // Check if research is already cached
    if (kv) {
      // Try exact match first
      const cachedResult = await kv.get(cacheKey);
      if (cachedResult) {
        return new Response(
          JSON.stringify({ 
            research: cachedResult, 
            fromCache: true,
            matchType: 'exact' 
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Try simplified key pattern
      const simplifiedKey = createSimplifiedTopicKey(topic);
      console.log(`[CHECK] Checking for simplified key matches: ${simplifiedKey}`);
      
      try {
        const keys = await kv.keys(`${simplifiedKey}*`);
        if (keys && keys.length > 0) {
          console.log(`[CHECK] Found ${keys.length} keys matching simplified pattern`);
          const partialMatch = await kv.get(keys[0]);
          if (partialMatch) {
            return new Response(
              JSON.stringify({ 
                research: partialMatch, 
                fromCache: true,
                matchType: 'simplified',
                cacheKey: keys[0]
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (err) {
        console.warn('[CHECK] Error searching for simplified matches:', err);
      }
      
      // Try keyword-based matching as a last resort
      const keywords: string[] = topic.toLowerCase().split(' ').filter((word: string) => word.length > 4);
      for (const keyword of keywords) {
        try {
          const keyPattern = `research:*${keyword}*`;
          console.log(`[CHECK] Checking keyword pattern: ${keyPattern}`);
          const keywordKeys = await kv.keys(keyPattern);
          if (keywordKeys && keywordKeys.length > 0) {
            console.log(`[CHECK] Found ${keywordKeys.length} keyword matches for ${keyword}`);
            const keywordMatch = await kv.get(keywordKeys[0]);
            if (keywordMatch) {
              return new Response(
                JSON.stringify({ 
                  research: keywordMatch, 
                  fromCache: true,
                  matchType: 'keyword',
                  cacheKey: keywordKeys[0]
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              );
            }
          }
        } catch (err) {
          console.warn(`[CHECK] Error searching for keyword ${keyword}:`, err);
        }
      }
    }
    
    // If not cached, return appropriate response
    return new Response(
      JSON.stringify({ available: false }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(`Error checking research availability:`, error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
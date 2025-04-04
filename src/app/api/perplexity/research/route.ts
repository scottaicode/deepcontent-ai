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
import { kv } from '@vercel/kv';

// Define an interface for the job object stored in KV
interface Job {
  status: 'pending' | 'completed' | 'failed';
  resultKey?: string; // Key where the result is stored (if completed)
  error?: string; // Error message (if failed)
  progress?: string; // Progress percentage
  isFallback?: string; // Indicate if result is fallback
  // Add other potential fields if necessary
  [key: string]: any; // Add index signature to satisfy hgetall constraint
}

// Test KV connection immediately upon module load
(async () => {
  try {
    // Simple test write/read
    const testKey = `kv-test-${Date.now()}`;
    await kv.set(testKey, 'test-value', { ex: 60 }); // 60 second expiration
    const testValue = await kv.get(testKey);
    await kv.del(testKey); // Clean up test key
    console.log(`[KV] Connection test: ${testValue === 'test-value' ? 'SUCCESS' : 'FAILED'}`);
  } catch (e) {
    console.error('[KV] Initial connection test failed:', e);
    // Note: KV operations might still work later even if this initial test fails.
    // Consider adding more robust health checks if needed.
  }
})();

// Add wait utility
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Set the maximum duration for this route
export const maxDuration = 300; // 5 minutes max - keep the full duration

// Set the maximum size for request/response to handle large research results
export const fetchCache = "force-no-store";
export const revalidate = 0;

// Add additional caching prevention settings
export const dynamic = 'force-dynamic';

// Set response headers to prevent caching
const noCacheHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

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

// Function to create a job ID for tracking research requests
const createJobId = (topic: string): string => {
  const normalizedTopic = topic.trim().toLowerCase().replace(/[^a-z0-9]/gi, '-').substring(0, 50);
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `job:${normalizedTopic}:${timestamp}:${randomPart}`;
};

// Utility function to create a simplified topic key for fallback lookup
const createSimplifiedTopicKey = (topic: string): string => {
  return `research:${topic.trim().toLowerCase().replace(/[^a-z0-9]/gi, '-').substring(0, 50)}`;
};

// Check if a job is complete, now returning the defined Job type
async function checkJobStatus(jobId: string): Promise<Job | null> {
  // kv check removed as kv is now imported directly and should always exist
  // if (!kv) return null; 

  try {
    // Explicitly type the result of hgetall
    const job = await kv.hgetall<Job>(jobId);
    
    // hgetall returns null if key doesn't exist, handle that explicitly
    if (!job) {
      console.log(`[KV] Job not found for ID: ${jobId}`);
      return null;
    }

    // Ensure status exists, default to pending if missing for some reason
    if (!job.status) {
        console.warn(`[KV] Job ${jobId} missing status field. Defaulting to pending.`);
        job.status = 'pending';
    }
    
    return job;
  } catch (err) {
    console.error(`Error checking job status for ${jobId}:`, err);
    return null;
  }
}

// POST handler for direct research requests
export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const requestId = request.headers.get('X-Request-ID') || requestUrl.searchParams.get('requestId') || `req_${Date.now()}`;
  logSection(requestId, 'INIT', `Received research request at ${new Date().toISOString()}`);

  // Parse the request body outside the try block so it's available in the catch block
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
    context = '',
    sources = ['recent', 'scholar'], 
    language = 'en',
    companyName = '',
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
  
  // Extract follow-up answers from context if present
  let followUpAnswers = '';
  if (context.includes('Follow-up Answers:')) {
    const followUpSection = context.split('Follow-up Answers:')[1].trim();
    followUpAnswers = followUpSection;
    console.log(`[DIAG] [${requestId}] Follow-up answers detected in context`);
  }
  
  // Extract additional information from context
  let extractedContentType = 'article';
  let extractedPlatform = 'general';
  let audience = 'general';
  
  // Extract content type, platform and audience from context
  if (context.includes('Content Type:')) {
    extractedContentType = context.split('Content Type:')[1].split(',')[0].trim();
  }
  if (context.includes('Platform:')) {
    extractedPlatform = context.split('Platform:')[1].split(',')[0].trim();
  }
  if (context.includes('Target Audience:')) {
    audience = context.split('Target Audience:')[1].split('\n')[0].trim();
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
  
  logSection(requestId, 'API_KEY', `API key validation: ${apiKey.startsWith('pplx-') ? 'VALID FORMAT' : 'INVALID FORMAT'}`);

  // Create a cache key for this research request
  const cacheKey = createCacheKey(topic, extractedContentType, extractedPlatform, language);
  logSection(requestId, 'CACHE', `Cache key: ${cacheKey}`);
  
  // Check if research is already cached
  let cachedResult = null;
  try {
    if (kv) {
      // Commented out cache lookup to always generate fresh research
      // const cachedResult = await kv.get(cacheKey);
      
      // If exact match not found, try a simplified key lookup
      /*
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
      */
      
      // Disable cache return by setting cachedResult to null
      cachedResult = null;
      logSection(requestId, 'CACHE', `Cache disabled, always generating fresh research`);
      
      /*
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
        logSection(requestId, 'CACHE', `No cached research found, proceeding with job creation`);
      }
      */
    }
  } catch (err) {
    console.warn(`[DIAG] [${requestId}] Cache check failed, continuing with job creation:`, err);
  }
  
  // Build the prompt
  const promptText = getPromptForTopic(topic, {
    audience,
    contentType: extractedContentType,
    platform: extractedPlatform,
    sources,
    language,
    companyName,
    websiteContent,
    additionalContext: followUpAnswers // Add follow-up answers as additional context
  });
  
  logSection(requestId, 'PROMPT', `Prompt built, length: ${promptText.length} characters`);
  
  // Create Perplexity client with proper configuration
  const perplexity = new PerplexityClient(apiKey);
  logSection(requestId, 'CLIENT', `Perplexity client initialized successfully`);
  
  // Set up options for the API call
  const options = {
    maxTokens: 4000,
    temperature: 0.2,
    language
  };
  
  // Log clearly that we're generating fresh research
  console.log(`=== GENERATING FRESH RESEARCH ===`);
  console.log(`Topic: ${topic}`);
  console.log(`Content Type: ${extractedContentType}`);
  console.log(`Platform: ${extractedPlatform}`);
  console.log(`Request ID: ${requestId}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`==============================`);

  // Return the research data directly - no job ID or polling mechanism
  try {
    // Log that we're calling the Perplexity API for Deep Research
    logSection(requestId, 'API_CALL', `Calling Perplexity API for Deep Research using sonar-deep-research model`);
    
    // Make the direct API call - not using jobs
    const research = await perplexity.generateResearch(promptText, options);
    
    // Log success clearly
    console.log(`=== FRESH RESEARCH GENERATED SUCCESSFULLY ===`);
    console.log(`Research length: ${research.length} characters`);
    console.log(`Response time: ${Date.now() - new Date(requestUrl.searchParams.get('timestamp') || Date.now()).getTime()}ms`);
    console.log(`=========================================`);
    
    // Cache the successful result if possible
    try {
      /*
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
      */
      logSection(requestId, 'CACHE', `Caching disabled to ensure fresh research is generated each time`);
    } catch (err) {
      console.warn(`[DIAG] [${requestId}] Failed to cache research:`, err);
    }
    
    return new Response(
      JSON.stringify({ research }),
      { status: 200, headers: noCacheHeaders }
    );
  } catch (error: any) {
    // Log detailed error information
    logSection(requestId, 'ERROR', `Error generating research: ${error.message}`);
    console.error(`[DIAG] [${requestId}] Error details:`, error);
    
    // Remove fallback logic that creates mockup softcom content, keeping only essential code
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      console.error(`Research API timeout: ${error.message}`);
      return new Response(
        JSON.stringify({ error: 'Research generation timed out. Please try again.' }),
        { status: 504, headers: noCacheHeaders }
      );
    } else {
      console.error(`Research API error: ${error.message}`);
      
      // Return appropriate error
      return new Response(
        JSON.stringify({ error: `${error.message}` }),
        { status: 500, headers: noCacheHeaders }
      );
    }
  }
}

// Handler for GET requests to check job status
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId');
  
  // If jobId is provided, check specific job status
  if (jobId) {
    try {
      const job = await checkJobStatus(jobId);
      
      if (!job) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: noCacheHeaders }
        );
      }
      
      // If job is completed, also return the research content
      if (job.status === 'completed' && job.resultKey) {
        try {
          const research = await kv.get(job.resultKey);
          if (research) {
            return new Response(
              JSON.stringify({ 
                ...job,
                research,
                isFallback: job.isFallback === 'true'
              }),
              { status: 200, headers: noCacheHeaders }
            );
          }
        } catch (err) {
          console.warn(`Error retrieving research for completed job ${jobId}:`, err);
        }
      }
      
      // Return job status without research content
      const responseBody = JSON.stringify(job || {}); // Stringify first, ensuring not null
      return new Response(
        responseBody, // Pass the pre-stringified body
        { status: 200, headers: noCacheHeaders }
      );
    } catch (error: any) {
      console.error(`Error checking job status for ${jobId}:`, error);
      return new Response(
        JSON.stringify({ error: error.message || 'An error occurred checking job status' }),
        { status: 500, headers: noCacheHeaders }
      );
    }
  }
  
  // If no jobId, check for cached research by topic
  const topic = url.searchParams.get('topic');
  const contentType = url.searchParams.get('contentType') || 'article';
  const platform = url.searchParams.get('platform') || 'general';
  const language = url.searchParams.get('language') || 'en';
  
  if (!topic) {
    return new Response(
      JSON.stringify({ error: 'Either jobId or topic parameter is required' }),
      { status: 400, headers: noCacheHeaders }
    );
  }
  
  try {
    // Always return "not found" response to force fresh research generation
    console.log(`Cache lookup disabled for topic: ${topic}`);
    return new Response(
      JSON.stringify({ available: false }),
      { status: 404, headers: noCacheHeaders }
    );
  } catch (error: any) {
    console.error(`Error checking research availability:`, error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: noCacheHeaders }
    );
  }
}
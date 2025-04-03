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
    context, 
    sources = ['recent', 'scholar'], 
    language = 'en',
    companyName,
    websiteContent,
    contentType = 'article',
    platform = 'general',
    refresh = false  // Add a refresh parameter to force bypassing cache
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
    hasWebsiteContent: !!websiteContent,
    refresh
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
  
  // Check if research is already cached - skip this if refresh is true
  let cachedResult = null;
  if (!refresh) {
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
          logSection(requestId, 'CACHE', `No cached research found, proceeding with job creation`);
        }
      }
    } catch (err) {
      console.warn(`[DIAG] [${requestId}] Cache check failed, continuing with job creation:`, err);
    }
  } else {
    logSection(requestId, 'CACHE', `Refresh parameter is true, skipping cache lookup`);
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
  
  // Create Perplexity client with proper configuration
  const perplexity = new PerplexityClient(apiKey);
  logSection(requestId, 'CLIENT', `Perplexity client initialized successfully`);
  
  // Set up options for the API call
  const options = {
    maxTokens: 4000,
    temperature: 0.2,
    language
  };
  
  // Return the research data directly - no job ID or polling mechanism
  try {
    // Log that we're calling the Perplexity API for Deep Research
    logSection(requestId, 'API_CALL', `Calling Perplexity API for Deep Research using sonar-deep-research model`);
    
    // Make the direct API call - not using jobs
    const research = await perplexity.generateResearch(promptText, options);
    
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
    
    return new Response(
      JSON.stringify({ research }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    // Log detailed error information
    logSection(requestId, 'ERROR', `Error generating research: ${error.message}`);
    console.error(`[DIAG] [${requestId}] Error details:`, error);
    
    // Handle errors with fallback
    console.error(`Error generating research: ${error.message}`);
    
    // Generate fallback content - maintain the existing fallback code
    let fallbackResult = `# Research on ${topic}\n\n`;
    
    // Add topic-specific fallback content
    if (topic.toLowerCase().includes('tranont')) {
      // Add the Tranont-specific fallback content 
      fallbackResult += `## Executive Summary\n\n`;
      fallbackResult += `This research report provides a comprehensive analysis of Tranont with a focus on applications for social/social-media. The target audience for this research is Women age 50 - 60. This report includes market analysis, audience insights, and strategic recommendations.\n\n`;
      
      // Additional sections as needed...
    } else if (topic.toLowerCase().includes('softcom') || 
               topic.toLowerCase().includes('internet') || 
               extractedPlatform.toLowerCase().includes('social')) {
      // Add the existing softcom/internet fallback content
      fallbackResult += `## Overview of ${topic}\n\n`;
      fallbackResult += `Internet service providers play a crucial role in rural and residential areas. For companies like Softcom, understanding the specific needs and pain points of rural internet users is essential.\n\n`;
      fallbackResult += `## Content Strategy Recommendations\n\n`;
      fallbackResult += `1. Share customer success stories highlighting how reliable internet improves rural businesses and homes\n`;
      fallbackResult += `2. Create educational content about maximizing internet performance\n`;
    } else {
      // Add generic fallback content
      fallbackResult += `## Overview\n\nThis topic requires in-depth research. Due to technical limitations, we could only generate a basic outline of the important areas to research.\n\n`;
      fallbackResult += `## Key Areas to Research\n\n`;
      fallbackResult += `1. Market trends and current statistics\n`;
      fallbackResult += `2. Target audience demographics and preferences\n`;
    }
    
    fallbackResult += `\n\nThis report was generated as an emergency fallback due to research API limitations.`;
    
    // Return the fallback content directly
    return new Response(
      JSON.stringify({ research: fallbackResult, isFallback: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
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
          { status: 404, headers: { 'Content-Type': 'application/json' } }
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
              { status: 200, headers: { 'Content-Type': 'application/json' } }
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
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error(`Error checking job status for ${jobId}:`, error);
      return new Response(
        JSON.stringify({ error: error.message || 'An error occurred checking job status' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
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
      
      // Try fallback key
      const fallbackResult = await kv.get(`${cacheKey}:fallback`);
      if (fallbackResult) {
        return new Response(
          JSON.stringify({ 
            research: fallbackResult, 
            fromCache: true,
            matchType: 'fallback',
            isFallback: true
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Try simplified key pattern
      const simplifiedKey = createSimplifiedTopicKey(topic);
      
      try {
        const keys = await kv.keys(`${simplifiedKey}*`);
        if (keys && keys.length > 0) {
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
        console.warn('Error searching for simplified matches:', err);
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
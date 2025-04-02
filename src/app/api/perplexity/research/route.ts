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

// Add wait utility
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Set the maximum duration for this route
export const maxDuration = 60; // Reduced to 60 seconds for initial request handling

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

// Check if a job is complete
async function checkJobStatus(jobId: string) {
  if (!kv) return null;
  
  try {
    const job = await kv.hgetall(jobId);
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
          logSection(requestId, 'CACHE', `No cached research found, proceeding with job creation`);
        }
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
      websiteContent
    });
    
    logSection(requestId, 'PROMPT', `Prompt built, length: ${promptText.length} characters`);
    
    // Create a job ID for this research request
    const jobId = createJobId(topic);
    
    // Initialize job in KV storage
    if (kv) {
      await kv.hset(jobId, {
        status: 'pending',
        topic,
        createdAt: Date.now(),
        progress: 0
      });
      
      // Set expiration for job records (24 hours)
      await kv.expire(jobId, 86400);
    }
    
    // Start the research process in background (outside the request/response cycle)
    // This is done by wrapping the process in an immediately invoked async function
    (async () => {
      try {
        // Create Perplexity client
        const perplexity = new PerplexityClient(apiKey);
        
        // Update job status to 'processing'
        if (kv) {
          await kv.hset(jobId, {
            status: 'processing',
            progress: 10,
            startedAt: Date.now()
          });
        }
        
        // Track time for research generation
        const startTime = Date.now();
        
        // Set options for the API call
        const options = {
          maxTokens: 4000,
          temperature: 0.2,
          timeoutMs: 270000, // 4.5 minutes timeout
          language
        };
        
        // Regular API call with options
        try {
          // Periodically update progress
          const progressInterval = setInterval(async () => {
            if (kv) {
              const job = await kv.hgetall(jobId);
              if (job && job.status === 'processing') {
                // Increment progress gradually up to 90%
                const currentProgress = Math.min(90, (parseInt(job.progress) || 10) + Math.floor(Math.random() * 5 + 2));
                await kv.hset(jobId, { progress: currentProgress });
              } else {
                clearInterval(progressInterval);
              }
            }
          }, 10000); // Update progress every 10 seconds
          
          const research = await perplexity.generateResearch(promptText, options);
          
          // Clear progress interval
          clearInterval(progressInterval);
          
          // If research was successful, cache it and update job status
          if (research) {
            logSection(requestId, 'JOB', `Research generated successfully, length: ${research.length} characters`);
            
            // Cache the successful result
            if (kv) {
              await kv.set(cacheKey, research, { ex: 86400 }); // Cache for 24 hours
              await kv.hset(jobId, {
                status: 'completed',
                progress: 100,
                completedAt: Date.now(),
                resultKey: cacheKey
              });
            }
          } else {
            // Handle case where research is empty
            logSection(requestId, 'JOB', 'Research generation failed: empty result');
            if (kv) {
              await kv.hset(jobId, {
                status: 'failed',
                error: 'Empty research result',
                completedAt: Date.now()
              });
            }
          }
        } catch (error: any) {
          // Handle API error
          logSection(requestId, 'JOB', `Research generation failed: ${error.message}`);
          if (kv) {
            await kv.hset(jobId, {
              status: 'failed',
              error: error.message || 'Unknown error',
              completedAt: Date.now()
            });
          }
          
          // If it's a timeout error, generate fallback content
          if (error.message.includes('timeout') || error.message.includes('exceeded')) {
            logSection(requestId, 'FALLBACK', 'Generating fallback content for timed out job');
            
            // Create more generalized fallback content
            let fallbackResult = `# Research on ${topic}\n\n`;
            
            // Add topic-specific content to the fallback
            if (topic.toLowerCase().includes('softcom') || 
                topic.toLowerCase().includes('internet') || 
                extractedPlatform.toLowerCase().includes('social')) {
              fallbackResult += `## Overview of ${topic}\n\n`;
              fallbackResult += `Internet service providers play a crucial role in rural and residential areas. For companies like Softcom, understanding the specific needs and pain points of rural internet users is essential.\n\n`;
              fallbackResult += `## Key Market Insights\n\n`;
              fallbackResult += `* Rural internet users often face challenges with reliability and speed\n`;
              fallbackResult += `* Business customers in rural areas require dedicated support and specialized solutions\n`;
              fallbackResult += `* Social media is an important channel for internet service providers to engage with their community\n`;
              fallbackResult += `* Content on Facebook should focus on service updates, customer testimonials, and community involvement\n\n`;
              fallbackResult += `## Content Strategy Recommendations\n\n`;
              fallbackResult += `1. Share customer success stories highlighting how reliable internet improves rural businesses and homes\n`;
              fallbackResult += `2. Create educational content about maximizing internet performance\n`;
              fallbackResult += `3. Post about community involvement and local events\n`;
              fallbackResult += `4. Provide transparent updates about service improvements and coverage expansions\n`;
            } else {
              fallbackResult += `## Overview\n\nThis topic requires in-depth research. Due to technical limitations, we could only generate a basic outline of the important areas to research.\n\n`;
              fallbackResult += `## Key Areas to Research\n\n`;
              fallbackResult += `1. Market trends and current statistics\n`;
              fallbackResult += `2. Target audience demographics and preferences\n`;
              fallbackResult += `3. Competitive landscape and differentiation opportunities\n`;
              fallbackResult += `4. Content strategy best practices for ${extractedPlatform}\n`;
              fallbackResult += `5. Success metrics and benchmarks\n\n`;
            }
            
            fallbackResult += `## Next Steps\n\n`;
            fallbackResult += `Consider researching these topics individually for more detailed insights. You may want to try again with a more specific research topic to get better results.`;
            
            // Cache the fallback result
            if (kv) {
              const fallbackKey = `${cacheKey}:fallback`;
              await kv.set(fallbackKey, fallbackResult, { ex: 86400 }); // Cache for 24 hours
              await kv.hset(jobId, {
                status: 'completed',
                progress: 100,
                completedAt: Date.now(),
                resultKey: fallbackKey,
                isFallback: true
              });
            }
          }
        }
      } catch (error: any) {
        // Handle any other errors in the background process
        console.error(`Background job processing error for ${jobId}:`, error);
        if (kv) {
          await kv.hset(jobId, {
            status: 'failed',
            error: error.message || 'Unknown background process error',
            completedAt: Date.now()
          });
        }
      }
    })().catch(error => {
      console.error(`Failed to start background job ${jobId}:`, error);
    });
    
    // Return immediately with the job ID
    return new Response(
      JSON.stringify({ 
        jobId,
        message: 'Research job started successfully',
        status: 'pending'
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error(`[DIAG] [${requestId}] Unhandled error in research API:`, error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
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
      return new Response(
        JSON.stringify(job),
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
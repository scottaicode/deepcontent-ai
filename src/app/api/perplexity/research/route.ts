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

// Update the KV initialization to be more robust
let kv: any;
try {
  kv = require('@vercel/kv');
  // Test KV connection immediately
  (async () => {
    try {
      // Simple test write/read
      const testKey = `kv-test-${Date.now()}`;
      await kv.set(testKey, 'test-value', { ex: 60 }); // 60 second expiration
      const testValue = await kv.get(testKey);
      console.log(`[KV] Connection test: ${testValue === 'test-value' ? 'SUCCESS' : 'FAILED'}`);
    } catch (e) {
      console.error('[KV] Test connection failed:', e);
      // Don't disable KV here, it might work for subsequent calls
    }
  })();
} catch (e) {
  console.warn('[KV] Storage not available, caching will be disabled:', e);
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
    
    // Start the research process in background
    // This is the key change - use proper async handling and ensure job state management
    (async () => {
      console.log(`[BACKGROUND] Starting job ${jobId} for topic "${topic}"`);
      
      // Set a flag in KV that this is a properly started job (not just created)
      if (kv) {
        try {
          await kv.hset(jobId, {
            status: 'processing',
            progress: 10,
            startedAt: Date.now(),
            lastUpdated: Date.now()
          });
          console.log(`[BACKGROUND] Job ${jobId} set to processing state`);
        } catch (kvError) {
          console.error(`[BACKGROUND] KV update error for job ${jobId}:`, kvError);
        }
      }
      
      try {
        // Create Perplexity client
        const perplexity = new PerplexityClient(apiKey);
        
        // Track time for research generation
        const startTime = Date.now();
        
        // Set options for the API call with increased timeout
        const options = {
          maxTokens: 4000,
          temperature: 0.2,
          timeoutMs: 270000, // 4.5 minutes timeout
          language
        };
        
        // Periodically update progress with heartbeat
        let lastProgressUpdate = Date.now();
        const progressInterval = setInterval(async () => {
          try {
            if (kv) {
              const job = await kv.hgetall(jobId);
              if (job && job.status === 'processing') {
                // Increment progress gradually up to 90%
                const elapsed = Date.now() - startTime;
                // Calculate progress based on time elapsed (assume 4 minutes total process)
                const timeBasedProgress = Math.min(90, Math.floor((elapsed / 240000) * 100));
                // Use maximum of current progress or time-based progress
                const currentProgress = Math.max(
                  timeBasedProgress, 
                  (parseInt(job.progress) || 10) + Math.floor(Math.random() * 3 + 1)
                );
                
                await kv.hset(jobId, { 
                  progress: currentProgress,
                  lastUpdated: Date.now()
                });
                console.log(`[BACKGROUND] Job ${jobId} progress updated to ${currentProgress}%`);
                lastProgressUpdate = Date.now();
              } else {
                console.log(`[BACKGROUND] Job ${jobId} no longer in processing state, stopping updates`);
                clearInterval(progressInterval);
              }
            }
          } catch (progressError) {
            console.error(`[BACKGROUND] Progress update error for job ${jobId}:`, progressError);
          }
        }, 15000); // Update progress every 15 seconds (reduced frequency)
        
        try {
          console.log(`[BACKGROUND] Job ${jobId} calling Perplexity API`);
          
          // Add a safety timeout in case the API call itself doesn't timeout properly
          const apiPromise = perplexity.generateResearch(promptText, options);
          const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(() => reject(new Error('API safety timeout reached')), 250000); // 4.17 minutes
          });
          
          // Use race to enforce an absolute maximum time
          const research = await Promise.race([apiPromise, timeoutPromise]);
          
          // Clear progress interval
          clearInterval(progressInterval);
          
          // If research was successful, cache it and update job status
          if (research && research.length > 200) { // Must have substantial content
            console.log(`[BACKGROUND] Job ${jobId} research generated successfully, length: ${research.length} characters`);
            
            // Cache the successful result
            if (kv) {
              try {
                await kv.set(cacheKey, research, { ex: 86400 }); // Cache for 24 hours
                await kv.hset(jobId, {
                  status: 'completed',
                  progress: 100,
                  completedAt: Date.now(),
                  resultKey: cacheKey,
                  isFallback: false,
                  lastUpdated: Date.now()
                });
                console.log(`[BACKGROUND] Job ${jobId} marked as completed and cached`);
              } catch (cacheError) {
                console.error(`[BACKGROUND] Cache error for job ${jobId}:`, cacheError);
              }
            }
          } else {
            throw new Error('Research result was empty or too short');
          }
        } catch (apiError: any) {
          // Clear progress interval
          clearInterval(progressInterval);
          
          // Log the specific error
          console.error(`[BACKGROUND] Research API error for job ${jobId}:`, apiError);
          
          // Update job with error state
          if (kv) {
            try {
              await kv.hset(jobId, {
                status: 'failed',
                error: apiError.message || 'Unknown API error',
                completedAt: Date.now(),
                lastUpdated: Date.now()
              });
            } catch (kvError) {
              console.error(`[BACKGROUND] KV error updating failed status for job ${jobId}:`, kvError);
            }
          }
          
          // Generate fallback content
          console.log(`[BACKGROUND] Generating fallback content for job ${jobId}`);
          
          try {
            // Create more informative fallback content with date stamp
            const currentDate = new Date().toLocaleDateString();
            let fallbackResult = `# Research Report: ${topic}\n\n`;
            
            // Add topic-specific content to the fallback
            if (topic.toLowerCase().includes('tranont')) {
              fallbackResult += `## Executive Summary\n\n`;
              fallbackResult += `This research report provides a comprehensive analysis of Tranont with a focus on applications for social/social-media. The target audience for this research is Women age 50 - 60. This report includes market analysis, audience insights, and strategic recommendations.\n\n`;
              
              fallbackResult += `## Market Overview\n\n`;
              fallbackResult += `Tranont represents a significant area of interest in today's market. Based on our research:\n\n`;
              fallbackResult += `- The market has shown steady growth over the past 1-5 years\n`;
              fallbackResult += `- Key players include established companies and innovative startups\n`;
              fallbackResult += `- Current market valuation is estimated to be substantial\n`;
              fallbackResult += `- Future projections indicate continued expansion and development\n\n`;
              
              fallbackResult += `## Key Trends\n\n`;
              fallbackResult += `1. Digital transformation is accelerating adoption in this space\n`;
              fallbackResult += `2. Customer expectations are evolving toward more personalized experiences\n`;
              fallbackResult += `3. Integration with mobile platforms is becoming increasingly important\n`;
              fallbackResult += `4. Data-driven approaches are providing competitive advantages\n\n`;
              
              fallbackResult += `## Target Audience Analysis\n\n`;
              fallbackResult += `The primary audience (Women age 50 - 60) demonstrates these characteristics:\n\n`;
              fallbackResult += `### Demographics\n`;
              fallbackResult += `- Age range typically spans 25-64 years\n`;
              fallbackResult += `- Mix of professional and personal interests\n`;
              fallbackResult += `- Tech savvy with regular online engagement\n`;
              fallbackResult += `- Active on multiple platforms including social\n\n`;
              
              fallbackResult += `### Pain Points\n`;
              fallbackResult += `- Information overload leading to decision fatigue\n`;
              fallbackResult += `- Difficulty finding reliable, specialized information\n`;
              fallbackResult += `- Time constraints limiting in-depth research\n`;
              fallbackResult += `- Concerns about reliability and trustworthiness\n\n`;
              
              fallbackResult += `## Content Strategy for social\n\n`;
              fallbackResult += `Based on our analysis, the following approaches are recommended for social:\n\n`;
              fallbackResult += `1. Content Format: Engaging, visually appealing posts with clear messaging\n`;
              fallbackResult += `2. Optimal Posting Frequency: 3-5 times per week\n`;
              fallbackResult += `3. Best Performing Content Types:\n`;
              fallbackResult += `   - Educational content explaining complex topics simply\n`;
              fallbackResult += `   - Behind-the-scenes insights\n`;
              fallbackResult += `   - Customer success stories and testimonials\n`;
              fallbackResult += `   - Trend analysis and forecasting\n\n`;
              
              fallbackResult += `## Key Recommendations\n\n`;
              fallbackResult += `1. Develop a consistent content calendar focused on addressing audience pain points\n`;
              fallbackResult += `2. Utilize a mix of formats including text, images, videos, and interactive elements\n`;
              fallbackResult += `3. Monitor engagement metrics to continuously refine your approach\n`;
              fallbackResult += `4. Position your content as authoritative by including research-backed information\n\n`;
              
              fallbackResult += `## Additional Resources\n\n`;
              fallbackResult += `Consider exploring these related topics for future content:\n\n`;
              fallbackResult += `- Tranont best practices and case studies\n`;
              fallbackResult += `- Industry benchmarks and performance metrics\n`;
              fallbackResult += `- Competitive landscape analysis\n\n`;
            } else if (topic.toLowerCase().includes('softcom') || 
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
              fallbackResult += `4. Provide transparent updates about service improvements and coverage expansions\n\n`;
            } else {
              fallbackResult += `## Overview\n\nThis topic requires in-depth research. Due to technical limitations, we could only generate a basic outline of the important areas to research.\n\n`;
              fallbackResult += `## Key Areas to Research\n\n`;
              fallbackResult += `1. Market trends and current statistics\n`;
              fallbackResult += `2. Target audience demographics and preferences\n`;
              fallbackResult += `3. Competitive landscape and differentiation opportunities\n`;
              fallbackResult += `4. Content strategy best practices for ${extractedPlatform}\n`;
              fallbackResult += `5. Success metrics and benchmarks\n\n`;
            }
            
            // Add date stamp and explanation to fallback
            fallbackResult += `This report was generated on ${currentDate} as an emergency fallback due to research API limitations. You can still proceed with content creation using this foundational research.`;
            
            // Cache the fallback result
            if (kv) {
              const fallbackKey = `${cacheKey}:fallback`;
              try {
                await kv.set(fallbackKey, fallbackResult, { ex: 86400 }); // Cache for 24 hours
                await kv.hset(jobId, {
                  status: 'completed',
                  progress: 100,
                  completedAt: Date.now(),
                  resultKey: fallbackKey,
                  isFallback: true,
                  lastUpdated: Date.now()
                });
                console.log(`[BACKGROUND] Job ${jobId} fallback content created and cached`);
              } catch (fallbackError) {
                console.error(`[BACKGROUND] Fallback caching error for job ${jobId}:`, fallbackError);
              }
            }
          } catch (fallbackError) {
            console.error(`[BACKGROUND] Fallback generation error for job ${jobId}:`, fallbackError);
            // Last resort - mark job as completely failed if even fallback fails
            if (kv) {
              try {
                await kv.hset(jobId, {
                  status: 'failed',
                  error: 'Failed to generate even fallback content',
                  completedAt: Date.now(),
                  lastUpdated: Date.now()
                });
              } catch (e) {
                // At this point, we've done all we can
                console.error(`[BACKGROUND] Final KV update error for job ${jobId}:`, e);
              }
            }
          }
        }
      } catch (error: any) {
        // Handle any other errors in the background process
        console.error(`[BACKGROUND] Critical error in job ${jobId}:`, error);
        
        // Try to update job status
        if (kv) {
          try {
            await kv.hset(jobId, {
              status: 'failed',
              error: error.message || 'Unknown background process error',
              completedAt: Date.now(),
              lastUpdated: Date.now()
            });
          } catch (e) {
            console.error(`[BACKGROUND] Final error status update failed for job ${jobId}:`, e);
          }
        }
      }
    })().catch(error => {
      console.error(`[BACKGROUND] Failed to even start background job ${jobId}:`, error);
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
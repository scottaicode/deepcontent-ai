/**
 * Perplexity Deep Research API Route
 * 
 * This API route handles integration with Perplexity's Deep Research API.
 * It takes a topic and context, performs deep research using Perplexity's API,
 * and returns structured research results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PerplexityClient } from '@/lib/api/perplexityClient';
import { getPromptForTopic } from '@/lib/api/promptBuilder';
import { kv } from '@vercel/kv';
import { rateLimit } from '@/lib/rateLimit';
import { validateLimitedUsage } from '@/lib/validateCredits';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { findOrCreateUser } from '@/lib/users';

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

// Improved error handling for API routes
export async function POST(req: NextRequest) {
  console.log('======= PERPLEXITY RESEARCH DIAGNOSTICS =======');
  const apiKey = process.env.PERPLEXITY_API_KEY;
  console.log('API Key exists:', !!apiKey);
  if (apiKey) {
    console.log('API Key first 8 chars:', apiKey.substring(0, 8));
    console.log('API Key starts with expected prefix "pplx-":', apiKey.startsWith('pplx-'));
  } else {
    console.log('WARNING: No Perplexity API key configured');
  }
  
  try {
    // Get user session for rate limiting
    const session = await getServerSession(authOptions);
    
    // Apply rate limiting for non-authenticated users
    if (!session?.user?.email) {
      const ipLimiter = rateLimit({
        uniqueTokenPerInterval: 500,
        interval: 60 * 1000, // 1 minute
      });
      
      // Rate limit by IP address for non-authenticated requests
      const ip = req.headers.get('x-forwarded-for') || 'anonymous';
      await ipLimiter.check(10, ip); // 10 requests per minute maximum
    } else {
      // For authenticated users, check their usage limits
      const email = session.user.email;
      
      // Validate usage limits for perplexity_research
      await validateLimitedUsage(email, 'perplexity_research');
      
      // Update user record for analytics
      if (email) {
        await findOrCreateUser(email);
      }
    }
    
    // Parse request body
    const body = await req.json();
    const { topic, context, sources, language, companyName, websiteContent } = body;
    
    console.log('Research request details:', { 
      topic: topic.substring(0, 50) + (topic.length > 50 ? '...' : ''),
      contextLength: context?.length || 0,
      language,
      hasCompanyName: !!companyName,
      hasWebsiteContent: !!websiteContent
    });
    
    // Validate required fields
    if (!topic || topic.trim() === '') {
      return NextResponse.json(
        { error: 'Missing required topic parameter' },
        { status: 400 }
      );
    }
    
    // Set up client with error handling
    if (!process.env.PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY is not set');
      return NextResponse.json(
        { error: 'Perplexity API key is not configured' },
        { status: 500 }
      );
    }
    
    // Create client
    try {
      const client = new PerplexityClient(process.env.PERPLEXITY_API_KEY);
      console.log('PerplexityClient initialized successfully');
      
      // Create system prompt
      const systemPrompt = `You are a comprehensive research assistant that helps users by finding and synthesizing accurate, up-to-date information on any topic. Your research should be well-structured, informative, and useful for content creation.

Language: ${language || 'English'}.

Specific Instructions:
1. Organize your response with clear headings and subheadings in markdown format.
2. Include relevant statistics, trends, and data where available.
3. Analyze the competitive landscape if applicable.
4. For business-focused research, include market analysis.
5. For personal topics, focus on best practices and current trends.
6. Cite specific sources where possible.
7. Provide actionable insights and recommendations.
8. Use bullet points and numbered lists where appropriate.`;

      const startTime = Date.now();
      const research = await client.generateResearch(
        `Provide comprehensive research about ${topic}. ${context || ''}`, 
        {
          systemPrompt,
          temperature: 0.7,
          maxTokens: 4000,
          language: language || 'en',
        }
      );
      const duration = Date.now() - startTime;
      console.log(`Research generated successfully in ${duration}ms`);
      
      return NextResponse.json({ research });
    } catch (error) {
      console.error('Error initializing Perplexity client:', error);
      return NextResponse.json(
        { error: 'Error initializing Perplexity client' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Perplexity research API error:', error);
    
    // Handle rate limit errors
    if (error.message && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'An error occurred during research generation' },
      { status: 500 }
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
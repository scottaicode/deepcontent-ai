/**
 * Research Completion Check Endpoint
 * 
 * This endpoint checks if research for a given topic has completed and is available in the cache.
 * It allows the client to recover research that may have completed despite connection issues.
 */

import { NextRequest } from 'next/server';

// Import KV with error handling
let kv: any;
try {
  kv = require('@vercel/kv');
} catch (e) {
  console.warn('KV storage not available, research completion check will be limited');
  kv = null;
}

// Utility function to create a cache key from research parameters (must match the one in research route)
const createCacheKey = (topic: string, contentType: string = 'article', platform: string = 'general', language: string = 'en'): string => {
  // Normalize and sanitize inputs
  const normalizedTopic = topic.trim().toLowerCase().replace(/[^a-z0-9]/gi, '-').substring(0, 100);
  const normalizedType = contentType.trim().toLowerCase().replace(/[^a-z0-9]/gi, '-');
  const normalizedPlatform = platform.trim().toLowerCase().replace(/[^a-z0-9]/gi, '-');
  
  return `research:${normalizedTopic}:${normalizedType}:${normalizedPlatform}:${language}`;
};

// POST handler to check for completed research
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { topic, contentType = 'article', platform = 'general', language = 'en' } = body;
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[CHECK] Checking for completed research on topic: "${topic}"`);
    
    // Create cache key and check for exact match
    const exactCacheKey = createCacheKey(topic, contentType, platform, language);
    
    // If KV is available, check for cached research
    if (kv) {
      // Check for exact cache match first
      const exactMatch = await kv.get(exactCacheKey);
      if (exactMatch) {
        console.log(`[CHECK] Found exact cache match for: "${topic}"`);
        return new Response(
          JSON.stringify({ 
            research: exactMatch,
            fromCache: true,
            matchType: 'exact'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Check for partial match using a simplified key
      const simplifiedKey = `research:${topic.trim().toLowerCase().replace(/[^a-z0-9]/gi, '-').substring(0, 50)}`;
      console.log(`[CHECK] Checking for partial match with key pattern: ${simplifiedKey}`);
      
      // Get all keys that start with the simplified pattern
      try {
        const keys = await kv.keys(`${simplifiedKey}*`);
        if (keys && keys.length > 0) {
          // Get the most recent research (first match)
          const partialMatch = await kv.get(keys[0]);
          if (partialMatch) {
            console.log(`[CHECK] Found partial match for: "${topic}" using key: ${keys[0]}`);
            return new Response(
              JSON.stringify({ 
                research: partialMatch,
                fromCache: true,
                matchType: 'partial'
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (error) {
        console.warn('[CHECK] Error searching for partial matches:', error);
      }
    }
    
    // If we get here, no research was found
    return new Response(
      JSON.stringify({ available: false }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[CHECK] Error checking for research completion:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 
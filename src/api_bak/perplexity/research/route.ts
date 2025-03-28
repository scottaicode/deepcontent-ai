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

// Disable caching to ensure fresh research data
export const dynamic = 'force-dynamic';

// Set a longer timeout for extensive research
export const maxDuration = 300; // 5 minutes

interface PerplexityResearchRequest {
  topic: string;
  context?: string;
  sources?: string[];
  language?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { topic, context, sources = ['recent', 'scholar'], language } = body;
    
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
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
    
    console.log('Extracted audience from context:', JSON.stringify(audience));
    console.log('Extracted content type from context:', JSON.stringify(contentType));
    console.log('Extracted platform from context:', JSON.stringify(platform));
    console.log('Language for research output:', language);
    
    // Get API key from environment variables
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Perplexity API key not configured' }, { status: 500 });
    }
    
    console.log('API Key first few characters:', `${apiKey.substring(0, 5)}...`);
    
    // Build the prompt
    const promptText = getPromptForTopic(topic, {
      audience,
      contentType,
      platform,
      sources,
      language
    });
    
    console.log('Built prompt for Perplexity API:', promptText.substring(0, 100) + '...');
    
    // Create Perplexity client
    const perplexity = new PerplexityClient(apiKey);
    
    const startTime = Date.now();
    
    // Call Perplexity API
    console.log('Sending request to Perplexity API...');
    console.log('Language for this request:', language);
    
    // Call Perplexity API
    const response = await perplexity.generateResearch(promptText);
    
    // Calculate actual time taken
    const endTime = Date.now();
    const timeTaken = endTime - startTime;
    console.log(`Successfully received research from Perplexity API in ${timeTaken}ms`);
    
    // Return the research result
    return NextResponse.json({ research: response });
    
  } catch (error: any) {
    console.error('Error generating research:', error);
    return NextResponse.json({ error: error.message || 'Unknown error occurred' }, { status: 500 });
  }
}
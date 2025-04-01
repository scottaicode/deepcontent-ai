/**
 * Research Generation API
 * 
 * This API endpoint generates research content based on trending topics
 * and business type. It leverages the trendService to create comprehensive
 * research that can be used for content creation.
 */

import { NextResponse } from 'next/server';
import { generateResearch, ResearchRequest } from '@/app/lib/api/trendService';

// Disable caching for this API route to ensure fresh data
export const dynamic = 'force-dynamic';

/**
 * Generate research content based on the provided business type and trending topic
 */
export async function POST(req: Request) {
  try {
    // Parse request body
    const body = await req.json() as ResearchRequest;
    const { businessType, contentType, trendingTopic } = body;
    
    // Validate required parameters
    if (!businessType) {
      return NextResponse.json(
        { error: 'Business type is required' },
        { status: 400 }
      );
    }

    // Generate research using the trendService
    const result = await generateResearch({
      businessType,
      contentType,
      trendingTopic
    });

    // If there was an error generating research, return it
    if (result.error) {
      console.error('Error generating research:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Return the generated research
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in research generation API:', error);
    
    return NextResponse.json(
      { error: error.message || 'An error occurred while generating research' },
      { status: 500 }
    );
  }
}

/**
 * Get research based on provided query parameters
 */
export async function GET(req: Request) {
  try {
    // Parse URL to get query parameters
    const { searchParams } = new URL(req.url);
    const businessType = searchParams.get('businessType');
    const contentType = searchParams.get('contentType') || undefined;
    
    // Validate required parameters
    if (!businessType) {
      return NextResponse.json(
        { error: 'Business type is required as a query parameter' },
        { status: 400 }
      );
    }

    // Generate research using the trendService
    const result = await generateResearch({
      businessType,
      contentType
    });

    // If there was an error generating research, return it
    if (result.error) {
      console.error('Error generating research:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Return the generated research
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in research generation API:', error);
    
    return NextResponse.json(
      { error: error.message || 'An error occurred while generating research' },
      { status: 500 }
    );
  }
} 
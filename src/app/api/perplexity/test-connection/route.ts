/**
 * Test endpoint for Perplexity API Connection and Research
 */
import { NextRequest, NextResponse } from 'next/server';
import { PerplexityClient } from '@/lib/api/perplexityClient';

// Disable caching to ensure fresh test data
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get API key from environment
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'API key not found in environment variables'
      }, { status: 400 });
    }
    
    // Create Perplexity client
    const perplexity = new PerplexityClient(apiKey);
    
    // Generate a simple test research
    const testPrompt = "Provide a brief overview of artificial intelligence in 2-3 paragraphs.";
    
    // Set up options
    const options = {
      maxTokens: 500,
      temperature: 0.2,
      timeoutMs: 30000, // 30 seconds timeout for quick test
      language: 'en'
    };
    
    // Make the API call
    console.log('Testing Perplexity API with a simple research request...');
    const research = await perplexity.generateResearch(testPrompt, options);
    
    if (research && research.length > 100) {
      return NextResponse.json({
        success: true,
        message: 'Perplexity API test successful',
        researchLength: research.length,
        researchSample: research.substring(0, 200) + '...',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Perplexity API response too short or empty',
        researchLength: research ? research.length : 0,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error testing Perplexity API:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error testing Perplexity API',
      error: error.message || String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 
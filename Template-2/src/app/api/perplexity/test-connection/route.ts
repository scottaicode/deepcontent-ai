/**
 * Test endpoint for Perplexity API Connection
 */
import { NextRequest, NextResponse } from 'next/server';

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
    
    // Make a simple API call directly to Perplexity
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar-small-chat',
        messages: [
          { role: 'user', content: 'Say hello in 5 words or less.' }
        ],
        max_tokens: 20,
        temperature: 0.0
      })
    });
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: `API error: ${response.status} ${response.statusText}`
      }, { status: response.status });
    }
    
    const data = await response.json();
    const content = data.choices && data.choices[0] && data.choices[0].message ? 
      data.choices[0].message.content : 'No content returned';
    
    return NextResponse.json({
      success: true,
      message: 'Perplexity API test successful',
      response: content,
      timestamp: new Date().toISOString()
    });
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
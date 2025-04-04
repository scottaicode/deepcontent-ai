import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple endpoint to test Perplexity API key
 */
export async function GET(req: NextRequest) {
  try {
    console.log('======= PERPLEXITY API KEY TEST =======');
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      console.log('API key missing in environment');
      return NextResponse.json({
        status: 'error',
        message: 'Perplexity API key not configured',
        keyExists: false
      }, { status: 500 });
    }
    
    console.log('API key found in environment, length:', apiKey.length);
    console.log('API key first 4 chars:', apiKey.substring(0, 4));
    console.log('API key has valid prefix:', apiKey.startsWith('pplx-'));
    
    // Make a simple API call to test the key
    try {
      // Configure request body for a minimal API call
      const requestBody = {
        model: 'sonar-small-chat',  // Using a smaller model for quick test
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'Hello, this is a test message. Please respond with "API key is working correctly"'
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      };
      
      console.log('Making test API call to Perplexity...');
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          errorMessage = JSON.stringify(errorData);
          console.error('API error details:', errorData);
        } catch (e) {
          errorMessage = await response.text();
        }
        
        return NextResponse.json({
          status: 'error',
          message: `API request failed with status ${response.status}`,
          error: errorMessage,
          keyExists: true,
          keyValid: false,
          statusCode: response.status
        }, { status: 500 });
      }
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || 'No content returned';
      
      return NextResponse.json({
        status: 'success',
        message: 'API key is working correctly',
        keyExists: true,
        keyValid: true,
        response: content,
        statusCode: response.status
      });
    } catch (error: any) {
      console.error('Error testing API key:', error);
      
      return NextResponse.json({
        status: 'error',
        message: `Error testing API key: ${error.message}`,
        keyExists: true,
        keyValid: false,
        error: error.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Unexpected error in test endpoint:', error);
    
    return NextResponse.json({
      status: 'error',
      message: `Unexpected error: ${error.message}`
    }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';

// Disable caching to ensure fresh test data
export const dynamic = 'force-dynamic';

// Common testing function that can be used by both GET and POST
async function testPerplexityApi() {
  try {
    // Get environment variables
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    const nodeEnv = process.env.NODE_ENV;
    
    // Check if environment variables are loaded
    const environmentDetails = {
      exists: !!perplexityApiKey,
      firstChars: perplexityApiKey ? `${perplexityApiKey.substring(0, 4)}...` : 'not found',
      env: nodeEnv || 'not set'
    };
    
    // Also log to server console
    console.log('Perplexity API environment check:', environmentDetails);
    
    // Test if the API key is valid with a simple request
    let apiKeyValidation = { valid: false, message: 'Not tested' };
    
    if (perplexityApiKey) {
      try {
        console.log('Testing Perplexity API key validity...');
        
        // Make a minimal API call to verify the key works
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${perplexityApiKey}`
          },
          body: JSON.stringify({
            model: 'sonar',  // Updated to use a valid model from Perplexity's current offerings
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant.'
              },
              {
                role: 'user',
                content: 'Say hello in one word only.'
              }
            ],
            max_tokens: 10,
            temperature: 0.0,
          })
        });
        
        if (response.ok) {
          apiKeyValidation = { 
            valid: true, 
            message: 'API key is valid and working' 
          };
          console.log('Perplexity API key is valid');
        } else {
          const errorText = await response.text();
          apiKeyValidation = { 
            valid: false, 
            message: `API key validation failed with status ${response.status}: ${errorText}`
          };
          console.error('Perplexity API key validation failed:', errorText);
        }
      } catch (error) {
        apiKeyValidation = { 
          valid: false, 
          message: error instanceof Error ? error.message : String(error)
        };
        console.error('Error testing Perplexity API key:', error);
      }
    } else {
      apiKeyValidation = { 
        valid: false, 
        message: 'No API key provided to test'
      };
    }
    
    return {
      exists: environmentDetails.exists,
      firstChars: environmentDetails.firstChars,
      env: environmentDetails.env,
      valid: apiKeyValidation.valid,
      message: apiKeyValidation.message,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in Perplexity API test:', error);
    throw error;
  }
}

// GET handler for backwards compatibility
export async function GET() {
  try {
    const result = await testPerplexityApi();
    return NextResponse.json({
      success: true,
      message: 'Perplexity API test route (GET)',
      environmentVariables: {
        PERPLEXITY_API_KEY_EXISTS: result.exists,
        PERPLEXITY_API_KEY_FIRST_CHARS: result.firstChars,
        NODE_ENV: result.env
      },
      apiKeyValidation: {
        valid: result.valid,
        message: result.message
      },
      timestamp: result.timestamp
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: 'Failed to run test',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// New POST handler to match the frontend request
export async function POST(req: Request) {
  try {
    // We don't really need to parse the request body, but we'll do it to match the pattern
    await req.json().catch(() => ({}));
    
    const result = await testPerplexityApi();
    return NextResponse.json({
      success: true,
      exists: result.exists,
      firstChars: result.firstChars,
      env: result.env,
      valid: result.valid,
      message: result.message,
      timestamp: result.timestamp
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: 'Failed to run Perplexity API test',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
/**
 * Test endpoint for Perplexity API
 */
import { NextRequest, NextResponse } from 'next/server';

// Disable caching to ensure fresh test data
export const dynamic = 'force-dynamic';

// Sample key for format validation (first few chars)
const validKeyFormat = 'pplx-';

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
      env: nodeEnv || 'not set',
      format: perplexityApiKey ? (perplexityApiKey.startsWith('pplx-') ? 'valid' : 'invalid') : 'not found'
    };
    
    // Also log to server console
    console.log('Perplexity API environment check:', environmentDetails);
    
    // Test if the API key is valid with a simple request
    let apiKeyValidation = { valid: false, message: 'Not tested' };
    
    if (!perplexityApiKey) {
      apiKeyValidation = { 
        valid: false, 
        message: 'API key is missing. Add PERPLEXITY_API_KEY to your environment variables.'
      };
    } else if (!perplexityApiKey.startsWith('pplx-')) {
      apiKeyValidation = { 
        valid: false, 
        message: 'API key format is invalid. Perplexity API keys should start with "pplx-".'
      };
    } else {
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
          const data = await response.json();
          const reply = data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : 'No content returned';
            
          apiKeyValidation = { 
            valid: true, 
            message: `API key is valid and working. Response: "${reply}"` 
          };
          console.log('Perplexity API key is valid');
        } else {
          const errorData = await response.text();
          const statusCode = response.status;
          
          // Provide more specific error messages based on status code
          if (statusCode === 401) {
            apiKeyValidation = { 
              valid: false, 
              message: 'API key is invalid or unauthorized. Please check your Perplexity API key.'
            };
          } else if (statusCode === 429) {
            apiKeyValidation = { 
              valid: false, 
              message: 'Rate limit exceeded. Your account may have reached its request limit.'
            };
          } else {
            apiKeyValidation = { 
              valid: false, 
              message: `API key validation failed with status ${response.status}: ${errorData}`
            };
          }
          
          console.error('Perplexity API key validation failed:', errorData);
        }
      } catch (error) {
        apiKeyValidation = { 
          valid: false, 
          message: error instanceof Error ? error.message : String(error)
        };
        console.error('Error testing Perplexity API key:', error);
      }
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
export async function GET(request: NextRequest) {
  // Check environment variables
  const apiKey = process.env.PERPLEXITY_API_KEY;
  const hasApiKey = !!apiKey;
  const keyFirstChars = hasApiKey ? apiKey.substring(0, 5) : 'not found';
  const keyLength = hasApiKey ? apiKey.length : 0;
  const keyFormat = hasApiKey ? (apiKey.startsWith(validKeyFormat) ? 'valid' : 'invalid') : 'missing';
  
  // Check how many environment variables are loaded
  const loadedEnvVars = Object.keys(process.env).filter(key => !key.startsWith('npm_')).length;
  
  // Check other API keys
  const otherKeys = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    DEEPGRAM_API_KEY: !!process.env.DEEPGRAM_API_KEY
  };
  
  // Basic key validation
  const isValidFormat = hasApiKey && apiKey.startsWith(validKeyFormat);
  
  return NextResponse.json({
    success: true,
    message: 'Perplexity API test route (GET)',
    environmentVariables: {
      PERPLEXITY_API_KEY_EXISTS: hasApiKey,
      PERPLEXITY_API_KEY_FIRST_CHARS: keyFirstChars,
      PERPLEXITY_API_KEY_LENGTH: keyLength,
      PERPLEXITY_API_KEY_FORMAT: keyFormat,
      TOTAL_ENV_VARS_LOADED: loadedEnvVars,
      OTHER_API_KEYS: otherKeys,
      NODE_ENV: process.env.NODE_ENV
    },
    apiKeyValidation: {
      valid: isValidFormat,
      message: isValidFormat 
        ? "API key has the correct format" 
        : hasApiKey 
          ? "API key exists but has an invalid format" 
          : "No API key provided to test"
    },
    timestamp: new Date().toISOString()
  });
}

// New POST handler to match the frontend request
export async function POST(request: NextRequest) {
  try {
    // Get the API key
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    // If no API key is provided, return an error
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key is not configured',
        message: 'Please add a valid PERPLEXITY_API_KEY to your environment variables'
      }, { status: 400 });
    }
    
    // Check basic format (should start with pplx-)
    if (!apiKey.startsWith(validKeyFormat)) {
      return NextResponse.json({
        success: false,
        error: 'API key has invalid format',
        message: `API key should start with "${validKeyFormat}"`
      }, { status: 400 });
    }
    
    // We don't actually make an API call here to avoid using quota
    // Instead, just return success if the API key exists and has the right format
    return NextResponse.json({
      success: true,
      message: 'API key format validation successful',
      keyFormat: 'valid'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      message: 'API key validation failed'
    }, { status: 500 });
  }
} 
/**
 * Diagnostic Test for Perplexity API Connection
 * This endpoint tests API key validity and service availability
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
    
    console.log(`Testing Perplexity API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 3)}`);
    
    // Check if key starts with the expected prefix
    if (!apiKey.startsWith('pplx-')) {
      return NextResponse.json({
        success: false,
        message: 'API key has invalid format (should start with "pplx-")',
        keyPrefix: apiKey.substring(0, 5)
      }, { status: 400 });
    }
    
    // Make THREE different API calls to diagnose different aspects:
    
    // TEST 1: Basic connection test with minimal prompt
    console.log("TEST 1: Basic API connectivity test");
    try {
      const basicResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'sonar-small-chat',  // Using smallest model
          messages: [
            { role: 'user', content: 'Say "test" and nothing else.' }
          ],
          max_tokens: 10,
          temperature: 0
        })
      });
      
      const basicStatus = basicResponse.status;
      const basicHeaders = Object.fromEntries(basicResponse.headers.entries());
      let basicData;
      
      try {
        basicData = await basicResponse.json();
      } catch (e) {
        basicData = { error: "Could not parse JSON response" };
      }
      
      const test1Result = {
        status: basicStatus,
        headers: basicHeaders,
        data: basicData,
        ok: basicResponse.ok
      };
      
      console.log("TEST 1 Result:", test1Result);
      
      // If test 1 failed, no need to continue
      if (!basicResponse.ok) {
        return NextResponse.json({
          success: false,
          message: 'Basic API connectivity test failed',
          diagnostics: {
            test1: test1Result,
            errorCode: basicStatus,
            errorDetails: basicData
          }
        }, { status: 500 });
      }
    
      // TEST 2: Test with the actual research model
      console.log("TEST 2: Testing with research model");
      const researchResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'sonar-medium-chat', // Try a mid-sized model
          messages: [
            { role: 'system', content: 'You are a helpful research assistant.' },
            { role: 'user', content: 'What is the capital of France? Answer in one word.' }
          ],
          max_tokens: 50,
          temperature: 0
        })
      });
      
      const researchStatus = researchResponse.status;
      const researchHeaders = Object.fromEntries(researchResponse.headers.entries());
      let researchData;
      
      try {
        researchData = await researchResponse.json();
      } catch (e) {
        researchData = { error: "Could not parse JSON response" };
      }
      
      const test2Result = {
        status: researchStatus,
        headers: researchHeaders,
        data: researchData,
        ok: researchResponse.ok
      };
      
      console.log("TEST 2 Result:", test2Result);
      
      // TEST 3: Check for rate limiting or quota issues
      console.log("TEST 3: Testing sonar-deep-research model");
      const deepResearchResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'sonar-medium-online', // Try online model which might have different permissions
          messages: [
            { role: 'system', content: 'You provide factual information.' },
            { role: 'user', content: 'What year is it currently?' }
          ],
          max_tokens: 50,
          temperature: 0
        })
      });
      
      const deepStatus = deepResearchResponse.status;
      const deepHeaders = Object.fromEntries(deepResearchResponse.headers.entries());
      let deepData;
      
      try {
        deepData = await deepResearchResponse.json();
      } catch (e) {
        deepData = { error: "Could not parse JSON response" };
      }
      
      const test3Result = {
        status: deepStatus,
        headers: deepHeaders,
        data: deepData,
        ok: deepResearchResponse.ok
      };
      
      console.log("TEST 3 Result:", test3Result);
      
      // Return combined test results
      return NextResponse.json({
        success: test1Result.ok && test2Result.ok && test3Result.ok,
        message: 'API diagnostics completed',
        apiKeyFormat: 'Valid (starts with pplx-)',
        diagnostics: {
          test1: test1Result,
          test2: test2Result,
          test3: test3Result,
          recommendedAction: determineRecommendedAction(test1Result, test2Result, test3Result)
        }
      });
    } catch (fetchError: any) {
      console.error("Error during API test:", fetchError);
      return NextResponse.json({
        success: false,
        message: 'Network error during API test',
        error: fetchError.message || String(fetchError),
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error testing Perplexity API:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error running diagnostics',
      error: error.message || String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to determine recommended action based on test results
function determineRecommendedAction(test1: any, test2: any, test3: any): string {
  if (!test1.ok) {
    if (test1.status === 401) {
      return "Your API key is invalid or has been revoked. Please check your Perplexity account and generate a new key.";
    }
    if (test1.status === 403) {
      return "Your API key doesn't have permission to access this service. Please check your Perplexity subscription level.";
    }
    if (test1.status === 429) {
      return "You've hit rate limits. Consider reducing request frequency or upgrading your subscription.";
    }
    return `Basic API connectivity issue. Status code: ${test1.status}. Check your network connection and Perplexity service status.`;
  }
  
  if (!test2.ok && test1.ok) {
    return "Your API key works with basic models but not with the research model. Check your subscription tier or model permissions.";
  }
  
  if (!test3.ok && test2.ok) {
    return "Your API key has limited model access. The online research model requires specific permissions or a higher tier subscription.";
  }
  
  if (test1.ok && test2.ok && test3.ok) {
    return "All API tests passed. If you're still having issues, check the prompt formatting or explore more complex query patterns.";
  }
  
  return "Inconsistent API behavior. Contact Perplexity support for assistance.";
} 
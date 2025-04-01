/**
 * YouTube API Configuration Check Endpoint
 * 
 * This endpoint checks if the required API keys and configurations
 * are set up correctly for the YouTube transcript functionality.
 */

import { NextRequest, NextResponse } from 'next/server';

// Add config for dynamic route - explicitly mark as dynamic
export const dynamic = 'force-dynamic';

// Define types for the diagnostic data structure
interface ConfigCheck {
  name: string;
  status: 'configured' | 'missing' | 'error';
  message: string;
  keyInfo?: {
    length: number;
    preview: string;
  };
  instructions?: string[];
  details?: any;
}

interface DiagnosticsData {
  timestamp: string;
  configChecks: ConfigCheck[];
  environmentInfo: {
    nodeEnv: string | undefined;
    isVercel: boolean;
  };
  networkDiagnostics?: any;
}

export async function GET(request: NextRequest) {
  console.log('YouTube API Configuration Check: Request received', new Date().toISOString());
  
  const diagnostics: DiagnosticsData = {
    timestamp: new Date().toISOString(),
    configChecks: [],
    environmentInfo: {
      nodeEnv: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL
    },
    networkDiagnostics: {}
  };
  
  // Check Supadata API Key Configuration
  const supadataApiKey = process.env.SUPADATA_API_KEY;
  if (supadataApiKey) {
    diagnostics.configChecks.push({
      name: 'Supadata API Key',
      status: 'configured',
      message: 'Supadata API key is properly configured',
      keyInfo: {
        length: supadataApiKey.length,
        preview: `${supadataApiKey.substring(0, 3)}...${supadataApiKey.substring(supadataApiKey.length - 3)}`
      }
    });
    
    // Test network connectivity to various endpoints
    const networkEndpoints = [
      { name: 'Supadata API Base', url: 'https://api.supadata.io/robots.txt' },
      { name: 'YouTube Base', url: 'https://www.youtube.com/robots.txt' },
      { name: 'Google DNS', url: 'https://8.8.8.8/' },
      { name: 'External Service', url: 'https://httpbin.org/get' }
    ];
    
    // Perform network diagnostics
    console.log('YouTube API Check: Running network diagnostics');
    diagnostics.networkDiagnostics.tests = [];
    
    for (const endpoint of networkEndpoints) {
      try {
        console.log(`Testing network connectivity to ${endpoint.name}: ${endpoint.url}`);
        const startTime = Date.now();
        const response = await fetch(endpoint.url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        const endTime = Date.now();
        
        diagnostics.networkDiagnostics.tests.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          status: response.status,
          ok: response.ok,
          latency: endTime - startTime,
          timestamp: new Date().toISOString()
        });
        
        console.log(`Network test to ${endpoint.name} completed: Status ${response.status}, Time: ${endTime - startTime}ms`);
      } catch (error: any) {
        console.error(`Network test to ${endpoint.name} failed:`, error.message);
        diagnostics.networkDiagnostics.tests.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Test the actual API with the configured key
    try {
      console.log('Testing Supadata API with configured key');
      const testVideoId = 'dQw4w9WgXcQ'; // Known video with captions
      const supadadataCheckUrl = `https://api.supadata.io/youtube/transcript?videoId=${testVideoId}`;
      console.log(`Making request to: ${supadadataCheckUrl}`);
      
      const apiResponse = await fetch(supadadataCheckUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supadataApiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DeepContent/1.0 (ApiValidation)'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      console.log('Supadata API test response received', {
        status: apiResponse.status,
        ok: apiResponse.ok,
        headers: Object.fromEntries(
          Array.from(apiResponse.headers.entries())
            .filter(([key]) => !key.includes('set-cookie'))
        )
      });
      
      let responseBody = '';
      try {
        responseBody = await apiResponse.text();
        console.log('API response body preview:', responseBody.substring(0, 200));
      } catch (bodyError) {
        console.error('Failed to read API response body:', bodyError);
      }
      
      if (apiResponse.ok) {
        diagnostics.configChecks.push({
          name: 'Supadata API Test',
          status: 'configured',
          message: 'Successfully connected to Supadata API and retrieved data',
          details: {
            statusCode: apiResponse.status,
            bodyPreview: responseBody.substring(0, 100)
          }
        });
      } else {
        diagnostics.configChecks.push({
          name: 'Supadata API Test',
          status: 'error',
          message: `API returned error response: ${apiResponse.status}`,
          details: {
            statusCode: apiResponse.status,
            bodyPreview: responseBody.substring(0, 200),
            headers: Object.fromEntries(
              Array.from(apiResponse.headers.entries())
                .filter(([key]) => ['content-type', 'www-authenticate', 'date'].includes(key.toLowerCase()))
            )
          }
        });
      }
    } catch (apiError: any) {
      console.error('Supadata API connection test failed:', apiError);
      
      // Try to extract more detailed error information
      let errorType = 'unknown';
      let errorDetails = '';
      
      if (apiError.message.includes('ETIMEDOUT') || apiError.message.includes('timeout')) {
        errorType = 'timeout';
      } else if (apiError.message.includes('ENOTFOUND') || apiError.message.includes('DNS')) {
        errorType = 'dns_resolution';
      } else if (apiError.message.includes('certificate') || apiError.message.includes('SSL')) {
        errorType = 'ssl';
      } else if (apiError.message.includes('refused')) {
        errorType = 'connection_refused';
      }
      
      diagnostics.configChecks.push({
        name: 'Supadata API Test',
        status: 'error',
        message: `Failed to connect to Supadata API: ${apiError.message}`,
        details: {
          errorType,
          errorMessage: apiError.message,
          errorStack: apiError.stack?.split('\n')[0],
          recommendations: getErrorRecommendations(errorType)
        }
      });
    }
  } else {
    diagnostics.configChecks.push({
      name: 'Supadata API Key',
      status: 'missing',
      message: 'Supadata API key is not configured',
      instructions: [
        'Add SUPADATA_API_KEY=your_api_key to your .env file',
        'Get your API key from https://supadata.io/dashboard',
        'After adding the key, restart the development server'
      ]
    });
  }
  
  // Check if we're using the backup code from a previous version
  try {
    console.log('Checking for backup YouTube transcript implementation');
    const backupModulePath = require.resolve('@/app/lib/services/YouTubeTranscriptBackupService');
    
    diagnostics.configChecks.push({
      name: 'Backup Implementation',
      status: 'configured',
      message: 'Backup YouTube transcript implementation found',
      details: {
        path: backupModulePath
      }
    });
  } catch (moduleError) {
    diagnostics.configChecks.push({
      name: 'Backup Implementation',
      status: 'missing',
      message: 'No backup YouTube transcript implementation found',
      details: {
        recommendation: 'Check FINAL MASTER 3_28_2025 12_20_pm_Production_Version for working implementation'
      }
    });
  }
  
  // Add overall status
  const isFullyConfigured = diagnostics.configChecks.some(check => 
    check.name === 'Supadata API Test' && check.status === 'configured'
  );
  
  return NextResponse.json({
    success: isFullyConfigured,
    message: isFullyConfigured 
      ? 'YouTube API is properly configured and connected' 
      : 'YouTube API configuration has issues. See details for instructions.',
    diagnostics,
    timestamp: new Date().toISOString()
  });
}

function getErrorRecommendations(errorType: string): string[] {
  switch (errorType) {
    case 'timeout':
      return [
        'Check your internet connection',
        'The API server might be experiencing high load',
        'Try again later or with a longer timeout'
      ];
    case 'dns_resolution':
      return [
        'Check if api.supadata.io is accessible from your network',
        'Verify DNS settings on your network',
        'Try using a different DNS resolver'
      ];
    case 'ssl':
      return [
        'Your network might be intercepting SSL connections',
        'Check for SSL inspection in corporate networks',
        'Verify system date and time are correct'
      ];
    case 'connection_refused':
      return [
        'The API endpoint might be down or unreachable',
        'Check if your network blocks this connection',
        'Verify firewall settings'
      ];
    default:
      return [
        'Verify your API key is correct and active',
        'Check network connectivity to api.supadata.io',
        'Contact Supadata support if issues persist'
      ];
  }
} 
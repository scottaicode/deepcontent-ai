/**
 * YouTube API Configuration Checker
 * 
 * This endpoint performs diagnostics on the YouTube transcript API
 * to help troubleshoot connection issues.
 */

import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

// Mark route as dynamic to ensure it doesn't get statically generated
export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('YouTube API Check: Starting API configuration check');
  
  const startTime = Date.now();
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    packageVersion: {
      'youtube-transcript': require('youtube-transcript/package.json').version
    },
    checks: [],
    startTime,
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    configuredApis: {
      supadata: !!process.env.SUPADATA_API_KEY
    }
  };
  
  try {
    // Use a video that definitely has captions enabled 
    const testVideoId = 'UF8uR6Z6KLc'; // Steve Jobs' Stanford Commencement Speech - has reliable transcripts
    
    diagnostics.checks.push({
      name: 'Library Import Check',
      status: 'success',
      message: 'YoutubeTranscript library successfully imported'
    });
    
    // Check 1.5: Check if Supadata API key is configured
    if (process.env.SUPADATA_API_KEY) {
      diagnostics.checks.push({
        name: 'Supadata API Key Check',
        status: 'success',
        message: 'Supadata API key is configured',
        keyLength: process.env.SUPADATA_API_KEY.length,
        keyPreview: `${process.env.SUPADATA_API_KEY.substring(0, 3)}...${process.env.SUPADATA_API_KEY.substring(process.env.SUPADATA_API_KEY.length - 3)}`
      });
      
      // Check 1.6: Test Supadata API with safer approach
      try {
        console.log('YouTube API Check: Testing Supadata API with test video ID:', testVideoId);
        
        // More robust fetch with error handling
        let supadataResponse;
        try {
          supadataResponse = await fetch(`https://api.supadata.io/youtube/transcript?videoId=${testVideoId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.SUPADATA_API_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // 10-second timeout
          });
        } catch (fetchError: any) {
          throw new Error(`Network error: ${fetchError.message}`);
        }
        
        // Handle non-OK responses
        if (!supadataResponse.ok) {
          let errorInfo = '';
          try {
            const errorText = await supadataResponse.text();
            errorInfo = errorText.substring(0, 100);
          } catch (e) {
            errorInfo = 'Could not read error text';
          }
          
          throw new Error(`API returned status ${supadataResponse.status}: ${errorInfo}`);
        }
        
        // Safely parse JSON
        let responseText = '';
        let data;
        
        try {
          responseText = await supadataResponse.text();
          
          // Debug log the raw response
          console.log('YouTube API Check: Raw response preview:', {
            length: responseText.length,
            preview: responseText.substring(0, 50),
            contentType: supadataResponse.headers.get('content-type')
          });
          
          // Handle empty response
          if (!responseText || responseText.trim().length === 0) {
            throw new Error('Empty response from API');
          }
          
          // Trim response to remove BOM and whitespace
          const trimmedResponse = responseText.trim();
          
          // Safer JSON parsing with validation first
          if (!trimmedResponse.startsWith('{') && !trimmedResponse.startsWith('[')) {
            throw new Error(`Invalid JSON response format: ${trimmedResponse.substring(0, 20)}...`);
          }
          
          try {
            // Parse JSON
            data = JSON.parse(trimmedResponse);
          } catch (jsonError: any) {
            // Try to fix common JSON issues
            console.warn('Initial JSON parse failed, attempting to sanitize:', jsonError.message);
            
            // Attempt to remove any invalid characters at the beginning
            const cleanedResponse = trimmedResponse.replace(/^\s*[^\[{]/, '');
            
            if (cleanedResponse.startsWith('{') || cleanedResponse.startsWith('[')) {
              data = JSON.parse(cleanedResponse);
              console.log('Sanitized JSON parsing succeeded');
            } else {
              throw jsonError; // Re-throw if sanitization didn't help
            }
          }
          
        } catch (parseError: any) {
          throw new Error(`JSON parse error: ${parseError.message}. Response preview: ${responseText.substring(0, 50)}...`);
        }
        
        // Validate response data
        if (!data) {
          throw new Error('No data in response');
        }
        
        const transcript = data.transcript || data.content;
        
        if (!transcript || typeof transcript !== 'string') {
          throw new Error('No transcript in response');
        }
        
        diagnostics.checks.push({
          name: 'Supadata API Check',
          status: 'success',
          message: `Successfully fetched transcript with Supadata API (${transcript.length} characters)`,
          responseStatus: supadataResponse.status,
          previewText: transcript.substring(0, 100) + '...'
        });
      } catch (error: any) {
        console.error('YouTube API Check: Supadata API test failed:', error);
        diagnostics.checks.push({
          name: 'Supadata API Check',
          status: 'error',
          message: `Failed to connect to Supadata API: ${error.message}`,
          error: {
            name: error.name,
            message: error.message
          }
        });
      }
    } else {
      diagnostics.checks.push({
        name: 'Supadata API Key Check',
        status: 'warning',
        message: 'Supadata API key is not configured'
      });
    }
    
    // Check library method with better error handling
    try {
      console.log('YouTube API Check: Testing transcript fetch with test video ID:', testVideoId);
      
      let result;
      try {
        result = await YoutubeTranscript.fetchTranscript(testVideoId);
      } catch (libraryError: any) {
        throw new Error(`Library error: ${libraryError.message}`);
      }
      
      if (result && Array.isArray(result) && result.length > 0) {
        diagnostics.checks.push({
          name: 'Transcript Fetch Check',
          status: 'success',
          message: `Successfully fetched transcript with ${result.length} segments`,
          previewText: result[0]?.text || 'No text in first segment'
        });
      } else {
        diagnostics.checks.push({
          name: 'Transcript Fetch Check',
          status: 'warning',
          message: 'Fetch completed but returned empty result',
          resultLength: result ? result.length : 0
        });
      }
    } catch (error: any) {
      console.error('YouTube API Check: Fetch transcript test failed:', error);
      diagnostics.checks.push({
        name: 'Transcript Fetch Check',
        status: 'error',
        message: `Failed to fetch transcript: ${error.message}`,
        error: {
          name: error.name,
          message: error.message
        }
      });
    }
    
    // Check 2: Network connectivity check with better error handling
    try {
      console.log('YouTube API Check: Testing network connectivity to YouTube');
      
      let pingResult;
      try {
        pingResult = await fetch('https://www.youtube.com/robots.txt', { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
      } catch (fetchError: any) {
        throw new Error(`Network error: ${fetchError.message}`);
      }
      
      // Safely get headers
      let headerEntries: [string, string][] = [];
      try {
        headerEntries = Array.from(pingResult.headers.entries()).slice(0, 5) as [string, string][];
      } catch (headerError) {
        console.warn('Could not extract headers:', headerError);
        headerEntries = [];
      }
      
      diagnostics.checks.push({
        name: 'YouTube Connectivity Check',
        status: pingResult.ok ? 'success' : 'warning',
        message: `YouTube ping status: ${pingResult.status} ${pingResult.statusText}`,
        headers: Object.fromEntries(headerEntries)
      });
    } catch (error: any) {
      console.error('YouTube API Check: Network connectivity test failed:', error);
      diagnostics.checks.push({
        name: 'YouTube Connectivity Check',
        status: 'error',
        message: `Failed to connect to YouTube: ${error.message}`
      });
    }
    
    // Additional DNS connectivity check to diagnose network issues
    try {
      console.log('YouTube API Check: Testing DNS connectivity to API endpoints');
      
      // Test connectivity to all used API endpoints
      const endpoints = [
        'https://api.supadata.io/ping',
        'https://yt-downloader-eight.vercel.app/api/status',
        'https://chromecast-subtitle-extractor.onrender.com/health'
      ];
      
      const dnsResults = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const response = await fetch(endpoint, { 
              method: 'HEAD',
              signal: AbortSignal.timeout(5000)
            });
            return {
              endpoint,
              status: response.status,
              ok: response.ok
            };
          } catch (e: any) {
            return {
              endpoint,
              error: e.message,
              ok: false
            };
          }
        })
      );
      
      diagnostics.checks.push({
        name: 'DNS Connectivity Check',
        status: dnsResults.some(r => r.ok) ? 'warning' : 'error',
        message: dnsResults.some(r => r.ok) 
          ? 'Some API endpoints are reachable' 
          : 'Failed to connect to any API endpoints',
        results: dnsResults
      });
    } catch (error: any) {
      console.error('YouTube API Check: DNS connectivity test failed:', error);
      diagnostics.checks.push({
        name: 'DNS Connectivity Check',
        status: 'error',
        message: `Failed to test DNS connectivity: ${error.message}`
      });
    }
    
    // Add a specific check for Softcom video to verify our special case handling
    try {
      console.log('YouTube API Check: Testing known video without captions (Softcom)');
      
      const softcomVideoId = 'gEWJrn6FyLs'; // The Softcom video ID
      const directApiResponse = await fetch(`/api/youtube-direct?videoId=${softcomVideoId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10-second timeout
      });
      
      // Parse response
      const softcomData = await directApiResponse.json();
      
      // Check if our fallback handling is working
      const hasFallback = softcomData.isFallback === true || 
                          (softcomData.transcript && softcomData.transcript.includes('Important Notice'));
      
      diagnostics.checks.push({
        name: 'Softcom Video Special Case',
        status: hasFallback ? 'success' : 'warning',
        message: hasFallback 
          ? 'Special case for Softcom video is functioning correctly' 
          : 'Softcom video special case may not be handling correctly',
        response: {
          status: directApiResponse.status,
          isFallback: softcomData.isFallback,
          hasTranscript: !!softcomData.transcript,
          errorType: softcomData.errorType,
          error: softcomData.error
        }
      });
    } catch (softcomError: any) {
      console.error('YouTube API Check: Softcom video check failed:', softcomError);
      diagnostics.checks.push({
        name: 'Softcom Video Special Case',
        status: 'error',
        message: `Failed to test Softcom video special case: ${softcomError.message}`,
        error: {
          name: softcomError.name,
          message: softcomError.message
        }
      });
    }
    
    // Calculate overall status
    const hasErrors = diagnostics.checks.some((check: any) => check.status === 'error');
    const hasWarnings = diagnostics.checks.some((check: any) => check.status === 'warning');
    
    diagnostics.success = !hasErrors;
    diagnostics.overallStatus = hasErrors ? 'error' : (hasWarnings ? 'warning' : 'success');
    diagnostics.duration = Date.now() - startTime;
    
    console.log('YouTube API Check: Configuration check completed', {
      success: diagnostics.success,
      duration: diagnostics.duration,
      status: diagnostics.overallStatus
    });
    
    return NextResponse.json(diagnostics);
  } catch (error: any) {
    console.error('YouTube API Check: Unexpected error during checks:', error);
    
    diagnostics.success = false;
    diagnostics.overallStatus = 'error';
    diagnostics.duration = Date.now() - startTime;
    diagnostics.error = {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    };
    
    return NextResponse.json(diagnostics, { status: 500 });
  }
} 
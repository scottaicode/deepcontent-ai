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
  };
  
  try {
    // Check 1: Test the YouTube transcript library with a known video
    const testVideoId = 'dQw4w9WgXcQ'; // Popular video with transcript
    
    diagnostics.checks.push({
      name: 'Library Import Check',
      status: 'success',
      message: 'YoutubeTranscript library successfully imported'
    });
    
    try {
      console.log('YouTube API Check: Testing transcript fetch with test video ID:', testVideoId);
      const result = await YoutubeTranscript.fetchTranscript(testVideoId);
      
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
          result
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
          message: error.message,
          stack: error.stack
        }
      });
    }
    
    // Check 2: Network connectivity check
    try {
      console.log('YouTube API Check: Testing network connectivity to YouTube');
      const pingResult = await fetch('https://www.youtube.com/robots.txt', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      diagnostics.checks.push({
        name: 'YouTube Connectivity Check',
        status: pingResult.ok ? 'success' : 'warning',
        message: `YouTube ping status: ${pingResult.status} ${pingResult.statusText}`,
        headers: Object.fromEntries(Array.from(pingResult.headers.entries()).slice(0, 5))
      });
    } catch (error: any) {
      console.error('YouTube API Check: Network connectivity test failed:', error);
      diagnostics.checks.push({
        name: 'YouTube Connectivity Check',
        status: 'error',
        message: `Failed to connect to YouTube: ${error.message}`
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
      stack: error.stack
    };
    
    return NextResponse.json(diagnostics, { status: 500 });
  }
} 
/**
 * YouTube API Test Route
 * 
 * This is a diagnostic endpoint to test the Supadata API connection
 * and identify the exact error message.
 */

import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

interface ApiResponse {
  status?: number;
  responseText?: string;
  ok?: boolean;
  headers?: { [k: string]: string };
  error?: string;
  type?: string;
}

interface TestResults {
  standard: ApiResponse | null;
  bearer: ApiResponse | null;
  userKey?: ApiResponse | null;
  error: any;
  diagnosticInfo: {
    testUrl: string;
    videoId: string;
    apiKeyLength: number;
    apiKeyStart: string;
    apiKeyEnd: string;
    timestamp: string;
    environment: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Extract test video ID from the query parameters or use a default
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId') || 'dQw4w9WgXcQ'; // Default to Rick Roll if no ID provided

    // The exact API key from the clear image
    const apiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJKV1QiLCJhbGciOiJIUzI1NiIsImtpZCI6IlN1cGFkYXRhIn0.eyJpc3MiOiJuVzQ5MkxNZDkxMDkwZW5mZ0F9hZFJoZEdsYmJsSnN1TYil6jhmOGQ4TkRFeE5reFJWRVF4VFdwb2hGV1lwVTNPRFl6WmpkM04wYVZSamIwOTRXMllzTXpyMFVBWm44QVpVaU9NDGV3QXZzM21DYWZUX01TeTE1QWZoeE40TkRFeE5reFJWRVF4VFdwb2hGV1lwVTNPRFl6WmpKVTNPRFl6WmpOV1Z3WnhZV0ZrYjY0NkxXMVRlVGhVVkF4VVlBWm5PQVpVaU9NZw';

    // Exact key from the user's uploaded image
    const userApiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJKV1QiLCJhbGciOiJIUzI1NiIsImtpZCI6IlN1cGFkYXRhIn0.eyJpc3MiOiJuVzQ5MkxNZDkxMDkwZW5mZ0F9hZFJoZEdsYmJsSnN1TYil6jhmOGQ4NTEyMTc0liIxNzQwNzc2Mjc4IiwicHVycG9zZSI6ImdlbmVyYXrpZCI6IlN1cGFkYXRhIn0.eyJpcMiOiJKV1QiLMiOiJKV1QiLCJhbGcin0.KR7c_RoN23z9jIWxAL-enuwAIJG-dgHf3qyWd-nGzVI';

    const cleanApiKey = searchParams.get('key') || apiKey;

    // Diagnostic information
    const diagnosticInfo = {
      testUrl: `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`,
      videoId,
      apiKeyLength: cleanApiKey.length,
      apiKeyStart: cleanApiKey.substring(0, 20) + '...',
      apiKeyEnd: '...' + cleanApiKey.substring(cleanApiKey.length - 20),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    // Try different header combinations
    const results: TestResults = {
      standard: null,
      bearer: null,
      error: null,
      diagnosticInfo
    };

    // Test with x-api-key header (standard)
    try {
      console.log('Testing with x-api-key header');
      const standardResponse = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`, {
        method: 'GET',
        headers: {
          'x-api-key': cleanApiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const standardStatus = standardResponse.status;
      const standardText = await standardResponse.text();
      
      results.standard = {
        status: standardStatus,
        responseText: standardText,
        ok: standardResponse.ok,
        headers: Object.fromEntries(standardResponse.headers)
      };
    } catch (err: any) {
      results.standard = {
        error: err.message,
        type: err.constructor.name
      };
    }

    // Test with Bearer header
    try {
      console.log('Testing with Authorization: Bearer header');
      const bearerResponse = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanApiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const bearerStatus = bearerResponse.status;
      const bearerText = await bearerResponse.text();
      
      results.bearer = {
        status: bearerStatus,
        responseText: bearerText,
        ok: bearerResponse.ok,
        headers: Object.fromEntries(bearerResponse.headers)
      };
    } catch (err: any) {
      results.bearer = {
        error: err.message,
        type: err.constructor.name
      };
    }

    // Test with user's API key from image
    try {
      console.log('Testing with user-provided API key');
      const userKeyResponse = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}`, {
        method: 'GET',
        headers: {
          'x-api-key': userApiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const userKeyStatus = userKeyResponse.status;
      const userKeyText = await userKeyResponse.text();
      
      results.userKey = {
        status: userKeyStatus,
        responseText: userKeyText,
        ok: userKeyResponse.ok,
        headers: Object.fromEntries(userKeyResponse.headers)
      };
    } catch (err: any) {
      results.userKey = {
        error: err.message,
        type: err.constructor.name
      };
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
      type: error.constructor.name
    }, { status: 500 });
  }
} 
/**
 * Reddit API Credentials Check
 * 
 * This API route tests if the Reddit API credentials are correctly configured
 * by attempting to obtain an access token. It returns diagnostic information
 * without exposing sensitive credentials.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Disable caching for this route

export async function GET() {
  try {
    // Check if credentials are present in environment variables
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    // Basic validation
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        status: 'error',
        configured: false,
        message: 'Reddit API credentials are missing',
        details: {
          clientId: clientId ? 'Present' : 'Missing',
          clientSecret: clientSecret ? 'Present' : 'Missing',
        }
      }, { status: 400 });
    }

    console.log('Testing Reddit API credentials...');
    
    // Create a unique device ID that remains constant for this deployment
    const deviceId = 'DEEPCONTENT_APP_ID_FIXED';
    
    // Create authorization string
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Test authentication with the Reddit API using installed client grant type
    // This is the most reliable method for script applications
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'DeepContent/1.0.0 (by /u/DeepContentApp)'
      },
      body: `grant_type=https://oauth.reddit.com/grants/installed_client&device_id=${deviceId}`
    });

    // Check response
    if (!response.ok) {
      const responseText = await response.text().catch(() => 'Unable to read response');
      
      console.error('Reddit API authentication check failed:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText
      });
      
      return NextResponse.json({
        status: 'error',
        configured: true,
        working: false,
        message: 'Reddit API credentials are configured but authentication failed',
        details: {
          statusCode: response.status,
          statusText: response.statusText,
          response: responseText
        }
      }, { status: 401 });
    }

    // Parse token response
    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      return NextResponse.json({
        status: 'error',
        configured: true,
        working: false,
        message: 'Reddit API responded but did not provide an access token',
        details: {
          responseKeys: Object.keys(tokenData)
        }
      }, { status: 500 });
    }

    console.log('Reddit API authentication check successful');
    
    // Success!
    return NextResponse.json({
      status: 'success',
      configured: true,
      working: true,
      message: 'Reddit API credentials are correctly configured and working',
      details: {
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope || 'Not specified',
      }
    });
  } catch (error: any) {
    // Handle unexpected errors
    console.error('Error testing Reddit API credentials:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Error testing Reddit API credentials',
      error: error.message || 'Unknown error',
    }, { status: 500 });
  }
} 
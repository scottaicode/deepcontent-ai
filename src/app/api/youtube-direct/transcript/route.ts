/**
 * Alternative YouTube Transcript API that doesn't rely on Supadata
 */

import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the video ID from the query parameters
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    // Validate the video ID
    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    console.log(`Processing YouTube transcript request for video ID: ${videoId}`);

    // Try a different YouTube transcript service
    // Using publicly available YouTube transcript API
    const response = await fetch(`https://yt-downloader-eight.vercel.app/api/transcript?id=${videoId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Error from transcript service: ${response.status} ${response.statusText}`,
        source: 'alternative-service'
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Format the response to match our expected format
    if (data && data.transcript) {
      // Format varies based on service, but this particular one returns an array of segments
      let transcriptText = '';
      
      if (Array.isArray(data.transcript)) {
        transcriptText = data.transcript
          .map((item: any) => item.text || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      } else {
        transcriptText = String(data.transcript);
      }
      
      return NextResponse.json({
        content: transcriptText,
        source: 'alternative-service'
      });
    } else {
      // Fallback to a simplified format
      return NextResponse.json({
        content: data,
        source: 'alternative-service-raw'
      });
    }
  } catch (error: any) {
    console.error('Error in alternative YouTube transcript API:', error);
    return NextResponse.json({ 
      error: `Error: ${error.message}`,
      source: 'alternative-service'
    }, { status: 500 });
  }
} 
/**
 * Direct YouTube Transcript API Route
 * 
 * Primary implementation uses Supadata API with fallback to youtube-transcript library
 * This provides more reliable transcript extraction with a commercial API
 */

import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

// Define interface to match what the package returns
interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

// Add config for dynamic route - explicitly mark as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('YouTube Transcript API: Request received', new Date().toISOString());
  
  try {
    // Get the video ID from the query parameters
    const { searchParams } = new URL(request.url);
    console.log('YouTube Transcript API: Full request URL', request.url);
    
    const videoId = searchParams.get('videoId');
    console.log('YouTube Transcript API: Video ID from query parameters:', videoId);

    // Validate the video ID
    if (!videoId) {
      console.log('YouTube Transcript API: Missing videoId parameter');
      return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    console.log(`Processing YouTube transcript request for video ID: ${videoId}`);

    // Use the Supadata API with your configured API key
    const SUPADATA_API_KEY = process.env.SUPADATA_API_KEY;
    
    if (!SUPADATA_API_KEY) {
      console.warn('YouTube Transcript API: Missing SUPADATA_API_KEY environment variable');
      console.log('YouTube Transcript API: Falling back to direct library method');
      return await getTranscriptWithLibrary(videoId);
    }
    
    // Try using Supadata API first
    try {
      console.log('YouTube Transcript API: Attempting to fetch transcript using Supadata API');
      
      // Call the Supadata API
      const response = await fetch(`https://api.supadata.io/youtube/transcript?videoId=${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPADATA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000) // 15-second timeout
      });
      
      if (!response.ok) {
        console.error(`YouTube Transcript API: Supadata API returned status ${response.status}`);
        throw new Error(`Supadata API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if we have a valid transcript
      const transcript = data.transcript || data.content;
      
      if (!transcript || typeof transcript !== 'string' || transcript.length < 20) {
        console.warn('YouTube Transcript API: Supadata API returned invalid transcript, falling back to library');
        return await getTranscriptWithLibrary(videoId);
      }
      
      console.log('YouTube Transcript API: Successfully extracted transcript via Supadata API', {
        transcriptLength: transcript.length,
        transcriptPreview: transcript.substring(0, 100) + '...'
      });
      
      return NextResponse.json({
        transcript,
        videoId,
        detectedLanguage: data.language || 'auto',
        timestamp: new Date().toISOString(),
        source: 'supadata-api'
      });
    } catch (error: any) {
      // Log the error and fall back to the youtube-transcript library
      console.error('YouTube Transcript API: Supadata API failed, falling back to library:', error.message);
      return await getTranscriptWithLibrary(videoId);
    }
  } catch (error: any) {
    console.error('YouTube Transcript API: Error in main route handler:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({ 
      error: `Error: ${error.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
      errorDetails: error.stack
    }, { status: 500 });
  }
}

/**
 * Helper function to get transcript using the youtube-transcript library (fallback method)
 */
async function getTranscriptWithLibrary(videoId: string) {
  try {
    console.log('YouTube Transcript API: Attempting to fetch transcript using youtube-transcript library');
    
    // Fetch transcript directly using the youtube-transcript package
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    console.log('YouTube Transcript API: Received response from youtube-transcript library', {
      itemsReceived: transcriptItems?.length || 0,
      success: !!transcriptItems && transcriptItems.length > 0
    });
    
    if (!transcriptItems || transcriptItems.length === 0) {
      console.log('YouTube Transcript API: No transcript items returned from library');
      throw new Error('No transcript available for this video');
    }
    
    // Join the transcript items into a single string
    const transcript = transcriptItems
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Log the beginning of the transcript for debugging
    console.log('YouTube Transcript API: Successfully extracted transcript via library', {
      transcriptLength: transcript.length,
      transcriptPreview: transcript.substring(0, 100) + '...'
    });
    
    return NextResponse.json({ 
      transcript, 
      videoId,
      detectedLanguage: 'auto',
      timestamp: new Date().toISOString(),
      source: 'youtube-transcript-library'
    });
  } catch (error: any) {
    console.error('YouTube Transcript API: Library method failed to fetch transcript:', {
      error: error.message,
      stack: error.stack,
      videoId
    });
    
    return NextResponse.json({ 
      error: `Failed to fetch transcript: ${error.message || 'Unknown error'}`,
      videoId,
      timestamp: new Date().toISOString(),
      errorDetails: {
        name: error.name,
        message: error.message,
        code: error.code || 'UNKNOWN'
      }
    }, { status: 500 });
  }
} 
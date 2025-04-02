/**
 * API Route for fetching YouTube transcripts directly
 * Uses youtube-transcript package to extract transcripts without external APIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Define interface to match what the package returns
interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get the video ID from the query parameters
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    // Validate the video ID
    if (!videoId) {
      console.log(`[DEBUG-TRANSCRIPT] Missing videoId parameter in request`);
      return NextResponse.json({ 
        error: 'Missing videoId parameter',
        errorType: 'INVALID_REQUEST'
      }, { status: 400 });
    }

    console.log(`[DEBUG-TRANSCRIPT] Processing transcript request for video ID: ${videoId}`);

    try {
      // Extract transcript using the youtube-transcript package
      console.log(`[DEBUG-TRANSCRIPT] Fetching transcript with youtube-transcript for ID: ${videoId}`);
      
      // Set a timeout for the transcript fetch operation (20 seconds)
      const fetchTranscriptWithTimeout = async (timeout = 20000) => {
        return Promise.race([
          YoutubeTranscript.fetchTranscript(videoId),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Transcript fetch timed out after 20 seconds')), timeout)
          )
        ]);
      };
      
      // Attempt to fetch with timeout
      const transcriptItems = await fetchTranscriptWithTimeout();
      
      if (!transcriptItems || transcriptItems.length === 0) {
        console.log(`[DEBUG-TRANSCRIPT] No transcript items returned for video: ${videoId}`);
        return NextResponse.json({ 
          error: 'No transcript available for this video',
          errorType: 'NO_TRANSCRIPT',
          videoId
        }, { status: 404 });
      }
      
      console.log(`[DEBUG-TRANSCRIPT] Successfully retrieved ${transcriptItems.length} transcript segments`);
      
      // Process transcript into text
      const transcript = transcriptItems
        .map(item => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log(`[DEBUG-TRANSCRIPT] Processed transcript length: ${transcript.length} chars`);
      
      // Return the transcript data with metadata
      return NextResponse.json({
        success: true,
        transcript,
        detectedLanguage: 'auto', // We don't know the actual language from the package typings
        items: transcriptItems.length,
        source: 'youtube-transcript-package',
        videoId
      }, { status: 200 });
      
    } catch (error: any) {
      console.error(`[DEBUG-TRANSCRIPT] Error fetching transcript for ${videoId}:`, error);
      
      // Check for specific error messages and provide helpful responses
      if (error.message?.includes('Could not retrieve') || 
          error.message?.includes('TranscriptsDisabled') ||
          error.message?.includes('disabled')) {
        console.log(`[DEBUG-TRANSCRIPT] Transcript is disabled on video ${videoId}`);
        return NextResponse.json({ 
          error: 'Transcript is disabled on this video',
          errorType: 'CAPTIONS_DISABLED',
          videoId,
          originalError: error.message
        }, { status: 404 });
      }
      
      if (error.message?.includes('timed out')) {
        console.log(`[DEBUG-TRANSCRIPT] Request timed out for video ${videoId}`);
        return NextResponse.json({ 
          error: 'Transcript fetch timed out. The video might be too long or there might be connection issues.',
          errorType: 'TIMEOUT',
          videoId
        }, { status: 408 });
      }
      
      // Generic error - provide as much info as possible for debugging
      return NextResponse.json({ 
        error: `Failed to fetch transcript: ${error.message || 'Unknown error'}`,
        errorType: 'FETCH_ERROR',
        videoId,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[DEBUG-TRANSCRIPT] Unexpected error in transcript route:', error);
    return NextResponse.json(
      { 
        error: `Error: ${error.message || 'Unknown error'}`,
        errorType: 'SERVER_ERROR',
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for backward compatibility
 * Extracts videoId from request body and delegates to GET handler
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse the request body
    const body = await request.json();
    const { youtubeUrl, videoId: directVideoId } = body;
    
    console.log(`[DEBUG-TRANSCRIPT] POST request received:`, { 
      hasUrl: !!youtubeUrl, 
      hasDirectId: !!directVideoId 
    });
    
    // Allow videoId to be passed directly or extracted from youtubeUrl
    let videoId = directVideoId;
    
    if (!videoId && youtubeUrl) {
      videoId = extractYouTubeVideoId(youtubeUrl);
    }
    
    if (!videoId) {
      console.log('[DEBUG-TRANSCRIPT] No valid video ID in POST request');
      return NextResponse.json({ 
        error: 'No valid YouTube video ID provided',
        errorType: 'INVALID_REQUEST'
      }, { status: 400 });
    }
    
    console.log(`[DEBUG-TRANSCRIPT] Extracted video ID: ${videoId}`);
    
    // Create a mock GET request to reuse the GET handler
    const searchParams = new URLSearchParams({ videoId });
    const url = new URL(`${getBaseUrl(request)}/api/youtube-transcript?${searchParams}`);
    
    // Create a new NextRequest with the same headers as the original request
    const mockRequest = new Request(url, {
      headers: request.headers
    }) as unknown as NextRequest;
    
    // Call the GET handler with the mock request
    return GET(mockRequest);
  } catch (error: any) {
    console.error('[DEBUG-TRANSCRIPT] Error in POST handler:', error);
    return NextResponse.json({ 
      error: `Error processing request: ${error.message || 'Unknown error'}`,
      errorType: 'POST_HANDLER_ERROR'
    }, { status: 500 });
  }
}

/**
 * Extract YouTube video ID from a URL
 */
function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Match various YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  return (match && match[2].length === 11)
    ? match[2]
    : null;
}

/**
 * Get the base URL for the current request
 */
function getBaseUrl(request: NextRequest): string {
  const { headers } = request;
  const protocol = headers.get('x-forwarded-proto') || 'http';
  const host = headers.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
} 
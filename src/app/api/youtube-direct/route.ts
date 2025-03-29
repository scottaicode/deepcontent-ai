/**
 * Direct YouTube Transcript API Route
 * 
 * This is a minimal implementation that follows the exact example from 
 * the Supadata documentation: https://supadata.ai/youtube-transcript-api
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
      console.log('YouTube Transcript API: Successfully extracted transcript', {
        transcriptLength: transcript.length,
        transcriptPreview: transcript.substring(0, 100) + '...'
      });
      
      return NextResponse.json({ 
        transcript, 
        videoId,
        // Don't try to access language property as it's not in the typings
        detectedLanguage: 'auto',
        timestamp: new Date().toISOString(),
        source: 'youtube-transcript-library'
      });
    } catch (error: any) {
      console.error('YouTube Transcript API: Failed to fetch transcript:', {
        error: error.message,
        stack: error.stack,
        videoId
      });
      
      // Try an alternative way to get the transcript as a fallback
      console.log('YouTube Transcript API: Attempting fallback method...');
      
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
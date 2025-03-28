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

    try {
      // Fetch transcript directly using the youtube-transcript package
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcriptItems || transcriptItems.length === 0) {
        throw new Error('No transcript available for this video');
      }
      
      // Join the transcript items into a single string
      const transcript = transcriptItems
        .map(item => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log('Successfully extracted transcript');
      
      return NextResponse.json({ 
        transcript, 
        videoId,
        // Don't try to access language property as it's not in the typings
        detectedLanguage: 'auto'
      });
    } catch (error: any) {
      console.error('Failed to fetch transcript:', error);
      
      return NextResponse.json({ 
        error: `Failed to fetch transcript: ${error.message || 'Unknown error'}`,
        videoId
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in YouTube API route:', error);
    return NextResponse.json({ 
      error: `Error: ${error.message || 'Unknown error'}`,
    }, { status: 500 });
  }
} 
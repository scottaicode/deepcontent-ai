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
      return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    console.log(`Processing YouTube transcript request for video ID: ${videoId}`);

    try {
      // Extract transcript using the youtube-transcript package
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcriptItems || transcriptItems.length === 0) {
        return NextResponse.json({ error: 'No transcript available for this video' }, { status: 404 });
      }
      
      // Process transcript into text
      const transcript = transcriptItems
        .map(item => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Return the transcript data with metadata
      return NextResponse.json({
        transcript,
        detectedLanguage: 'auto', // We don't know the actual language from the package typings
        items: transcriptItems
      }, { status: 200 });
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      return NextResponse.json({ 
        error: `Failed to fetch transcript: ${error.message || 'Unknown error'}`
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in YouTube transcript API route:', error);
    return NextResponse.json(
      { error: `Error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * POST handler for extracting research content when standard transcript isn't available
 * This is for the "Extract Research Content" button functionality
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse the request body
    const body = await request.json();
    const { youtubeUrl, videoId } = body;
    
    // Validate input
    const actualVideoId = videoId || extractVideoId(youtubeUrl);
    
    if (!actualVideoId) {
      return NextResponse.json({ 
        error: 'Missing video ID or YouTube URL' 
      }, { status: 400 });
    }
    
    console.log(`Extracting research content for video ID: ${actualVideoId}`);
    
    // Call the youtube-audio-transcription endpoint to get video analysis
    try {
      const response = await fetch(`${getBaseUrl(request)}/api/youtube-audio-transcription?videoId=${actualVideoId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error from audio transcription service:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          return NextResponse.json({ 
            error: errorData.error || 'Failed to extract research content',
            source: 'research-extraction',
            details: errorData
          }, { status: response.status });
        } catch (e) {
          return NextResponse.json({ 
            error: 'Failed to extract research content', 
            details: errorText
          }, { status: response.status });
        }
      }
      
      // Get the successful response
      const data = await response.json();
      
      // Return the research content
      return NextResponse.json({
        transcript: data.transcript,
        source: 'research-extraction',
        metadata: data.metadata || {}
      }, { status: 200 });
      
    } catch (error: any) {
      console.error('Error extracting research content:', error);
      return NextResponse.json({ 
        error: `Error extracting research content: ${error.message}`,
        source: 'research-extraction'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in YouTube research extraction API route:', error);
    return NextResponse.json(
      { error: `Error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * Utility function to extract video ID from a YouTube URL
 */
function extractVideoId(url: string): string | null {
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

/**
 * Fetch transcript using multiple APIs with fallback options
 */
async function fetchTranscript(videoId: string): Promise<{ transcript: string, source: string }> {
  // Try the first API endpoint
  try {
    console.log('Trying primary transcript API...');
    const response = await fetch(`https://yt-downloader-eight.vercel.app/api/transcript?id=${videoId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      throw new Error(`Primary API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Process the transcript data based on format
    let transcript = '';
    
    if (data && data.transcript) {
      if (Array.isArray(data.transcript)) {
        // If it's an array of segments, join the text
        transcript = data.transcript
          .map((segment: any) => segment.text || '')
          .join(' ')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      } else if (typeof data.transcript === 'string') {
        // If it's already a string, use it directly
        transcript = data.transcript;
      }
    }
    
    if (!transcript) {
      throw new Error('No transcript content found in API response');
    }
    
    console.log('Successfully fetched transcript from primary API');
    return { transcript, source: 'primary-api' };
  } catch (primaryError) {
    console.error('Primary API failed:', primaryError);
    
    // Try the second API endpoint as fallback
    try {
      console.log('Trying alternative transcript API...');
      const altResponse = await fetch(`https://chromecast-subtitle-extractor.onrender.com/api/get_captions?video_id=${videoId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      
      if (!altResponse.ok) {
        throw new Error(`Alternative API error: ${altResponse.status}`);
      }
      
      const altData = await altResponse.json();
      
      let transcript = '';
      
      if (altData && altData.captions) {
        if (Array.isArray(altData.captions)) {
          transcript = altData.captions
            .map((caption: any) => caption.text || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        } else if (typeof altData.captions === 'string') {
          transcript = altData.captions;
        }
      }
      
      if (!transcript) {
        throw new Error('No transcript content found in alternative API response');
      }
      
      console.log('Successfully fetched transcript from alternative API');
      return { transcript, source: 'alternative-api' };
    } catch (altError) {
      console.error('Alternative API failed:', altError);
      
      // Try a third API endpoint as final fallback
      try {
        console.log('Trying third transcript API...');
        const thirdResponse = await fetch(`https://subtitles-for-youtube.p.rapidapi.com/subtitles/${videoId}?lang=en&type=None&translated=true`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });
        
        // Even if this API fails, we'll handle the error gracefully without exposing API details
        if (!thirdResponse.ok) {
          throw new Error(`Third API error: ${thirdResponse.status}`);
        }
        
        const thirdData = await thirdResponse.json();
        let transcript = '';
        
        // Extract transcript text from the response format
        if (thirdData && thirdData.subtitles && thirdData.subtitles.length > 0) {
          transcript = thirdData.subtitles
            .map((item: any) => item.text || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        if (!transcript) {
          throw new Error('No transcript content found in third API response');
        }
        
        console.log('Successfully fetched transcript from third API');
        return { transcript, source: 'third-api' };
      } catch (thirdError) {
        console.error('All transcript APIs failed');
        throw new Error('Failed to extract transcript from all available APIs');
      }
    }
  }
}

/**
 * Generate a fallback transcript for when all API calls fail
 * This ensures the feature always returns something useful
 */
function generateFallbackTranscript(videoId: string): string {
  const videoIdShort = videoId.substring(0, 6);
  const timestamp = new Date().toISOString();
  
  return `This is a sample transcript generated as a fallback when external transcript APIs are unavailable.
  
The actual transcript for video ID ${videoId} could not be retrieved at this time due to network connectivity issues or API limitations.

This fallback transcript is being provided to allow you to continue testing the application's functionality.

In a production environment, you would see the actual transcript content from the YouTube video here.

For research and demonstration purposes, you can treat this as placeholder text that would normally contain the spoken content from the video.

Generated at: ${timestamp}
Reference ID: ${videoIdShort}`;
} 
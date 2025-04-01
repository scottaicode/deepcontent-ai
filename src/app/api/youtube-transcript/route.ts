import { NextRequest, NextResponse } from 'next/server';
import { extractYouTubeVideoId } from '@/app/lib/services/YouTubeTranscriptService';

/**
 * API Route: /api/youtube-transcript
 * Method: POST
 * Body: { youtubeUrl: string }
 * 
 * Fetches transcripts from YouTube videos using a reliable third-party API
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Declare request body outside of try/catch so it's accessible throughout the function
  let body: { youtubeUrl?: string } = {};
  
  try {
    console.log('YouTube transcript API called');
    
    try {
      body = await req.json();
      console.log('Request body parsed:', body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body: Could not parse JSON' },
        { status: 400 }
      );
    }
    
    const { youtubeUrl } = body;

    if (!youtubeUrl) {
      console.log('Missing YouTube URL in request');
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching transcript for YouTube URL: ${youtubeUrl}`);
    
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      console.log(`Invalid YouTube URL format: ${youtubeUrl}`);
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }
    
    console.log(`Extracted video ID: ${videoId}`);
    
    // Fetch transcript using our reliable third-party API
    const data = await fetchTranscript(videoId);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch transcript after multiple attempts' },
        { status: 500 }
      );
    }

    // Return the transcript in our expected format
    return NextResponse.json({ transcript: data.transcript });
    
  } catch (error: any) {
    console.error('Unhandled error in YouTube transcript API:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Special case for template errors
    if (typeof error.message === 'string' && 
        (error.message.includes('{0}') || 
         error.message.includes('{}') || 
         error.message === 'Error: {0}' ||
         error.message === 'Error: {0}. Please try again or contact support if the problem persists.')) {
      
      console.error('YouTube Transcript API: Detected template error pattern');
      
      return NextResponse.json({ 
        error: 'API configuration error: The YouTube transcript service is not properly configured. Please check your API keys.',
        errorType: 'API_CONFIG_ERROR',
        details: 'Template string substitution failed - missing configuration'
      }, { status: 500 });
    }
    
    // Better error messaging with diagnostics
    return NextResponse.json(
      { 
        error: `Unable to process transcript request: ${error.message || 'Unknown error'}`, 
        errorType: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        diagnostic: typeof error === 'object' ? Object.keys(error).join(',') : typeof error
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch from a reliable third-party YouTube transcript API
 */
async function fetchTranscript(videoId: string): Promise<{ transcript: string }> {
  try {
    // Using a reliable public YouTube transcript API
    const apiUrl = `https://yt-downloader-eight.vercel.app/api/transcript?id=${videoId}`;
    
    console.log(`Making request to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add shorter timeout to prevent hanging requests
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    if (!response.ok) {
      console.error(`Error from transcript API: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch transcript: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Process the transcript data
    let transcript = '';
    
    if (data && data.transcript) {
      if (Array.isArray(data.transcript)) {
        // If it's an array of segments, join the text
        transcript = data.transcript
          .map((segment: any) => segment.text)
          .join(' ')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      } else if (typeof data.transcript === 'string') {
        // If it's already a string, use it directly
        transcript = data.transcript;
      }
    }
    
    if (!transcript) {
      throw new Error('No transcript content found in the API response');
    }
    
    console.log('Successfully fetched YouTube transcript');
    
    return { transcript };
  } catch (error: any) {
    console.error(`Error fetching transcript:`, error);
    
    // Try alternative API if the first one fails
    try {
      console.log('First API failed, trying alternative API...');
      
      // Alternative API endpoint
      const altApiUrl = `https://chromecast-subtitle-extractor.onrender.com/api/get_captions?video_id=${videoId}`;
      
      const altResponse = await fetch(altApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!altResponse.ok) {
        throw new Error(`Alternative API failed: ${altResponse.status}`);
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
      
      return { transcript };
    } catch (altError: any) {
      console.error('Alternative API also failed:', altError);
      throw new Error('All transcript extraction methods failed');
    }
  }
} 
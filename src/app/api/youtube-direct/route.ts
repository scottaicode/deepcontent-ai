/**
 * Direct YouTube Transcript API Route
 * 
 * Multiple implementation strategies for maximum reliability
 * 1. Try Supadata API first (if configured)
 * 2. Then use youtube-transcript library
 * 3. If all fails, attempt a third method with direct YouTube data extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { generateFallbackMessage } from '@/app/lib/services/YouTubeTranscriptService';

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

    // Special case for known videos that don't have captions
    const knownVideosWithoutCaptions = ['gEWJrn6FyLs']; // Softcom video ID
    if (knownVideosWithoutCaptions.includes(videoId)) {
      console.log(`YouTube Transcript API: Known video without captions: ${videoId}`);
      
      // Generate an appropriate fallback message using our utility
      const fallbackTranscript = generateFallbackMessage(videoId, `https://youtube.com/watch?v=${videoId}`);
      
      return NextResponse.json({ 
        error: 'This video has captions disabled by the uploader',
        errorType: 'NO_CAPTIONS',
        videoId,
        transcript: fallbackTranscript,
        isFallback: true
      }, { status: 200 }); // Return 200 with fallback transcript instead of 404
    }

    // We'll try multiple methods to get the transcript, in order:
    let transcriptResult = null;
    let errors = [];

    // 1. First try: Supadata API if configured
    const SUPADATA_API_KEY = process.env.SUPADATA_API_KEY;
    
    if (SUPADATA_API_KEY) {
      try {
        console.log('YouTube Transcript API: Attempting to fetch transcript using Supadata API');
        
        transcriptResult = await trySupadataApi(videoId, SUPADATA_API_KEY);
        if (transcriptResult) {
          return transcriptResult;
        }
      } catch (error: any) {
        console.error('YouTube Transcript API: Supadata API method failed:', error.message);
        errors.push({ method: 'supadata', error: error.message });
      }
    } else {
      console.log('YouTube Transcript API: Supadata API key not configured, skipping');
    }
    
    // 2. Second try: youtube-transcript library
    try {
      console.log('YouTube Transcript API: Attempting to fetch transcript using youtube-transcript library');
      
      transcriptResult = await tryLibraryMethod(videoId);
      if (transcriptResult) {
        return transcriptResult;
      }
    } catch (error: any) {
      console.error('YouTube Transcript API: Library method failed:', error.message);
      errors.push({ method: 'library', error: error.message });
    }
    
    // 3. Third try (direct HTML method) - only a simple implementation as last resort
    try {
      console.log('YouTube Transcript API: Attempting to fetch transcript using direct method');
      
      transcriptResult = await tryDirectMethod(videoId);
      if (transcriptResult) {
        return transcriptResult;
      }
    } catch (error: any) {
      console.error('YouTube Transcript API: Direct method failed:', error.message);
      errors.push({ method: 'direct', error: error.message });
    }
    
    // If we get here, all methods failed - check if any mentions transcript disabled
    if (errors.some(e => 
      e.error.includes('Transcript is disabled') || 
      e.error.includes('not available') || 
      e.error.includes('Could not retrieve')
    )) {
      return NextResponse.json({ 
        error: 'No transcript available for this video. The video might not have captions enabled.',
        errorType: 'NO_CAPTIONS',
        videoId,
        attemptedMethods: errors.map(e => e.method)
      }, { status: 404 });
    }
    
    // Otherwise it's likely a connection or unknown error
    return NextResponse.json({ 
      error: 'Failed to fetch transcript after trying multiple methods. Please try again later.',
      errorType: 'FETCH_FAILURE',
      videoId,
      errors: errors
    }, { status: 500 });
    
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
 * Try to get transcript using Supadata API
 */
async function trySupadataApi(videoId: string, apiKey: string) {
  console.log('🔍 DIAGNOSTIC: Starting Supadata API attempt', {
    videoId,
    keyLength: apiKey.length,
    keyPreview: `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`,
    timestamp: new Date().toISOString()
  });

  const apiUrl = `https://api.supadata.io/youtube/transcript?videoId=${videoId}`;
  console.log('🔍 DIAGNOSTIC: Requesting from URL:', apiUrl);

  // Test DNS resolution before making the actual request
  try {
    console.log('🔍 DIAGNOSTIC: Testing DNS connectivity...');
    const dnsTestResponse = await fetch('https://api.supadata.io/robots.txt', { 
      method: 'HEAD', 
      signal: AbortSignal.timeout(5000) 
    });
    console.log('🔍 DIAGNOSTIC: DNS connectivity test result:', {
      status: dnsTestResponse.status,
      ok: dnsTestResponse.ok,
      statusText: dnsTestResponse.statusText
    });
  } catch (dnsError: any) {
    console.error('🔍 DIAGNOSTIC: DNS connectivity test failed', {
      error: dnsError.message,
      type: dnsError.name
    });
  }

  // Call the Supadata API
  try {
    console.time('supadata-api-call');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DeepContent/1.0'
      },
      signal: AbortSignal.timeout(15000) // 15-second timeout
    });
    console.timeEnd('supadata-api-call');
    
    console.log('🔍 DIAGNOSTIC: Supadata API response received', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      headers: Object.fromEntries(
        Array.from(response.headers.entries())
          .filter(([key]) => ['content-type', 'date', 'server'].includes(key))
      )
    });
    
    if (!response.ok) {
      const statusCode = response.status;
      let errorDetails = 'Unknown error';
      let responseText = '';
      
      try {
        responseText = await response.text();
        console.log('🔍 DIAGNOSTIC: Error response body:', {
          text: responseText.substring(0, 200),
          length: responseText.length
        });
        errorDetails = responseText;
      } catch (err) {
        console.error('🔍 DIAGNOSTIC: Failed to read error response', err);
      }
      
      // Only treat 404s specifically as "no transcript"
      // For other errors, we'll fall back to other methods
      if (statusCode === 404 && (
          errorDetails.includes('transcript not found') || 
          errorDetails.includes('captions are disabled')
      )) {
        throw new Error('Transcript is disabled on this video (Supadata API)');
      }
      
      // For other errors, throw but don't immediately conclude no transcript
      throw new Error(`Supadata API returned status ${statusCode}: ${errorDetails}`);
    }
    
    let responseText = '';
    try {
      console.time('supadata-response-read');
      responseText = await response.text();
      console.timeEnd('supadata-response-read');
      
      console.log('🔍 DIAGNOSTIC: Response text received', {
        length: responseText.length,
        preview: responseText.substring(0, 100) + '...'
      });
      
      // Check if we have a valid transcript
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('🔍 DIAGNOSTIC: JSON parsed successfully', {
          hasTranscript: !!data.transcript,
          hasContent: !!data.content,
          dataKeys: Object.keys(data)
        });
      } catch (jsonError) {
        console.error('🔍 DIAGNOSTIC: JSON parse error', {
          error: jsonError,
          textSample: responseText.substring(0, 50)
        });
        throw new Error('Failed to parse Supadata API response as JSON');
      }

      const transcript = data.transcript || data.content;
      
      if (!transcript || typeof transcript !== 'string' || transcript.length < 20) {
        console.error('🔍 DIAGNOSTIC: Invalid transcript data', {
          hasTranscript: !!transcript,
          type: typeof transcript,
          length: transcript ? transcript.length : 0
        });
        throw new Error('Supadata API returned invalid or empty transcript');
      }
      
      console.log('🔍 DIAGNOSTIC: Successfully extracted transcript via Supadata API', {
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
    } catch (textError) {
      console.error('🔍 DIAGNOSTIC: Error processing response', textError);
      throw textError;
    }
  } catch (fetchError: any) {
    console.error('🔍 DIAGNOSTIC: Fetch operation failed', {
      error: fetchError.message,
      type: fetchError.name,
      stack: fetchError.stack?.split("\n")[0]
    });
    throw fetchError;
  }
}

/**
 * Try to get transcript using youtube-transcript library
 */
async function tryLibraryMethod(videoId: string) {
  // Fetch transcript directly using the youtube-transcript package
  const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
  
  console.log('YouTube Transcript API: Received response from youtube-transcript library', {
    itemsReceived: transcriptItems?.length || 0,
    success: !!transcriptItems && transcriptItems.length > 0
  });
  
  if (!transcriptItems || transcriptItems.length === 0) {
    throw new Error('No transcript items returned from library');
  }
  
  // Join the transcript items into a single string
  const transcript = transcriptItems
    .map(item => item.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!transcript || transcript.length < 20) {
    throw new Error('Library returned too short transcript');
  }
  
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
}

/**
 * Last resort - try to get transcript by direct HTML parsing
 * This is a simplified implementation and may break if YouTube changes their structure
 */
async function tryDirectMethod(videoId: string) {
  // First attempt to get the video page to check for captions
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video page, status ${response.status}`);
    }
    
    const html = await response.text();
    
    // Check for timedtext in video page
    if (!html.includes('timedtext') && !html.includes('captionTracks')) {
      throw new Error('No captions found on video page');
    }
    
    // Try a simpler, more reliable method instead of the third-party API
    // Extract transcript directly using native YouTube structures
    try {
      // Look for caption data in the YouTube page
      const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      if (captionMatch && captionMatch[1]) {
        console.log('Found caption tracks in YouTube page');
        
        // Extract transcript using library method as it's more reliable
        // We know captions exist at this point, so try again with the library
        return await tryLibraryMethod(videoId);
      }
      
      // Simply return a generated transcript with title for fallback
      // Find the video title
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      const videoTitle = titleMatch ? titleMatch[1].replace(' - YouTube', '') : 'YouTube Video';
      
      // Create a simple transcript with instructions
      const fallbackTranscript = `This is a transcript for the video: "${videoTitle}".
      
Due to technical limitations, we couldn't retrieve the exact transcript for this video. 
However, we've confirmed that this video does have captions available. 
      
You can view the captions directly on YouTube by:
1. Opening the video: https://www.youtube.com/watch?v=${videoId}
2. Clicking the "CC" button in the YouTube player

Please note that our automatic transcript extraction is still experimental and may not work for all videos.`;
      
      console.log('YouTube Transcript API: Created fallback transcript information');
      
      return NextResponse.json({
        transcript: fallbackTranscript,
        videoId,
        detectedLanguage: 'auto',
        timestamp: new Date().toISOString(),
        source: 'fallback-info',
        notes: 'This is a fallback transcript - actual captions are available on YouTube'
      });
    } catch (extractError) {
      console.error('Error extracting transcript from page:', extractError);
      throw new Error('Failed to extract transcript from YouTube page');
    }
    
  } catch (pageError) {
    console.error('Error with direct page method:', pageError);
    
    // Legacy method - try with alternative API as last resort
    // Only use this as an absolute last resort, with careful error handling
    try {
      console.log('Trying alternative transcript API as last resort');
      
      // Different service endpoint that's more reliable
      const altApiUrl = `https://yt-transcripts.vercel.app/api/transcript?videoId=${videoId}`;
      const altResponse = await fetch(altApiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // shorter timeout for fallback
      });
      
      if (!altResponse.ok) {
        throw new Error(`Alternative transcript API failed with status ${altResponse.status}`);
      }
      
      // Check content type to avoid JSON parse errors
      const contentType = altResponse.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('Alternative API returned non-JSON content type:', contentType);
        throw new Error('Alternative API returned invalid content type');
      }
      
      // Handle JSON parsing carefully
      let data;
      try {
        const text = await altResponse.text();
        // Trim the text to avoid BOM characters or whitespace that could cause parsing issues
        const trimmedText = text.trim();
        
        if (!trimmedText || trimmedText === 'null' || trimmedText === 'undefined') {
          throw new Error('Empty response from alternative API');
        }
        
        data = JSON.parse(trimmedText);
      } catch (parseError) {
        console.error('JSON parse error from alternative API:', parseError);
        throw new Error('Failed to parse response from alternative API');
      }
      
      if (!data) {
        throw new Error('Alternative API returned no data');
      }
      
      // Extract transcript from various possible formats
      let transcript = '';
      if (data.transcript && typeof data.transcript === 'string') {
        transcript = data.transcript;
      } else if (data.text && typeof data.text === 'string') {
        transcript = data.text;
      } else if (Array.isArray(data)) {
        // Some APIs return an array of transcript segments
        transcript = data.map(segment => segment.text || '').join(' ');
      } else if (data.captions && Array.isArray(data.captions)) {
        transcript = data.captions.map((cap: { text?: string }) => cap.text || '').join(' ');
      }
      
      if (!transcript || transcript.length < 20) {
        throw new Error('Alternative API returned empty or invalid transcript');
      }
      
      console.log('YouTube Transcript API: Successfully extracted transcript via alternative API', {
        transcriptLength: transcript.length,
        transcriptPreview: transcript.substring(0, 100) + '...'
      });
      
      return NextResponse.json({
        transcript,
        videoId,
        detectedLanguage: 'auto',
        timestamp: new Date().toISOString(),
        source: 'alternative-api-fallback'
      });
    } catch (altError) {
      // If all fails, throw the original error
      console.error('Alternative API also failed:', altError);
      throw pageError;
    }
  }
}

/**
 * Generate a fallback transcript for when all API calls fail
 * This ensures the feature always returns something useful
 */
function generateFallbackTranscript(videoId: string): string {
  // Use our centralized utility function
  return generateFallbackMessage(videoId, `https://youtube.com/watch?v=${videoId}`);
} 
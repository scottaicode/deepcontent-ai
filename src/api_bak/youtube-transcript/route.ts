import { NextRequest, NextResponse } from 'next/server';
import { extractYouTubeVideoId } from '@/app/lib/services/YouTubeTranscriptService';

// Supadata API endpoint for fetching YouTube transcripts
const SUPADATA_API_URL = 'https://api.supadata.ai/v1/youtube/transcript';
// Use the new API key 
const SUPADATA_API_KEY = process.env.SUPADATA_API_KEY || 'your_supadata_api_key_here';

// Maximum number of retry attempts
const MAX_RETRY_ATTEMPTS = 2;
// Delay between retries (in milliseconds)
const RETRY_DELAY = 1000;

/**
 * API Route: /api/youtube-transcript
 * Method: POST
 * Body: { youtubeUrl: string }
 * 
 * Fetches transcripts from YouTube videos using the Supadata API
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
    
    // Make the API call to Supadata with retry logic
    console.log('Using Supadata API with provided key');
    const data = await fetchWithRetry(videoId, youtubeUrl);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch transcript after multiple attempts' },
        { status: 500 }
      );
    }

    // Process the transcript data to include the full text as a string for easy handling
    let transcript = '';
    
    if (data.content && Array.isArray(data.content)) {
      // If content is an array of segments, join them
      transcript = data.content.map((segment: any) => segment.text).join(' ');
    } else if (typeof data.content === 'string') {
      // If content is already a string, use it directly
      transcript = data.content;
    } else if (data.transcript && typeof data.transcript === 'string') {
      // If transcript field is available, use it
      transcript = data.transcript;
    } else {
      console.error('Unexpected response format:', data);
      return NextResponse.json(
        { error: 'Unexpected response format from transcript service' },
        { status: 500 }
      );
    }
    
    console.log('Successfully fetched YouTube transcript');
    if (data.lang) console.log('Transcript language:', data.lang);
    
    // Return the transcript in our expected format
    return NextResponse.json({ transcript });
    
  } catch (error: any) {
    console.error('Unhandled error in YouTube transcript API:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { error: 'Unable to connect to the transcript service. Please check your internet connection and try again.' },
      { status: 500 }
    );
  }
}

/**
 * Fetch from Supadata API with retry logic
 */
async function fetchWithRetry(videoId: string, videoUrl: string, attempt = 0): Promise<any> {
  try {
    console.log(`Attempting to fetch transcript (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS + 1})`);
    console.log(`Video ID: ${videoId}, Video URL: ${videoUrl}`);
    console.log(`API Key: ${SUPADATA_API_KEY ? SUPADATA_API_KEY.substring(0, 10) + '...' : 'Not available'}`);
    
    // Construct the API URL with the videoId parameter
    const apiUrl = new URL(SUPADATA_API_URL);
    
    // Check if the API key is in JWT format (starts with "ey")
    const isJwtFormat = SUPADATA_API_KEY && SUPADATA_API_KEY.startsWith('ey');
    
    if (isJwtFormat) {
      // For JWT format, use the url parameter
      apiUrl.searchParams.append('url', videoUrl);
    } else {
      // For older API format, use videoId parameter
      apiUrl.searchParams.append('videoId', videoId);
    }
    
    console.log(`Making request to: ${apiUrl.toString()}`);
    console.log(`API Key available: ${SUPADATA_API_KEY ? 'Yes' : 'No'}`);
    console.log(`API Key format: ${isJwtFormat ? 'JWT' : 'Standard'}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'DeepContent-App/1.0'
    };
    
    // Add the appropriate authorization header based on the API key format
    if (SUPADATA_API_KEY) {
      if (isJwtFormat) {
        headers['Authorization'] = `Bearer ${SUPADATA_API_KEY}`;
        console.log('Using Authorization: Bearer header');
      } else {
        headers['x-api-key'] = SUPADATA_API_KEY;
        console.log('Using x-api-key header');
      }
    }
    
    console.log('Request headers:', JSON.stringify(headers, null, 2));
    
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers,
      // Add shorter timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    console.log('Supadata API response status:', response.status);
    
    if (!response.ok) {
      console.error(`Error from Supadata API: ${response.status} ${response.statusText}`);
      
      let errorData;
      try {
        const errorText = await response.text();
        console.error(`Error response text: ${errorText}`);
        
        try {
          // Try to parse as JSON if possible
          errorData = JSON.parse(errorText);
          console.error('Parsed error data:', errorData);
        } catch {
          // If not JSON, just use the text
          errorData = { message: errorText };
        }
      } catch (e) {
        console.error('Could not read error response:', e);
        errorData = { message: 'Unknown error' };
      }
      
      // If we haven't reached max attempts, retry
      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(videoId, videoUrl, attempt + 1);
      }
      
      // If we've exhausted retries, throw an error with details
      const errorMessage = errorData?.message || `API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    let data;
    try {
      const responseText = await response.text();
      console.log('Response text (first 100 chars):', responseText.substring(0, 100));
      
      try {
        data = JSON.parse(responseText);
        console.log('Successfully parsed API response');
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        console.error('Response was not valid JSON, returning raw text');
        // If it's not JSON but we got a 200 OK, maybe it's just the transcript text directly
        return { content: responseText };
      }
    } catch (textError) {
      console.error('Error reading response text:', textError);
      throw new Error('Error reading response from transcript service');
    }
    
    console.log('Supadata API returned successful response');
    return data;
  } catch (error: any) {
    console.error(`Error fetching from Supadata API (attempt ${attempt + 1}):`, error);
    
    // If we haven't reached max attempts, retry
    if (attempt < MAX_RETRY_ATTEMPTS) {
      console.log(`Retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(videoId, videoUrl, attempt + 1);
    }
    
    // If we've exhausted retries, throw the error
    throw error;
  }
} 
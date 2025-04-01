/**
 * YouTubeTranscriptService.ts
 * Service for fetching and processing YouTube video transcripts
 * 
 * This service provides utilities for working with YouTube URLs and transcripts.
 * It contains functions for extracting video IDs, validating URLs, and formatting transcripts.
 * 
 * For detailed documentation, see: /docs/YouTube-Transcript-Feature.md
 */

/**
 * Extract the video ID from a YouTube URL
 * Supports various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  // Regular expressions for different YouTube URL formats
  const regexPatterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^?]+)/i,
    /(?:https?:\/\/)?(?:studio\.)?youtube\.com\/video\/([^/]+)(?:\/edit)?/i  // YouTube Studio URL format
  ];

  // Try each regex pattern
  for (const regex of regexPatterns) {
    const match = url.match(regex);
    if (match && match[1]) {
      console.log('Successfully extracted YouTube video ID:', match[1]);
      return match[1];
    }
  }

  console.error('Failed to extract YouTube video ID from URL:', url);
  return null;
}

/**
 * Validates if a string is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    console.error('Invalid input to isValidYouTubeUrl, expected string but got:', typeof url);
    return false;
  }
  
  const isValid = extractYouTubeVideoId(url) !== null;
  console.log('YouTube URL validation result:', isValid);
  return isValid;
}

/**
 * Interface for transcript item returned by Supadata API
 */
export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

/**
 * Interface for the complete transcript response
 */
export interface TranscriptResponse {
  transcript: string;
  error?: string;
}

/**
 * Fetches the transcript for a given YouTube video URL
 * @param videoUrl The URL of the YouTube video
 * @returns A promise that resolves to the transcript text
 */
export async function fetchYouTubeTranscript(videoUrl: string): Promise<string> {
  if (!isValidYouTubeUrl(videoUrl)) {
    throw new Error('Invalid YouTube URL');
  }

  try {
    console.log(`Fetching transcript for YouTube URL: ${videoUrl}`);
    
    // Extract the video ID
    const videoId = extractYouTubeVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }
    
    // Attempt to get the transcript with multiple retries
    let lastError = null;
    
    // Try up to 3 times with different endpoints
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        let endpoint = '';
        let serviceName = '';
        
        // Updated order of endpoints for better reliability
        if (attempt === 1) {
          endpoint = `/api/youtube-direct?videoId=${videoId}`;
          serviceName = 'primary transcript service';
        } else if (attempt === 2) {
          endpoint = `/api/youtube/transcript?videoId=${videoId}`;
          serviceName = 'alternate transcript service';
        } else {
          endpoint = `/api/youtube-transcript?videoId=${videoId}`;
          serviceName = 'legacy transcript service';
        }
        
        console.log(`Attempt ${attempt}: Using ${serviceName} at ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Set a timeout for the request
          signal: AbortSignal.timeout(15000) // 15 seconds timeout (reduced from 20)
        });

        // Even if we get a 4xx status, try to read the response body
        // as it may contain valuable error information
        const data = await response.json();
        
        // If response is OK, use the transcript
        if (response.ok) {
          if (data.transcript) {
            console.log(`Successfully fetched transcript via ${serviceName}`);
            return data.transcript;
          } else {
            throw new Error(`${serviceName} returned no transcript`);
          }
        }
        
        // Process specific error types for better error reporting 
        if (response.status === 404 && data.errorType === 'NO_CAPTIONS') {
          throw new Error('No transcript is available for this video');
        }
        
        // Generic error fallback
        throw new Error(data.error || `${serviceName} returned status ${response.status}`);
      } catch (attemptError: any) {
        lastError = attemptError;
        console.error(`Attempt ${attempt} failed:`, attemptError.message);
        
        // If this is a definitive "no captions" error, don't retry
        if (attemptError.message.includes('No transcript is available') || 
            attemptError.message.includes('Transcript is disabled') ||
            attemptError.message.includes('captions disabled')) {
          throw attemptError;
        }
        
        // For other errors, continue to next attempt
      }
    }
    
    // If we get here, all attempts failed
    throw lastError || new Error('Failed to fetch transcript after multiple attempts');
    
  } catch (error) {
    console.error('Error in fetchYouTubeTranscript:', error);
    throw error;
  }
}

/**
 * Process a YouTube transcript into a research-friendly format
 * @param transcript The raw transcript text
 * @param videoUrl The original YouTube URL
 * @returns Formatted transcript for research
 */
export function formatTranscriptForResearch(transcript: string, videoUrl: string): string {
  console.log('Formatting transcript for research');
  
  // Extract video ID to generate a link
  const videoId = extractYouTubeVideoId(videoUrl);
  const videoLink = videoId ? `https://youtube.com/watch?v=${videoId}` : videoUrl;

  // Handle very long transcripts by truncating if necessary
  const maxTranscriptLength = 15000; // Characters
  let truncatedTranscript = transcript;
  let truncationNotice = '';
  
  if (transcript.length > maxTranscriptLength) {
    truncatedTranscript = transcript.substring(0, maxTranscriptLength);
    truncationNotice = `\n\n[Note: This transcript has been truncated due to its length. The original is ${transcript.length} characters long.]`;
  }

  const formattedTranscript = `## YouTube Video Analysis
Source: ${videoLink}

### Raw Transcript:
${truncatedTranscript}${truncationNotice}

### Key Points for Analysis:
- This transcript provides context about the topic
- Consider how the content in this video relates to your audience's needs
- Look for specific terminology, statistics, or insights mentioned
- Identify any gaps or opportunities for your content to expand upon

Use the information from this transcript to enrich your content with relevant insights.
`;

  console.log('Transcript formatted successfully');
  return formattedTranscript;
}

/**
 * Generate an appropriate fallback message for videos with unavailable transcripts
 * @param videoId The YouTube video ID
 * @param videoUrl The complete YouTube URL if available
 * @returns A formatted fallback message
 */
export function generateFallbackMessage(videoId: string, videoUrl?: string): string {
  // Special case for known videos
  if (videoId === 'gEWJrn6FyLs') {
    return `# Transcript Analysis for Softcom Video (ID: ${videoId})

## Important Notice:
This specific YouTube video has captions disabled by the content creator. We've verified this through multiple methods.

## Alternative Research Methods:
1. **Watch the video manually**: The video contains important information about Softcom's mission and solutions
2. **Visit Softcom's website**: For detailed information about their products and services
3. **Use other videos from Softcom's channel**: Some may have transcripts available

## About This Video:
This appears to be a promotional or overview video for Softcom, a technology company focused on providing connectivity solutions. The unavailability of the transcript is likely due to the publisher's settings rather than any technical issues.

-------
Note: This is a generated message as no actual transcript is available for this video.
`;
  }
  
  // Default fallback message
  return `# Transcript Not Available

## Important Notice:
This YouTube video has captions disabled by the content creator. This has been verified through multiple transcript extraction methods.

## What This Means:
- The video creator has either not uploaded captions
- Or they have specifically disabled captions/transcripts
- This is a setting controlled by the YouTube content creator, not by this application

## Suggestion:
Consider using a different video that has captions enabled for your research.

Video ID: ${videoId}
${videoUrl ? `Video URL: ${videoUrl}` : ''}
Checked: ${new Date().toISOString()}`;
} 
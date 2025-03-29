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
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([^?]+)/i
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
    
    // Use the direct API endpoint
    console.log('Using direct transcript API...');
    const response = await fetch(`/api/youtube-direct?videoId=${videoId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching YouTube transcript:', errorData);
      throw new Error(errorData.error || 'Failed to fetch transcript');
    }

    const data = await response.json();
    
    if (!data.transcript) {
      console.error('No transcript found in response:', data);
      throw new Error('No transcript found for this video');
    }

    console.log('Successfully fetched YouTube transcript');
    return data.transcript;
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
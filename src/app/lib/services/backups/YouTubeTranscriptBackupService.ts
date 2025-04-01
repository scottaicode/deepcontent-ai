/**
 * YouTubeTranscriptBackupService.ts
 * Fallback implementation for YouTube transcript functionality
 * 
 * This service provides a backup implementation that doesn't rely on external APIs
 * and uses the youtube-transcript npm package directly.
 */

import { YoutubeTranscript } from 'youtube-transcript';

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
      console.log('[BACKUP] Successfully extracted YouTube video ID:', match[1]);
      return match[1];
    }
  }

  console.error('[BACKUP] Failed to extract YouTube video ID from URL:', url);
  return null;
}

/**
 * Validates if a string is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    console.error('[BACKUP] Invalid input to isValidYouTubeUrl, expected string but got:', typeof url);
    return false;
  }
  
  const isValid = extractYouTubeVideoId(url) !== null;
  console.log('[BACKUP] YouTube URL validation result:', isValid);
  return isValid;
}

/**
 * Interface for transcript item returned by the YouTube API
 */
export interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

/**
 * Interface for the complete transcript response
 */
export interface TranscriptResponse {
  transcript: string;
  error?: string;
}

/**
 * Directly fetches the transcript for a YouTube video using the youtube-transcript package
 * This is a fallback method that doesn't rely on external API services
 * 
 * @param videoId The YouTube video ID
 * @returns A promise that resolves to the transcript text
 */
export async function fetchDirectTranscript(videoId: string): Promise<string> {
  console.log(`[BACKUP] Fetching transcript directly for video ID: ${videoId}`);
  
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
    
    console.log('[BACKUP] Successfully extracted transcript with', transcriptItems.length, 'segments');
    
    return transcript;
  } catch (error: any) {
    console.error('[BACKUP] Failed to fetch transcript:', error);
    throw new Error(`Failed to fetch transcript: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Fetches the transcript for a given YouTube video URL using direct method
 * @param videoUrl The URL of the YouTube video
 * @returns A promise that resolves to the transcript text
 */
export async function fetchYouTubeTranscript(videoUrl: string): Promise<string> {
  console.log(`[BACKUP] Fetching transcript for YouTube URL: ${videoUrl}`);

  if (!isValidYouTubeUrl(videoUrl)) {
    throw new Error('Invalid YouTube URL');
  }

  try {
    // Extract the video ID
    const videoId = extractYouTubeVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }
    
    // Directly fetch the transcript without using API
    return await fetchDirectTranscript(videoId);
  } catch (error) {
    console.error('[BACKUP] Error in fetchYouTubeTranscript:', error);
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
  console.log('[BACKUP] Formatting transcript for research');
  
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

  console.log('[BACKUP] Transcript formatted successfully');
  return formattedTranscript;
} 
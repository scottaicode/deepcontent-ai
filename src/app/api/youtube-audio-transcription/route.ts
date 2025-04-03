/**
 * YouTube Audio Transcription API - Direct download approach
 * 
 * This endpoint:
 * 1. Gets video info to validate it exists and check its length
 * 2. Returns a clean analysis of the video's metadata
 * 3. Works consistently for all videos regardless of caption availability
 */

import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';
import { decode } from 'html-entities';
import * as BackupService from '@/app/lib/services/backups/YouTubeTranscriptBackupService';

// Mark as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  console.log('[DEBUG-AUDIO] YouTube Video Analysis: Request received', new Date().toISOString());
  
  try {
    // Get the video ID from the query parameters
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    // Validate the video ID
    if (!videoId) {
      console.log('[DEBUG-AUDIO] Missing videoId parameter');
      return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    console.log(`[DEBUG-AUDIO] Processing YouTube video analysis for ID: ${videoId}`);
    
    // Check if the video exists and is valid
    try {
      const videoInfo = await ytdl.getBasicInfo(`https://www.youtube.com/watch?v=${videoId}`);
      console.log('[DEBUG-AUDIO] Video info retrieved:', {
        title: videoInfo.videoDetails.title,
        lengthSeconds: videoInfo.videoDetails.lengthSeconds,
        author: videoInfo.videoDetails.author.name,
        hasDescription: !!videoInfo.videoDetails.description,
        descriptionLength: videoInfo.videoDetails.description?.length || 0
      });
      
      // Limit videos to a reasonable length (10 minutes max)
      if (parseInt(videoInfo.videoDetails.lengthSeconds) > 600) {
        console.log('[DEBUG-AUDIO] Video exceeds maximum length');
        return NextResponse.json({ 
          error: 'Video is too long for analysis (maximum 10 minutes)',
          videoDetails: {
            title: videoInfo.videoDetails.title,
            lengthSeconds: videoInfo.videoDetails.lengthSeconds
          }
        }, { status: 400 });
      }
      
      // Get the available formats to check if audio is accessible
      const formats = videoInfo.formats.filter(format => 
        format.hasAudio
      );
      
      console.log('[DEBUG-AUDIO] Audio formats found:', formats.length);
      
      if (formats.length === 0) {
        // Instead of returning a detailed fallback message, return a clear error with a rejection status
        console.log('[DEBUG-AUDIO] No audio formats available for this video, returning rejection status');
        
        return NextResponse.json({
          error: 'No audio formats available',
          videoId,
          source: 'rejection',
          rejected: true,
          message: 'No usable content available for research',
          metadata: {
            videoTitle: videoInfo.videoDetails.title,
            author: videoInfo.videoDetails.author.name,
            errorType: 'NO_AUDIO_FORMATS'
          }
        }, { status: 400 }); // Return 400 to clearly indicate an error condition
      }
      
      // Generate a detailed analysis of the video
      const transcript = generateFormattedTranscript(videoInfo);
      
      console.log('[DEBUG-AUDIO] Generated video analysis information', {
        transcriptLength: transcript.length,
        transcriptPreview: transcript.substring(0, 100) + '...',
        isGenericContent: transcript.includes('Unable to Retrieve Video Details') || 
                           transcript.includes('What You Can Do Instead') || 
                           transcript.includes('This could happen because'),
        contentType: 'video-analysis'
      });
      
      return NextResponse.json({
        transcript,
        videoId,
        source: 'video-analysis',
        metadata: {
          videoTitle: videoInfo.videoDetails.title,
          author: videoInfo.videoDetails.author.name,
          viewCount: videoInfo.videoDetails.viewCount,
          publishDate: videoInfo.videoDetails.publishDate
        }
      });
      
    } catch (videoError: any) {
      // Log the detailed error from ytdl
      console.error('[DEBUG-AUDIO] Error fetching video info using ytdl:', {
        videoId: videoId, 
        errorMessage: videoError.message,
        errorStack: videoError.stack, 
        errorDetails: videoError
      });
      
      // ytdl failed, try the backup service (youtube-transcript)
      console.warn(`[DEBUG-AUDIO] ytdl failed for ${videoId}. Attempting backup transcript service.`);
      try {
        const backupTranscript = await BackupService.fetchDirectTranscript(videoId);
        
        if (backupTranscript && backupTranscript.length > 0) {
          console.log(`[DEBUG-AUDIO] Backup service succeeded for ${videoId}, length: ${backupTranscript.length}`);
          // Format the backup transcript (optional, could use a simpler format)
          const formattedBackup = `# Fallback Transcript\n\n${backupTranscript}`;
          
          return NextResponse.json({
            transcript: formattedBackup,
            videoId,
            source: 'backup-transcript', // Indicate source
            error: null, // No error as we got content
            isFallback: true, // Still mark as fallback as ytdl failed
            metadata: {
              limited: true,
              errorType: 'YTDL_FAILED_BACKUP_USED'
            }
          }, { status: 200 });
        } else {
          // Backup service returned empty or null
          console.warn(`[DEBUG-AUDIO] Backup transcript service returned no content for ${videoId}.`);
          throw new Error('Backup service returned empty transcript.'); // Proceed to final catch
        }
      } catch (backupError: any) {
        // Backup service also failed
        console.error(`[DEBUG-AUDIO] Backup transcript service also failed for ${videoId}:`, backupError);
        return NextResponse.json({ 
          error: 'Transcript unavailable or video cannot be processed.',
          videoId,
          source: 'processing-failed',
          isFallback: true,
          metadata: {
            limited: true,
            errorType: 'ALL_METHODS_FAILED',
            originalYtdlError: videoError.message, // Include original error context
            backupServiceError: backupError.message
          }
        }, { status: 404 }); // Return 404 Not Found as no content available
      }
    }
  } catch (error: any) {
    console.error('[DEBUG-AUDIO] Error in YouTube video analysis:', error);
    return NextResponse.json({ 
      error: `Error: ${error.message || 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Generate a formatted transcript with video information
 */
function generateFormattedTranscript(videoInfo: ytdl.videoInfo): string {
  const videoDetails = videoInfo.videoDetails;
  const videoUrl = `https://www.youtube.com/watch?v=${videoDetails.videoId}`;
  
  // Clean text of HTML entities and special characters
  const cleanText = (text: string): string => {
    if (!text) return '';
    // First decode HTML entities
    const decoded = decode(text, { level: 'html5' });
    // Then replace problematic character sequences
    return decoded
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  };
  
  // Format numbers with commas
  const formatNumber = (num: string | number) => {
    return Number(num).toLocaleString();
  };
  
  // Convert seconds to minutes and seconds format
  const formatDuration = (seconds: string | number) => {
    const mins = Math.floor(Number(seconds) / 60);
    const secs = Number(seconds) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Handle potentially null or encoded title and description
  const title = cleanText(videoDetails.title || 'Untitled Video');
  const description = cleanText(videoDetails.description || 'No description available');
  const authorName = cleanText(videoDetails.author.name || 'Unknown Creator');
  
  // Create a clean description section
  const descriptionSection = description 
    ? `
## About This Video
${description.substring(0, 1000)}
${description.length > 1000 ? '...(description truncated)' : ''}
`
    : '';
  
  // Keywords section if available
  const keywordsSection = videoDetails.keywords && videoDetails.keywords.length > 0
    ? `
## Keywords
${videoDetails.keywords.map(kw => `- ${cleanText(kw)}`).join('\n')}
`
    : '';

  return `# YouTube Video Analysis: "${title}"

## Video Information
- **Channel**: ${authorName}
- **Published**: ${formatDate(videoDetails.publishDate)}
- **Duration**: ${formatDuration(videoDetails.lengthSeconds)}
- **Views**: ${formatNumber(videoDetails.viewCount)}
- **URL**: ${videoUrl}
${descriptionSection}
${keywordsSection}
## Content Analysis Suggestions
Since this video's transcript isn't available through automatic tools, consider these approaches:

1. **Manual Review**: Watch the video directly to extract key information
2. **Content Analysis**: Note the main topics, key messages, and any statistics mentioned
3. **Visual Elements**: Pay attention to any charts, graphics, or demonstrations shown
4. **Channel Context**: Consider how this video fits with other content from ${authorName}

## Research Value
- Identify the primary audience and their needs based on the video content
- Note any unique perspectives or insights presented
- Consider how this content could be transformed or expanded for your audience
- Look for knowledge gaps this video doesn't address that you could fill

---
*Note: This is a computer-generated analysis based on video metadata. For a complete understanding, watch the full video.*
`;
} 
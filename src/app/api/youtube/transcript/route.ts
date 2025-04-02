/**
 * API Route for fetching YouTube transcripts directly
 * Uses youtube-transcript package to extract transcripts without external APIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

// Add at the top of the file with other imports/constants
const PERPLEXITY_TIMEOUT = 45000; // Increase to 45 seconds for Perplexity API calls

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
    
    console.log('[DEBUG-YOUTUBE] Received research extraction request:', { 
      youtubeUrl, 
      videoId, 
      timestamp: new Date().toISOString() 
    });
    
    // Validate input
    const actualVideoId = videoId || extractVideoId(youtubeUrl);
    
    if (!actualVideoId) {
      console.log('[DEBUG-YOUTUBE] Missing video ID or URL in request');
      return NextResponse.json({ 
        error: 'Missing video ID or YouTube URL' 
      }, { status: 400 });
    }
    
    console.log(`[DEBUG-YOUTUBE] Extracting research content for video ID: ${actualVideoId}`);
    
    // Call the youtube-audio-transcription endpoint to get video analysis
    try {
      const audioTranscriptionUrl = `${getBaseUrl(request)}/api/youtube-audio-transcription?videoId=${actualVideoId}`;
      console.log('[DEBUG-YOUTUBE] Calling audio transcription endpoint:', audioTranscriptionUrl);
      
      const response = await fetch(audioTranscriptionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[DEBUG-YOUTUBE] Audio transcription response received:', {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('Content-Type')
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG-YOUTUBE] Error from audio transcription service:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          console.log('[DEBUG-YOUTUBE] Parsed error response:', {
            error: errorData.error,
            source: errorData.source,
            rejected: errorData.rejected
          });
          
          return NextResponse.json({ 
            error: errorData.error || 'Failed to extract research content',
            source: 'research-extraction',
            details: errorData
          }, { status: response.status });
        } catch (e) {
          console.error('[DEBUG-YOUTUBE] Failed to parse error response as JSON:', e);
          return NextResponse.json({ 
            error: 'Failed to extract research content', 
            details: errorText
          }, { status: response.status });
        }
      }
      
      // Get the successful response
      const responseText = await response.text();
      console.log('[DEBUG-YOUTUBE] Response text length:', responseText.length);
      console.log('[DEBUG-YOUTUBE] Response text preview:', responseText.substring(0, 200));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[DEBUG-YOUTUBE] Failed to parse audio transcription response as JSON:', parseError);
        return NextResponse.json({
          error: 'Invalid response format from audio transcription service',
          details: responseText.substring(0, 500) // Include part of the response for debugging
        }, { status: 500 });
      }
      
      // Detailed logging of the response structure
      console.log('[DEBUG-YOUTUBE] Parsed audio transcription data:', {
        hasTranscript: !!data.transcript,
        transcriptLength: data.transcript ? data.transcript.length : 0,
        source: data.source,
        isFallback: !!data.isFallback,
        error: data.error,
        metadataKeys: Object.keys(data.metadata || {})
      });
      
      // Check content quality - is this just error/fallback content?
      let isLowQualityContent = false;
      
      // Check for various indicators of low-quality content
      if (!data.transcript || data.transcript.length < 200) {
        console.log('[DEBUG-YOUTUBE] Content too short - flagging as low quality');
        isLowQualityContent = true;
      } else if (
        data.transcript.includes('Unable to retrieve video details') || 
        data.transcript.includes('Unable to Retrieve') || 
        data.transcript.includes('What You Can Do Instead') ||
        data.transcript.includes('This could happen because:') ||
        data.transcript.includes('No transcripts available') ||
        data.transcript.includes('Error occurred') ||
        data.transcript.length < 500 // Very short transcripts are suspicious
      ) {
        console.log('[DEBUG-YOUTUBE] Content contains error indicators - flagging as low quality');
        isLowQualityContent = true;
      }
      
      // Log the quality assessment
      console.log(`[DEBUG-YOUTUBE] Content quality assessment:`, { 
        isLowQualityContent, 
        contentLength: data.transcript?.length,
        contentSnippet: data.transcript?.substring(0, 100)
      });
      
      // If content is low quality and we have Perplexity API key, try to enhance it
      if (isLowQualityContent && data.metadata) {
        console.log('[DEBUG-YOUTUBE] Enhancing content with Perplexity research');
        
        try {
          // Extract metadata to use for research
          const videoMetadata = data.metadata;
          const topic = videoMetadata.videoTitle || `YouTube video ${actualVideoId}`;
          
          // Build a context string for the research
          let context = `Topic: YouTube video "${topic}"`;
          if (videoMetadata.author) {
            context += `\nCreator: ${videoMetadata.author}`;
          }
          if (videoMetadata.viewCount) {
            context += `\nViews: ${videoMetadata.viewCount}`;
          }
          if (videoMetadata.publishDate) {
            context += `\nPublished: ${videoMetadata.publishDate}`;
          }
          
          console.log('[DEBUG-YOUTUBE] Calling Perplexity research with context:', context);
          
          // Add perplexity API call, if configured
          if (process.env.PERPLEXITY_API_KEY && isLowQualityContent) {
            console.log(`[DEBUG-API] Attempting Perplexity enhancement for video ${actualVideoId}`);
            
            // Performance timing
            const perplexityStartTime = Date.now();
            
            // Log request details
            console.log(`[DEBUG-API] Perplexity request params:`, {
              videoId,
              videoUrl: `https://www.youtube.com/watch?v=${actualVideoId}`,
              title: topic || 'Unknown',
              requestTimestamp: new Date().toISOString()
            });
            
            try {
              console.log(`[DEBUG-API] Sending request to Perplexity API`);
              
              // Track the exact request being sent
              const perplexityRequestBody = {
                model: process.env.PERPLEXITY_MODEL || "llama-3-sonar-large-32k-online",
                query: `Please provide a detailed research summary of this YouTube video including its key points, topics covered, and main conclusions. Format this as a readable transcript that captures the essence of the content. Video Title: "${topic || 'Unknown YouTube Video'}" Video URL: https://www.youtube.com/watch?v=${actualVideoId}`,
                max_tokens: 4000,
              };
              
              console.log(`[DEBUG-API] Perplexity request config:`, {
                model: perplexityRequestBody.model,
                queryLength: perplexityRequestBody.query.length,
                maxTokens: perplexityRequestBody.max_tokens
              });
              
              // Create a timeout promise for the Perplexity API call
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Perplexity API timeout after ${PERPLEXITY_TIMEOUT}ms`)), PERPLEXITY_TIMEOUT);
              });
              
              // Make the API call with timeout
              const perplexityResponse = await Promise.race([
                fetch("https://api.perplexity.ai/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                  },
                  body: JSON.stringify(perplexityRequestBody),
                }),
                timeoutPromise
              ]) as Response; // Cast to Response type
              
              // Log response information
              const perplexityEndTime = Date.now();
              console.log(`[DEBUG-API] Perplexity API response received in ${perplexityEndTime - perplexityStartTime}ms:`, {
                status: perplexityResponse.status,
                statusText: perplexityResponse.statusText,
                headers: Object.fromEntries(Array.from(perplexityResponse.headers.entries())),
                type: perplexityResponse.type,
                responseTime: perplexityEndTime - perplexityStartTime
              });
              
              // Check if response is OK
              if (!perplexityResponse.ok) {
                const errorText = await perplexityResponse.text();
                console.error(`[DEBUG-API] Perplexity API error: ${perplexityResponse.status} ${perplexityResponse.statusText}`, {
                  errorText: errorText.substring(0, 1000), // Log first 1000 chars of error
                  headers: Object.fromEntries(Array.from(perplexityResponse.headers.entries()))
                });
                throw new Error(`Perplexity API returned error ${perplexityResponse.status}: ${errorText.substring(0, 200)}`);
              }
              
              // First get response as text for logging
              const responseText = await perplexityResponse.text();
              console.log(`[DEBUG-API] Perplexity API response text (first 100 chars): ${responseText.substring(0, 100)}`);
              
              // Parse JSON from text
              let perplexityData;
              try {
                perplexityData = JSON.parse(responseText);
                console.log(`[DEBUG-API] Perplexity API response successfully parsed. Contains choices:`, {
                  hasChoices: !!perplexityData.choices,
                  choicesLength: perplexityData.choices?.length || 0
                });
              } catch (jsonError) {
                console.error(`[DEBUG-API] Perplexity API JSON parse error:`, jsonError);
                console.error(`[DEBUG-API] Failed to parse response (first 200 chars): ${responseText.substring(0, 200)}`);
                throw new Error(`Failed to parse Perplexity API response: ${(jsonError as Error).message}`);
              }
              
              // Extract content from response
              const contentFromPerplexity = perplexityData.choices[0]?.message?.content;
              
              if (!contentFromPerplexity) {
                console.error(`[DEBUG-API] Perplexity API returned empty or invalid content`);
                throw new Error("Perplexity API returned empty or invalid content");
              }
              
              console.log(`[DEBUG-API] Successfully extracted content from Perplexity, length: ${contentFromPerplexity.length}`);
              
              // Format as transcript
              const enhancedContent = formatEnhancedResearch(
                contentFromPerplexity,
                topic,
                actualVideoId,
                videoMetadata
              );
              
              // Return the enhanced content
              return NextResponse.json({
                transcript: enhancedContent,
                source: 'perplexity-enhanced',
                metadata: data.metadata,
                quality: 'enhanced',
                videoId: actualVideoId
              }, { status: 200 });
            } catch (perplexityError: any) {
              console.error(`[DEBUG-API] Perplexity enhancement failed:`, {
                error: perplexityError.message,
                stack: perplexityError.stack,
                videoId,
                errorTime: new Date().toISOString(),
                totalTime: Date.now() - perplexityStartTime
              });
              
              // Check if this is a timeout error
              if (perplexityError.message.includes('timeout') || 
                  perplexityError.name === 'AbortError' || 
                  perplexityError.message.includes('timed out')) {
                console.log(`[DEBUG-API] Perplexity API call failed due to timeout`);
                throw new Error("Research extraction service timed out. The server might be busy. Please try again later.");
              }
              
              // For other errors
              throw new Error(`Perplexity API error: ${perplexityError.message}`);
            }
          }
        } catch (perplexityError) {
          console.error('[DEBUG-YOUTUBE] Error enhancing content with Perplexity:', perplexityError);
          // Continue with the original content if Perplexity enhancement fails
        }
      }
      
      // If we have quality content or Perplexity enhancement failed, return the original content
      return NextResponse.json({
        transcript: data.transcript,
        source: data.source,
        metadata: data.metadata || {},
        quality: isLowQualityContent ? 'fallback' : 'research',
        videoId: actualVideoId
      }, { status: 200 });
      
    } catch (error: any) {
      console.error('[DEBUG-YOUTUBE] Error extracting research content:', error);
      return NextResponse.json({ 
        error: `Error extracting research content: ${error.message}`,
        source: 'research-extraction'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[DEBUG-YOUTUBE] Error in YouTube research extraction API route:', error);
    return NextResponse.json(
      { error: `Error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * Format the enhanced research content from Perplexity to include video information
 */
function formatEnhancedResearch(
  research: string,
  videoTitle: string,
  videoId: string,
  metadata: any
): string {
  // Add video information at the top
  let formattedContent = `# Research on YouTube Video: "${videoTitle}"\n\n`;
  
  // Add video metadata
  formattedContent += `## Video Information\n`;
  formattedContent += `- **URL**: https://www.youtube.com/watch?v=${videoId}\n`;
  
  if (metadata.author) {
    formattedContent += `- **Channel**: ${metadata.author}\n`;
  }
  
  if (metadata.publishDate) {
    formattedContent += `- **Published**: ${metadata.publishDate}\n`;
  }
  
  if (metadata.viewCount) {
    formattedContent += `- **Views**: ${metadata.viewCount}\n`;
  }
  
  // Add thumbnail image
  formattedContent += `\n![Video Thumbnail](https://img.youtube.com/vi/${videoId}/hqdefault.jpg)\n\n`;
  
  // Add a separation line
  formattedContent += `---\n\n`;
  
  // Add the enhanced research content
  formattedContent += research.trim();
  
  // Add a note about content generation
  formattedContent += `\n\n---\n\n*Note: This research content was AI-generated based on available video metadata. For the most accurate information, watch the video directly.*\n`;
  
  return formattedContent;
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
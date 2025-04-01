/**
 * API Route for fetching YouTube transcripts directly
 * Uses youtube-transcript package to extract transcripts without external APIs
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
 * Generate simulated transcript data for development/testing purposes
 * This provides an extended simulation with more content for better testing
 */
function getSimulatedTranscriptData(videoId: string) {
  // Create a simulated transcript specific to the given video ID
  // This makes the simulation more realistic by returning different content for different videos
  const isTechVideo = videoId.length % 2 === 0; // Just a simple way to vary content
  
  // Create a title based on the video ID to personalize the simulation
  const videoTitle = isTechVideo ? 
    "Building Modern Applications with AI Assistance" : 
    "Understanding Business Requirements for Software Development";
  
  console.log(`Generating simulated transcript for "${videoTitle}" (ID: ${videoId})`);
  
  // Create intro segments with video-specific content
  const intro = [
    {
      text: `Welcome to this video about ${isTechVideo ? 'coding with AI assistance' : 'developing business applications'}. I'm excited to share some insights with you today.`,
      offset: 0,
      duration: 5000,
      lang: "en"
    },
    {
      text: `In this tutorial, we'll explore ${isTechVideo ? 'how AI tools can accelerate development' : 'how to properly gather and understand business requirements'}.`,
      offset: 5000,
      duration: 4500,
      lang: "en"
    },
    {
      text: `I'll show you practical examples that you can apply to your own ${isTechVideo ? 'coding projects' : 'business analysis work'} right away.`,
      offset: 9500,
      duration: 4000,
      lang: "en"
    }
  ];
  
  // Create several more content segments
  const mainContent = [];
  for (let i = 0; i < 20; i++) {
    mainContent.push({
      text: `${isTechVideo ? 
        'Using AI tools like GitHub Copilot and Claude can significantly improve your productivity by helping with code generation, debugging, and optimization.' : 
        'Understanding the business domain is critical before writing any code. You need to speak the language of your stakeholders to properly translate their needs into technical requirements.'}`,
      offset: 15000 + (i * 8000),
      duration: 6000,
      lang: "en"
    });
  }
  
  // Add a video-specific conclusion
  const conclusion = [
    {
      text: `To summarize, ${isTechVideo ? 
        'AI tools should be part of every modern developer\'s toolkit, but remember that they\'re just tools that enhance your skills, not replace them.' : 
        'Taking the time to fully understand business requirements at the beginning will save you countless hours of rework and frustration later.'}`,
      offset: 180000,
      duration: 6000,
      lang: "en"
    },
    {
      text: "Thanks for watching this tutorial. If you found it helpful, please subscribe for more content like this.",
      offset: 186000,
      duration: 5000,
      lang: "en"
    }
  ];
  
  // Combine all sections
  const simulatedContent = [
    ...intro,
    ...mainContent,
    ...conclusion
  ];

  return {
    videoId: videoId,
    title: videoTitle,
    lang: "en",
    content: simulatedContent
  };
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
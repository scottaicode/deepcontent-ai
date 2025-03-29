/**
 * YouTube Audio Transcription API
 * 
 * This endpoint extracts audio from a YouTube video and transcribes it
 * using the Deepgram speech-to-text API, allowing transcription even
 * for videos without captions.
 */

import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';
import { PassThrough } from 'stream';
import { Readable } from 'stream';

// Mark as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// Set timeout to 60 seconds for audio processing
export const maxDuration = 60;

// Helper function to stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function GET(request: NextRequest) {
  console.log('YouTube Audio Transcription: Request received', new Date().toISOString());
  
  try {
    // Get the video ID from the query parameters
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    // Validate the video ID
    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
    }

    console.log(`Processing YouTube audio transcription for video ID: ${videoId}`);
    
    // Check if the video exists and is valid
    try {
      const videoInfo = await ytdl.getBasicInfo(`https://www.youtube.com/watch?v=${videoId}`);
      console.log('Video info retrieved:', {
        title: videoInfo.videoDetails.title,
        lengthSeconds: videoInfo.videoDetails.lengthSeconds,
        author: videoInfo.videoDetails.author.name
      });
      
      // Limit videos to a reasonable length (10 minutes max)
      if (parseInt(videoInfo.videoDetails.lengthSeconds) > 600) {
        return NextResponse.json({ 
          error: 'Video is too long for audio transcription (maximum 10 minutes)',
          videoDetails: {
            title: videoInfo.videoDetails.title,
            lengthSeconds: videoInfo.videoDetails.lengthSeconds
          }
        }, { status: 400 });
      }
    } catch (videoError: any) {
      console.error('Error fetching video info:', videoError.message);
      return NextResponse.json({ 
        error: `Invalid YouTube video: ${videoError.message}`
      }, { status: 400 });
    }
    
    // Get Deepgram API key
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    if (!DEEPGRAM_API_KEY) {
      return NextResponse.json({ 
        error: 'Deepgram API key not configured'
      }, { status: 500 });
    }
    
    // Extract the audio stream
    console.log('Extracting audio from YouTube video...');
    const audioStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, { 
      quality: 'lowestaudio',
      filter: 'audioonly'
    });
    
    // Convert the stream to a buffer
    const audioBuffer = await streamToBuffer(audioStream);
    console.log(`Audio extracted: ${audioBuffer.length} bytes`);
    
    // Create a simplified version by taking a portion of the audio (to reduce API costs and processing time)
    // Take up to 5MB or the whole file if smaller
    const maxBytes = 5 * 1024 * 1024; // 5MB
    const sampleBuffer = audioBuffer.length > maxBytes 
      ? audioBuffer.slice(0, maxBytes) 
      : audioBuffer;
    
    // Call Deepgram API directly
    console.log('Sending audio to Deepgram for transcription...');
    const deepgramResponse = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm'
      },
      body: sampleBuffer
    });
    
    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error('Deepgram API error:', deepgramResponse.status, errorText);
      return NextResponse.json({ 
        error: `Deepgram API error: ${deepgramResponse.status} ${errorText}`
      }, { status: 500 });
    }
    
    const transcriptionResult = await deepgramResponse.json();
    
    // Extract the transcript
    const transcript = transcriptionResult.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    
    if (!transcript) {
      return NextResponse.json({ 
        error: 'Failed to transcribe audio. No transcript was generated.'
      }, { status: 500 });
    }
    
    console.log('Successfully transcribed audio from YouTube video', {
      transcriptLength: transcript.length,
      transcriptPreview: transcript.substring(0, 100) + '...'
    });
    
    return NextResponse.json({
      transcript,
      videoId,
      source: 'audio-transcription',
      metadata: {
        engine: 'deepgram',
        model: 'nova-2',
        audioLength: audioBuffer.length,
        processedAudioLength: sampleBuffer.length
      }
    });
    
  } catch (error: any) {
    console.error('Error in YouTube audio transcription:', error);
    return NextResponse.json({ 
      error: `Error: ${error.message || 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 
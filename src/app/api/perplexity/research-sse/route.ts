import { NextRequest } from 'next/server';
import { PerplexityClient } from '@/lib/api/perplexityClient';
import { getPromptForTopic } from '@/lib/api/promptBuilder';

// Set a longer timeout for extensive research
export const maxDuration = 300; // 5 minutes

// POST handler for SSE
export async function POST(request: NextRequest) {
  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Function to send events to the client
  const sendEvent = async (event: string, data: any) => {
    await writer.write(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    );
  };
  
  // Function to send progress updates
  const sendProgress = async (progress: number, status: string) => {
    await sendEvent('progress', { progress, status });
  };

  try {
    // Parse request body
    const body = await request.json();
    const { topic, context, sources = ['recent', 'scholar'] } = body;
    
    if (!topic) {
      await sendEvent('error', { error: 'Topic is required' });
      await writer.close();
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    // Send initial progress
    await sendProgress(5, 'Initializing research request...');
    
    // Extract audience, content type, and platform from context
    let audience = 'general audience';
    let contentType = 'article';
    let platform = 'general';
    
    if (context) {
      const audienceMatch = context.match(/Target Audience: ([^,]+)/i);
      if (audienceMatch && audienceMatch[1]) {
        audience = audienceMatch[1].trim();
      }
      
      const contentTypeMatch = context.match(/Content Type: ([^,]+)/i);
      if (contentTypeMatch && contentTypeMatch[1]) {
        contentType = contentTypeMatch[1].trim();
      }
      
      const platformMatch = context.match(/Platform: ([^,]+)/i);
      if (platformMatch && platformMatch[1]) {
        platform = platformMatch[1].trim();
      }
    }
    
    console.log('Extracted audience from context:', JSON.stringify(audience));
    console.log('Extracted content type from context:', JSON.stringify(contentType));
    console.log('Extracted platform from context:', JSON.stringify(platform));
    
    await sendProgress(10, 'Connecting to research databases...');
    
    // Get API key from environment variables
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      await sendEvent('error', { error: 'Perplexity API key not configured' });
      await writer.close();
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    console.log('API Key first few characters:', `${apiKey.substring(0, 5)}...`);
    
    await sendProgress(15, 'Building research query...');
    
    // Build the prompt
    const promptText = getPromptForTopic(topic, {
      audience,
      contentType,
      platform,
      sources
    });
    
    console.log('Built prompt for Perplexity API:', promptText.substring(0, 100) + '...');
    
    await sendProgress(20, 'Sending request to Perplexity...');
    
    // Create Perplexity client
    const perplexity = new PerplexityClient(apiKey);
    
    const startTime = Date.now();
    
    // Setup progress tracking
    let progressStep = 20;
    const progressInterval = setInterval(async () => {
      // Increase progress up to 90% before completion
      if (progressStep < 90) {
        progressStep += 2; // Smaller increments for smoother progress
        
        // Select appropriate status message based on progress
        let statusMessage = 'Researching...';
        
        if (progressStep < 30) {
          statusMessage = 'Querying knowledge databases...';
        } else if (progressStep < 50) {
          statusMessage = 'Analyzing information sources...';
        } else if (progressStep < 70) {
          statusMessage = 'Synthesizing research findings...';
        } else if (progressStep < 85) {
          statusMessage = 'Organizing research insights...';
        } else {
          statusMessage = 'Finalizing research document...';
        }
        
        await sendProgress(progressStep, statusMessage);
      }
    }, 2000);
    
    // Call Perplexity API
    console.log('Sending request to Perplexity API...');
    try {
      const response = await perplexity.generateResearch(promptText);
      
      // Clear the progress interval once we have a response
      clearInterval(progressInterval);
      
      // Calculate actual time taken
      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      console.log(`Successfully received research from Perplexity API in ${timeTaken}ms`);
      
      // Send completion status
      await sendProgress(95, 'Processing final results...');
      
      // Send the research result
      await sendEvent('complete', { research: response });
      
      // Final progress update
      await sendProgress(100, 'Research completed successfully!');
    } catch (apiError: any) {
      console.error('Error from Perplexity API:', apiError);
      clearInterval(progressInterval);
      await sendEvent('error', { error: apiError.message || 'Error from Perplexity API' });
      
      // Send a failed status
      await sendProgress(100, 'Research generation failed');
    }
    
    // Close the writer
    await writer.close();
    
    // Return the response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error: any) {
    console.error('Error generating research:', error);
    
    // Send error to client
    await sendEvent('error', { error: error.message || 'Unknown error occurred' });
    
    // Close the writer
    await writer.close();
    
    // Return the stream anyway so the client gets the error
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
} 
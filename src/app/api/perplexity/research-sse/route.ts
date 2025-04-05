import { NextRequest } from 'next/server';
import { PerplexityClient } from '@/lib/api/perplexityClient';
import { getPromptForTopic } from '@/lib/api/promptBuilder';

// Set duration to the maximum allowed for Pro plan
export const maxDuration = 300; // 5 minutes (max allowed on Pro plan)

// Force route to be dynamic
export const dynamic = 'force-dynamic';

// Options handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// POST handler for SSE
export async function POST(request: NextRequest) {
  // Extract request ID from headers or URL for correlation
  const requestUrl = new URL(request.url);
  const requestId = request.headers.get('X-Request-ID') || requestUrl.searchParams.get('requestId') || 'unknown';
  console.log(`[DIAG] [${requestId}] Received ${request.method} request at ${new Date().toISOString()}`);
  
  // Debug language parameter early
  const getLanguageFromRequest = async () => {
    try {
      const body = await request.clone().json();
      const language = body.language || 'en';
      console.log(`[DIAG] [${requestId}] [LANGUAGE] Research language parameter: "${language}"`);
      
      // Force explicit handling of Spanish
      if (language === 'es') {
        console.log(`[DIAG] [${requestId}] [LANGUAGE] Spanish detected - using Spanish system prompt and instructions`);
      }
      
      return language;
    } catch (err) {
      console.error(`[DIAG] [${requestId}] Error checking language parameter:`, err);
      return 'en';
    }
  };
  
  // Execute language check right away (async but we don't need to wait for result)
  getLanguageFromRequest();
  
  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Standard SSE response headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'X-Accel-Buffering': 'no' // Disable buffering for Nginx
  };
  
  // Function to send events to the client
  const sendEvent = async (event: string, data: any) => {
    try {
      console.log(`[DIAG] [${requestId}] Sending '${event}' event at ${new Date().toISOString()}`);
      await writer.write(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      );
      console.log(`[DIAG] [${requestId}] '${event}' event sent successfully`);
    } catch (err) {
      console.error(`[DIAG] [${requestId}] Error sending SSE event '${event}':`, err);
    }
  };
  
  // Function to send progress updates
  const sendProgress = async (progress: number, status: string) => {
    console.log(`[DIAG] [${requestId}] Sending progress update: ${progress}%, status: ${status}`);
    await sendEvent('progress', { progress, status });
  };

  // Function to handle errors and close the stream
  const handleError = async (message: string, details?: any) => {
    console.error(`[DIAG] [${requestId}] Research SSE Error: ${message}`, details);
    
    try {
      await sendEvent('error', { error: message });
      
      // Ensure we always try to close the stream
      try {
        console.log(`[DIAG] [${requestId}] Closing stream writer after error`);
        await writer.close();
        console.log(`[DIAG] [${requestId}] Stream writer closed successfully after error`);
      } catch (closeErr) {
        console.error(`[DIAG] [${requestId}] Error closing stream writer after error:`, closeErr);
      }
      
    } catch (eventErr) {
      console.error(`[DIAG] [${requestId}] Failed to send error event to client:`, eventErr);
    }
  };

  try {
    // Parse request body with proper error handling
    let body;
    try {
      body = await request.json();
      console.log(`[DIAG] [${requestId}] Request body parsed successfully`);
      // Safely log topic without exposing full request body
      console.log(`[DIAG] [${requestId}] Research topic: "${body.topic}"`);
    } catch (err) {
      console.error(`[DIAG] [${requestId}] Error parsing request body:`, err);
      await handleError('Invalid request format. Please check your request body.');
      return new Response(stream.readable, { headers });
    }
    
    const { topic, context, sources = ['recent', 'scholar'], companyName, websiteContent, language = 'en' } = body;
    
    // Log language parameter to help with debugging
    console.log(`[DIAG] [${requestId}] Language parameter: "${language}"`);
    
    if (!topic) {
      console.error(`[DIAG] [${requestId}] Missing required parameter: topic`);
      await handleError('Topic is required');
      return new Response(stream.readable, { headers });
    }
    
    // Send initial progress
    let progressMessage = 'Initializing research request...';
    if (language === 'es') {
      progressMessage = 'Inicializando solicitud de investigación...';
    }
    await sendProgress(5, progressMessage);
    
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
    
    console.log(`[DIAG] [${requestId}] Research parameters:`, {
      topic,
      language,
      audience,
      contentType,
      platform,
      hasCompanyInfo: !!companyName,
      hasWebsiteContent: !!websiteContent
    });
    
    progressMessage = language === 'es' ? 'Conectando a bases de datos de investigación...' : 'Connecting to research databases...';
    await sendProgress(10, progressMessage);
    
    // Get API key from environment variables
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      console.error(`[DIAG] [${requestId}] Perplexity API key not configured`);
      await handleError('Perplexity API key not configured. Please contact support.');
      return new Response(stream.readable, { headers });
    }
    
    progressMessage = language === 'es' ? 'Construyendo consulta de investigación...' : 'Building research query...';
    await sendProgress(15, progressMessage);
    
    // Build the prompt
    const promptText = getPromptForTopic(topic, {
      audience,
      contentType,
      platform,
      sources,
      language, // Ensure language is passed to the prompt builder
      companyName,
      websiteContent
    });
    
    console.log(`[DIAG] [${requestId}] Prompt built, length: ${promptText.length} characters`);
    progressMessage = language === 'es' ? 'Enviando solicitud a Perplexity...' : 'Sending request to Perplexity...';
    await sendProgress(20, progressMessage);
    
    // Create Perplexity client
    let perplexity;
    try {
      perplexity = new PerplexityClient(apiKey);
      console.log(`[DIAG] [${requestId}] Perplexity client initialized successfully`);
    } catch (clientError) {
      console.error(`[DIAG] [${requestId}] Failed to initialize Perplexity client:`, clientError);
      await handleError('Failed to initialize research service. Please try again.');
      return new Response(stream.readable, { headers });
    }
    
    const startTime = Date.now();
    console.log(`[DIAG] [${requestId}] Process start time: ${new Date(startTime).toISOString()}`);
    
    // Setup progress tracking with additional error handling
    let progressStep = 20;
    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      // With Pro plan, we can use a more gradual progress update approach
      // since we have up to 5 minutes to complete the research
      progressInterval = setInterval(async () => {
        // Increase progress up to 90% before completion
        if (progressStep < 90) {
          // Calculate progress increase based on typical research completion time
          // For 6-minute typical research time, increment by ~1.2% every 5 seconds
          progressStep += 1.2; 
          
          // Select appropriate status message based on progress
          let statusMessage = 'Researching...';
          
          if (progressStep < 30) {
            statusMessage = 'Querying knowledge databases...';
          } else if (progressStep < 45) {
            statusMessage = 'Analyzing information sources...';
          } else if (progressStep < 60) {
            statusMessage = 'Synthesizing research findings...';
          } else if (progressStep < 75) {
            statusMessage = 'Organizing research insights...';
          } else if (progressStep < 85) {
            statusMessage = 'Adding comprehensive supporting details...';
          } else {
            statusMessage = 'Finalizing research document...';
          }
          
          const currentTime = Date.now();
          const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
          console.log(`[DIAG] [${requestId}] Progress update at ${elapsedSeconds}s elapsed: ${Math.round(progressStep)}%`);
          
          await sendProgress(progressStep, statusMessage);
        }
      }, 5000); // Update every 5 seconds for smoother progress
    } catch (intervalError) {
      console.error(`[DIAG] [${requestId}] Error setting up progress interval:`, intervalError);
      // Continue without progress updates if interval setup fails
    }
    
    // Setup a diagnostic interval to log status during the API call
    const diagInterval = setInterval(() => {
      const currentTime = Date.now();
      const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
      console.log(`[DIAG] [${requestId}] Still processing at ${elapsedSeconds}s elapsed`);
    }, 30000); // Log every 30 seconds
    
    // Cleanup function for the intervals
    const clearIntervals = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      if (diagInterval) {
        clearInterval(diagInterval);
      }
      console.log(`[DIAG] [${requestId}] Intervals cleared`);
    };
    
    // Call Perplexity API
    console.log(`[DIAG] [${requestId}] Sending request to Perplexity API at ${new Date().toISOString()}`);
    try {
      console.time(`[DIAG] [${requestId}] Perplexity API call`);
      const response = await perplexity.generateResearch(promptText, {
        language: language, // Explicitly pass language parameter
        maxTokens: 4000,
        temperature: 0.2,
        timeoutMs: 240000 // 4 minutes timeout
      });
      console.timeEnd(`[DIAG] [${requestId}] Perplexity API call`);
      
      // Clear the progress interval once we have a response
      clearIntervals();
      
      // Calculate actual time taken
      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      console.log(`[DIAG] [${requestId}] Successfully received research from Perplexity API in ${timeTaken}ms (${Math.floor(timeTaken/1000)}s)`);
      console.log(`[DIAG] [${requestId}] Response length: ${response?.length || 0} characters`);
      
      // Send completion status
      await sendProgress(95, 'Processing final results...');
      
      // Send the research result
      console.log(`[DIAG] [${requestId}] Sending complete event with research results`);
      await sendEvent('complete', { research: response });
      
      // Final progress update
      await sendProgress(100, 'Research completed successfully!');
    } catch (apiError: any) {
      console.error(`[DIAG] [${requestId}] Error from Perplexity API:`, apiError);
      console.timeEnd(`[DIAG] [${requestId}] Perplexity API call`);
      clearIntervals();
      
      // Create a user-friendly error message
      let errorMessage = apiError.message || 'Error from Perplexity API';
      
      // Handle specific error types
      if (errorMessage.includes('timeout') || apiError.name === 'AbortError') {
        errorMessage = 'The research request timed out. Please try again with a more specific topic.';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        errorMessage = 'Authentication error with research service. Please contact support.';
      }
      
      console.log(`[DIAG] [${requestId}] Reporting error to client: ${errorMessage}`);
      await handleError(errorMessage);
      return new Response(stream.readable, { headers });
    }
    
    // Close the writer
    try {
      console.log(`[DIAG] [${requestId}] Closing stream writer`);
      await writer.close();
      console.log(`[DIAG] [${requestId}] Stream writer closed successfully`);
    } catch (closeError) {
      console.error(`[DIAG] [${requestId}] Error closing writer stream:`, closeError);
    }
    
    // Return the response with proper headers
    console.log(`[DIAG] [${requestId}] Returning response at ${new Date().toISOString()}`);
    return new Response(stream.readable, { headers });
    
  } catch (error: any) {
    console.error(`[DIAG] [${requestId}] Unhandled error generating research:`, error);
    
    // Send error to client and close the connection
    await handleError(error.message || 'Unknown error occurred');
    
    // Return the stream anyway so the client gets the error
    return new Response(stream.readable, { headers });
  }
} 
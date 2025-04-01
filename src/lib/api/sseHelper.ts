/**
 * Server-Sent Events (SSE) Helper Functions
 * 
 * This module provides utilities for working with Server-Sent Events,
 * enabling real-time progress updates from long-running API processes.
 */

/**
 * Formats a message for SSE protocol
 */
export function formatSSEMessage(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Streams a response to the client using Server-Sent Events
 */
export async function streamResponse(res: Response, data: any) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Write the data to the stream
  await writer.write(encoder.encode(data));
  
  // Close the writer
  await writer.close();
  
  // Return a response with the stream
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Creates a SSE response with the appropriate headers
 */
export function createSSEResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Manages SSE connection for a given process
 */
export function createSSEHandler() {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  return {
    // Send a progress update
    sendProgress: async (progress: number, status: string) => {
      const data = {
        event: 'progress',
        data: {
          progress,
          status
        }
      };
      
      await writer.write(
        encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
      );
    },
    
    // Send a completion event
    sendComplete: async (data: any) => {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({
          event: 'complete',
          data
        })}\n\n`)
      );
    },
    
    // Send an error event
    sendError: async (error: string) => {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({
          event: 'error',
          data: { error }
        })}\n\n`)
      );
    },
    
    // Close the connection
    close: async () => {
      await writer.close();
    },
    
    // Get the readable stream
    getStream: () => stream.readable
  };
} 
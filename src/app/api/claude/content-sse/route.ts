import { NextRequest } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import { createSSEHandler } from "@/lib/api/sseHelper";

// Set a longer timeout for content generation
export const maxDuration = 60; // 60 seconds (max allowed on hobby plan)

export async function POST(request: NextRequest) {
  // Create SSE handler for real-time updates
  const sse = createSSEHandler();
  
  try {
    // Parse request body
    const body = await request.json();
    const { researchTopic, targetAudience, contentType, platform, research, tone = "informative" } = body;
    
    // Send initial progress update
    await sse.sendProgress(5, 'Initializing content generation...');
    
    // Validate required fields
    if (!contentType) {
      await sse.sendError('Content type is required');
      await sse.close();
      return new Response(sse.getStream(), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    await sse.sendProgress(10, 'Preparing content request...');
    
    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      await sse.sendError('Claude API key not configured');
      await sse.close();
      return new Response(sse.getStream(), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    console.log('Creating Anthropic client...');
    const client = new Anthropic({
      apiKey,
    });
    
    // Record start time
    const startTime = Date.now();
    
    // Setup progress tracking
    let progressStep = 10;
    const progressInterval = setInterval(async () => {
      // Increase progress up to 90% before completion
      if (progressStep < 90) {
        progressStep += 5; // Larger increments due to faster completion times
        
        // Select appropriate status message based on progress
        let statusMessage = 'Generating content...';
        
        if (progressStep < 30) {
          statusMessage = 'Analyzing research input...';
        } else if (progressStep < 60) {
          statusMessage = 'Crafting content structure...';
        } else if (progressStep < 80) {
          statusMessage = 'Refining language and style...';
        } else {
          statusMessage = 'Finalizing content...';
        }
        
        await sse.sendProgress(progressStep, statusMessage);
      }
    }, 1000); // Update every second due to faster generation
    
    // Build the prompt for Claude
    await sse.sendProgress(15, 'Building content generation prompt...');
    
    const researchPrompt = research 
      ? `Use this research as your main source of information:\n\n${research}`
      : "Generate content based on your knowledge of the topic.";
    
    const prompt = `Create a ${contentType} for ${targetAudience} about ${researchTopic} on ${platform}. 
    Make it ${tone} in tone.
    
    ${researchPrompt}
    
    ${getContentTypeInstructions(contentType, platform)}`;
    
    // Call Claude API
    await sse.sendProgress(20, 'Calling Claude 3.7 Sonnet for content generation...');
    console.log('Calling Claude API...');
    
    const response = await client.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4000,
      system: "You are a professional content creator and skilled copywriter specializing in creating high-quality, engaging content that resonates with specific audiences. Adapt your writing style to match the requested tone and platform. Focus on value, clarity, and engagement.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
    });
    
    // Clear the progress interval
    clearInterval(progressInterval);
    
    // Calculate actual time taken
    const endTime = Date.now();
    const timeTaken = endTime - startTime;
    
    // Extract the content text safely
    let contentText = '';
    if (response.content && response.content.length > 0) {
      // Claude API returns different content types
      // We need to handle them correctly
      const firstBlock = response.content[0];
      
      // Check for the type property
      if ('type' in firstBlock && firstBlock.type === 'text' && 'text' in firstBlock) {
        contentText = String(firstBlock.text);
      } else if ('text' in firstBlock) {
        // Direct text property
        contentText = String(firstBlock.text);
      } else {
        // Fallback: attempt to stringify the content
        contentText = JSON.stringify(firstBlock);
        console.log('Unable to extract text directly, using stringified content');
      }
    }
    
    console.log(`Content generated in ${timeTaken}ms, length: ${contentText.length} characters`);
    
    // Process and enhance the content
    await sse.sendProgress(95, 'Enhancing content quality...');
    
    // Log information about the generation
    console.log('Successfully generated content using research-driven approach', {
      contentType,
      platform,
      researchIncluded: !!research,
      contentLength: contentText.length
    });
    
    // Send completion event
    await sse.sendComplete({
      content: contentText
    });
    
    // Final progress update
    await sse.sendProgress(100, 'Content generation completed successfully!');
    
    // Close the SSE connection
    await sse.close();
    
    // Return the SSE stream
    return new Response(sse.getStream(), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error: any) {
    console.error('Error generating content:', error);
    
    // Send error to client
    await sse.sendError(error.message || 'Error generating content');
    
    // Close the SSE connection
    await sse.close();
    
    // Return the SSE stream with the error
    return new Response(sse.getStream(), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}

/**
 * Get specific instructions based on content type
 */
function getContentTypeInstructions(contentType: string, platform: string): string {
  switch (contentType.toLowerCase()) {
    case 'blog-post':
      return `
Create a well-structured blog post with:
- An attention-grabbing headline
- An engaging introduction that hooks the reader
- Properly formatted sections with subheadings
- Relevant examples or case studies
- A conclusion with a clear takeaway or call-to-action`;
    
    case 'social-post':
    case 'social-media':
    case 'social':
      const platformSpecific = getPlatformSpecificInstructions(platform);
      return `
Create a concise, engaging social media post that:
- Captures attention in the first few words
- Uses a conversational, authentic tone
- Includes relevant hashtags if appropriate
- Ends with a clear call-to-action

${platformSpecific}`;
    
    case 'email':
      return `
Create an email with:
- A compelling subject line (labeled as "Subject:")
- A personalized greeting
- Clear, scannable content with short paragraphs
- A specific call-to-action
- A professional signature`;
    
    case 'script':
    case 'video-script':
      return `
Create a video script with:
- A hook that grabs attention in the first 5-10 seconds
- Clear sections for introduction, main points, and conclusion
- Conversational language meant to be spoken aloud
- Visual cues for transitions or b-roll footage in [brackets]
- A strong call-to-action at the end`;
    
    default:
      return 'Create high-quality content with a clear structure, engaging opening, and valuable information for the audience.';
  }
}

/**
 * Get platform-specific instructions
 */
function getPlatformSpecificInstructions(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'twitter':
    case 'x':
      return 'Optimize for Twitter/X with concise text (under 280 characters) and impactful language.';
    
    case 'linkedin':
      return 'Optimize for LinkedIn with a professional tone and business-relevant insights.';
    
    case 'instagram':
      return 'Optimize for Instagram with visual descriptions and a focus on aesthetic elements.';
    
    case 'facebook':
      return 'Optimize for Facebook with conversational tone and community-building elements.';
    
    case 'tiktok':
      return 'Optimize for TikTok with very concise, trend-aware, and authentic language.';
    
    default:
      return 'Optimize for the specific platform requirements while maintaining engagement.';
  }
} 
/**
 * AI-Powered Follow-Up Questions Generator
 * 
 * This API route uses Claude 3.7 Sonnet to generate tailored follow-up questions
 * based on the specific content details provided by the user.
 */

import { Anthropic } from '@anthropic-ai/sdk';

// Constants
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

export async function POST(req: Request) {
  try {
    // Parse request body
    const body = await req.json();
    
    // Log request with transcript size instead of full content for privacy
    console.log('Questions API request received:', { 
      ...body,
      youtubeTranscript: body.youtubeTranscript 
        ? `[Transcript: ${body.youtubeTranscript.length} characters]` 
        : null 
    });

    // Extract all input parameters
    const {
      researchTopic,
      businessType,
      targetAudience,
      audienceNeeds,
      platform,
      contentType,
      isPersonalUseCase,
      youtubeTranscript,
      youtubeUrl,
      language = 'en' // Default to English if language not provided
    } = body;

    console.log('Language for follow-up questions:', language);

    // Validate essential inputs
    if (!researchTopic) {
      return new Response(JSON.stringify({ 
        error: 'Research topic is required',
        message: 'Please provide a research topic to generate questions'
      }), {
        status: 400,
      });
    }

    // Get and clean the API key 
    let apiKey = process.env.ANTHROPIC_API_KEY || '';
    apiKey = apiKey.replace(/\s+/g, '');
    
    // Validate API key
    if (apiKey.length < 30 || !apiKey.startsWith('sk-ant-api')) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Claude API key configuration',
          message: 'Please check your .env.local file to ensure the ANTHROPIC_API_KEY is correctly set without line breaks or extra spaces. It should start with "sk-ant-api".'
        }),
        { status: 500 }
      );
    }

    // Construct prompt based on the parameters and context
    let basePrompt = `Generate 5 research questions about ${researchTopic}.
These questions should help create ${isPersonalUseCase ? 'personal' : 'business'} content for ${platform}.
The target audience is ${targetAudience}${audienceNeeds ? ` who need ${audienceNeeds}` : ''}.
${isPersonalUseCase ? 'This is for personal content creation, not business marketing.' : ''}
${businessType && !isPersonalUseCase ? `This is for a ${businessType} business.` : ''}

Please make the questions specific and insightful, focusing specifically on ${researchTopic}.
The questions should help gather detailed information about effective practices, tips, strategies, and innovative approaches related to ${researchTopic}.

Return your response as a JSON object with this structure:
{
  "questions": [
    "First specific question about ${researchTopic}?",
    "Second specific question about ${researchTopic}?",
    "Third specific question about ${researchTopic}?",
    "Fourth specific question about ${researchTopic}?",
    "Fifth specific question about ${researchTopic}?"
  ]
}`;

    // Add language instruction for output language
    if (language === 'es') {
      basePrompt += `\n\nIMPORTANT: Your questions MUST be written in Spanish. All text in the response must be in Spanish, not English.`;
    } else if (language !== 'en') {
      basePrompt += `\n\nIMPORTANT: Your questions MUST be written in ${language}. All text in the response must be in ${language}, not English.`;
    }

    // Add YouTube transcript context if available
    const finalPrompt = youtubeTranscript
      ? `${basePrompt}\n\nAdditionally, consider this YouTube video transcript when generating questions:\n${youtubeTranscript.substring(0, 4000)}`
      : basePrompt;

    try {
      // Create Anthropic client
      const anthropic = new Anthropic({
        apiKey: apiKey,
      });
      
      // Call the Claude API
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        temperature: 0.7,
        system: "You are a helpful assistant. Please format your response as JSON when asked.",
        messages: [
          { role: "user" as const, content: finalPrompt }
        ]
      });
      
      // Extract text from response
      let responseText = '';
      if (response.content && Array.isArray(response.content)) {
        for (const content of response.content) {
          if (content.type === 'text' && typeof content.text === 'string') {
            responseText += content.text;
          }
        }
      }
      
      if (!responseText) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid response format from Claude API',
            message: 'The AI service returned an unexpected response format.'
          }),
          { status: 500 }
        );
      }
      
      // Parse the response to extract questions
      const questions = parseQuestionsFromResponse(responseText);
      
      if (!questions || questions.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No questions were found in the response',
            message: 'The AI failed to generate valid research questions. Please try again.'
          }),
          { status: 500 }
        );
      }
      
      return new Response(JSON.stringify({ questions }), { status: 200 });
    } catch (error: any) {
      console.error('Error calling Claude API:', error);
      
      // Enhanced error reporting
      const errorDetails = {
        message: error.message || 'Unknown error',
        status: error.status,
        type: error.type,
        error: error.error
      };
      
      // Handle specific error types
      if (error.status === 400) {
        return new Response(
          JSON.stringify({ 
            error: 'Bad request to Claude API',
            message: 'The request was rejected by Claude API: ' + error.message
          }), 
          { status: 500 }
        );
      }
      
      if (error.status === 401 || error.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Authentication error with Claude API',
            message: 'Please check your API key and permissions: ' + error.message
          }), 
          { status: 500 }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to generate questions: ${error.message}`,
          message: 'There was an error communicating with the Claude AI service.'
        }), 
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error in questions API route:', error);
    return new Response(
      JSON.stringify({ 
        error: `Internal server error: ${error.message}`,
        message: 'An unexpected error occurred while processing your request.'
      }), 
      { status: 500 }
    );
  }
}

/**
 * Extract questions from a text response if JSON parsing fails
 */
function extractQuestionsFromText(text: string): string[] {
  // Look for numbered lists (1. Question)
  const numberedPattern = /\d+\.\s+([^.?!]+\??)/g;
  let numberedMatches: string[] = [];
  let match;
  
  while ((match = numberedPattern.exec(text)) !== null) {
    if (match[1]) numberedMatches.push(match[1].trim());
  }
  
  if (numberedMatches.length >= 3) {
    return numberedMatches;
  }
  
  // Look for bulleted lists (- Question)
  const bulletPattern = /[-*•]\s+([^.?!]+\??)/g;
  let bulletMatches: string[] = [];
  
  while ((match = bulletPattern.exec(text)) !== null) {
    if (match[1]) bulletMatches.push(match[1].trim());
  }
  
  if (bulletMatches.length >= 3) {
    return bulletMatches;
  }
  
  // Look for question marks as a last resort
  const questionPattern = /([^.!?]+\?)/g;
  let questionMatches: string[] = [];
  
  while ((match = questionPattern.exec(text)) !== null) {
    if (match[1]) questionMatches.push(match[1].trim());
  }
  
  if (questionMatches.length >= 3) {
    return questionMatches;
  }
  
  return [];
}

/**
 * Parse questions from the AI response
 */
function parseQuestionsFromResponse(response: string): string[] {
  // First try to parse as JSON
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const parsedData = JSON.parse(jsonStr);
      
      if (parsedData && Array.isArray(parsedData.questions) && parsedData.questions.length > 0) {
        return parsedData.questions.filter((q: any) => typeof q === 'string' && q.trim().length > 0);
      }
    }
  } catch (error) {
    console.log('Failed to parse response as JSON, falling back to text extraction');
  }
  
  // Fall back to text extraction
  return extractQuestionsFromText(response);
} 
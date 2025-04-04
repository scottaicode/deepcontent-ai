import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { enhanceWithPersonaTraits, getPersonaDisplayName } from '@/app/lib/personaUtils';

// Constants - Using the correct Claude 3.7 Sonnet model identifier
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

/**
 * Call the Claude API to refine content with enhanced error handling and timeout management
 */
async function callClaudeWithLanguage(
  promptText: string, 
  apiKey: string, 
  systemMessage: string,
  style: string = 'professional',
  timeoutMs: number = 25000 // 25 second timeout
): Promise<string> {
  try {
    console.log('Creating Anthropic client...');
    const anthropicClient = new Anthropic({
      apiKey: apiKey,
      maxRetries: 2, // Add retries for resilience
    });
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timed out'));
      }, timeoutMs);
    });
    
    // Create the API call promise
    const apiCallPromise = anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      system: systemMessage,
      messages: [
        { role: "user", content: promptText }
      ]
    });
    
    // Race the API call against the timeout
    console.log('Calling Claude API with prompt...');
    const response = await Promise.race([apiCallPromise, timeoutPromise]) as Awaited<typeof apiCallPromise>;
    
    console.log('Claude API response received');
    
    // Process the response
    let responseText = "";
    if (response.content && Array.isArray(response.content) && response.content.length > 0) {
      const firstContent = response.content[0];
      if (typeof firstContent === 'string') {
        responseText = firstContent;
      } else if (firstContent && typeof firstContent === 'object') {
        if ('text' in firstContent && typeof firstContent.text === 'string') {
          responseText = firstContent.text;
        } else if ('type' in firstContent && firstContent.type === 'text' && 'text' in firstContent && typeof firstContent.text === 'string') {
          responseText = firstContent.text;
        }
      }
    }
    
    if (!responseText) {
      console.error('No response text found in Claude API response:', JSON.stringify(response));
      throw new Error('No response text found in Claude API response');
    }
    
    console.log('Response text length:', responseText.length);
    
    // Apply persona traits enhancement
    const enhancedContent = enhanceWithPersonaTraits(responseText, style, 1.5); // Higher intensity for refinements
    console.log(`Enhanced content with ${style} persona traits`);
    
    return enhancedContent;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        throw new Error('Request timed out. Please try a simpler refinement instruction.');
      } else if (error.message.includes('rate limit')) {
        throw new Error('Too many requests. Please try again in a few moments.');
      }
    }
    
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('Refine content API called');
    const body = await req.json();
    console.log('Request body received:', Object.keys(body));
    
    const { originalContent, feedback, contentType, platform, style, language, isSpanishMode } = body;
    
    // Log language parameter for debugging
    console.log('Language parameter received:', language || 'not specified, defaulting to English');
    console.log('Is Spanish mode:', isSpanishMode ? 'Yes' : 'No');
    
    if (!originalContent) {
      console.error('Missing originalContent in request');
      return NextResponse.json(
        { error: 'Missing originalContent in request' },
        { status: 400 }
      );
    }
    
    if (!feedback) {
      console.error('Missing feedback in request');
      return NextResponse.json(
        { error: 'Missing feedback in request' },
        { status: 400 }
      );
    }

    const personaName = getPersonaDisplayName(style || 'professional');
    
    // Get current date for reference
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString(language || 'en', { month: 'long' });

    // Simplified prompt for better performance
    const prompt = `<instructions>
${isSpanishMode ? '# IMPORTANTE: ESTA ES UNA SOLICITUD DE REFINAMIENTO EN ESPAÑOL' : ''}

## ORIGINAL CONTENT
${originalContent}

## USER FEEDBACK
${feedback}

## REFINEMENT INSTRUCTIONS
${isSpanishMode ? 
'1. Mantén el mismo estilo y tono del contenido original\n' +
'2. Aplica ÚNICAMENTE los cambios solicitados por el usuario\n' +
'3. Asegúrate de que el contenido suene natural en español\n' +
'4. El contenido DEBE estar en español'
:
'1. Maintain the same style and tone as the original content\n' +
'2. Apply ONLY the changes requested in the user feedback\n' +
'3. Ensure the content flows naturally and maintains consistency\n'
}

Return ONLY the refined content, ready for publication.
</instructions>`;

    // Get the API key from environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) {
      console.error('API key is not configured');
      return NextResponse.json(
        { error: 'API key is not configured' },
        { status: 500 }
      );
    }

    // Create simplified system message
    const systemMessage = isSpanishMode ?
      `Eres un experto en creación de contenido que refina textos en español según las instrucciones del usuario. TODAS TUS RESPUESTAS DEBEN ESTAR EN ESPAÑOL.` :
      `You are an expert content creator helping refine content based on user feedback.`;

    console.log('Calling Claude API...');
    // Call Claude API with extended timeout for Spanish content
    const timeoutMs = isSpanishMode ? 30000 : 25000; // 30 seconds for Spanish, 25 for English
    const refinedContent = await callClaudeWithLanguage(prompt, apiKey, systemMessage, style || 'professional', timeoutMs);
    console.log('Content refined successfully, length:', refinedContent.length);
    
    // Return the response as JSON
    return NextResponse.json({ content: refinedContent });
  } catch (error) {
    console.error('Error in refine-content API:', error);
    
    // More specific error messages
    let errorMessage = 'An unknown error occurred while refining the content';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle timeout errors specifically
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMessage = 'The request timed out. Please try a simpler refinement instruction.';
        statusCode = 504;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 
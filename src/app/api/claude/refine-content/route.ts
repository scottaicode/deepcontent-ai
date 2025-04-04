import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { enhanceWithPersonaTraits, getPersonaDisplayName } from '@/app/lib/personaUtils';

// Constants - Using the correct Claude model identifier
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Set increased route config for timeout - extending to 5 minutes max (like content generation)
export const maxDuration = 300; // 5 minutes maximum (limit for Vercel Pro plan)
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0; // No revalidation

// Optimize for speed in serverless environment (Vercel has 15s timeout for hobby tier)
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

    // Get API key immediately to fail fast if not present
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) {
      console.error('API key is not configured');
      return NextResponse.json(
        { error: 'API key is not configured' },
        { status: 500 }
      );
    }

    // Create the Anthropic client with optimal settings
    console.log('Creating Anthropic client...');
    const anthropicClient = new Anthropic({
      apiKey: apiKey,
      maxRetries: 0, // Disable retries to prevent timeouts
    });
    
    // Ultra-simplified prompt for better performance - remove all excess
    const prompt = `<content>${originalContent}</content>
<feedback>${feedback}</feedback>

${isSpanishMode ? 'Aplica este feedback al contenido en español. Mantén el estilo y tono original. Responde SOLO con el contenido revisado.' : 'Apply this feedback to the content. Maintain the original style and tone. Reply ONLY with the revised content.'}`;

    // Create simplified system message - extremely minimal
    const systemMessage = isSpanishMode ?
      `Eres un editor de contenido en español. RESPONDE ÚNICAMENTE CON EL TEXTO EDITADO, SIN EXPLICACIONES.` :
      `You are a content editor. RESPOND ONLY WITH THE EDITED TEXT, NO EXPLANATIONS.`;

    console.log('Calling Claude API with minimal prompt...');
    
    // Set maximum token limit based on original content length to speed processing
    const estimatedMaxTokens = Math.min(
      Math.max(originalContent.length / 4, 1000), // At least 1000 tokens, but scale with content
      4000 // Cap at 4000
    );
    
    // Set longer timeout for generation
    const startTime = Date.now();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Claude API request timed out after 5 minutes')), 300000); // 5 minute timeout
    });
    
    // Create the API request promise
    const apiRequestPromise = anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: Math.round(estimatedMaxTokens),
      temperature: 0.4, // Lower temperature for more predictable, faster responses
      system: systemMessage,
      messages: [{ role: "user", content: prompt }]
    });
    
    // Race the API request against the timeout
    const response = await Promise.race([apiRequestPromise, timeoutPromise]) as Awaited<typeof apiRequestPromise>;
    
    const responseTime = Date.now() - startTime;
    console.log(`Refinement completed in ${responseTime}ms`);
    
    // Process the response - simplified parsing
    let refinedContent = "";
    if (response.content && Array.isArray(response.content) && response.content.length > 0) {
      const firstContent = response.content[0];
      if (typeof firstContent === 'object' && 'text' in firstContent) {
        refinedContent = firstContent.text;
      } else if (typeof firstContent === 'string') {
        refinedContent = firstContent;
      }
    }
    
    if (!refinedContent) {
      console.error('No response text found in Claude API response');
      return NextResponse.json(
        { error: 'No content was generated' },
        { status: 500 }
      );
    }
    
    console.log('Content refined successfully, length:', refinedContent.length);
    
    // Skip persona traits enhancement for speed - just return the raw content
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
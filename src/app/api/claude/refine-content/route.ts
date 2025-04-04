import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { enhanceWithPersonaTraits, getPersonaDisplayName } from '@/app/lib/personaUtils';

// Constants - Using the correct Claude 3.7 Sonnet model identifier
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

/**
 * Call the Claude API to refine content based on feedback
 */
async function callClaudeApi(promptText: string, apiKey: string, style: string = 'professional', language: string = 'en'): Promise<string> {
  try {
    console.log('Creating Anthropic client...');
    console.log('Language for Claude API:', language);
    
    // Create Anthropic client with timeout
    const anthropicClient = new Anthropic({
      apiKey: apiKey,
      maxRetries: 2, // Add retries to handle transient failures
    });
    
    // Get current date for reference
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString(language || 'en', { month: 'long' });
    
    console.log('Calling Claude API with prompt...');
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Claude API request timed out after 30 seconds'));
      }, 30000); // 30 second timeout
    });
    
    // Create the actual API call promise
    const apiCallPromise = anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      system: `You are an expert content creator helping refine content based on user feedback. 
Keep your response concise and focused on the requested changes.
Your response MUST be in ${language === 'es' ? 'Spanish' : language || 'English'}.
${language === 'es' ? 'IMPORTANTE: Escribe en español natural y fluido.' : ''}`,
      messages: [
        { role: "user", content: promptText }
      ]
    });
    
    // Race the API call against the timeout
    const response = await Promise.race([apiCallPromise, timeoutPromise]);
    
    console.log('Claude API response received');
    console.log('Response structure:', JSON.stringify(Object.keys(response)));
    
    // Process the response with more robust error handling
    let responseText = "";
    
    try {
      if (response.content && Array.isArray(response.content)) {
        console.log('Content array length:', response.content.length);
        
        for (const item of response.content) {
          if (typeof item === 'string') {
            responseText += item;
          } else if (item && typeof item === 'object') {
            if ('text' in item && typeof item.text === 'string') {
              responseText += item.text;
            } else if ('type' in item && item.type === 'text' && 'text' in item && typeof item.text === 'string') {
              responseText += item.text;
            }
            // Log all keys in the item for debugging
            console.log('Content item keys:', Object.keys(item));
          }
        }
      }
    } catch (parseError) {
      console.error('Error parsing Claude API response content:', parseError);
      // Attempt direct access as fallback
      if (response.content) {
        const content = response.content;
        if (Array.isArray(content) && content[0] && typeof content[0] === 'object' && 'text' in content[0]) {
          responseText = content[0].text;
        }
      }
    }
    
    if (!responseText) {
      console.error('No response text found in Claude API response:', JSON.stringify(response));
      throw new Error('No response text found in Claude API response');
    }
    
    console.log('Response text length:', responseText.length);
    console.log('Language used for content:', language);
    console.log('First 100 chars of response:', responseText.substring(0, 100));
    
    // Normalize line endings and clean up extra whitespace
    responseText = responseText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    
    // Apply persona traits enhancement - reduced intensity for faster processing
    const enhancedContent = enhanceWithPersonaTraits(responseText, style, 1.0);
    console.log(`Enhanced content with ${style} persona traits`);
    
    return enhancedContent;
  } catch (error) {
    console.error("❌ Error calling Claude API:", error);
    
    // Check for specific Anthropic API errors
    if (error instanceof Error) {
      const errorMessage = error.message;
      
      // Handle timeout specifically
      if (errorMessage.includes('timed out')) {
        throw new Error(language === 'es' 
          ? 'La solicitud a Claude API agotó el tiempo de espera. Por favor, intenta con un texto más corto o inténtalo de nuevo más tarde.'
          : 'Claude API request timed out. Please try with shorter text or try again later.');
      }
      
      // Handle authentication errors specifically
      if (errorMessage.includes('apiKey') || 
          errorMessage.includes('authentication') || 
          errorMessage.includes('401') || 
          errorMessage.includes('auth')) {
        throw new Error(language === 'es' 
          ? 'Error de autenticación con la API de Claude. Por favor, verifica tu clave API.' 
          : 'Authentication error with Claude API. Please verify your API key.');
      }
      
      // Handle rate limiting
      if (errorMessage.includes('rate') || errorMessage.includes('429')) {
        throw new Error(language === 'es'
          ? 'Límite de tasa excedido en la API de Claude. Por favor, inténtalo más tarde.'
          : 'Rate limit exceeded on Claude API. Please try again later.');
      }
    }
    
    // Re-throw the original error with helpful context
    throw new Error(language === 'es'
      ? `Error al procesar la respuesta de Claude: ${error instanceof Error ? error.message : 'Error desconocido'}`
      : `Error processing Claude response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(req: NextRequest) {
  console.log('⭐️ REFINE API START ⭐️');
  const startTime = Date.now();
  
  // Declare language variable at the top scope so it's available in the catch block
  let language = 'en';
  
  try {
    console.log('Refine content API called');
    const body = await req.json();
    console.log('Request body received:', Object.keys(body));
    
    const { originalContent, feedback, contentType, platform, style, researchData } = body;
    
    // Assign to outer language variable so it's available in catch blocks
    language = body.language || 'en';
    
    // Log language parameter for debugging
    console.log('Language parameter received:', language);
    
    if (!originalContent) {
      console.error('Missing originalContent in request');
      return NextResponse.json(
        { error: language === 'es' ? 'Falta el contenido original en la solicitud' : 'Missing originalContent in request' },
        { status: 400 }
      );
    }
    
    if (!feedback) {
      console.error('Missing feedback in request');
      return NextResponse.json(
        { error: language === 'es' ? 'Faltan comentarios en la solicitud' : 'Missing feedback in request' },
        { status: 400 }
      );
    }

    const personaName = getPersonaDisplayName(style || 'professional');
    
    // Get current date for reference
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString(language || 'en', { month: 'long' });

    // Add persona-specific instructions
    let personaInstructions = '';
    if (style === 'ariastar') {
      personaInstructions = `## IMPORTANT: YOU ARE ARIASTAR
As AriaStar, your primary persona characteristics:
- You are a witty, relatable content creator speaking to your audience in a conversational, friendly tone
- You write authentically in first person as someone who's "been there" and understands the challenges
- Your content follows a specific pattern: hook → relatable analogy → simplification → benefits → CTA → memorable closer
- Your writing has distinctive markers: strategic emojis (✨💫🔥), bullet points (•), short paragraphs, and unexpected analogies

YOUR VOICE MUST INCLUDE THESE ELEMENTS:
- Start with a relatable hook or question that creates an "aha" moment
- Include a creative analogy that makes complex concepts feel simple and approachable
- Write at a 4th-grade reading level with short sentences and paragraphs
- Use specific AriaStar phrases like "Here's my wild truth", "Think of this like...", or "The game-changer that makes everything else seem ordinary"
- End with a memorable P.S. or unexpected insight that leaves the reader smiling

## ARIASTAR ENHANCED VOICE ELEMENTS (MARCH 2025 UPDATE)

### EMOTIONAL ARC (REQUIRED)
Create a clear emotional journey:
- BEGIN: Acknowledge a real frustration/struggle your reader is experiencing (first 1/3 of content)
- MIDDLE: Reveal the insight or "aha moment" that changes everything (middle 1/3)
- END: Describe the emotional payoff - how they'll feel once they implement your advice (final 1/3)

### PERSONAL STORY INTEGRATION
Weave your own journey throughout the content:
- Share a specific personal experience related to the topic
- Use phrases like "When I first tried this..." or "My own journey with this started..."
- Connect your personal example to the reader's situation
- Reference back to your story when presenting solutions

### "TOGETHER" LANGUAGE 
Create a sense of solidarity with:
- Validating phrases: "I see you trying to make this work" or "If you're nodding right now..."
- Reassurance: "You're not alone in this" or "We've all been there"
- Use "we" and "us" strategically to create community
- Acknowledge shared struggles: "That feeling when you think you're the only one? Not true."

### SIGNATURE BOOKMARK PHRASES
Use these transition phrases consistently throughout:
- New sections: "✨ Let's talk about [topic] ✨"
- Key insights: "Here's my wild truth:"
- Main takeaways: "The game-changer here?"
- Action steps: "Your next simple shift:"
- Examples: "Picture this scenario:"

### INTERACTIVE QUESTIONS
Include questions that invite mental participation:
- "Which of these challenges sounds most like your day?"
- "Have you ever found yourself staring at your screen wondering where the day went?"
- "What if you could get back 5 hours of your week - what would you do with that time?"
- "Does any of this sound familiar, or is it just me?"

### SECTION OPENINGS
Begin each major section/point using one of these patterns:
- Pain point: "Ever find yourself drowning in [topic] options but still feeling stuck?"
- Contrast: "Unlike typical [topic] approaches that just add more complexity, here's a fresh perspective."
- Question: "What if your approach to [topic] could actually create more joy, not just more output?"
- Story: "I used to think mastering [topic] meant doing more, faster. Then something changed."
- Stat: "Did you know that [X%] of professionals struggle with [problem]? You're not alone."

### MEMORABLE P.S.
End with a P.S. that reinforces your main message:
- Connect to the emotional transformation: "Your future self is already thanking you!"
- Provide one final simple insight: "Remember, the magic happens when we choose quality over quantity."
- Offer reassurance for those still feeling overwhelmed: "Start with just ONE change. That's how every transformation begins."

TONE CHECKLIST (include at least 4):
- At least one engaging question or exclamation
- At least one creative analogy or comparison
- Some short, simple sentences (under 20 characters)
- Short paragraphs (under 100 characters)
- Positive, energetic language
- "Together" language that creates connection
- Personal story element
- Clear emotional arc from frustration to solution

WHEN REFINING CONTENT:
- Preserve any existing personal stories but enhance them with more specific details if needed
- Ensure the emotional arc is complete and flows naturally throughout the piece
- Check that all major sections use one of the signature openings
- Verify the content ends with a strong P.S. that reinforces the main message
- Add interactive questions if there aren't enough
- Incorporate "together" language to create connection with the reader
`;
    }

    // Build a comprehensive prompt that preserves context and emphasizes current best practices
    const prompt = `<instructions>
You are ${personaName}, refining content based on user feedback. 

Original Content:
${originalContent}

User Feedback:
${feedback}

Content Type: ${contentType || 'Not specified'}
Platform: ${platform || 'Not specified'}

IMPORTANT: Write in ${language === 'es' ? 'Spanish' : language || 'English'}.
${language === 'es' ? 'Escribe en español natural y fluido.' : ''}

TASK: Revise the content applying the user's feedback while maintaining the original style and purpose.
Keep your response focused on the content only.
</instructions>`;

    // Get the API key from environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) {
      console.error('API key is not configured');
      return new Response(JSON.stringify({ 
        error: language === 'es' ? 'La clave API no está configurada' : 'API key is not configured' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Calling Claude API with language:', language || 'en');
    // Call Claude API with style parameter and handle timeouts
    try {
      // Add overall function timeout as a backup
      const functionTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Function timeout after 50 seconds'));
        }, 50000); // 50 second timeout - leave buffer before Vercel's 60s timeout
      });
      
      // API call wrapped in a Promise.race with the timeout
      const apiCallPromise = async () => {
        const refinedContent = await callClaudeApi(prompt, apiKey, style || 'professional', language || 'en');
        console.log('Content refined successfully, length:', refinedContent.length);
        
        // Simplify response to avoid JSON parsing issues
        // Use a simple object with minimal nesting
        const simpleResponse = { content: refinedContent };
        
        console.log('Returning response with content length:', refinedContent.length);
        
        return new Response(JSON.stringify(simpleResponse), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          }
        });
      };
      
      // Race the API call against the function timeout
      return await Promise.race([apiCallPromise(), functionTimeoutPromise]);
    } catch (claudeError) {
      console.error('❌ Claude API specific error:', claudeError);
      
      let errorMessage = language === 'es' 
        ? 'Error al comunicarse con la API de Claude. Por favor, inténtalo de nuevo.' 
        : 'Error communicating with Claude API. Please try again.';
        
      // Specific error message for timeouts
      if (claudeError instanceof Error && claudeError.message.includes('timeout')) {
        errorMessage = language === 'es'
          ? 'La solicitud tardó demasiado tiempo. Por favor, intenta con un texto más corto o inténtalo de nuevo.'
          : 'Request took too long. Please try with shorter text or try again.';
      }
      
      // Return a simple error response that can be easily parsed
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 504, // Gateway Timeout for timeout errors
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
  } catch (outerError) {
    console.error('❌ Outer error in refine-content API:', outerError);
    console.log(`⏱ Outer error occurred after ${Date.now() - startTime}ms`);
    
    // Extract more detailed error information based on the type of error
    let errorMessage = language === 'es' 
      ? 'Ocurrió un error desconocido al refinar el contenido' 
      : 'An unknown error occurred while refining the content';
    let statusCode = 500;
    
    if (outerError instanceof Error) {
      errorMessage = outerError.message;
      
      // Check for specific API errors and provide localized messages
      if (outerError.message.includes('API key')) {
        errorMessage = language === 'es'
          ? 'Error de clave API - verifica tu configuración de API'
          : 'API key error - please check your API configuration';
      } else if (outerError.message.includes('rate limit')) {
        errorMessage = language === 'es'
          ? 'Límite de velocidad excedido. Por favor, inténtalo de nuevo en unos minutos'
          : 'Rate limit exceeded. Please try again in a few minutes';
        statusCode = 429;
      } else if (outerError.message.includes('timeout')) {
        errorMessage = language === 'es'
          ? 'La solicitud agotó el tiempo de espera. Por favor, inténtalo de nuevo'
          : 'Request timed out. Please try again';
        statusCode = 408;
      } else if (outerError.message.includes('token')) {
        errorMessage = language === 'es'
          ? 'Contenido demasiado largo para procesar. Por favor, intenta con contenido más corto'
          : 'Content too long for processing. Please try with shorter content';
        statusCode = 413;
      }
    }
    
    console.error('🚨 Returning outer error response:', errorMessage, statusCode);
    
    try {
      // Ensure valid JSON is returned even for outer errors
      const safeErrorResponse = JSON.stringify({ error: errorMessage });
      console.log(`📦 Error JSON response: ${safeErrorResponse}`);
      console.log('⭐️ REFINE API END - OUTER ERROR ⭐️');
      
      return new Response(safeErrorResponse, {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (jsonError) {
      console.error('💥 Critical error - Failed to create JSON error response:', jsonError);
      // Last resort plain text response
      return new Response('{"error":"Critical server error"}', {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
} 
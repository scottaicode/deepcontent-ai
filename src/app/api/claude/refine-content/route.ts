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
    const anthropicClient = new Anthropic({
      apiKey: apiKey,
    });
    
    // Get current date for reference
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString(language || 'en', { month: 'long' });
    
    console.log('Calling Claude API with prompt...');
    const response = await anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      system: `You are an expert content creator helping refine content based on user feedback. 
You follow all current best practices for ${currentMonth} ${currentYear} and prioritize mobile-first design (75% weighting), voice search optimization, and E-E-A-T 2.0 documentation requirements in all content refinements.
Your response MUST be in ${language === 'es' ? 'Spanish' : language || 'English'}.
${language === 'es' ? 'Asegúrate de que todo tu contenido esté en español natural y fluido, no una traducción literal del inglés.' : ''}`,
      messages: [
        { role: "user", content: promptText }
      ]
    });
    
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
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('Refine content API called');
    const body = await req.json();
    console.log('Request body received:', Object.keys(body));
    
    const { originalContent, feedback, contentType, platform, style, researchData, language } = body;
    
    // Log language parameter for debugging
    console.log('Language parameter received:', language || 'not specified, defaulting to English');
    
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
You are ${personaName}, refining content based on user feedback. Below is the original content, research data, and the user's feedback. 
Apply the feedback while maintaining the style, tone, and purpose of the original content.

${personaInstructions}

Original Content:
${originalContent}

User Feedback:
${feedback}

Content Type: ${contentType || 'Not specified'}
Platform: ${platform || 'Not specified'}
Style: ${style || 'professional'}
Current Date: ${currentMonth} ${currentYear}
Language: ${language || 'en'}

## CRITICAL INSTRUCTIONS
The content MUST be written in ${language === 'es' ? 'Spanish' : language || 'English'}.
${language === 'es' ? 'Asegúrate de que el contenido esté completamente en español y use expresiones naturales en español, no traducciones literales del inglés.' : ''}

## CRITICAL PLATFORM-SPECIFIC INSTRUCTIONS FOR ${currentMonth.toUpperCase()} ${currentYear}
You MUST follow the current best practices for ${platform || 'digital content'} as of ${currentMonth} ${currentYear}.

${researchData ? `## RESEARCH DATA (MARCH ${currentYear})
${researchData}

IMPORTANT: Ensure your refinements align with the latest best practices identified in this research data.
` : ''}

${contentType && contentType.includes('google-ads') ? `## GOOGLE ADS SPECIFIC REQUIREMENTS FOR ${currentMonth.toUpperCase()} ${currentYear}
Maintain Google Ads format with:
- Responsive Search Ads: 15 headlines (30 character max each), 4 descriptions (90 character max each)
- Performance Max campaign assets where applicable
- Mobile-first optimization (75% weight)
- Voice search optimization patterns
- Smart bidding strategy recommendations
- Negative keyword suggestions to prevent wasteful spend
- Audience signal recommendations for broad match keywords
- AI-generated assets settings guidelines
- Current policy compliance requirements
- Latest conversion tracking implementation advice
- E-E-A-T 2.0 documentation requirements
` : ''}

${contentType && contentType.includes('landing-page') ? `## LANDING PAGE SPECIFIC REQUIREMENTS FOR ${currentMonth.toUpperCase()} ${currentYear}
Maintain landing page best practices:
- Mobile-first design requirements (75% weighting)
- Schema markup recommendations
- FAQ-rich content blocks optimized for voice search
- E-E-A-T 2.0 documentation elements
` : ''}

${contentType && contentType.includes('research-report') ? `## RESEARCH REPORT SPECIFIC REQUIREMENTS FOR ${currentMonth.toUpperCase()} ${currentYear}
Maintain research report professional standards:
- Executive summary with key findings (limit to 250 words)
- Clear methodology section with data collection methods and limitations
- Data visualization descriptions with specific metrics and insights
- Statistical validity indicators for all reported findings
- Competitive analysis with precise market share figures
- Citations following current academic standards
- "Currency Notice" indicating data collection timeframe
- Elimination of placeholder language or vague references
- Consistent formatting of headings, subheadings and sections
- Balanced perspective addressing potential biases in the research
` : ''}

## CONTENT QUALITY REQUIREMENTS
DO NOT use repetitive or filler phrases. Each sentence should provide unique value and information.
Avoid phrases like:
- "Let's analyze what's happening here"
- "The data points are clear"
- "According to the latest statistics" without actually providing statistics
- "The numbers tell an interesting story" without explaining what the story is
- "The trend emerges when we map the data" without describing the trend
- "Let's talk about" without adding substantive content

IF you need to reference data visualization:
- Describe SPECIFIC metrics and numbers that would be shown
- Use precise values (X increased by 42% over Y period)
- Explain exactly what the visualization reveals
- Imagine you're describing a real visual to someone who cannot see it

AVOID GENERIC PLACEHOLDERS like "Let's analyze what's happening here".
Each sentence must move the content forward with new information.

Make targeted changes based on the feedback while preserving the overall structure and quality.
You MUST maintain the same persona voice and distinctive style markers that were in the original content.
Remember that digital best practices change rapidly - what worked even a few months ago may be ineffective now.

## QUALITY CHECK REQUIREMENTS
Before submitting your final content:
1. Review for any repetitive phrases or sentences - each sentence should provide unique value
2. Replace any generic placeholder text with specific, substantive content
3. Ensure all data references include actual numbers or percentages
4. Check that visualization descriptions include specific metrics and trends
5. Verify that your content follows a logical flow without unnecessary repetition

Return ONLY the revised content, ready for publication.
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

    console.log('Calling Claude API...');
    // Call Claude API with style parameter
    const refinedContent = await callClaudeApi(prompt, apiKey, style || 'professional', language || 'en');
    console.log('Content refined successfully, length:', refinedContent.length);
    
    // Return the response as JSON
    return NextResponse.json({ content: refinedContent });
  } catch (error) {
    console.error('Error in refine-content API:', error);
    
    // Extract more detailed error information based on the type of error
    let errorMessage = 'An unknown error occurred while refining the content';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific Anthropic API errors
      if (error.message.includes('API key')) {
        errorMessage = 'API key error - please check your API configuration';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again in a few minutes';
        statusCode = 429;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again';
        statusCode = 408;
      } else if (error.message.includes('token')) {
        errorMessage = 'Content too long for processing. Please try with shorter content';
        statusCode = 413;
      }
    }
    
    console.error('Returning error response:', errorMessage, statusCode);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 
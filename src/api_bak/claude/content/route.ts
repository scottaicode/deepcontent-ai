import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { enhanceWithPersonaTraits, getPersonaDisplayName, getPersonaTemplate } from '@/app/lib/personaUtils';
import { verifyResearchQuality } from '@/app/lib/middleware/researchGuard';

// Constants - Using the correct Claude 3.7 Sonnet model identifier
// From official Anthropic API docs: https://docs.anthropic.com/en/api/getting-started
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// First, update the request interface to include YouTube-related fields
interface ContentGenerationRequest {
  contentType: string;
  platform: string;
  audience: string;
  prompt?: string;
  context?: string;
  researchData?: string;
  youtubeTranscript?: string;
  youtubeUrl?: string;
  style?: string;
  language?: string;
  styleIntensity?: number;
}

/**
 * Post-process content to remove template language and placeholders
 */
function removeTemplateLanguage(content: string): string {
  // Detect and replace template markers
  return content
    // Remove "How This Works" template blocks if they still contain placeholders
    .replace(/How This Works:.*\[technical explanation\].*\[accessible explanation\].*\[ethical implication\]/g, '')
    // Replace variations of placeholder patterns
    .replace(/\[technical explanation\]/g, '')
    .replace(/\[accessible explanation\]/g, '')
    .replace(/\[ethical implication\]/g, '')
    // Spanish language pattern variations
    .replace(/Cómo funciona esto:.*\[explicación técnica\].*\[explicación accesible\].*\[implicación ética\]/g, '')
    .replace(/\[explicación técnica\]/g, '')
    .replace(/\[explicación accesible\]/g, '')
    .replace(/\[implicación ética\]/g, '')
    // Clean up any resulting double spaces or empty lines
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Call the Claude API to generate content
 */
async function callClaudeApi(promptText: string, apiKey: string, style: string = 'professional', language: string = 'en', styleIntensity: number = 1): Promise<string> {
  try {
    console.log("Creating Anthropic client...");
    const anthropicClient = new Anthropic({
      apiKey: apiKey,
    });
    
    // Get current date for reference
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    
    // Enhanced system prompt with stronger emphasis on current information
    let systemPrompt = `You are an expert content marketing writer with access to up-to-date information as of ${currentMonth} ${currentYear}.

FOR EACH PLATFORM AND CONTENT TYPE YOU DISCUSS:
1. Reference ONLY tactics and best practices that are working RIGHT NOW (${currentMonth} ${currentYear})
2. Explicitly note which practices are newly effective in the past 1-2 months
3. Highlight which older tactics have declined in effectiveness recently
4. Include specific metrics and data points WITH THEIR PUBLICATION DATES to prove currency
5. Cite specific platform updates and algorithm changes from the past 90 days that affect content performance

Your expertise MUST reflect the absolute latest digital marketing knowledge. Outdated advice is worse than no advice.`;
    
    // Add language instruction to system prompt
    if (language && language !== 'en') {
      systemPrompt += ` IMPORTANT: Generate all content in ${language === 'es' ? 'Spanish' : language} language.`;
    }
    
    console.log("Calling Claude API...");
    const response = await anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        { role: "user", content: promptText }
      ]
    });
    
    // Process the response - handle different possible response structures
    let responseText = "";
    if (response.content && Array.isArray(response.content) && response.content.length > 0) {
      // Check for different possible response structures
      const firstContent = response.content[0];
      if (typeof firstContent === 'string') {
        responseText = firstContent;
      } else if (firstContent && typeof firstContent === 'object') {
        // Handle text property if it exists
        if ('text' in firstContent && typeof firstContent.text === 'string') {
          responseText = firstContent.text;
        }
      }
    }
    
    console.log(`Response received, length: ${responseText.length} characters`);
    
    // First, remove any template language from the content
    responseText = removeTemplateLanguage(responseText);
    
    // Then enhance the content with persona-specific traits
    const enhancedContent = enhanceWithPersonaTraits(responseText, style, styleIntensity, language);
    console.log(`Enhanced content with ${style} persona traits`);
    
    // Final check for any remaining template language
    return removeTemplateLanguage(enhancedContent);
  } catch (error) {
    console.error("Error calling Claude API:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const {
      contentType,
      platform,
      audience,
      researchData = '',
      youtubeTranscript = '',
      youtubeUrl = '',
      prompt = '',
      style = 'professional',
      language = 'en',
      styleIntensity = 0.7,
      // Add presentation-specific settings
      slideCount = 10,
      presentationFormat = 'informative',
      technicalLevel = 'balanced',
      includeExecutiveSummary = false,
      includeActionItems = false,
      includeDataVisualizations = false
    } = requestBody;
    
    // Validate that language is a supported value
    const supportedLanguages = ['en', 'es']; // Can expand this list in the future
    const safeLanguage = supportedLanguages.includes(language) ? language : 'en';
    
    console.log(`Content generation requested with style: ${style}, language: ${safeLanguage}`);
    if (contentType.includes('business-presentation') || platform.includes('presentation')) {
      console.log(`Presentation settings: format=${presentationFormat}, technicalLevel=${technicalLevel}, slideCount=${slideCount}`);
    }
    
    // Validate input data
    if (!contentType || !platform || !audience) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Sanitize input data (very basic example)
    const safeContentType = contentType.replace(/[^\w\s-]/gi, '');
    const safePlatform = platform.replace(/[^\w\s-]/gi, '');
    const safeAudience = audience.replace(/[^\w\s-]/gi, '');
    const safePrompt = prompt || '';
    const safeResearch = researchData || '';
    const safeYoutube = youtubeTranscript || '';

    // Check research quality if present
    if (safeResearch) {
      const { valid, issues } = verifyResearchQuality(safeResearch);
      if (!valid) {
        // Log warnings instead of blocking the request
        console.warn(`Research quality check identified issues: ${issues.join(', ')}`);
        // Continue with processing despite issues
      }
    }

    // Build prompt with all available context
    const promptText = buildPrompt(
      safeContentType, 
      safePlatform, 
      safeAudience, 
      safeResearch, 
      safeYoutube, 
      safePrompt, 
      style,
      safeLanguage,
      // Pass presentation-specific settings
      contentType.includes('business-presentation') || platform.includes('presentation') ? {
        slideCount,
        presentationFormat,
        technicalLevel,
        includeExecutiveSummary,
        includeActionItems,
        includeDataVisualizations
      } : undefined
    );

    // Initialize the Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });

    // Generate the content with Claude
    const completion = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: styleIntensity,
      system: "You are Claude, an AI assistant created by Anthropic to be helpful, harmless, and honest. In this conversation, you will generate high-quality content for a user based on their specifications.",
      messages: [
        {
          role: "user",
          content: promptText
        }
      ]
    });

    // Extract the content response
    let content = '';
    if (completion.content && completion.content.length > 0) {
      const contentBlock = completion.content[0];
      if ('text' in contentBlock) {
        content = contentBlock.text;
      }
    }

    // Remove any template language from the content
    content = removeTemplateLanguage(content);

    // Enhance the response with persona-specific traits if a style is specified
    let enhancedContent = content;
    if (style && style !== 'professional') {
      const personaName = getPersonaDisplayName(style);
      enhancedContent = enhanceWithPersonaTraits(content, style, styleIntensity, safeLanguage);
    }

    // Final check for any remaining template language
    enhancedContent = removeTemplateLanguage(enhancedContent);

    // Return the generated content
    return NextResponse.json({ content: enhancedContent });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}

/**
 * Build a prompt for Claude to generate content
 */
function buildPrompt(safeContentType: string, safePlatform: string, safeAudience: string, researchData: string, youtubeTranscript: string, prompt: string, style: string = 'professional', language: string = 'en', presentationSettings?: any): string {
  // Add current year and month variables
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  
  let promptText = '';
  
  // Add language instruction
  if (language && language !== 'en') {
    promptText += `## LANGUAGE INSTRUCTION
IMPORTANT: Generate ALL content in ${language === 'es' ? 'Spanish' : language} language.

`;
  }
  
  // Add style-specific instructions using the centralized template generator
  if (style && style !== 'professional') {
    const personaTemplate = getPersonaTemplate(style, language);
    if (personaTemplate) {
      promptText += personaTemplate + '\n\n';
    }
  }
  
  // Add platform-specific formatting recommendations with emphasis on current trends
  promptText += `## PLATFORM BEST PRACTICES FOR ${safePlatform.toUpperCase()} (${currentMonth.toUpperCase()} ${currentYear})
Your content must follow the ABSOLUTE LATEST best practices for ${safePlatform} as of ${currentMonth} ${currentYear}.
DO NOT rely on outdated best practices from even 2-3 months ago.
`;

  // Replace hardcoded best practices with instructions to source current information
  if (safePlatform.includes('instagram')) {
    promptText += `Instagram content should follow ALL the latest best practices for ${currentMonth} ${currentYear}.
Rather than relying on generic advice, make sure to include:
- The CURRENT character limits for all content types as of THIS MONTH
- Any algorithm changes announced or observed in the past 90 days
- Current engagement patterns based on the most recent data available
- New features rolled out in the past quarter and how to leverage them
- Content formats that are receiving the highest reach RIGHT NOW

`;
  } else if (safePlatform.includes('linkedin')) {
    promptText += `LinkedIn content should follow ALL the latest best practices for ${currentMonth} ${currentYear}.
Rather than relying on generic advice, make sure to include:
- The CURRENT algorithm preferences for content as of THIS MONTH
- Any changes to visibility factors in the past 90 days
- Current character counts and formatting limitations
- New features rolled out in the past quarter and how to leverage them
- Content formats that are receiving the highest engagement RIGHT NOW

`;
  } else if (safePlatform.includes('facebook')) {
    promptText += `Facebook content should follow ALL the latest best practices for ${currentMonth} ${currentYear}.
Rather than relying on generic advice, make sure to include:
- The CURRENT algorithm preferences for content types as of THIS MONTH
- Any major platform changes in the past 90 days
- Current character counts and formatting limitations
- New features rolled out in the past quarter and how to leverage them
- Content formats that are receiving the highest engagement RIGHT NOW

`;
  } else if (safePlatform.includes('twitter') || safePlatform.includes('x.com')) {
    promptText += `Twitter/X content should follow ALL the latest best practices for ${currentMonth} ${currentYear}.
Rather than relying on generic advice, make sure to include:
- The CURRENT character limits and formatting options as of THIS MONTH
- Any platform changes or feature updates in the past 90 days
- Current engagement patterns based on the most recent data available
- New features rolled out in the past quarter and how to leverage them
- Content formats that are receiving the highest engagement RIGHT NOW

`;
  } else if (safePlatform.includes('blog') || safeContentType.includes('blog')) {
    promptText += `Blog content should follow ALL the latest best practices for ${currentMonth} ${currentYear}.
Rather than relying on generic advice, make sure to include:
- The CURRENT SEO best practices as of THIS MONTH
- Any major Google algorithm updates in the past 90 days
- Current formatting standards for optimal readability and engagement
- New industry trends in blog content structure and delivery
- Content formats that are receiving the highest engagement RIGHT NOW

`;
  } else if (safeContentType.includes('email')) {
    promptText += `Email content should follow ALL the latest best practices for ${currentMonth} ${currentYear}.
Rather than relying on generic advice, make sure to include:
- The CURRENT subject line and preview text best practices as of THIS MONTH
- Any major email client rendering changes in the past 90 days
- Current deliverability factors and spam triggers to avoid
- New industry trends in email engagement and conversion
- Content formats that are receiving the highest open and click rates RIGHT NOW

`;
  } else if (safeContentType.includes('video')) {
    promptText += `Video script content should follow ALL the latest best practices for ${currentMonth} ${currentYear}.
Rather than relying on generic advice, make sure to include:
- The CURRENT video platform algorithm preferences as of THIS MONTH
- Any major changes to recommended video formatting in the past 90 days
- Current optimal video lengths and structure for maximum engagement
- New industry trends in video content creation and distribution
- Content formats that are receiving the highest engagement RIGHT NOW

`;
  } else if (safeContentType.includes('landing-page')) {
    promptText += `## LANDING PAGE SPECIFIC REQUIREMENTS FOR ${currentMonth.toUpperCase()} ${currentYear}
Create landing page content following ${currentMonth} ${currentYear} best practices from the research.
Include:
- The CURRENT landing page structure best practices as of ${currentMonth} ${currentYear}
- Incorporate any new SEO or conversion rate optimization techniques from the past 90 days
- Follow the latest mobile-first design principles
- Implement conversion elements that are proven effective in recent studies
- Align with current user experience expectations and behaviors
`;
  } else if (safeContentType.includes('research-report')) {
    promptText += `## RESEARCH REPORT SPECIFIC REQUIREMENTS FOR ${currentMonth.toUpperCase()} ${currentYear}
Create a comprehensive research report following professional standards current as of ${currentMonth} ${currentYear}.
Include these components:
- Executive summary with key findings (limit to 250 words)
- Detailed methodology section explaining data collection and analysis techniques
- Current industry benchmarks with comparative analysis
- Data visualizations described with specific metrics (not placeholder language)
- Statistical significance indicators where applicable
- Market segment breakdown with actionable insights for each segment
- Competitive landscape analysis with market share data
- Future trend predictions with confidence levels
- Citations following current academic standards
- Appendix with raw data references
- Include a "Currency Notice" stating when data was collected
- Highlight any data limitations or areas requiring further research
- Format headings, subheadings, and sections according to professional research report standards
- Address potential biases in data collection or analysis
- Include a section on ethical considerations if applicable to the topic
`;
  } else if (safeContentType.includes('google-ads')) {
    promptText += `## GOOGLE ADS SPECIFIC REQUIREMENTS FOR ${currentMonth.toUpperCase()} ${currentYear}
Create fully-formatted Google Ads copy following ${currentMonth} ${currentYear} best practices from the research.
Format as multiple ad groups, each containing:
- Responsive Search Ads with 15 headlines (30 character max each) and 4 descriptions (90 character max each)
- Performance Max assets including headlines, descriptions, and image text recommendations 
- Follow all current Google Ads best practices based on the most recent information
- Incorporate any new features or ad formats introduced in the past 90 days
- Format to align with current click-through rate optimization techniques
- Follow the latest compliance and policy requirements
- Include recommended AI-generated assets settings
- Specify audience signals for broad match keywords
- Provide negative keyword recommendations to prevent wasteful spend
- Include smart bidding strategy recommendations (Target CPA, ROAS, etc.)
- Suggest optimal campaign structure based on current algorithm preferences
- Address any recent policy changes affecting ad approval rates
`;
  } else if (safeContentType.includes('business-presentation') || safePlatform.includes('presentation')) {
    promptText += `## BUSINESS PRESENTATION SPECIFIC REQUIREMENTS FOR ${currentMonth.toUpperCase()} ${currentYear}
Create a professional business presentation following ${currentMonth} ${currentYear} best practices.`;

    // Add presentation settings if available
    if (presentationSettings) {
      // Add slide count information
      const slideCount = presentationSettings.slideCount || 10;
      promptText += `\nCreate a presentation with approximately ${slideCount} total slides.`;
      
      // Add presentation format instructions
      const format = presentationSettings.presentationFormat || 'informative';
      if (format === 'persuasive') {
        promptText += `\nThis should be a compelling, persuasive presentation focused on convincing the audience to take action.`;
      } else if (format === 'analytical') {
        promptText += `\nThis should be a data-driven, analytical presentation that supports points with evidence and facts.`;
      } else if (format === 'inspirational') {
        promptText += `\nCreate an inspirational and motivational presentation that energizes and engages the audience.`;
      } else {
        promptText += `\nThis should be an informative presentation that educates the audience clearly and effectively.`;
      }
      
      // Add technical level instructions
      const techLevel = presentationSettings.technicalLevel || 'balanced';
      if (techLevel === 'general') {
        promptText += `\nUse general, accessible language that avoids industry jargon and technical terms. Explain concepts in simple terms for a non-technical audience.`;
      } else if (techLevel === 'technical') {
        promptText += `\nUse moderately technical language with appropriate industry terminology. Include some specialized vocabulary but provide context for more complex concepts.`;
      } else if (techLevel === 'expert') {
        promptText += `\nUse highly technical, specialized language appropriate for subject matter experts. Assume deep domain knowledge and use advanced terminology without extensive explanations.`;
      } else {
        promptText += `\nBalance technical and accessible language. Use industry terminology where appropriate but provide enough context for a semi-technical audience to understand key concepts.`;
      }
      
      // Add optional sections
      promptText += `\n\nInclude the following sections:`;
      
      // Standard sections
      promptText += `
- Title slide with clear presentation purpose and presenter information
- Table of contents slide outlining the presentation structure
- Introduction section with clear objective statement`;
      
      // Optional executive summary
      if (presentationSettings.includeExecutiveSummary) {
        promptText += `
- Executive summary slide with key takeaways and high-level overview`;
      }
      
      // Main content slides
      promptText += `
- Main content slides with concise bullet points (max 6 bullets per slide)`;
      
      // Optional data visualizations
      if (presentationSettings.includeDataVisualizations) {
        promptText += `
- Specific data visualization recommendations with exact metrics, chart types, and what insights each visualization would reveal`;
      }
      
      // Optional action items
      if (presentationSettings.includeActionItems) {
        promptText += `
- Action items and next steps slide with clear responsibilities and timelines`;
      }
      
      // Conclusion
      promptText += `
- Strong conclusion that reinforces the main message`;
    }
    
    // Add standard formatting instructions
    promptText += `

Format the presentation with these components:
- Each slide should include:
  * Clear slide title (max 10 words)
  * Concise bullet points or content (not paragraphs)
  * Speaker notes with talking points for each slide
  * Visual element suggestions
- Follow professional presentation design principles:
  * One main idea per slide
  * Consistent formatting and visual hierarchy
  * Data-driven insights with specific metrics
  * Clear calls to action where appropriate
- Format according to modern business presentation standards for ${currentMonth} ${currentYear}
`;
  } else if (safeContentType.includes('landing-page')) {
    promptText += `## LANDING PAGE SPECIFIC REQUIREMENTS FOR ${currentMonth.toUpperCase()} ${currentYear}
Create landing page content following ${currentMonth} ${currentYear} best practices from the research.
Include:
- The CURRENT landing page structure best practices as of ${currentMonth} ${currentYear}
- Incorporate any new SEO or conversion rate optimization techniques from the past 90 days
- Follow the latest mobile-first design principles
- Implement conversion elements that are proven effective in recent studies
- Align with current user experience expectations and behaviors
`;
  }

  // Add content quality requirements
  promptText += `## CONTENT QUALITY REQUIREMENTS

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

YOU MUST structure your output to match these current standards. Format alone can increase engagement by 30-75%.

`;

  // Add content type guidance
  if (safeContentType.includes('google-ads')) {
    promptText += `## GOOGLE ADS SPECIFIC REQUIREMENTS FOR ${currentMonth.toUpperCase()} ${currentYear}
Create fully-formatted Google Ads copy following ${currentMonth} ${currentYear} best practices from the research.
Format as multiple ad groups, each containing:
- Responsive Search Ads with 15 headlines (30 character max each) and 4 descriptions (90 character max each)
- Performance Max assets including headlines, descriptions, and image text recommendations 
- Follow all current Google Ads best practices based on the most recent information
- Incorporate any new features or ad formats introduced in the past 90 days
- Format to align with current click-through rate optimization techniques
- Follow the latest compliance and policy requirements
- Include recommended AI-generated assets settings
- Specify audience signals for broad match keywords
- Provide negative keyword recommendations to prevent wasteful spend
- Include smart bidding strategy recommendations (Target CPA, ROAS, etc.)
- Suggest optimal campaign structure based on current algorithm preferences
- Address any recent policy changes affecting ad approval rates
`;
  } else if (safeContentType.includes('landing-page')) {
    promptText += `## LANDING PAGE SPECIFIC REQUIREMENTS FOR ${currentMonth.toUpperCase()} ${currentYear}
Create landing page content following ${currentMonth} ${currentYear} best practices from the research.
Include:
- The CURRENT landing page structure best practices as of ${currentMonth} ${currentYear}
- Incorporate any new SEO or conversion rate optimization techniques from the past 90 days
- Follow the latest mobile-first design principles
- Implement conversion elements that are proven effective in recent studies
- Align with current user experience expectations and behaviors
`;
  }

  // Add the main content prompt
  promptText += `## CONTENT REQUEST
Content Type: ${safeContentType}
Platform: ${safePlatform}
Target Audience: ${safeAudience}
Current Date: ${currentMonth} ${currentYear}
${prompt ? `Additional Instructions: ${prompt}` : ''}

## RESEARCH DATA (${currentMonth.toUpperCase()} ${currentYear})
${researchData}

`;
  
  // Add YouTube transcript if available
  if (youtubeTranscript) {
    promptText += `## YOUTUBE TRANSCRIPT
${youtubeTranscript}

`;
  }

  // Add currency verification requirement
  promptText += `## CURRENCY VERIFICATION REQUIREMENT
As the first step in generating this content:
1. Review all platform best practices and ensure they reflect ${currentMonth} ${currentYear} standards
2. For each major recommendation, include the month/year when this practice became effective
3. For any statistics cited, include the publication date in (Month Year) format
4. If you're unsure about the currency of any specific recommendation, explicitly state this uncertainty

This content will be rejected if it contains outdated information without clear date attribution.
`;

  // Add final instruction to respect research
  promptText += `## FINAL CRITICAL INSTRUCTION
You MUST create content that follows the LATEST best practices from the research data, especially the ${currentMonth} ${currentYear} updates.
DO NOT rely on outdated formats or approaches from previous periods.
Remember that digital best practices change rapidly - what worked even a few months ago may be ineffective now.
Structure your output according to the specific platform requirements for maximum effectiveness in TODAY'S digital environment.

## QUALITY CHECK REQUIREMENTS
Before submitting your final content:
1. Review for any repetitive phrases or sentences - each sentence should provide unique value
2. Replace any generic placeholder text with specific, substantive content
3. Ensure all data references include actual numbers or percentages
4. Check that visualization descriptions include specific metrics and trends
5. Verify that your content follows a logical flow without unnecessary repetition
6. IMPORTANT: Remove any template language or placeholders like [technical explanation]
`;

  return promptText;
}

export const dynamic = 'force-dynamic'; 
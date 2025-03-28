/**
 * Claude 3.7 Sonnet Research API Route
 * 
 * This API route uses Claude 3.7 Sonnet to generate detailed research analysis.
 */

import { NextResponse } from 'next/server';
import { TrendingTopic } from '@/app/lib/api/redditApi';

// Define the model name - using Claude 3.7 Sonnet as required
const CLAUDE_MODEL_NAME = 'claude-3-7-sonnet-20250219';

export async function POST(req: Request) {
  console.log('==== CLAUDE RESEARCH API CALLED ====');
  try {
    // Parse the request body
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    console.log('Using Claude model:', CLAUDE_MODEL_NAME);
    
    // Extract key parameters
    const { topic, context, trendingTopics = [], language } = requestBody;
    
    // Validate inputs
    if (!topic) {
      console.error('Missing required parameter: topic');
      return Response.json({ 
        error: 'Missing required parameter: topic',
        message: 'A topic must be provided for research generation'
      }, { status: 400 });
    }
    
    // Extract audience, content type, and platform from context if available
    let audience = '';
    let contentType = '';
    let platform = '';
    
    if (context) {
      // Extract audience information
      const audienceMatch = context.match(/Target Audience: ([^,]+)/i);
      audience = audienceMatch ? audienceMatch[1].trim() : '';
      
      // Extract content type
      const contentTypeMatch = context.match(/Content Type: ([^,]+)/i);
      contentType = contentTypeMatch ? contentTypeMatch[1].trim() : '';
      
      // Extract platform
      const platformMatch = context.match(/Platform: ([^,]+)/i);
      platform = platformMatch ? platformMatch[1].trim() : '';
    }
    
    console.log(`Extracted audience from context: "${audience}"`);
    console.log(`Extracted content type from context: "${contentType}"`);
    console.log(`Extracted platform from context: "${platform}"`);
    
    // Get the API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    // Only use the real API
    if (!apiKey) {
      console.error('No Claude API key found in environment variables');
      return Response.json({ 
        error: 'No Claude API key configured',
        message: 'Please set the ANTHROPIC_API_KEY environment variable to use Claude research generation'
      }, { status: 500 });
    }
    
    try {
      console.log('Building prompt for Claude API...');
      
      // Build a research prompt for Claude
      const prompt = buildPrompt(topic, context, trendingTopics, language);
      
      console.log('Calling Claude API for research generation...');
      
      // Call the real Claude API
      const research = await callClaudeApi(prompt, apiKey);
      
      console.log(`Research generated successfully for topic: ${topic}`);
      console.log('Research length:', research.length);
      
      // Return successful response
      console.log('==== RESEARCH API CALL COMPLETED SUCCESSFULLY ====');
      return Response.json({
        research,
        model: CLAUDE_MODEL_NAME,
        using: 'real'
      });
      
    } catch (claudeError: any) {
      console.error('==== ERROR CALLING CLAUDE API FOR RESEARCH ====');
      console.error('Error details:', claudeError);
      
      // Return detailed error information
      return Response.json({ 
        error: `Claude API error: ${claudeError.message}`,
        message: 'Failed to generate research with Claude API. Please check your API key and try again.',
        details: claudeError.toString()
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('==== ERROR IN CLAUDE RESEARCH API ROUTE ====');
    console.error('Error details:', error);
    return Response.json({ 
      error: `Server error: ${error.message}`,
      message: 'An unexpected error occurred while processing your research request.',
      details: error.toString()
    }, { status: 500 });
  }
}

/**
 * Call the Claude API to generate research
 */
async function callClaudeApi(prompt: string, apiKey: string): Promise<string> {
  console.log('Calling Claude API with prompt length:', prompt.length);
  console.log('Prompt sample (first 200 chars):', prompt.substring(0, 200) + '...');
  
  try {
    // Create an AbortController to implement a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 360000); // 6 minute timeout (360 seconds)
    
    try {
      // Log the exact request being sent
      const requestBody = {
        model: CLAUDE_MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          { role: 'user', content: prompt }
        ]
      };
      
      console.log('Request body for Claude API:', JSON.stringify({
        model: requestBody.model,
        max_tokens: requestBody.max_tokens,
        temperature: requestBody.temperature
      }));
      
      // Double-check we aren't sending any beta headers
      console.log('Making API call with headers:', JSON.stringify({
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }));
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      // Clear the timeout since the request completed
      clearTimeout(timeoutId);

      // Log the response status
      console.log(`API Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Claude API error response: ${response.status} ${response.statusText}`);
        console.error(`Response body: ${errorText}`);
        
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error('Failed to parse error response as JSON');
        }
        
        // Add more specific error messages for common issues
        if (response.status === 401 || response.status === 403) {
          console.error('Authentication error with Claude API - likely invalid API key');
          throw new Error('Claude API authentication failed: Please check your API key. The key should start with "sk-ant-".');
        } else if (response.status === 404) {
          console.error(`Model not found: ${CLAUDE_MODEL_NAME}`);
          throw new Error(`Claude API returned 404: Model '${CLAUDE_MODEL_NAME}' not found. Please check the model name.`);
        } else if (response.status === 400) {
          console.error('Bad request to Claude API');
          const errorMessage = errorData.error?.message || errorText;
          throw new Error(`Claude API bad request: ${errorMessage}`);
        }
        
        throw new Error(
          `Claude API returned ${response.status}: ${
            errorData.error?.message || errorText || response.statusText
          }`
        );
      }

      // Parse the response
      console.log('Parsing API response...');
      const responseText = await response.text();
      console.log('Response text length:', responseText.length);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error(`Invalid response format from Claude API: ${responseText.substring(0, 200)}...`);
      }
      
      console.log('Claude API response received, structure:', Object.keys(data).join(', '));
      
      // Extract the research content from Claude's response
      let researchText = '';
      if (data.content && Array.isArray(data.content) && data.content.length > 0) {
        const firstContent = data.content[0];
        if (typeof firstContent === 'object' && firstContent.text) {
          researchText = firstContent.text;
        } else if (typeof firstContent === 'string') {
          researchText = firstContent;
        }
      }
      
      if (!researchText) {
        console.error('Failed to extract text from Claude response:', data);
        throw new Error('Invalid response format from Claude API');
      }
      
      // Filter out <think> tags from research
      researchText = removeThinkingTags(researchText);
      
      console.log('Successfully extracted research text of length:', researchText.length);
      return researchText;
    } catch (fetchError: unknown) {
      // Clear the timeout in case of error
      clearTimeout(timeoutId);
      
      // Check if this was a timeout error
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Claude API request timed out after 6 minutes');
      }
      
      // Re-throw other errors
      throw fetchError;
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

/**
 * Build a prompt for Claude to generate deep research
 */
function buildPrompt(topic: string, context?: string, trendingTopics: TrendingTopic[] = [], language?: string): string {
  // Get current date info for accurate best practice references
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Enhanced system prompt with stronger emphasis on current information
  let systemPrompt = `You are a distinguished research expert known for producing comprehensive, current, and factual content backed by up-to-date sources. 
Your research is generated as of ${currentDate} and MUST reflect the absolute latest information available.

YOUR RESEARCH MUST:
1. Focus on data and trends from the past 30-60 days whenever possible
2. Include specific statistics WITH PUBLICATION DATES to prove currency 
3. Cite specific updates, studies, or developments from the past 3 months
4. Include exact numbers and percentages rather than vague claims
5. Prioritize authoritative industry sources published in the past 1-2 months
6. Address changes in best practices that have occurred recently
7. Note when certain information could not be verified as current
8. Include any algorithm updates, policy changes, or platform updates within the past 90 days
9. Reference competitor moves and market shifts from the past quarter
10. Cite industry-specific conferences, webinars, or announcements from the past 60 days

FOR GOOGLE ADS AND SEO TOPICS SPECIFICALLY:
1. Document any Google algorithm updates in the past 90 days that affect rankings or ad performance
2. Include recent changes to Google Ads policies, features, or best practices 
3. Note changes in keyword competition, CPCs, or audience targeting capabilities
4. Reference first-party data studies on CTR, conversion rates, or ad performance
5. Include information on AI-generated content policies and their impact on search rankings
6. Document changes to Performance Max, RSA requirements, or other ad format specifications

FOR RESEARCH REPORTS SPECIFICALLY:
1. Follow current academic and professional research standards
2. Include methodological best practices for data collection and analysis
3. Reference industry benchmarks from the most recent available studies
4. Include data visualization best practices and accessibility requirements
5. Cite competitive landscape changes within the past quarter

Outdated research is harmful and misleading. Each section must contain information clearly published or verified within the past 12 months, with preference for data from the past 60 days.`;

  // Basic prompt for all research with enhanced emphasis on recency
  let promptText = `You are an expert content researcher using Claude 3.7 Sonnet. Create in-depth research on "${topic}" with the following context: ${context || ''}.

Your research should provide a comprehensive analysis that content creators can use to create high-quality, well-informed content.

THIS IS CRITICAL: It is currently ${currentMonth} ${currentYear}. Ensure ALL information reflects the ABSOLUTE LATEST best practices, algorithm changes, and platform behaviors as of TODAY - not from months ago. Digital marketing changes weekly, so information from even last month may be outdated.

Format your research in Markdown with clear headings, subheadings, and bullet points where appropriate.

Your research must include:
1. Recent industry trends and developments related to the topic
2. Analysis of the current landscape and market situation
3. Specific strategies and tactics that are working NOW
4. Examples of successful approaches within the industry
5. Common challenges and how to overcome them

Make sure to provide actionable insights that content creators can immediately apply to their work.
`;

  // Add special instructions for trending topics if available
  if (trendingTopics && trendingTopics.length > 0) {
    promptText += `\n## IMPORTANT: Trending Topics Integration

I'm providing you with current trending topics that should be thoughtfully integrated into the research. These represent current conversations and interests that will make the content more timely and engaging.

Trending topics to incorporate:
${trendingTopics.map((topic, index) => `${index + 1}. "${topic.title}" (Relevance Score: ${topic.relevanceScore || 'N/A'}) - ${topic.summary || ''}`).join('\n')}

Guidelines for trending topic integration:
- Don't simply list these topics - find meaningful connections to the main research subject
- Prioritize topics with higher relevance scores when creating connections
- Use trending topics to provide timely context, examples, analogies, or talking points
- Create specific sections that show how the research subject relates to these current conversations
- Explain why these connections matter to the audience and how content creators can leverage them
- For each trending topic you incorporate, briefly explain how it connects to the main subject
- Use the trending topics to make the content feel current and relevant, not just informative

One of your primary goals is to help content creators leverage current trends to make their content more engaging and share-worthy.`;
  }

  // Add platform-specific section if available
  let targetPlatform = '';
  let targetAudience = 'general audience';
  
  if (context) {
    // Extract platform information
    const platformMatch = context.match(/Platform: ([^,]+)/i);
    if (platformMatch) {
      targetPlatform = platformMatch[1].toLowerCase().trim();
    }
    
    // Extract audience information
    const audienceMatch = context.match(/Target Audience: ([^,]+)/i);
    if (audienceMatch) {
      targetAudience = audienceMatch[1].trim();
    }
  }

  // Add specific instruction for absolute latest platform information
  promptText += `\n\n## PLATFORM-SPECIFIC BEST PRACTICES
When creating platform-specific sections, ensure all best practices reflect the very latest information as of ${currentMonth} ${currentYear}. Include:

1. Latest algorithm changes (even those from the past few weeks)
2. Current content format preferences based on the most recent engagement data
3. Up-to-the-minute posting time recommendations based on current user behavior
4. The newest features on each platform and how to leverage them effectively
5. Recently changed policies or guidelines that affect content creation

For each platform, specifically note any changes that occurred in the past 1-2 months.`;

  // If there's a specific platform mentioned, add more tailored instructions
  if (targetPlatform) {
    promptText += `\n\nFocus especially on ${targetPlatform}, provide detailed analysis of:
- Latest algorithm changes specific to ${targetPlatform}
- Content formats currently performing best on ${targetPlatform}
- Ideal posting frequency and times for ${targetPlatform} based on current data
- Best practices for audience engagement on ${targetPlatform}
- How to optimize content specifically for ${targetPlatform}'s unique features`;
  }

  // Add specific instruction for the target audience
  promptText += `\n\n## AUDIENCE INSIGHTS
Provide detailed analysis on reaching and engaging with: ${targetAudience}
Include:
- Demographics and psychographics
- Content preferences and consumption habits
- Pain points and motivations
- Effective messaging approaches
- How to create audience-relevant content that also incorporates trending topics`;

  // Add content structure guidance
  promptText += `\n\n## RESEARCH STRUCTURE
Your response should include these sections:
1. Executive Summary (brief overview of key findings)
2. Market Overview (with current data and trends)
3. Audience Analysis (detailed insights on ${targetAudience})
4. Content Strategy Recommendations
5. Platform-Specific Best Practices${targetPlatform ? ` (focusing on ${targetPlatform})` : ''}
6. Trending Topic Integration Strategies
7. Keywords and Topics for Content Creation
8. Measurement and Success Metrics`;

  // Add quality requirements
  promptText += `\n\n## QUALITY REQUIREMENTS
Ensure your research:
- Is specific and detailed, not generic
- Includes current data points and statistics
- Provides actionable insights tailored to ${topic}
- Is optimized for ${targetAudience}
- Seamlessly incorporates trending topics
- Reflects the ABSOLUTE LATEST platform trends and best practices

Avoid generic templates - this research should be completely customized for this specific topic and audience.`;

  return systemPrompt + '\n\n' + promptText;
}

/**
 * Remove thinking tags from the research text
 * These are Claude's internal reasoning that shouldn't be shown to the user
 */
function removeThinkingTags(text: string): string {
  // Check if thinking tags exist
  if (text.includes('<think>') && text.includes('</think>')) {
    console.log('Detected thinking tags in research output - removing them');
    // Remove everything between <think> and </think> tags, including the tags themselves
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }
  return text;
}

export const dynamic = 'force-dynamic'; 
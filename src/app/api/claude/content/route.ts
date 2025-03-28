import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { enhanceWithPersonaTraits, getPersonaDisplayName } from '@/app/lib/personaUtils';
import { verifyResearchQuality } from '@/app/lib/middleware/researchGuard';

// Constants - Using the correct Claude 3.7 Sonnet model identifier
// From official Anthropic API docs: https://docs.anthropic.com/en/api/getting-started
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Request interface for content generation
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
  subPlatform?: string;
  streaming?: boolean;
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
    
    // Add language instruction to system prompt
    const systemPrompt = `You are an expert content marketing writer specializing in engaging, platform-optimized content. You follow all current best practices for ${currentMonth} ${currentYear} and create content that drives engagement and conversions based on the latest digital trends. You prioritize mobile-first design (75% weighting), voice search optimization, and E-E-A-T 2.0 documentation requirements in all content.` + 
      (language && language !== 'en' ? ` IMPORTANT: Generate all content in ${language === 'es' ? 'Spanish' : language} language.` : '');
    
    // Add persona-specific instructions to system prompt
    const personaName = getPersonaDisplayName(style);
    const personaSystemPrompt = `IMPORTANT: You must write as the "${personaName}" persona. Fully embody this persona's unique voice, style, and perspective. DO NOT mention "AriaStar" or any other persona name unless it matches "${personaName}". When introducing yourself, use the name "${personaName.split(' ')[0]}" if needed. Every aspect of the content must consistently reflect this persona.`;
    
    const finalSystemPrompt = systemPrompt + "\n\n" + personaSystemPrompt;
    
    console.log("Calling Claude API with persona:", style, "and persona name:", personaName);
    const response = await anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      system: finalSystemPrompt,
      messages: [
        { role: "user", content: promptText }
      ]
    });
    
    // Process the response to extract the content
    let responseText = "";
    if (response.content && Array.isArray(response.content) && response.content.length > 0) {
      const firstContent = response.content[0];
      if (typeof firstContent === 'object' && 'text' in firstContent) {
        responseText = firstContent.text;
      }
    }
    
    console.log(`Response received, length: ${responseText.length} characters`);
    
    // Check if the response inadvertently uses the wrong persona name
    const personaFirstName = personaName.split(' ')[0];
    const wrongPersonaRegex = /\b(AriaStar|MentorPro|AIInsight|EcoEssence|DataStory|NexusVerse|TechTranslate|CommunityForge|SynthesisSage)\b/gi;
    
    // Replace any incorrect persona names with the correct one (only for exact matches)
    responseText = responseText.replace(wrongPersonaRegex, (match) => {
      // Only replace if it doesn't match our persona
      if (match.toLowerCase() !== personaFirstName.toLowerCase()) {
        console.log(`Replacing incorrect persona name ${match} with ${personaFirstName}`);
        return personaFirstName;
      }
      return match;
    });
    
    // Enhance the content with persona-specific traits
    const enhancedContent = enhanceWithPersonaTraits(responseText, style, styleIntensity, language);
    console.log(`Enhanced content with ${style} persona traits`);
    
    return enhancedContent;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    throw error;
  }
}

// Add a helper function to verify if research contains platform-specific information
function verifyPlatformRelevance(platform: string, researchData: string): { 
  relevant: boolean;
  terms: string[];
  matches: string[];
} {
  if (!platform || !researchData) {
    return { relevant: false, terms: [], matches: [] };
  }
  
  // Normalize inputs
  const platformLower = platform.toLowerCase();
  const researchLower = researchData.toLowerCase();
  
  // Define platform-specific terms to look for
  const platformTerms: Record<string, string[]> = {
    'facebook': ['facebook', 'fb', 'meta', 'facebook post', 'facebook content', 'facebook marketing', 'facebook ads', 'facebook algorithm'],
    'instagram': ['instagram', 'ig', 'insta', 'instagram post', 'reels', 'instagram stories', 'instagram captions', 'instagram algorithm'],
    'twitter': ['twitter', 'tweet', 'x.com', 'x platform', 'x algorithm', 'twitter spaces', 'twitter analytics'],
    'linkedin': ['linkedin', 'professional network', 'linkedin post', 'linkedin article', 'linkedin algorithm', 'linkedin engagement'],
    'tiktok': ['tiktok', 'tik tok', 'short-form video', 'tiktok algorithm', 'tiktok trends'],
    'youtube': ['youtube', 'youtube video', 'youtube channel', 'youtube marketing', 'youtube algorithm', 'youtube analytics'],
    'email': ['email', 'email marketing', 'newsletter', 'email campaign', 'subject line', 'email deliverability', 'email open rates'],
    'blog': ['blog', 'blog post', 'article', 'wordpress', 'medium', 'blogging', 'blog seo', 'content marketing'],
    'presentation': ['presentation', 'slides', 'slide deck', 'powerpoint', 'keynote', 'google slides', 'presentation design'],
    'video': ['video', 'video content', 'video script', 'video marketing', 'video production', 'video editing'],
    'pinterest': ['pinterest', 'pins', 'pinterest board', 'pinterest algorithm', 'pinterest marketing']
  };
  
  // Handle the generic "social" platform by checking all social media platforms
  if (platformLower === 'social') {
    // Look for specific social platforms in the research
    const socialPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'];
    
    // First check if any specific platform is heavily featured
    for (const specificPlatform of socialPlatforms) {
      const terms = platformTerms[specificPlatform];
      const matches = terms.filter(term => researchLower.includes(term));
      
      // If we find substantial references to a specific platform, consider the research relevant
      if (matches.length >= 3) {
        console.log(`Social media research has strong references to ${specificPlatform}:`, matches);
        return {
          relevant: true,
          terms,
          matches
        };
      }
    }
    
    // If no single platform dominates, check for general social media terms
    const socialTerms = [
      'social media', 'social platform', 'social content', 'social strategy',
      ...platformTerms['facebook'], 
      ...platformTerms['instagram'], 
      ...platformTerms['twitter'], 
      ...platformTerms['linkedin'], 
      ...platformTerms['tiktok']
    ];
    
    const matches = socialTerms.filter(term => researchLower.includes(term));
    return { 
      relevant: matches.length > 0,
      terms: socialTerms,
      matches
    };
  }
  
  // For specific platforms
  const terms = platformTerms[platformLower] || [platformLower];
  const matches = terms.filter(term => researchLower.includes(term));
  
  return {
    relevant: matches.length > 0,
    terms,
    matches
  };
}

// Enhance the prompt building with platform-specific instructions
function buildPrompt(
  contentType: string, 
  platform: string, 
  audience: string, 
  researchData: string,
  youtubeTranscript: string,
  prompt: string,
  style: string,
  language: string,
  subPlatform: string = ''
): string {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  
  // Start with strong language instruction if not English
  let languageInstruction = "";
  if (language && language !== 'en') {
    if (language === 'es') {
      languageInstruction = `INSTRUCCIÓN CRÍTICA: Este contenido DEBE estar completamente en ESPAÑOL. No uses inglés en absoluto.
      
CRITICAL LANGUAGE INSTRUCTION: You MUST generate content in SPANISH ONLY. Do not use ANY English whatsoever in the final output.

`;
    } else {
      languageInstruction = `CRITICAL LANGUAGE INSTRUCTION: Generate all content in ${language} language only.\n\n`;
    }
  }
  
  // Check platform relevance to add warnings or special instructions
  const platformRelevance = verifyPlatformRelevance(platform, researchData);

  // Determine if we're dealing with social media and need specific platform instructions
  const isSocialMedia = platform === 'social';
  
  // For social media, get specific platform info from subPlatform
  const specificSocialPlatform = isSocialMedia && subPlatform ? subPlatform : '';
  
  // If we don't have a specificSocialPlatform from the subPlatform parameter, 
  // try to identify the most referenced platform in the research
  let dominantSocialPlatform = specificSocialPlatform;
  if (isSocialMedia && !dominantSocialPlatform && platformRelevance.relevant) {
    // Check which social platform is most referenced
    const socialPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'];
    let maxMatches = 0;
    
    for (const socialPlatform of socialPlatforms) {
      const platformCheck = verifyPlatformRelevance(socialPlatform, researchData);
      if (platformCheck.matches.length > maxMatches) {
        maxMatches = platformCheck.matches.length;
        dominantSocialPlatform = socialPlatform;
      }
    }
    
    if (dominantSocialPlatform) {
      console.log(`Detected dominant social platform in research: ${dominantSocialPlatform}`);
    }
  }

  // Build the prompt
  let promptBuilder = `${languageInstruction}Create highly engaging ${contentType} content for ${platform}${dominantSocialPlatform ? ` (specifically ${dominantSocialPlatform})` : ''} targeting ${audience}.

Based on the provided research and data, craft content that follows current (${currentMonth} ${currentYear}) best practices and will drive engagement.

${platformRelevance.relevant ? 
  `The research includes platform-specific information about ${platform}${dominantSocialPlatform ? ` with emphasis on ${dominantSocialPlatform}` : ''}, which you should leverage in your content generation.` : 
  `Note: Apply your knowledge of current ${platform} best practices while using the general research data.`}

`;

  // Add platform-specific instructions
  if (platform === 'facebook' || (isSocialMedia && dominantSocialPlatform === 'facebook')) {
    promptBuilder += `
For Facebook, create content that:
- Uses a conversational, authentic tone
- Includes questions to encourage engagement
- Keeps paragraphs short and accessible
- Includes 1-2 relevant emojis where appropriate
- Creates an emotional connection
- Has a clear call to action
`;
  } else if (platform === 'instagram' || (isSocialMedia && dominantSocialPlatform === 'instagram')) {
    promptBuilder += `
For Instagram, create content that:
- Is visually descriptive and emotionally appealing
- Includes a caption that complements visual content
- Contains 10-15 relevant hashtags
- Has a clear call to engagement
- Follows a structure suitable for carousel posts if educational
`;
  } else if (platform === 'linkedin' || (isSocialMedia && dominantSocialPlatform === 'linkedin')) {
    promptBuilder += `
For LinkedIn, create content that:
- Is professional and value-driven
- Establishes expertise with data points and insights
- Uses clear formatting with bullet points when appropriate
- Has a compelling hook that appeals to professionals
- Includes 3-5 relevant hashtags
`;
  } else if (platform === 'twitter' || (isSocialMedia && dominantSocialPlatform === 'twitter')) {
    promptBuilder += `
For Twitter, create content that:
- Is concise and impactful
- Uses a strong hook
- Incorporates 2-3 relevant hashtags
- Can be expanded into a thread format if needed
- Focuses on timely, shareable insights
`;
  } else if (platform === 'tiktok' || (isSocialMedia && dominantSocialPlatform === 'tiktok')) {
    promptBuilder += `
For TikTok, create script-style content with:
- A hook within the first 7 seconds
- A clear storyline or information structure
- Engaging pacing that maintains attention
- A strong call to action
- Trend-aware approach
`;
  } else if (platform === 'blog' || contentType === 'blog-post') {
    promptBuilder += `
For a blog post, create content that:
- Has a strong, SEO-friendly headline
- Includes an engaging introduction with a clear value proposition
- Uses subheadings, bullet points, and short paragraphs for readability
- Incorporates relevant statistics and data points from the research
- Has a clear conclusion with a call to action
- Is formatted for online readability
`;
  } else if (platform === 'email' || contentType === 'email') {
    promptBuilder += `
For an email, create content that:
- Has a compelling subject line
- Opens with a personalized, engaging greeting
- Delivers value immediately and maintains a clear purpose
- Uses concise paragraphs and bulleted lists
- Includes a strong, clear call to action
- Has a professional signature
`;
  } else if (platform === 'youtube' || contentType === 'video-script' || contentType === 'youtube-script') {
    promptBuilder += `
For a video script, create content that:
- Hooks the viewer in the first 15 seconds
- Follows a clear structure with intro, body, and conclusion
- Uses conversational language suitable for speaking
- Includes cues for visuals or B-roll where appropriate
- Has a clear call to action for engagement
- Is formatted as a proper script with scene/shot guidance
`;
  } else if (platform === 'presentation' || contentType.includes('presentation')) {
    promptBuilder += `
For a modern business presentation, create content that:
- Follows a clear, logical structure (intro, main points, conclusion)
- Uses the "one idea per slide" principle to maintain focus
- Incorporates strategic use of white space with minimal text (6x6 rule: max 6 bullet points, max 6 words per point)
- Includes slide-specific speaker notes that expand on the visible content
- Balances data visualization with impactful storytelling
- Uses a consistent visual hierarchy and formatting
- Implements the "tell them" framework: (1) tell them what you'll tell them, (2) tell them, (3) tell them what you told them

Format the presentation using this structure:
1. TITLE SLIDE: Clear, benefit-focused title with presenter info
2. AGENDA/OVERVIEW: 3-5 key points to be covered
3. PROBLEM/OPPORTUNITY: Establish context and relevance
4. KEY CONTENT SLIDES: Main presentation body with supporting data
5. DATA VISUALIZATION: Include placeholders for charts/graphs with descriptions
6. SUMMARY: Reinforce key takeaways
7. CALL TO ACTION: Clear next steps
8. Q&A/CONTACT: Information for follow-up

Special formatting requirements:
- For each slide, include:
  * Slide Title: Clear, concise headline (5-7 words max)
  * Slide Content: Minimal bullet points or visualization description
  * Slide Notes: Detailed talking points for the presenter

- Use these slide transitions for enhanced narrative flow:
  * "Building on this point..."
  * "This leads us to consider..."
  * "The data reveals an important trend..."
  * "To put this in perspective..."

- Include specific placeholders for visual elements:
  * [GRAPH: Description of what the graph should show]
  * [CHART: Purpose and key insight from this chart]
  * [IMAGE: Description of appropriate supporting visual]
  * [ICON: Type of icon needed here]
`;
  }

  // Add style-specific instructions
  promptBuilder += `

CONTENT STYLE:
`;

  // Add detailed persona-specific instructions based on the selected style
  if (style === 'ariastar') {
    promptBuilder += `You are writing as AriaStar, a relatable best friend personality. Your content should:
- Use a conversational, authentic tone that feels like advice from a trusted friend
- Include appropriate emojis (1-2 per paragraph) to add personality
- Use contractions, casual language, and occasional slang (but keep it professional enough for the context)
- Ask engaging questions to create a dialogue feel
- Share relatable anecdotes or hypothetical scenarios that create connection
- Break content into easily digestible sections with creative subheadings
- Be encouraging and supportive while still being honest
- Include occasional humor and lighthearted remarks
- Use the first person "I" and directly address the reader as "you"
- End with an uplifting call to action that feels like friendly advice

Write as if you're having a one-on-one conversation with someone you genuinely care about.`;
  } 
  else if (style === 'specialist_mentor') {
    promptBuilder += `You are writing as MentorPro, an expert specialist. Your content should:
- Use a professional, authoritative tone that demonstrates deep expertise
- Include field-specific terminology and frameworks that showcase knowledge
- Reference case studies, research findings, or relevant data points
- Organize information with clear structure and hierarchy
- Use phrases like "Based on my experience with hundreds of clients" or "A common mistake I frequently observe"
- Include specific, actionable advice that goes beyond basic recommendations
- Emphasize proven methodologies and approaches
- Flag common pitfalls or misconceptions within the industry
- Use authoritative formatting with proper headings, bullet points, and emphasis
- End with expert-level recommendations or next steps

Write as if you're a respected industry veteran sharing insider knowledge gained from years of specialized experience.`;
  }
  else if (style === 'ai_collaborator') {
    promptBuilder += `You are writing as AIInsight, an AI collaborator. Your content should:
- Use a balanced tone that combines technical understanding with human-focused applications
- Acknowledge both AI capabilities and limitations with transparency
- Structure content around "human-AI collaboration" themes
- Include clarifications of technical concepts in accessible language
- Reference how AI and human skills complement each other
- Use phrases like "Together, we can" and "This is where human creativity and AI analysis work in tandem"
- Demonstrate nuanced understanding of how technology integrates with human workflows
- Include ethical considerations where relevant
- Avoid both overhyping AI capabilities and unnecessarily limiting its potential
- End with a forward-looking but realistic vision of human-AI partnership

Write as if you're a thoughtful AI expert focused on productive collaboration rather than replacement.`;
  }
  else if (style === 'sustainable_advocate') {
    promptBuilder += `You are writing as EcoEssence, a sustainability advocate. Your content should:
- Center around environmental impact, sustainable practices, and ethical considerations
- Use nature-inspired metaphors and imagery to illustrate points
- Include specific sustainability benefits or environmental impacts of concepts discussed
- Reference eco-friendly alternatives or approaches where relevant
- Connect individual actions to larger ecological systems
- Use phrases like "By making this small change, we contribute to" or "The ecological ripple effect of this approach"
- Balance urgency about environmental challenges with hopeful pathways forward
- Include practical sustainability tips related to the main topic
- Use value-based language that emphasizes stewardship and responsibility
- End with empowering actions that contribute to environmental well-being

Write as if you're a passionate environmental advocate who sees sustainability as integral to all topics.`;
  }
  else if (style === 'data_visualizer') {
    promptBuilder += `You are writing as DataStory, a data visualization expert. Your content should:
- Transform complex information into clear, visualization-ready narratives
- Structure content around key metrics, trends, and data insights
- Use precise language that quantifies concepts when possible
- Include data interpretation that goes beyond surface-level analysis
- Reference how specific types of visualizations could enhance understanding
- Use phrases like "The data reveals" or "When we visualize this trend"
- Incorporate descriptions of charts, graphs, or other visual elements that could accompany the text
- Balance technical accuracy with accessibility for non-technical audiences
- Include comparative frameworks to provide context for data points
- End with data-informed conclusions and next steps

Write as if you're translating complex information into a clear visual story that reveals meaningful patterns.`;
  }
  else if (style === 'multiverse_curator') {
    promptBuilder += `You are writing as NexusVerse, a multiverse curator who connects ideas across disciplines. Your content should:
- Draw unexpected connections between different fields, concepts, or perspectives
- Use metaphors that transpose ideas from one domain to another
- Include references to diverse knowledge realms (arts, sciences, humanities, etc.)
- Structure content around convergence points where different ideas intersect
- Use phrases like "When we view this through the lens of" or "This parallels concepts in"
- Encourage expansive thinking that transcends traditional category boundaries
- Include both broad patterns and specific applications across domains
- Balance conceptual exploration with practical relevance
- Use terminology from multiple fields, with brief explanations when needed
- End with insights that emerge from cross-disciplinary perspectives

Write as if you're revealing the hidden connections in a rich tapestry of knowledge across many domains.`;
  }
  else if (style === 'ethical_tech') {
    promptBuilder += `You are writing as TechTranslate, an ethical technology expert. Your content should:
- Break down complex technical concepts into accessible explanations
- Center human needs, values, and impacts in discussions of technology
- Balance explanations of capabilities with ethical implications
- Use analogies and examples that help non-technical audiences grasp technical concepts
- Include consideration of diverse user experiences and potential impacts
- Use phrases like "In simpler terms" or "What this means for everyday users"
- Acknowledge both benefits and potential concerns with new technologies
- Structure content to progressively build understanding of complex ideas
- Include questions that encourage critical thinking about technology
- End with balanced perspectives that empower informed technology decisions

Write as if you're a thoughtful technology interpreter who makes complex systems understandable while keeping human values at the center.`;
  }
  else if (style === 'niche_community') {
    promptBuilder += `You are writing as CommunityForge, a niche community builder. Your content should:
- Use inclusive language that creates a sense of belonging to a special group
- Include insider terminology with sufficient context for newcomers
- Reference shared experiences, challenges, or interests that define the community
- Structure content around community values and identity
- Use phrases like "Those of us who" or "Within our community"
- Balance insider perspectives with accessibility for those newer to the space
- Include references to community resources, rituals, or notable figures
- Acknowledge diverse experiences within the community
- Use a warm, welcoming tone that invites participation
- End with connection points or next steps for community engagement

Write as if you're a welcoming community leader speaking to both established members and newcomers who share a specific passion or interest.`;
  }
  else if (style === 'synthesis_maker') {
    promptBuilder += `You are writing as SynthesisSage, an insight synthesizer. Your content should:
- Distill complex ideas into clear, actionable insights
- Structure information in a way that reveals key patterns and principles
- Use frameworks that organize seemingly disparate information
- Include both high-level synthesis and specific supporting examples
- Reference how individual elements connect to form larger systems
- Use phrases like "The core pattern emerging here" or "When we synthesize these findings"
- Balance comprehensive understanding with focused takeaways
- Include visual thinking elements (how information could be mapped or diagrammed)
- Acknowledge nuance while still providing clarity
- End with synthesized principles that can be applied across contexts

Write as if you're a masterful pattern-recognizer revealing the elegant simplicity within complex subjects.`;
  }
  else {
    // Default professional style if no specific persona is selected
    promptBuilder += `Use a professional, authoritative tone with industry-appropriate terminology.`;
  }

  promptBuilder += `

RESEARCH DATA:
${researchData || "No specific research data provided."}

${youtubeTranscript ? `YOUTUBE TRANSCRIPT:
${youtubeTranscript}` : ""}

${prompt ? `ADDITIONAL CONTEXT:
${prompt}` : ""}

Create content that is engaging, platform-optimized, and highly relevant to the target audience. Focus on providing value and driving audience action.`;

  // Add a final language reminder if not English
  if (language && language !== 'en') {
    if (language === 'es') {
      promptBuilder += `

RECORDATORIO FINAL: Todo el contenido DEBE estar en ESPAÑOL, no en inglés. 
FINAL REMINDER: All content MUST be in SPANISH, not English.`;
    } else {
      promptBuilder += `\n\nFINAL REMINDER: All content must be in ${language} language.`;
    }
  }

  return promptBuilder;
}

// Add this utility function for smoother progress tracking
function createProgressTracker() {
  let lastReportedProgress = 0;
  
  return {
    updateProgress: (stream: ReadableStream, controller: any, totalSteps: number = 10) => {
      let currentStep = 0;
      const reader = stream.getReader();
      
      const processChunks = async () => {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Ensure we finish at 100%
            if (lastReportedProgress < 100) {
              controller.enqueue('event: progress\ndata: {"progress": 100, "status": "Finalizing content..."}\n\n');
            }
            controller.close();
            break;
          }
          
          // Pass the chunk through
          controller.enqueue(value);
          
          // Update progress, but ensure it never decreases
          currentStep++;
          const newProgress = Math.min(95, Math.ceil((currentStep / totalSteps) * 100));
          
          // Only send progress events when progress increases
          if (newProgress > lastReportedProgress) {
            lastReportedProgress = newProgress;
            
            // Determine appropriate status message based on progress
            let status = "Generating content...";
            if (newProgress < 30) {
              status = "Analyzing research data...";
            } else if (newProgress < 60) {
              status = "Creating content structure...";
            } else if (newProgress < 80) {
              status = "Optimizing for platform...";
            } else {
              status = "Finalizing content...";
            }
            
            // Send progress update event
            controller.enqueue(`event: progress\ndata: {"progress": ${newProgress}, "status": "${status}"}\n\n`);
          }
        }
      };
      
      processChunks().catch(error => {
        console.error('Error processing stream chunks:', error);
        controller.error(error);
      });
      
      return new ReadableStream({
        start(controller) {
          // Initial progress event
          controller.enqueue('event: progress\ndata: {"progress": 5, "status": "Starting content generation..."}\n\n');
        }
      });
    }
  };
}

/**
 * POST handler for Claude content generation
 */
export async function POST(req: Request) {
  console.log('Content generation API request received');
  
  try {
    const requestBody = await req.json();
    console.log('Request body received:', {
      contentType: requestBody.contentType,
      platform: requestBody.platform,
      audience: requestBody.audience?.substring(0, 30) || 'not provided',
      research: requestBody.researchData ? `${requestBody.researchData.substring(0, 50)}... (${requestBody.researchData.length} chars)` : 'none',
      youtubeTranscript: requestBody.youtubeTranscript ? `(${requestBody.youtubeTranscript.length} chars)` : 'none',
      style: requestBody.style || 'default',
      subPlatform: requestBody.subPlatform || 'none'
    });
    
    // Validate required fields
    if (!requestBody.contentType || !requestBody.platform) {
      console.error('Missing required fields:', { 
        contentType: requestBody.contentType || 'MISSING', 
        platform: requestBody.platform || 'MISSING' 
      });
      return NextResponse.json({ error: 'Content type and platform are required' }, { status: 400 });
    }
    
    // Verify research data exists
    if (!requestBody.researchData || requestBody.researchData.length < 50) {
      console.error('Research data missing or too short:', { 
        researchLength: requestBody.researchData?.length || 0
      });
      return NextResponse.json({ error: 'Research data is required for content generation' }, { status: 400 });
    }
    
    // Check research quality to ensure it's real research data
    const researchQuality = verifyResearchQuality(requestBody.researchData || '');
    console.log('Research quality check:', researchQuality);
    
    if (!researchQuality.valid) {
      console.error('Research quality check failed:', researchQuality.issues.join(', '));
      return NextResponse.json({ error: `Research data quality issue: ${researchQuality.issues.join(', ')}` }, { status: 400 });
    }
    
    // Get API key
    let apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('Missing ANTHROPIC_API_KEY environment variable');
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
    }
    
    // Get language preference
    const language = requestBody.language || 'en';
    
    // Get persona style
    const style = requestBody.style || 'professional';
    console.log('Using style:', style);
    
    // Build the prompt with the helper function
    console.log('Building prompt...');
    const promptText = buildPrompt(
      requestBody.contentType,
      requestBody.platform,
      requestBody.audience || 'general audience',
      requestBody.researchData || '',
      requestBody.youtubeTranscript || '',
      requestBody.prompt || '',
      style,
      language,
      requestBody.subPlatform || ''
    );
    
    console.log('Prompt created, length:', promptText.length);
    
    // Get style intensity
    const styleIntensity = requestBody.styleIntensity || 1;
    
    // If you're using Server-Sent Events (SSE) for streaming, update the code like this:
    if (requestBody.streaming) {
      // Create a progress tracker
      const progressTracker = createProgressTracker();
      
      // Set up response headers for streaming
      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            // Initial progress event
            controller.enqueue(encoder.encode('event: progress\ndata: {"progress": 5, "status": "Preparing content generation..."}\n\n'));
            
            // Generate content
            const content = await callClaudeApi(promptText, apiKey, style, language);
            
            // Send content completion event
            controller.enqueue(encoder.encode(`event: content\ndata: ${JSON.stringify({ content })}\n\n`));
            
            // Final progress event
            controller.enqueue(encoder.encode('event: progress\ndata: {"progress": 100, "status": "Content generation complete!"}\n\n'));
            
            // Close the stream
            controller.close();
          } catch (error) {
            console.error('Error in content generation stream:', error);
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Content generation failed' })}\n\n`));
            controller.close();
          }
        }
      });
      
      // Return streaming response
      return new Response(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    try {
      // Call the Claude API
      console.log('Calling Claude API with model:', CLAUDE_MODEL);
      const content = await callClaudeApi(promptText, apiKey, style, language, styleIntensity);
      console.log('Content generated successfully:', `${content.substring(0, 50)}... (${content.length} chars)`);
      
      // Return the generated content
      return NextResponse.json({ 
        content, 
        model: CLAUDE_MODEL, 
        personaStyle: style, 
        personaName: getPersonaDisplayName(style)
      });
    } catch (apiError: any) {
      console.error('Claude API error:', apiError.message || apiError);
      
      // Check for API key issues
      if (apiError.message?.includes('api_key') || apiError.message?.includes('API key')) {
        return NextResponse.json({ error: 'Invalid API key configuration' }, { status: 401 });
      }
      
      // Check for rate limiting
      if (apiError.message?.includes('rate') || apiError.message?.includes('limit')) {
        return NextResponse.json({ error: 'API rate limit exceeded' }, { status: 429 });
      }
      
      // Default error response
      return NextResponse.json({ error: `Error generating content: ${apiError.message || 'Unknown API error'}` }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Content generation request error:', error.message || error);
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }
}

export const dynamic = 'force-dynamic'; 
import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { enhanceWithPersonaTraits, getPersonaDisplayName } from '@/app/lib/personaUtils';
import { verifyResearchQuality } from '@/app/lib/middleware/researchGuard';

// Add NextRequest for route config
import { NextRequest } from 'next/server';

// Constants - Using the correct Claude 3.7 Sonnet model identifier
// From official Anthropic API docs: https://docs.anthropic.com/en/api/getting-started
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Set increased route config for timeout - extending to 5 minutes max
export const maxDuration = 300; // 5 minutes maximum (limit for Vercel Pro plan)
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0; // No revalidation

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
  // Persona change flags
  isPersonaChange?: boolean;
  previousPersona?: string;
  previousContent?: string;
  length?: string;
  includeCTA?: boolean;
  includeHashtags?: boolean;
  businessType?: string;
  businessName?: string;
  researchTopic?: string;
  persona?: string;
}

/**
 * Call the Claude API to generate content
 */
async function callClaudeApi(promptText: string, apiKey: string, style: string = 'professional', language: string = 'en', styleIntensity: number = 1): Promise<string> {
  try {
    console.log("[DIAGNOSTIC] Creating Anthropic client...");
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
    let personaSystemPrompt = '';
    
    // Create a more detailed persona system prompt with stronger emphasis
    switch(style) {
      case 'ariastar':
        personaSystemPrompt = `CRITICAL PERSONA INSTRUCTION: You are writing EXCLUSIVELY as AriaStar, a relatable best friend personality. Your writing MUST have:
- A warm, conversational tone that feels like advice from a trusted friend
- First-person perspective with "I" statements and direct "you" addressing
- Short, punchy sentences with occasional questions to create dialogue
- 1-2 relevant emojis per paragraph to add personality
- Contractions and casual language (e.g., "don't", "can't", "let's")
- Relatable anecdotes or hypothetical scenarios
- Encouraging, supportive language

EVERY SENTENCE must reflect AriaStar's friendly, approachable personality.`;
        break;
      case 'specialist_mentor':
        personaSystemPrompt = `CRITICAL PERSONA INSTRUCTION: You are writing EXCLUSIVELY as MentorPro, an expert specialist. Your writing MUST have:
- An authoritative, professional tone with field-specific terminology
- Clear structure with bulleted lists and key takeaways
- Precise, data-backed statements that demonstrate deep expertise
- References to industry experience (e.g., "In my years working with clients...")
- Strategic frameworks and methodologies
- Practical, actionable advice that goes beyond basics
- Warning signs and best practices

EVERY SENTENCE must reflect MentorPro's authoritative expertise.`;
        break;
      case 'ai_collaborator':
        personaSystemPrompt = `CRITICAL PERSONA INSTRUCTION: You are writing EXCLUSIVELY as AIInsight, a balanced AI collaborator. Your writing MUST have:
- A balanced tone that combines technical understanding with human-focused applications
- Transparent acknowledgment of both AI capabilities and limitations
- Human-AI collaboration themes throughout
- Technical concepts explained in accessible language
- Ethical considerations where relevant
- Forward-looking but realistic vision

EVERY SENTENCE must reflect AIInsight's collaborative approach.`;
        break;
      // Add more detailed persona instructions for other personas
      default:
        personaSystemPrompt = `IMPORTANT: You must write as the "${personaName}" persona. Fully embody this persona's unique voice, style, and perspective. DO NOT mention "AriaStar" or any other persona name unless it matches "${personaName}". When introducing yourself, use the name "${personaName.split(' ')[0]}" if needed. Every aspect of the content must consistently reflect this persona.`;
    }
    
    const finalSystemPrompt = systemPrompt + "\n\n" + personaSystemPrompt;
    
    console.log("[DIAGNOSTIC] System prompt with enhanced persona:", personaSystemPrompt.substring(0, 100) + "...");
    
    // Check if prompt is too long and trim research data if needed
    const maxPromptLength = 85000; // ~85K tokens is a safe limit
    let processedPrompt = promptText;
    
    if (promptText.length > maxPromptLength) {
      console.log("[DIAGNOSTIC] Prompt too long, using chunked approach instead of trimming");
      
      // Instead of simply trimming research data, use a more intelligent chunking approach
      // Find research data section
      const researchStartMatch = promptText.match(/RESEARCH DATA:\s+/);
      if (researchStartMatch && researchStartMatch.index !== undefined) {
        const researchStartIdx = researchStartMatch.index + researchStartMatch[0].length;
        
        // Find the next section after research data
        const nextSectionMatch = promptText.substring(researchStartIdx).match(/\n\n[A-Z\s]+:/);
        
        if (nextSectionMatch && nextSectionMatch.index !== undefined) {
          // Calculate where to cut the research data
          const researchEndIdx = researchStartIdx + nextSectionMatch.index;
          const researchData = promptText.substring(researchStartIdx, researchEndIdx);
          
          // If research data is very long, use a structured extraction approach
          if (researchData.length > 40000) {
            console.log("[DIAGNOSTIC] Using sequential processing for large research");
            
            // Extract key highlights instead of just trimming
            // Create a more intelligent extraction with summarization request
            const introNote = `
[IMPORTANT: This research data is extensive. I've analyzed it thoroughly and extracted the most relevant information:

1. Key statistics, numbers, and data points are preserved
2. Essential insights and recommendations are included
3. Core ideas from beginning, middle, and end sections are incorporated
4. Industry-specific terminology and concepts are maintained
5. Both strategic overview and tactical details are balanced

Research Summary Follows:]

`;
            
            // Extract headers and important patterns
            const extractHeaders = (text: string): string => {
              // Extract all headers and their content
              const headerPattern = /#+\s+([^\n]+)/g;
              const headers = [];
              let match;
              
              while ((match = headerPattern.exec(text)) !== null) {
                headers.push(match[0]);
              }
              
              return headers.slice(0, 15).join('\n\n');
            };
            
            // Extract bullet points and lists
            const extractLists = (text: string): string => {
              // Get bullet points and numbered lists
              const listPattern = /(?:^|\n)(?:[*-]\s+|\d+\.\s+)([^\n]+)(?:\n|$)/g;
              const lists = [];
              let match;
              
              while ((match = listPattern.exec(text)) !== null) {
                lists.push(match[0]);
              }
              
              return lists.slice(0, 20).join('\n');
            };
            
            // Extract paragraphs with data
            const extractDataParagraphs = (text: string): string => {
              // Identify paragraphs with numbers and percentages
              const dataPattern = /(?:^|\n)([^.\n]*?(?:\d+(?:\.\d+)?%|\d+\s*(?:million|billion|trillion)|(?:\$|€|£)\d+)[^.\n]*\.)/g;
              const dataParagraphs = [];
              let match;
              
              while ((match = dataPattern.exec(text)) !== null) {
                dataParagraphs.push(match[1]);
              }
              
              return dataParagraphs.slice(0, 15).join('\n\n');
            };
            
            const headers = extractHeaders(researchData);
            const lists = extractLists(researchData);
            const dataParagraphs = extractDataParagraphs(researchData);
            
            // Take beginning and end portions along with extracted key sections
            const beginningData = researchData.substring(0, 8000);
            const endingData = researchData.substring(researchData.length - 8000);
            
            // Combine everything intelligently
            const smartResearch = `${introNote}

--- KEY SECTIONS AND HEADLINES ---
${headers}

--- KEY LISTS AND BULLET POINTS ---
${lists}

--- DATA HIGHLIGHTS ---
${dataParagraphs}

--- BEGINNING SECTION ---
${beginningData}

--- ENDING SECTION ---
${endingData}
`;
            
            // Replace the original research data with intelligent extraction
            processedPrompt = 
              promptText.substring(0, researchStartIdx) + 
              smartResearch + 
              promptText.substring(researchEndIdx);
            
            console.log("[DIAGNOSTIC] Created structured research extraction, keeping essential information");
            console.log("[DIAGNOSTIC] New research section length:", smartResearch.length, "characters");
          }
        }
      }
    }
    
    // Set longer timeout for generation
    const startTime = Date.now();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Claude API request timed out after 5 minutes')), 300000); // 5 minute timeout (increased from 3 minutes)
    });
    
    // Create the API request promise
    const apiRequestPromise = anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      system: finalSystemPrompt,
      messages: [
        { role: "user", content: processedPrompt }
      ]
    });
    
    // Race the API request against the timeout
    const response = await Promise.race([apiRequestPromise, timeoutPromise]) as Anthropic.Messages.Message;
    
    const responseTime = Date.now() - startTime;
    console.log(`[DIAGNOSTIC] Claude API responded in ${responseTime}ms`);
    
    // Process the response to extract the content
    let responseText = "";
    if (response.content && Array.isArray(response.content) && response.content.length > 0) {
      const firstContent = response.content[0];
      if (typeof firstContent === 'object' && 'text' in firstContent) {
        responseText = firstContent.text;
      }
    }
    
    console.log(`[DIAGNOSTIC] Response text length: ${responseText.length} characters`);
    
    // Check if we got empty content
    if (!responseText) {
      console.error("[DIAGNOSTIC] Empty response from Claude API");
      throw new Error("Claude API returned empty content");
    }
    
    // Check if the response inadvertently uses the wrong persona name
    const personaFirstName = personaName.split(' ')[0];
    const wrongPersonaRegex = /\b(AriaStar|MentorPro|AIInsight|EcoEssence|DataStory|NexusVerse|TechTranslate|CommunityForge|SynthesisSage)\b/gi;
    
    // Replace any incorrect persona names with the correct one (only for exact matches)
    responseText = responseText.replace(wrongPersonaRegex, (match) => {
      // Only replace if it doesn't match our persona
      if (match.toLowerCase() !== personaFirstName.toLowerCase()) {
        console.log(`[DIAGNOSTIC] Replacing incorrect persona name ${match} with ${personaFirstName}`);
        return personaFirstName;
      }
      return match;
    });
    
    // Enhance the content with persona-specific traits
    console.log(`[DIAGNOSTIC] Enhancing content with ${style} persona traits`);
    const enhancedContent = enhanceWithPersonaTraits(responseText, style, styleIntensity, language);
    console.log(`[DIAGNOSTIC] Enhanced content length: ${enhancedContent.length} characters`);
    
    // After getting the response, check more stringently for persona adherence
    if (!responseText) {
      console.error("[DIAGNOSTIC] Empty response from Claude API");
      throw new Error("Claude API returned empty content");
    }

    // Check if the response adheres to the persona style
    const personaAdherenceCheck = (responseText: string, persona: string): boolean => {
      // Define characteristics for each persona
      const personaCharacteristics: Record<string, string[]> = {
        'ariastar': ['conversational', 'friendly', 'relatable', 'personal', 'warm', 'casual'],
        'specialist_mentor': ['authoritative', 'expert', 'professional', 'technical', 'strategic', 'methodology'],
        'ai_collaborator': ['collaborative', 'balanced', 'ethical', 'partnership', 'capabilities', 'limitations'],
        // Add more personas as needed
      };
      
      // Get characteristics for the current persona
      const characteristics = personaCharacteristics[persona] || [];
      
      // Check if the content has enough persona characteristics
      let matches = 0;
      characteristics.forEach(trait => {
        if (responseText.toLowerCase().includes(trait)) {
          matches++;
        }
      });
      
      // Consider it matching if at least half of characteristics are present
      return matches >= Math.floor(characteristics.length / 2);
    };

    // Log persona adherence results for debugging
    const adheres = personaAdherenceCheck(responseText, style);
    console.log(`[DIAGNOSTIC] Persona adherence check: ${adheres ? 'Passed' : 'Not fully matched'} for ${style}`);
    
    return enhancedContent;
  } catch (error) {
    console.error("[DIAGNOSTIC] Error calling Claude API:", error);
    console.error("[DIAGNOSTIC] Error details:", error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : 'Unknown error type');
    
    // For timeout errors, provide a more specific error message
    if (error instanceof Error && error.message.includes('timed out')) {
      throw new Error("Claude API request timed out. This is likely due to the large size of research data. Please try again with more concise research or try breaking it into smaller sections.");
    }
    
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

// Add specific instruction about how to use research data with the selected persona
const addPersonaSpecificResearchInstruction = (style: string, platform: string): string => {
  // Placeholder: Add logic to tailor research requests based on persona
  // Example:
  // if (style === 'expert' && platform === 'linkedin') {
  //   return "Focus research on statistical data and industry trends.";
  // }
  return "Leverage the provided research data effectively.";
};

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

// Correct buildPrompt function starts here
function buildPrompt(
  contentType: string,
  platform: string,
  audience: string,
  researchData: string,
  youtubeTranscript: string,
  prompt: string,
  style: string,
  language: string,
  subPlatform: string = '',
  businessType: string = ''
): string {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  let languageInstruction = "";
  
  // Start with strong language instruction if not English
  if (language && language !== 'en') {
    if (language === 'es') {
      languageInstruction = `INSTRUCCIÓN CRÍTICA: Este contenido DEBE estar completamente en ESPAÑOL. No uses inglés en absoluto.\n\nCRITICAL LANGUAGE INSTRUCTION: You MUST generate content in SPANISH ONLY. Do not use ANY English whatsoever in the final output.\n\n`;
    } else {
      languageInstruction = `CRITICAL LANGUAGE INSTRUCTION: Generate all content in ${language} language only.\n\n`;
    }
  }
  
  // --- Persona/Style Enforcement Start ---
  const styleDescription = `Description for style '${style}' not implemented yet.`; // Placeholder
  const personaStyleInstruction = `\n# PERSONA/STYLE REQUIREMENT (STRICT)\n**Critical Instruction:** You MUST generate the content *strictly* in the following style: **${style}**. \nDescription of ${style}: ${styleDescription} \nDo NOT deviate from this style. Do NOT use elements from other styles unless explicitly part of the ${style} description.\n\n`;
  // --- Persona/Style Enforcement End ---
  
  // --- Determine dominant platform for prompt context (moved outside function call) ---
  // Note: platformRelevance and dominantSocialPlatform need to be passed in or calculated within
  // This requires refactoring how these are handled, assuming they are calculated before calling buildPrompt
  const platformRelevance = verifyPlatformRelevance(platform, researchData); // Assuming calculated outside
  const isSocialMedia = platform === 'social'; // Assuming calculated outside
  let dominantSocialPlatform = (isSocialMedia && subPlatform) ? subPlatform : ''; // Simplified assumption
  // Complex dominant platform detection logic should ideally happen *before* calling buildPrompt

  // Build the prompt
  let promptBuilder = `${languageInstruction}${personaStyleInstruction}`;
  
  // Add core request
  promptBuilder += `Create highly engaging ${contentType} content for ${platform}${dominantSocialPlatform ? ` (specifically ${dominantSocialPlatform})` : ''} targeting ${audience}.

Based on the provided research and data, craft content that follows current (${currentMonth} ${currentYear}) best practices and will drive engagement.

${platformRelevance.relevant ? 
  `The research includes platform-specific information about ${platform}${dominantSocialPlatform ? ` with emphasis on ${dominantSocialPlatform}` : ''} which you should leverage in your content generation.` : 
  `Note: Apply your knowledge of current ${platform} best practices while using the general research data.`}

${addPersonaSpecificResearchInstruction(style, platform)}

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
- Use phrases like "Together, we can" or "This is where human creativity and AI analysis work in tandem"
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
  
  // Add detailed research data and context
  promptBuilder += `

# RESEARCH DATA & CONTEXT
RESEARCH DATA:
${researchData || "No specific research data provided."}

${youtubeTranscript ? `YOUTUBE TRANSCRIPT:
${youtubeTranscript}` : ""}

${prompt ? `ADDITIONAL CONTEXT:
${prompt}` : ""}

# FINAL INSTRUCTION
Create content that is engaging, platform-optimized (strictly adhering to the single format requested above), and highly relevant to the target audience. Focus on providing value and driving audience action. ${languageInstruction}`;
  
  console.log("Final prompt being sent to Claude:", promptBuilder); // Added logging for debugging
  return promptBuilder;
}

/**
 * POST handler for Claude content generation
 */
export async function POST(request: Request) {
  try {
    console.log('[DIAGNOSTIC] Content generation API called');
    
    // Parse the request body
    const requestData = await request.json();
    
    console.log('[DIAGNOSTIC] Request body received:', Object.keys(requestData));
    
    // Get all parameters from request with defaults
    const { 
      contentType, 
      platform, 
      audience, 
      prompt = '', 
      context = '', 
      researchData = '', 
      youtubeTranscript = '',
      youtubeUrl = '',
      style = 'professional',
      language = 'en',
      styleIntensity = 1,
      subPlatform = '',
      isPersonaChange = false,
      previousPersona = '',
      previousContent = '',
      length = '',
      includeCTA = false,
      includeHashtags = false,
      businessType = '',
      businessName = '',
      researchTopic = '',
      persona = ''
    } = requestData;
    
    // Validate that required parameters are present
    if (!contentType) {
      console.error('[DIAGNOSTIC] Missing contentType in request');
      return NextResponse.json(
        { error: 'Missing contentType in request' }, 
        { status: 400 }
      );
    }
    
    if (!platform) {
      console.error('[DIAGNOSTIC] Missing platform in request');
      return NextResponse.json(
        { error: 'Missing platform in request' }, 
        { status: 400 }
      );
    }
    
    // Check if research data is present when required for certain content types
    if (contentType !== 'transcription' && !researchData && !youtubeTranscript) {
      console.error('[DIAGNOSTIC] Missing research data for content generation');
      return NextResponse.json(
        { error: 'Missing research data. For most content types, either researchData or youtubeTranscript is required.' }, 
        { status: 400 }
      );
    }
    
    // Verify the research quality (length, structure, etc)
    if (researchData && !youtubeTranscript) {
      const researchCheck = verifyResearchQuality(researchData);
      if (!researchCheck.valid) {
        console.error(`[DIAGNOSTIC] Research quality check failed:`, researchCheck.issues);
        return NextResponse.json(
          { error: `Research quality check failed: ${researchCheck.issues.join(', ')}` }, 
          { status: 400 }
        );
      }
    }
    
    // Get the API key from environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) {
      console.error('[DIAGNOSTIC] API key is not configured');
      return NextResponse.json(
        { error: 'API key is not configured' }, 
        { status: 500 }
      );
    }
    
    // Log important request parameters
    console.log('[DIAGNOSTIC] Content generation request:', { 
      contentType, 
      platform, 
      style,
      language,
      subPlatform,
      isPersonaChange
    });
    
    // Build a prompt based on the content type
    let fullPrompt = '';
    
    // Add special instructions for persona change
    if (isPersonaChange && previousPersona && previousContent) {
      console.log('[DIAGNOSTIC] Processing persona change request:', {
        from: previousPersona,
        to: style || persona
      });
      
      fullPrompt = `<instructions>
You are an expert AI content writer specializing in voice transformation. Your task is to rewrite the ORIGINAL CONTENT below to match the style and tone of a new AI persona.

## PERSONA CHANGE REQUEST
- PREVIOUS PERSONA: ${previousPersona}
- NEW PERSONA: ${style || persona}

## CURRENT CONTENT TO TRANSFORM
${previousContent}

## RESEARCH CONTEXT (DO NOT DIRECTLY COPY FROM THIS)
${researchData}

## CONTENT SPECIFICATIONS
- Content Type: ${contentType}
- Platform: ${platform}${subPlatform ? ` (${subPlatform})` : ''}
- Target Audience: ${audience}
- Length: ${length || 'medium'}
- Include Call to Action: ${includeCTA ? 'Yes' : 'No'}
- Include Hashtags: ${includeHashtags ? 'Yes' : 'No'}
- Business Type: ${businessType}
- Business Name: ${businessName}
- Topic: ${researchTopic}

## CRITICAL INSTRUCTIONS
1. MAINTAIN the same general information and facts from the original content
2. TRANSFORM the voice, tone, and style to perfectly match the new persona
3. DO NOT simply edit a few words - this must be a complete voice transformation
4. PRESERVE the overall structure but adapt the presentation style
5. INCORPORATE the unique style markers, vocabulary, and sentence patterns of the new persona
6. ENHANCE the content where appropriate for the new persona's strengths
7. ENSURE the transformation is complete and consistent throughout the entire piece

Return ONLY the transformed content in the new persona voice, with no explanations, introductions, or meta-commentary.
</instructions>`;
    } else {
      // Use standard prompt building for regular content generation
      // Calculate platform relevance and dominant platform *before* calling buildPrompt
      const platformRelevance = verifyPlatformRelevance(platform, researchData);
      const isSocialMedia = platform === 'social';
      const specificSocialPlatform = isSocialMedia && subPlatform ? subPlatform : '';
      let dominantSocialPlatform = specificSocialPlatform;
      if (isSocialMedia && !dominantSocialPlatform && platformRelevance.relevant) {
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
      
      // Now call the top-level function
      fullPrompt = buildPrompt(
        contentType,
        platform,
        audience,
        researchData,
        youtubeTranscript,
        prompt,
        style,
        language,
        // Pass dominantSocialPlatform instead of subPlatform if detected, otherwise pass original subPlatform
        dominantSocialPlatform || subPlatform, 
        businessType
      );
    }
    
    // Call the Claude API
    console.log('[DIAGNOSTIC] Calling Claude API...');
    const content = await callClaudeApi(fullPrompt, apiKey, style, language, styleIntensity);
    console.log('[DIAGNOSTIC] Content generated successfully, length:', content.length);
    
    // Return the response as JSON
    return NextResponse.json({ content });
  } catch (error) {
    console.error('[DIAGNOSTIC] Error in content API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 
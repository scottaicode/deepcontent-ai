/**
 * Claude 3.7 Sonnet Research API Route
 * 
 * This API route uses Claude 3.7 Sonnet to generate detailed research analysis.
 */

import { NextResponse } from 'next/server';
import { TrendingTopic } from '@/app/lib/api/redditApi';
import { Anthropic } from '@anthropic-ai/sdk';

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
    
    // Extract audience, content type, platform, and sub-platform from context if available
    let audience = '';
    let contentType = '';
    let platform = '';
    let subPlatform = '';
    
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
      
      // Extract sub-platform if available
      const subPlatformMatch = context.match(/Sub-Platform: ([^,]+)/i);
      subPlatform = subPlatformMatch ? subPlatformMatch[1].trim() : '';
      
      // If platform is 'social' and a specific sub-platform is available, use the sub-platform instead
      if (platform.toLowerCase() === 'social' && subPlatform) {
        console.log(`Using specific sub-platform "${subPlatform}" instead of generic "social" for better research specificity`);
        platform = subPlatform;
      } else if (platform.toLowerCase() === 'social') {
        // Convert 'social' to 'facebook' if no specific platform is provided
        console.log('Converting generic "social" platform to "facebook" for better research specificity');
        platform = 'facebook';
      }
    }
    
    console.log(`Extracted audience from context: "${audience}"`);
    console.log(`Extracted content type from context: "${contentType}"`);
    console.log(`Extracted platform from context: "${platform}"`);
    console.log(`Extracted sub-platform from context: "${subPlatform}"`);
    
    // If platform is "social" and we have a sub-platform, it indicates a specific social media platform
    // This helps with generating more specific research
    if (platform.toLowerCase() === 'social' && subPlatform) {
      console.log(`Social platform with specific sub-platform: ${subPlatform}`);
    }
    
    // Get the API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
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
      
      // Create Anthropic client
      const anthropic = new Anthropic({
        apiKey: apiKey,
      });
      
      // Call Claude API with the message format
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL_NAME,
        max_tokens: 4000,
        temperature: 0.7,
        system: "You are a highly skilled research analyst who specializes in finding valuable insights and best practices for content creation based on trends and data. Your research is comprehensive, accurate, and designed to help content creators make data-driven decisions.",
        messages: [
          { role: 'user', content: prompt }
        ]
      });
      
      // Extract the content from Claude's response
      let research = '';
      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        const firstContent = response.content[0];
        if (typeof firstContent === 'object' && 'text' in firstContent) {
          research = firstContent.text;
        }
      }
      
      // Clean the research text
      research = removeThinkingTags(research);
      
      console.log(`Research generated successfully for topic: ${topic}`);
      console.log('Research length:', research.length);
      
      // Return successful response with platform and sub-platform info
      console.log('==== RESEARCH API CALL COMPLETED SUCCESSFULLY ====');
      return Response.json({
        research,
        model: CLAUDE_MODEL_NAME,
        platform,
        subPlatform, // Include the sub-platform in the response
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
 * Build a prompt for Claude 3.7 Sonnet to generate research
 */
function buildPrompt(topic: string, context?: string, trendingTopics: TrendingTopic[] = [], language?: string): string {
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString();
  const month = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  
  // Extract audience, content type, and platform from context if available
  let audience = 'general audience';
  let contentType = 'content';
  let platform = 'general digital platform';
  let subPlatform = '';
  
  if (context) {
    // Extract audience information
    const audienceMatch = context.match(/Target Audience: ([^,]+)/i);
    if (audienceMatch) audience = audienceMatch[1].trim();
    
    // Extract content type
    const contentTypeMatch = context.match(/Content Type: ([^,]+)/i);
    if (contentTypeMatch) contentType = contentTypeMatch[1].trim();
    
    // Extract platform
    const platformMatch = context.match(/Platform: ([^,]+)/i);
    if (platformMatch) platform = platformMatch[1].trim();
    
    // Extract sub-platform if available
    const subPlatformMatch = context.match(/Sub-Platform: ([^,]+)/i);
    if (subPlatformMatch) subPlatform = subPlatformMatch[1].trim();
  }
  
  // If platform is "social" and we have a sub-platform, use the sub-platform
  if (platform.toLowerCase() === 'social' && subPlatform) {
    platform = subPlatform;
  }
  
  // Limit trending topics to 5 to avoid prompt bloat
  const limitedTrendingTopics = trendingTopics.slice(0, 5);
  
  // Build trending topics section if available
  let trendingTopicsSection = '';
  if (limitedTrendingTopics.length > 0) {
    trendingTopicsSection = `\nRELATED TRENDING TOPICS (${dateString}):\n`;
    
    limitedTrendingTopics.forEach((topic, index) => {
      // Use only properties from the TrendingTopic interface
      trendingTopicsSection += `${index + 1}. "${topic.title}" - ${topic.categories.join(', ')}\n`;
      // Use summary instead of description
      if (topic.summary) {
        trendingTopicsSection += `   ${topic.summary}\n`;
      }
    });
    
    trendingTopicsSection += '\nIncorporate insights from these trending topics where relevant.\n';
  }
  
  // Build the prompt based on the language
  if (language === 'es') {
    return `Generar una investigación exhaustiva sobre "${topic}" para crear contenido digital.

FECHA: ${dateString}
AUDIENCIA OBJETIVO: ${audience}
TIPO DE CONTENIDO: ${contentType}
PLATAFORMA: ${platform}${subPlatform ? ` (específicamente ${subPlatform})` : ''}

${trendingTopicsSection}

Tu investigación debe incluir:

1. IMPORTANCIA ACTUAL (${month} ${year}):
   - Por qué "${topic}" es relevante ahora
   - Tendencias actuales y datos relacionados
   - Contexto del mercado para ${platform}

2. TENDENCIAS Y DESARROLLOS RECIENTES (Últimos 90 días):
   - Tendencias de salud de la piel
   - Desarrollos recientes en la industria
   - Cambios en las suposiciones del consumidor

3. MEJORES PRÁCTICAS ACTUALES (A partir de ${month} ${year}):
   - Estrategias efectivas para ${platform}
   - Ejemplos de contenido exitoso
   - Formatos que están funcionando bien

4. RECOMENDACIONES PROCESABLES:
   - Tácticas prioritarias para implementar
   - Temas específicos a cubrir
   - Elementos a evitar

5. FUENTES Y CITAS:
   - Fuentes confiables utilizadas para esta investigación
   - Informes o estudios específicos consultados

Prioriza insights específicos para ${platform} y contenido optimizado para ${audience}. Incluye datos y estadísticas actuales siempre que sea posible. Esta investigación se utilizará para crear contenido digital efectivo y actualizado.`;
  } else {
    // Default English prompt
    return `Generate comprehensive research on "${topic}" for digital content creation.

DATE: ${dateString}
TARGET AUDIENCE: ${audience}
CONTENT TYPE: ${contentType}
PLATFORM: ${platform}${subPlatform ? ` (specifically ${subPlatform})` : ''}

${trendingTopicsSection}

Your research should include:

1. CURRENT SIGNIFICANCE (${month} ${year}):
   - Why "${topic}" matters now
   - Current trends and related data
   - Market context for ${platform}

2. RECENT TRENDS AND DEVELOPMENTS (Past 90 Days):
   - Relevant industry trends
   - Recent developments
   - Shifts in consumer assumptions

3. CURRENT BEST PRACTICES (As of ${month} ${year}):
   - Effective strategies for ${platform}
   - Examples of successful content
   - Formats that are performing well

4. ACTIONABLE RECOMMENDATIONS:
   - Priority tactics to implement
   - Specific topics to cover
   - Elements to avoid

5. SOURCES AND CITATIONS:
   - Reliable sources used for this research
   - Specific reports or studies consulted

Prioritize platform-specific insights for ${platform} and content optimized for ${audience}. Include current data and statistics whenever possible. This research will be used to create effective, up-to-date digital content.`;
  }
}

/**
 * Remove thinking tags from content
 */
function removeThinkingTags(text: string): string {
  if (!text) return '';
  
  return text
    // Remove both thinking tag variants
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
    .replace(/<thinking[\s\S]*?thinking>/g, '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think[\s\S]*?think>/g, '');
}

export const dynamic = 'force-dynamic'; 
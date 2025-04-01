import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

// Constants
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';
const MAX_IMAGE_SIZE_MB = 10; // Max image size in MB

export async function POST(req: Request) {
  console.log('Image analysis API called');
  
  try {
    // Extract form data
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;
    const contextType = formData.get('contextType') as string || 'general';
    const language = formData.get('language') as string || 'en';
    
    // Extract platform info if present
    const platformStr = formData.get('platform') as string || '';
    const subPlatformStr = formData.get('subPlatform') as string || '';
    
    // Determine the actual context type based on platform info
    let effectiveContextType = contextType;
    if (platformStr) {
      if (platformStr === 'youtube') {
        effectiveContextType = 'youtube';
      } else if (platformStr === 'vlog') {
        effectiveContextType = 'vlog';
      } else if (platformStr === 'video-script') {
        effectiveContextType = 'video';
      }
    }
    
    console.log(`Platform info: ${platformStr}/${subPlatformStr} → Context type: ${effectiveContextType}`);
    
    // Validate inputs
    if (!imageFile) {
      console.error('No image provided in request');
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Check file size
    const fileSizeMB = imageFile.size / (1024 * 1024);
    if (fileSizeMB > MAX_IMAGE_SIZE_MB) {
      console.error(`Image too large: ${fileSizeMB.toFixed(2)}MB (max: ${MAX_IMAGE_SIZE_MB}MB)`);
      return NextResponse.json(
        { error: `Image too large. Maximum allowed size is ${MAX_IMAGE_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    // Get Anthropic API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('Missing Anthropic API key');
      return NextResponse.json(
        { error: 'Configuration error - missing API key' },
        { status: 500 }
      );
    }
    
    // Convert image to base64 for Anthropic API
    const buffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    
    // Extract and validate mime type
    let mediaType = imageFile.type;
    // Ensure it's one of the supported types
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedTypes.includes(mediaType)) {
      console.warn(`Unsupported image type: ${mediaType}, defaulting to image/jpeg`);
      mediaType = 'image/jpeg';
    }
    
    // Configure Anthropic client
    const client = new Anthropic({
      apiKey,
    });
    
    // Build system prompt based on context type
    let systemPrompt = '';
    if (language === 'es') {
      systemPrompt = getSpanishSystemPrompt(effectiveContextType);
    } else {
      systemPrompt = getEnglishSystemPrompt(effectiveContextType);
    }
    
    console.log(`Sending image analysis request to Claude for context: ${effectiveContextType}`);
    
    // Call Claude API with the image
    try {
      console.log(`Preparing Claude API call with params: model=${CLAUDE_MODEL}, mediaType=${mediaType}, contextType=${effectiveContextType}`);
      
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              } as any,
              {
                type: 'text',
                text: prompt || getDefaultPrompt(effectiveContextType, language),
              } as any,
            ],
          },
        ],
      });
      
      console.log(`Received response from Claude with ${response.content?.length || 0} content items`);
      
      // Check if we have a valid response with content
      if (!response.content || response.content.length === 0) {
        console.error('Empty content array in Claude response');
        throw new Error('Empty response from Claude');
      }
      
      // Check the type of the first content item
      const firstContent = response.content[0];
      console.log(`First content item type: ${firstContent.type}`);
      
      // Return the analysis
      const analysisText = 'text' in firstContent ? firstContent.text : '';
      console.log(`Returning analysis text of length: ${analysisText.length}`);
      
      // Format the response with some simple markdown-like structure if it doesn't already have it
      let formattedAnalysis = analysisText;
      
      // Check if we need to add some structure (if it doesn't already have headers or bullet points)
      if (!analysisText.includes('##') && !analysisText.includes('#') && 
          !analysisText.includes('- ') && !analysisText.includes('* ')) {
        
        // Split by double newlines to get paragraphs
        const paragraphs = analysisText.split('\n\n').filter(p => p.trim().length > 0);
        
        if (paragraphs.length > 1) {
          // Try to create a more structured response
          formattedAnalysis = '';
          
          // Add a summary section if the first paragraph is short
          if (paragraphs[0].length < 200) {
            formattedAnalysis += `## Summary\n\n${paragraphs[0]}\n\n`;
            
            // Add details section with the rest
            formattedAnalysis += `## Detailed Analysis\n\n`;
            for (let i = 1; i < paragraphs.length; i++) {
              formattedAnalysis += `${paragraphs[i]}\n\n`;
            }
          } else {
            // Otherwise just add some basic structure
            formattedAnalysis += `## Image Analysis\n\n`;
            for (let i = 0; i < paragraphs.length; i++) {
              formattedAnalysis += `${paragraphs[i]}\n\n`;
            }
          }
        }
      }
      
      return NextResponse.json({
        analysis: formattedAnalysis,
      });
    } catch (anthropicError: any) {
      // Handle specific Anthropic API errors
      console.error('Anthropic API error:', anthropicError);
      
      // Check for rate limiting or quota errors
      if (anthropicError.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a few moments.' },
          { status: 429 }
        );
      }
      
      // Check for invalid image format errors
      if (anthropicError.message && anthropicError.message.includes('image')) {
        return NextResponse.json(
          { error: 'Invalid image format. Please try with a different image.' },
          { status: 400 }
        );
      }
      
      // General API error
      return NextResponse.json(
        { error: anthropicError.message || 'Error communicating with Claude' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error analyzing image:', error);
    const errorMessage = error?.message || 'Failed to analyze image';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Helper function to get default prompt based on context
function getDefaultPrompt(contextType: string, language: string): string {
  if (language === 'es') {
    switch (contextType) {
      case 'social-media':
        return 'Analiza esta imagen y sugiere un texto atractivo para acompañarla en redes sociales. Destaca los elementos clave y explica cómo podría mejorar la participación.';
      case 'landing-page':
        return 'Analiza esta imagen para una página de destino. ¿Cómo contribuye a la narrativa de la página? ¿Qué texto complementario sugerirías para mejorar las conversiones?';
      case 'research':
        return 'Analiza esta imagen en detalle. ¿Qué información clave proporciona para la investigación? Identifica todos los elementos importantes.';
      default:
        return 'Analiza esta imagen en detalle. Describe su contenido, contexto, y cómo podría usarse efectivamente en contenido digital.';
    }
  } else {
    switch (contextType) {
      case 'social-media':
        return 'Analyze this image and suggest engaging text to accompany it on social media. Highlight key elements and explain how it could improve engagement.';
      case 'landing-page':
        return 'Analyze this image for a landing page. How does it contribute to the page narrative? What complementary text would you suggest to improve conversions?';
      case 'research':
        return 'Analyze this image in detail. What key information does it provide for research? Identify all important elements.';
      default:
        return 'Analyze this image in detail. Describe its content, context, and how it could be effectively used in digital content.';
    }
  }
}

// System prompts
function getEnglishSystemPrompt(contextType: string): string {
  const basePrompt = `You are an expert image analyst and content creator. Analyze images thoroughly and provide detailed, insightful observations that can be used to create high-quality content. 
  
IMPORTANT: Always respond in English.

Your analysis should be comprehensive yet concise, focusing on elements most relevant to content creation.`;

  switch (contextType) {
    case 'social-media':
      return `${basePrompt}

Focus on elements that would drive engagement on social media platforms:
- Emotional appeal and storytelling potential
- Visual aesthetics and composition
- Trend relevance and timeliness
- Potential audience reaction
- Suitable hashtags and call-to-action opportunities

Suggest ways to optimize the image for specific platforms (Instagram, Twitter, LinkedIn, TikTok, etc.) if applicable.`;

    case 'landing-page':
      return `${basePrompt}

Focus on elements that would support conversion on a landing page:
- Brand alignment and messaging consistency
- Visual hierarchy and attention flow
- Trust signals and social proof elements
- Emotional triggers and value proposition support
- Call-to-action enhancement opportunities

Suggest complementary text that would work with the image to improve conversion rates.`;

    case 'research':
      return `${basePrompt}

Focus on extracting factual information from the image:
- Technical details and specifications
- Data points, statistics, and metrics
- Contextual information and setting
- Comparative elements and relationships
- Source credibility indicators

Provide objective analysis without speculation unless explicitly requested.`;

    case 'video':
      return `${basePrompt}

Focus on elements that would enhance video content:
- Visual storytelling and narrative support
- Scene composition and framing suggestions
- Thumbnail potential (for YouTube or other platforms)
- B-roll footage possibilities 
- Visual transitions and sequencing ideas
- Audience retention elements
- Key moments that could be highlighted

Suggest how the image could be incorporated into video content, what story it tells, and how to optimize it for video platforms like YouTube.`;

    case 'youtube':
      return `${basePrompt}

Focus specifically on YouTube optimization:
- Thumbnail potential - how this image could be adapted for high-CTR thumbnails
- Visual storytelling elements that align with YouTube best practices
- Scene composition suggestions ideal for the YouTube format
- B-roll integration opportunities
- Visual hooks for audience retention
- Title/description suggestions that complement the visual content
- YouTube-specific metadata recommendations

Provide analysis specifically optimized for creating successful YouTube content.`;

    case 'vlog':
      return `${basePrompt}

Focus on vlog-specific content optimization:
- Personal narrative potential within the image
- Authenticity and relatability elements
- How this visual could enhance the creator's storytelling
- Scene composition for vlog-style content
- Transition opportunities and visual flow
- B-roll integration possibilities
- Personal connection points that could engage viewers

Provide suggestions specifically for vlog content, focusing on personal storytelling and authentic presentation.`;

    default:
      return basePrompt;
  }
}

function getSpanishSystemPrompt(contextType: string): string {
  const basePrompt = `Eres un experto analista de imágenes y creador de contenido. Analiza las imágenes minuciosamente y proporciona observaciones detalladas y perspicaces que puedan utilizarse para crear contenido de alta calidad.

IMPORTANTE: Responde siempre en español. Toda tu respuesta debe estar en español.

Tu análisis debe ser completo pero conciso, centrándote en los elementos más relevantes para la creación de contenido.`;

  switch (contextType) {
    case 'social-media':
      return `${basePrompt}

Concéntrate en elementos que impulsarían la participación en plataformas de redes sociales:
- Atractivo emocional y potencial para contar historias
- Estética visual y composición
- Relevancia de tendencias y actualidad
- Reacción potencial de la audiencia
- Hashtags adecuados y oportunidades de llamada a la acción

Sugiere formas de optimizar la imagen para plataformas específicas (Instagram, Twitter, LinkedIn, TikTok, etc.) si es aplicable.`;

    case 'landing-page':
      return `${basePrompt}

Concéntrate en elementos que apoyarían la conversión en una página de destino:
- Alineación con la marca y consistencia del mensaje
- Jerarquía visual y flujo de atención
- Señales de confianza y elementos de prueba social
- Disparadores emocionales y apoyo a la propuesta de valor
- Oportunidades de mejora de llamada a la acción

Sugiere texto complementario que funcionaría con la imagen para mejorar las tasas de conversión.`;

    case 'research':
      return `${basePrompt}

Concéntrate en extraer información factual de la imagen:
- Detalles técnicos y especificaciones
- Puntos de datos, estadísticas y métricas
- Información contextual y entorno
- Elementos comparativos y relaciones
- Indicadores de credibilidad de la fuente

Proporciona análisis objetivo sin especulación a menos que se solicite explícitamente.`;

    case 'video':
      return `${basePrompt}

Concéntrate en elementos que mejorarían el contenido de video:
- Narración visual y apoyo narrativo
- Sugerencias de composición y encuadre de escenas
- Potencial para miniaturas (para YouTube u otras plataformas)
- Posibilidades de metraje secundario (B-roll)
- Ideas de transiciones visuales y secuenciación
- Elementos de retención de audiencia
- Momentos clave que podrían destacarse

Sugiere cómo se podría incorporar la imagen en contenido de video, qué historia cuenta y cómo optimizarla para plataformas de video como YouTube.`;

    case 'youtube':
      return `${basePrompt}

Concéntrate específicamente en la optimización para YouTube:
- Potencial de miniatura - cómo esta imagen podría adaptarse para miniaturas con alto CTR
- Elementos de narración visual que se alinean con las mejores prácticas de YouTube
- Sugerencias de composición de escenas ideales para el formato de YouTube
- Oportunidades de integración de metraje secundario (B-roll)
- Ganchos visuales para retención de audiencia
- Sugerencias de título/descripción que complementen el contenido visual
- Recomendaciones específicas de metadatos para YouTube

Proporciona análisis específicamente optimizado para crear contenido exitoso en YouTube.`;

    case 'vlog':
      return `${basePrompt}

Concéntrate en la optimización de contenido específico para vlogs:
- Potencial narrativo personal dentro de la imagen
- Elementos de autenticidad y capacidad de relación
- Cómo este visual podría mejorar la narración del creador
- Composición de escena para contenido estilo vlog
- Oportunidades de transición y flujo visual
- Posibilidades de integración de metraje secundario (B-roll)
- Puntos de conexión personal que podrían interesar a los espectadores

Proporciona sugerencias específicamente para contenido de vlog, enfocándote en la narración personal y la presentación auténtica.`;

    default:
      return basePrompt;
  }
} 
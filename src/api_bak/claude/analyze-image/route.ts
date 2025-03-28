import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

// Constants
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

export async function POST(req: Request) {
  try {
    // Extract form data
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;
    const contextType = formData.get('contextType') as string || 'general';
    const language = formData.get('language') as string || 'en';
    
    // Validate inputs
    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
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
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType)) {
      // Default to jpeg if not supported
      mediaType = 'image/jpeg';
    }
    
    // Configure Anthropic client
    const client = new Anthropic({
      apiKey,
    });
    
    // Build system prompt based on context type
    let systemPrompt = '';
    if (language === 'es') {
      systemPrompt = getSpanishSystemPrompt(contextType);
    } else {
      systemPrompt = getEnglishSystemPrompt(contextType);
    }
    
    console.log('Sending image analysis request to Claude');
    
    // Call Claude API with the image
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
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt || getDefaultPrompt(contextType, language),
            } as { type: 'text', text: string },
          ],
        },
      ],
    });
    
    console.log('Received response from Claude');
    
    // Return the analysis
    return NextResponse.json({
      analysis: response.content[0] && 'text' in response.content[0] ? response.content[0].text : '',
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
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

    default:
      return basePrompt;
  }
}

function getSpanishSystemPrompt(contextType: string): string {
  const basePrompt = `Eres un experto analista de imágenes y creador de contenido. Analiza las imágenes minuciosamente y proporciona observaciones detalladas y perspicaces que puedan utilizarse para crear contenido de alta calidad.

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

    default:
      return basePrompt;
  }
} 
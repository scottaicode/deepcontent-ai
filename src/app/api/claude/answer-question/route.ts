import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

// Constants - Using Claude 3.7 Sonnet model
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Define request interface
interface AnswerQuestionRequest {
  question: string;
  content: string;
  research?: string;
  transcript?: string;
  contentType?: string;
  platform?: string;
  audience?: string;
  topic?: string;
  language?: string;
  style?: string;
}

/**
 * Process the request to generate an answer to a follow-up question
 */
export async function POST(request: Request) {
  try {
    // Parse the request
    const requestData: AnswerQuestionRequest = await request.json();
    const { 
      question,
      content, 
      research, 
      transcript, 
      contentType = 'generic', 
      platform = 'generic',
      audience = 'general audience',
      topic = '',
      language = 'en',
      style = 'professional'
    } = requestData;

    // Validate required fields
    if (!question) {
      return NextResponse.json({ error: 'Missing required field: question' }, { status: 400 });
    }

    // Ensure content is at least an empty string
    const safeContent = content || '';

    // Get API key from environment variable
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return new Response('Anthropic API key not configured', { status: 500 });
    }

    // Create Anthropic client
    const anthropicClient = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Prepare system prompt
    let systemPrompt = buildSystemPrompt(language, !!content);

    // Build prompt with all available context
    const userPrompt = buildUserPrompt({
      question,
      content,
      research,
      transcript,
      contentType,
      platform,
      audience,
      topic,
      language
    });

    console.log(`Calling Claude API to answer question: "${question.substring(0, 50)}..."`);

    // Make API call to Claude
    const response = await anthropicClient.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt }
      ]
    });

    // Process the response
    let responseText = "";
    if (response.content && Array.isArray(response.content) && response.content.length > 0) {
      const firstContent = response.content[0];
      if (typeof firstContent === 'object' && 'text' in firstContent) {
        responseText = firstContent.text;
      }
    }

    console.log(`Answer generated successfully, length: ${responseText.length} characters`);

    // Return the answer
    return NextResponse.json({ 
      answer: responseText.trim(),
      model: CLAUDE_MODEL
    });

  } catch (error) {
    console.error('Error generating answer to follow-up question:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Build the system prompt based on language and content availability
 */
function buildSystemPrompt(language: string, hasContent: boolean = true): string {
  if (language === 'es') {
    const basePrompt = `Eres un asistente experto que responde preguntas sobre contenido digital. Tu tarea es generar respuestas informativas y útiles a las preguntas de seguimiento sobre ${hasContent ? 'el contenido proporcionado' : 'el tema proporcionado'}.

Instrucciones específicas:
1. Genera una respuesta completa pero concisa a la pregunta proporcionada.
2. ${hasContent ? 'Utiliza la información del contenido, la investigación y cualquier transcripción proporcionada para fundamentar tu respuesta.' : 'Utiliza tu conocimiento sobre el tema y cualquier transcripción proporcionada para generar una respuesta informativa.'}
3. La respuesta debe reflejar el conocimiento y la perspectiva que el usuario probablemente tendría sobre su propio contenido.
4. Mantén un tono profesional y útil.
5. Incluye detalles específicos y relevantes cuando sea posible.
6. Evita respuestas genéricas; personaliza la respuesta al contexto específico del ${hasContent ? 'contenido' : 'tema'} y la audiencia.
7. NO repitas ni incluyas la pregunta en tu respuesta - proporciona solo la respuesta en sí.
8. Comienza directamente con el contenido sustantivo de la respuesta.`;

    return basePrompt;
  }

  // Default English system prompt
  const basePrompt = `You are an expert assistant who answers questions about digital content. Your task is to generate informative and helpful responses to follow-up questions about ${hasContent ? 'the provided content' : 'the given topic'}.

Specific instructions:
1. Generate a comprehensive yet concise answer to the provided question.
2. ${hasContent ? 'Use information from the content, research, and any transcript provided to inform your answer.' : 'Use your knowledge about the topic and any transcript provided to generate an informative response.'}
3. The answer should reflect the knowledge and perspective the user would likely have about their own content.
4. Maintain a professional and helpful tone.
5. Include specific, relevant details when possible.
6. Avoid generic responses; tailor the answer to the specific context of the ${hasContent ? 'content' : 'topic'} and audience.
7. Do NOT repeat or include the question in your answer - provide only the answer itself.
8. Start directly with the substantive content of the answer.`;

  return basePrompt;
}

/**
 * Build the user prompt with all available context
 */
function buildUserPrompt(data: AnswerQuestionRequest): string {
  const { 
    question,
    content, 
    research, 
    transcript, 
    contentType, 
    platform,
    audience,
    topic,
    language
  } = data;

  // Use the safeContent variable we defined earlier
  const safeContent = content || '';
  
  let prompt = '';
  
  if (language === 'es') {
    prompt = `Genera una respuesta a la siguiente pregunta sobre este contenido.

PREGUNTA:
${question}

${safeContent ? `CONTENIDO:
${safeContent}

` : ''}`;

    if (research) {
      prompt += `INVESTIGACIÓN DE REFERENCIA:
${research}

`;
    }

    if (transcript) {
      prompt += `TRANSCRIPCIÓN DE YOUTUBE:
${transcript}

`;
    }

    prompt += `DETALLES ADICIONALES:
Tipo de contenido: ${contentType}
Plataforma: ${platform}
Audiencia: ${audience}
${topic ? `Tema principal: ${topic}` : ''}

Por favor, genera una respuesta útil y detallada a la pregunta proporcionada. La respuesta debe ser escrita como si fuera el usuario respondiendo a su propia pregunta, basándose en su conocimiento del tema y la investigación disponible.`;

  } else {
    // Default English prompt
    prompt = `Generate an answer to the following question about this content.

QUESTION:
${question}

${safeContent ? `CONTENT:
${safeContent}

` : ''}`;

    if (research) {
      prompt += `REFERENCE RESEARCH:
${research}

`;
    }

    if (transcript) {
      prompt += `YOUTUBE TRANSCRIPT:
${transcript}

`;
    }

    prompt += `ADDITIONAL DETAILS:
Content Type: ${contentType}
Platform: ${platform}
Audience: ${audience}
${topic ? `Main Topic: ${topic}` : ''}

Please generate a helpful and detailed response to the provided question. The answer should be written as if it were the user answering their own question, based on their knowledge of the topic and the available research.`;
  }

  return prompt;
} 
import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

// Constants - Using Claude 3.7 Sonnet model
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Define request interface
interface FollowUpQuestionsRequest {
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
 * Process the request to generate follow-up questions
 */
export async function POST(request: Request) {
  try {
    // Parse the request
    const requestData: FollowUpQuestionsRequest = await request.json();
    const { 
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
    if (!content) {
      return NextResponse.json({ error: 'Missing required field: content' }, { status: 400 });
    }

    // Get API key from environment variable
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    
    // Check if API key is available
    if (!anthropicApiKey) {
      console.warn('Anthropic API key not found. Using simulation mode.');
      // Return simulated response when API key is missing
      return NextResponse.json({ 
        questions: simulateFollowUpQuestions(language),
        model: "simulation_mode"
      });
    }

    // Create Anthropic client
    const anthropicClient = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Prepare system prompt
    let systemPrompt = buildSystemPrompt(language);

    // Build prompt with all available context
    const userPrompt = buildUserPrompt({
      content,
      research,
      transcript,
      contentType,
      platform,
      audience,
      topic,
      language
    });

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
      if (typeof firstContent === 'string') {
        responseText = firstContent;
      } else if (firstContent && typeof firstContent === 'object' && 'text' in firstContent) {
        responseText = firstContent.text;
      }
    }

    // Parse questions from the response
    const questions = parseQuestionsFromResponse(responseText, language);

    // Return the questions
    return NextResponse.json({ 
      questions,
      model: CLAUDE_MODEL
    });

  } catch (error) {
    console.error('Error generating follow-up questions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Build the system prompt based on language
 */
function buildSystemPrompt(language: string): string {
  if (language === 'es') {
    return `Eres un experto en crear preguntas de seguimiento para contenido digital. Tu tarea es generar preguntas relevantes y estimulantes que profundicen en el tema del contenido proporcionado.

Instrucciones específicas:
1. Genera exactamente 5 preguntas de seguimiento basadas en el contenido, la investigación y cualquier transcripción proporcionada.
2. Las preguntas deben ser relevantes para el tema, pero explorar ángulos que el contenido original no cubrió completamente.
3. Formula preguntas que sean específicas y estimulantes, no genéricas.
4. Cada pregunta debe ser autónoma y clara.
5. Asegúrate de que las preguntas sean apropiadas para el tipo de contenido y la plataforma especificada.
6. Responde ÚNICAMENTE con un array JSON de 5 preguntas. No incluyas ningún texto adicional, explicaciones o comentarios.`;
  }

  // Default English system prompt
  return `You are an expert at creating follow-up questions for digital content. Your task is to generate relevant and thought-provoking questions that deepen the topic of the provided content.

Specific instructions:
1. Generate exactly 5 follow-up questions based on the content, research, and any transcript provided.
2. Questions should be relevant to the topic but explore angles the original content didn't fully cover.
3. Craft questions that are specific and thought-provoking, not generic.
4. Each question should be self-contained and clear.
5. Ensure questions are appropriate for the specified content type and platform.
6. Respond ONLY with a JSON array of 5 questions. Include no additional text, explanations, or commentary.`;
}

/**
 * Build the user prompt with all available context
 */
function buildUserPrompt(data: FollowUpQuestionsRequest): string {
  const { 
    content, 
    research, 
    transcript, 
    contentType, 
    platform,
    audience,
    topic,
    language
  } = data;

  let prompt = '';
  
  if (language === 'es') {
    prompt = `Genera 5 preguntas de seguimiento para este contenido.

CONTENIDO:
${content}

`;

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

Genera exactamente 5 preguntas de seguimiento en español que profundicen en este tema. Las preguntas deben ser relevantes, específicas y estimular la reflexión. Deben explorar ángulos que el contenido original no cubrió por completo.

Responde ÚNICAMENTE con un array JSON de 5 preguntas, sin texto adicional.`;

  } else {
    // Default English prompt
    prompt = `Generate 5 follow-up questions for this content.

CONTENT:
${content}

`;

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

Generate exactly 5 follow-up questions in English that deepen this topic. Questions should be relevant, specific, and thought-provoking. They should explore angles the original content didn't fully cover.

Respond ONLY with a JSON array of 5 questions, with no additional text.`;
  }

  return prompt;
}

/**
 * Parse questions from Claude's response
 */
function parseQuestionsFromResponse(response: string, language: string): string[] {
  try {
    // Try to extract JSON array from the response
    // Using a more compatible regex pattern without the 's' flag
    const jsonMatch = response.match(/\[\s*"[\s\S]*"\s*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If direct JSON parsing fails, try to extract questions line by line
    const questions = response.split('\n')
      .filter(line => line.trim().endsWith('?'))
      .map(line => line.trim())
      .filter(Boolean);
    
    if (questions.length > 0) {
      return questions.slice(0, 5); // Limit to 5 questions
    }
    
    // If both methods fail, return a fallback message
    const fallbackMessage = language === 'es' 
      ? "No se pudieron generar preguntas de seguimiento. Por favor, intenta de nuevo."
      : "Failed to generate follow-up questions. Please try again.";
    
    return [fallbackMessage];
  } catch (error) {
    console.error('Error parsing questions from response:', error);
    const errorMessage = language === 'es'
      ? "Error al procesar las preguntas de seguimiento."
      : "Error processing follow-up questions.";
    return [errorMessage];
  }
}

/**
 * Generate simulated questions when API key is not available
 */
function simulateFollowUpQuestions(language: string): string[] {
  if (language === 'es') {
    return [
      "¿Qué obstáculos podrían surgir al implementar estas estrategias y cómo superarlos?",
      "¿Cómo podrían adaptarse estos conceptos para una audiencia diferente?",
      "¿De qué manera estos enfoques podrían evolucionar en los próximos años?",
      "¿Cuáles son algunas métricas específicas para medir el éxito de estas recomendaciones?",
      "¿Qué experiencias personales has tenido que confirmen o contradigan estos puntos?"
    ];
  }
  
  // Default English simulated questions
  return [
    "What obstacles might arise when implementing these strategies and how can they be overcome?",
    "How could these concepts be adapted for a different audience?",
    "In what ways might these approaches evolve in the coming years?",
    "What are some specific metrics to measure the success of these recommendations?",
    "What personal experiences have you had that confirm or contradict these points?"
  ];
} 
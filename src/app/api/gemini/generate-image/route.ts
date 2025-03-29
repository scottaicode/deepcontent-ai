import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { prompt, language = 'en' } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: language === 'es' ? 'Se requiere un prompt' : 'Prompt is required' },
        { status: 400 }
      );
    }

    // Format the prompt to be more specific for image generation
    const formattedPrompt = `Generate a high quality, detailed image of: ${prompt}. The image should be visually appealing and suitable for professional use.`;

    try {
      // Use ONLY Gemini 2.0 Flash Experimental model
      console.log('Using only Gemini 2.0 Flash Experimental model for image generation');
      
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp-image-generation'
      });

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: formattedPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 1,
          topK: 32,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          }
        ]
      });

      if (!result.response) {
        throw new Error('No response received from Gemini');
      }

      const parts = result.response.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        throw new Error('No content received from Gemini');
      }

      const imageData = parts.find(part => part.inlineData?.mimeType?.startsWith('image/'));
      if (!imageData?.inlineData?.data) {
        throw new Error('No image data received from Gemini');
      }

      return NextResponse.json({ 
        image: `data:${imageData.inlineData.mimeType};base64,${imageData.inlineData.data}`,
        prompt: formattedPrompt,
        modelUsed: "Gemini 2.0 Flash Experimental"
      });
    } catch (error: any) {
      console.error('Image Generation Error:', error);
      throw error;
    }

  } catch (error: any) {
    // Log detailed error for debugging
    console.error('Image Generation Error:', {
      message: error.message,
      stack: error.stack,
      response: error.response,
      name: error.name,
      code: error.code
    });

    const errorMessage = error.message || 'Unknown error occurred';
    const reqLanguage = request.headers.get('Accept-Language')?.startsWith('es') ? 'es' : 'en';
    
    return NextResponse.json(
      { 
        error: reqLanguage === 'es' 
          ? `Error al generar la imagen: ${errorMessage}` 
          : `Error generating image: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
} 
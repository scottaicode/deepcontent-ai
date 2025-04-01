import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing prompt in request body' },
        { status: 400 }
      );
    }

    // Get the Gemini Pro Vision model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

    // Generate the image
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'text/plain',
          data: prompt
        }
      }
    ]);

    const response = await result.response;
    const imageData = response.text();

    if (!imageData) {
      throw new Error('No image data received from Gemini');
    }

    return NextResponse.json({ imageData });
  } catch (error: any) {
    console.error('Error in image generation:', error);
    return NextResponse.json(
      { error: `Error generating image: ${error.message}` },
      { status: 500 }
    );
  }
} 
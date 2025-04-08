import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Set a longer timeout for this API route (60 seconds instead of default 15)
export const maxDuration = 60;

// Initialize the Google Generative AI client with the API key
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing prompt in request body' },
        { status: 400 }
      );
    }

    console.log(`Processing image generation request for prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);

    // Get the Gemini 2.0 Flash Experimental model for image generation
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp-image-generation"
    });

    console.log("Sending request to Gemini for image generation...");
    
    // Enhanced approach with more detailed prompt
    const enhancedPrompt = `Generate a detailed, high-quality image based on this description: "${prompt}". The image should be photorealistic, with good lighting and composition. Focus on creating a visually appealing result. Your task is to generate an image, not just describe how you would create it.`;
    
    // Use the enhanced prompt
    const result = await model.generateContent([
      enhancedPrompt
    ]);

    console.log("Response received from Gemini API");
    
    if (!result.response) {
      throw new Error("No response received from Gemini");
    }

    // Extract content parts from the response
    const parts = result.response.candidates?.[0]?.content?.parts || [];
    console.log(`Response contains ${parts.length} parts`);
    
    // Find image and text parts
    const imageParts = parts.filter((part: any) => part.inlineData?.mimeType?.startsWith("image/"));
    const textParts = parts.filter((part: any) => part.text);
    
    const textResponse = textParts.map((part: any) => part.text).join("\n");
    
    if (imageParts.length > 0 && imageParts[0].inlineData?.data) {
      console.log("Image successfully generated!");
      return NextResponse.json({
        image: `data:${imageParts[0].inlineData.mimeType};base64,${imageParts[0].inlineData.data}`,
        textResponse: textResponse || "Image generated successfully."
      });
    } else if (textResponse) {
      console.log("No image in response, but received text response");
      return NextResponse.json({
        error: "Could not generate image, but received text response.",
        textResponse,
        apiLimited: true
      }, { status: 200 });
    } else {
      throw new Error("No image or text data received from Gemini");
    }
  } catch (error: any) {
    console.error('Error generating image:', error);
    
    // Check if this is an API limitation issue
    const isApiLimitedError = error.message?.includes('permission') || 
                              error.message?.includes('region') || 
                              error.message?.includes('NOT_FOUND') ||
                              error.message?.includes('API key');
    
    return NextResponse.json(
      { 
        error: `Error generating image: ${error.message}`,
        apiLimited: isApiLimitedError
      },
      { status: 500 }
    );
  }
} 
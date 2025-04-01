import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    console.log('Testing Gemini API key...');
    
    // Log environment variable presence
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key exists:', !!apiKey);
    console.log('API Key prefix:', apiKey?.substring(0, 10) + '...');
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('Initialized GoogleGenerativeAI');
    
    // Try to get the experimental model
    console.log('Getting model: gemini-pro-vision');
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro-vision'
    });
    console.log('Successfully got model');
    
    // Try a simple generation
    console.log('Attempting to generate content...');
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: "What's in this test message?" }
          ]
        }
      ]
    });
    
    console.log('Got generation result');
    console.log('Has response:', !!result.response);
    
    const response = await result.response;
    console.log('Got response');
    
    const text = response.text();
    console.log('Response text:', text);
    
    return NextResponse.json({ 
      success: true,
      message: 'API key is valid',
      response: text,
      key_prefix: apiKey.substring(0, 10) + '...'
    });
    
  } catch (error: any) {
    console.error('Gemini API Test Error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    return NextResponse.json({
      success: false,
      error: error.message,
      key_prefix: process.env.GEMINI_API_KEY?.substring(0, 10) + '...'
    }, { status: 500 });
  }
} 
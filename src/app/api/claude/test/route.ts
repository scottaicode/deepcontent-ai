import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
  try {
    // Get and clean the API key
    let apiKey = process.env.ANTHROPIC_API_KEY || '';
    apiKey = apiKey.trim().replace(/\s+/g, '');

    // Check if API key exists and has correct format
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key is not configured',
        message: 'Please add ANTHROPIC_API_KEY to your .env.local file'
      }, { status: 400 });
    }

    if (!apiKey.startsWith('sk-ant-api')) {
      return NextResponse.json({
        success: false,
        error: 'API key has invalid format',
        message: 'API key should start with "sk-ant-api"',
        keyFormat: apiKey.substring(0, 10) + '...'
      }, { status: 400 });
    }

    console.log('Testing Claude API with key starting with:', apiKey.substring(0, 10) + '...');
    console.log('API key length:', apiKey.length);

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Make a simple test call
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 50,
      temperature: 0,
      system: "You are a helpful assistant.",
      messages: [
        { role: "user", content: "Say 'API key is valid' and nothing else." }
      ]
    });

    // Extract the response text
    let responseText = '';
    if (response.content && Array.isArray(response.content)) {
      for (const content of response.content) {
        if (content.type === 'text' && typeof content.text === 'string') {
          responseText += content.text;
        }
      }
    }

    console.log('Claude API test response:', responseText);

    return NextResponse.json({
      success: true,
      message: 'Claude API is working correctly',
      response: responseText,
      keyFormat: 'valid',
      keyPrefix: apiKey.substring(0, 10) + '...'
    });

  } catch (error: any) {
    console.error('Claude API test error:', error);

    // Provide detailed error information
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      status: error.status,
      type: error.type,
      keyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'not set'
    }, { status: 500 });
  }
} 
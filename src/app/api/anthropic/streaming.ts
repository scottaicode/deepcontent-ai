import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Function to stream text from Anthropic API
export async function streamText(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  try {
    // Fallback to returning the prompt if we're in a test/development environment without API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('No ANTHROPIC_API_KEY found, returning mock response');
      return `[Mock response for]: ${prompt}`;
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Create completion with Claude
    const response = await anthropic.completions.create({
      model: 'claude-3-sonnet-20240229',
      prompt: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}`,
      max_tokens_to_sample: 4000,
      temperature: 0.7,
    });

    return response.completion;
  } catch (error) {
    console.error('Error in streamText:', error);
    throw error;
  }
} 
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing prompt in request body' },
        { status: 400 }
      );
    }

    // Call Stable Diffusion API
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: prompt,
            weight: 1
          }
        ],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        samples: 1
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate image');
    }

    const result = await response.json();
    
    // Stable Diffusion returns base64 images
    const imageData = result.artifacts[0].base64;
    
    if (!imageData) {
      throw new Error('No image data received from API');
    }

    return NextResponse.json({ 
      imageData: `data:image/png;base64,${imageData}` 
    });
  } catch (error: any) {
    console.error('Error in image generation:', error);
    return NextResponse.json(
      { error: `Error generating image: ${error.message}` },
      { status: 500 }
    );
  }
} 
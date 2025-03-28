import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY || 'Not found';
  const keyLength = anthropicKey === 'Not found' ? 0 : anthropicKey.length;
  const keyStart = anthropicKey === 'Not found' ? '' : anthropicKey.substring(0, 10) + '...';
  
  return NextResponse.json({
    message: 'Environment variables test',
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    keyLength,
    keyStart,
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('API_KEY') || 
      key.includes('ANTHROPIC') || 
      key.includes('NEXT_')
    )
  });
} 
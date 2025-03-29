/**
 * YouTube API Configuration Check Endpoint
 * 
 * This endpoint checks if the required API keys and configurations
 * are set up correctly for the YouTube transcript functionality.
 */

import { NextRequest, NextResponse } from 'next/server';

// Add config for dynamic route - explicitly mark as dynamic
export const dynamic = 'force-dynamic';

// Define types for the diagnostic data structure
interface ConfigCheck {
  name: string;
  status: 'configured' | 'missing' | 'error';
  message: string;
  keyInfo?: {
    length: number;
    preview: string;
  };
  instructions?: string[];
}

interface DiagnosticsData {
  timestamp: string;
  configChecks: ConfigCheck[];
  environmentInfo: {
    nodeEnv: string | undefined;
    isVercel: boolean;
  };
}

export async function GET(request: NextRequest) {
  console.log('YouTube API Configuration Check: Request received', new Date().toISOString());
  
  const diagnostics: DiagnosticsData = {
    timestamp: new Date().toISOString(),
    configChecks: [],
    environmentInfo: {
      nodeEnv: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL
    }
  };
  
  // Check Supadata API Key Configuration
  const supadataApiKey = process.env.SUPADATA_API_KEY;
  if (supadataApiKey) {
    diagnostics.configChecks.push({
      name: 'Supadata API Key',
      status: 'configured',
      message: 'Supadata API key is properly configured',
      keyInfo: {
        length: supadataApiKey.length,
        preview: `${supadataApiKey.substring(0, 3)}...${supadataApiKey.substring(supadataApiKey.length - 3)}`
      }
    });
  } else {
    diagnostics.configChecks.push({
      name: 'Supadata API Key',
      status: 'missing',
      message: 'Supadata API key is not configured',
      instructions: [
        'Add SUPADATA_API_KEY=your_api_key to your .env file',
        'Get your API key from https://supadata.io/dashboard',
        'After adding the key, restart the development server'
      ]
    });
  }
  
  // Add overall status
  const isFullyConfigured = diagnostics.configChecks.every(check => check.status === 'configured');
  
  return NextResponse.json({
    success: isFullyConfigured,
    message: isFullyConfigured 
      ? 'YouTube API is properly configured' 
      : 'YouTube API configuration incomplete. See details for instructions.',
    diagnostics,
    timestamp: new Date().toISOString()
  });
} 
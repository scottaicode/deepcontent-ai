/**
 * Research Guard Middleware
 * 
 * This middleware ensures that the research-driven content generation architecture
 * is preserved by enforcing that all content generation requests include research data.
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware that checks if research data is included in Claude content generation requests
 */
export async function researchGuard(request: NextRequest, response: NextResponse) {
  // Only apply this middleware to content generation API calls
  if (request.nextUrl.pathname === '/api/claude/content' && request.method === 'POST') {
    try {
      // Parse the request body
      const body = await request.json();
      
      // Log the request for debugging
      console.log('Content generation request received:', {
        contentType: body.contentType,
        platform: body.platform,
        researchDataIncluded: !!body.researchData
      });
      
      // Check if research data is missing or insufficient
      if (!body.researchData || typeof body.researchData !== 'string' || body.researchData.length < 50) {
        console.error('Research data missing or insufficient in content generation request');
        
        // Return error response
        return NextResponse.json({
          error: 'Research data required',
          message: 'Content generation requires research data to follow the research-driven architecture',
          architectureReference: '/ARCHITECTURE.md'
        }, { status: 400 });
      }
      
      // Check other required parameters
      if (!body.contentType || !body.platform || !body.audience) {
        console.error('Missing required parameters in content generation request');
        
        // Return error response
        return NextResponse.json({
          error: 'Missing required parameters',
          message: 'Content generation requires contentType, platform, and audience parameters',
          architectureReference: '/ARCHITECTURE.md'
        }, { status: 400 });
      }
      
      // If all checks pass, allow the request to proceed
      console.log('Research data verified in content generation request');
    } catch (error) {
      console.error('Error processing content generation request:', error);
      
      // Return error response
      return NextResponse.json({
        error: 'Error processing request',
        message: 'Failed to process content generation request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }
  
  // For other routes or if checks pass, continue
  return NextResponse.next();
}

/**
 * Utility function to verify if research data contains the necessary components
 * for informed content generation
 */
export function verifyResearchQuality(researchData: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check research data length
  if (researchData.length < 300) {
    issues.push('Research data is too short to be meaningful');
  }
  
  // Check for platform best practices section - now more inclusive
  const bestPracticesTerms = [
    'best practices', 
    'Best Practices',
    'mejores prácticas',  // Spanish
    'Mejores Prácticas',  // Spanish
    'buenas prácticas',   // Spanish
    'prácticas recomendadas', // Spanish
    'recommendations', 
    'Recommendations',
    'recomendaciones',    // Spanish
    'Recomendaciones',    // Spanish
    'best strategy',
    'effective approach',
    'optimal content',
    'content strategy',
    'strategy for',
    'tips for',
    'tactics',
    'Mejores Prácticas Actuales', // Spanish "Current Best Practices"
    'Prácticas efectivas',        // Spanish "Effective Practices"
    'Estrategias efectivas'       // Spanish "Effective Strategies"
  ];
  
  if (!bestPracticesTerms.some(term => researchData.includes(term))) {
    // First check if this is an older format research that still has valuable content
    if (
      researchData.includes('Tendencias') || 
      researchData.includes('tendencias') ||
      researchData.includes('Trends') || 
      researchData.includes('trends') ||
      researchData.includes('Key Points') ||
      researchData.includes('key points') ||
      researchData.includes('Puntos Clave') ||
      researchData.includes('puntos clave')
    ) {
      // Allow older research format that has trends information
      console.log('Research data has alternative quality markers (trends/key points)');
    } else {
      issues.push('Research data does not include best practices information');
    }
  }
  
  // Check for recent information
  const currentYear = new Date().getFullYear();
  if (!researchData.includes(currentYear.toString())) {
    issues.push(`Research data may not include recent information (${currentYear})`);
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
} 
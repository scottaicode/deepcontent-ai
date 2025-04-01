/**
 * Perplexity Deep Research API Route
 * 
 * This API route handles integration with Perplexity's Deep Research API.
 * It takes a topic and context, performs deep research using Perplexity's API,
 * and returns structured research results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PerplexityClient } from '@/lib/api/perplexityClient';
import { getPromptForTopic } from '@/lib/api/promptBuilder';

// Disable caching to ensure fresh research data
export const dynamic = 'force-dynamic';

// Set a longer timeout for extensive research
export const maxDuration = 60; // 60 seconds (maximum allowed for hobby plan)

interface PerplexityResearchRequest {
  topic: string;
  context?: string;
  sources?: string[];
  language?: string;
  companyName?: string;
  websiteContent?: any;
}

// Helper function to validate company-specific research
function validateCompanyResearch(research: string, companyName: string): boolean {
  if (!research || !companyName) return true; // Skip validation if no company name
  
  const companyLower = companyName.toLowerCase();
  const researchLower = research.toLowerCase();
  
  // Check if the research has a company-specific section
  const hasCompanySection = 
    research.includes(`${companyName.toUpperCase()} COMPANY RESEARCH`) ||
    research.includes(`COMPANY-SPECIFIC RESEARCH`) ||
    research.includes(`===== COMPANY-SPECIFIC RESEARCH =====`);
  
  // Check if there are website citations
  const hasWebsiteCitation = 
    researchLower.includes(`${companyLower}'s website`) || 
    researchLower.includes(`${companyLower}'s official website`) ||
    researchLower.includes(`${companyLower} website`) ||
    researchLower.includes(`official website`);
  
  // Check if there are LinkedIn citations
  const hasLinkedInCitation = 
    researchLower.includes('linkedin') || 
    researchLower.includes('linked in');
  
  // Check if there are social media citations
  const hasSocialMediaCitation = 
    researchLower.includes('facebook') || 
    researchLower.includes('twitter') || 
    researchLower.includes('instagram') || 
    researchLower.includes('social media');
  
  // Check for company name mentions (should be frequent)
  const companyNameMatches = (researchLower.match(new RegExp(companyLower, 'g')) || []).length;
  
  console.log(`Company research validation:`, {
    hasCompanySection,
    hasWebsiteCitation,
    hasLinkedInCitation,
    hasSocialMediaCitation,
    companyNameMatches
  });
  
  // Must have company section, website citation, and at least one of LinkedIn or social media citations
  // Plus at least 5 mentions of the company name
  return hasCompanySection && hasWebsiteCitation && (hasLinkedInCitation || hasSocialMediaCitation) && companyNameMatches >= 5;
}

// Helper function to build additional context from all inputs
function buildAdditionalContext(inputs: any): string {
  if (!inputs) return '';
  
  let context = '';
  
  // Add YouTube transcript data
  if (inputs.youtubeTranscript && inputs.youtubeTranscript.trim()) {
    context += `\n\nYOUTUBE VIDEO TRANSCRIPT:\n"${inputs.youtubeTranscript.substring(0, 2000)}${inputs.youtubeTranscript.length > 2000 ? '...' : ''}"\n`;
    if (inputs.youtubeUrl) {
      context += `Source: ${inputs.youtubeUrl}\n`;
    }
  }
  
  // Add image analysis data
  if (inputs.imageAnalysisResult) {
    context += `\n\nIMAGE ANALYSIS RESULT:\n"${typeof inputs.imageAnalysisResult === 'string' ? 
      inputs.imageAnalysisResult.substring(0, 1000) + (inputs.imageAnalysisResult.length > 1000 ? '...' : '') : 
      JSON.stringify(inputs.imageAnalysisResult)}"\n`;
  }
  
  // Add follow-up answers
  if (inputs.followUpAnswers && inputs.followUpAnswers.length > 0) {
    context += '\n\nFOLLOW-UP QUESTIONS AND ANSWERS:\n';
    inputs.followUpAnswers.forEach((answer: string, index: number) => {
      if (answer && answer.trim()) {
        context += `Answer ${index+1}: "${answer}"\n`;
      }
    });
  }
  
  // Add detailed subject information
  if (inputs.subjectDetails) {
    context += `\n\nDETAILED SUBJECT INFORMATION:\n"${inputs.subjectDetails}"\n`;
  }
  
  // Add audience needs information
  if (inputs.audienceNeeds) {
    context += `\n\nAUDIENCE NEEDS:\n"${inputs.audienceNeeds}"\n`;
  }
  
  return context;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { 
      topic, 
      context, 
      sources = ['recent', 'scholar'], 
      language, 
      companyName, 
      websiteContent,
      additionalInputs = {} 
    } = body;
    
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }
    
    // Enhanced logging for troubleshooting
    console.log('=== RESEARCH REQUEST DETAILS ===');
    console.log(`Topic: "${topic}"`);
    console.log(`Company Name: ${companyName || 'Not specified'}`);
    console.log(`Language: ${language || 'en'}`);
    console.log(`Sources: ${sources.join(', ')}`);
    
    // Get API key from environment variables
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      console.error('[DIAGNOSTIC] CRITICAL ERROR: PERPLEXITY_API_KEY is missing in environment variables');
      return NextResponse.json({ 
        error: 'API key configuration error', 
        message: 'The Perplexity API key is missing. Please add a valid API key to your environment variables.'
      }, { status: 500 });
    }
    
    // Validate API key format
    if (!apiKey.startsWith('pplx-')) {
      console.error('[DIAGNOSTIC] CRITICAL ERROR: PERPLEXITY_API_KEY has invalid format - should start with "pplx-"');
      return NextResponse.json({ 
        error: 'API key format error', 
        message: 'The Perplexity API key has an invalid format. It should start with "pplx-".'
      }, { status: 500 });
    }
    
    console.log('[DIAGNOSTIC] Perplexity API Key validation passed:', `${apiKey.substring(0, 10)}...`);
    
    // Build the prompt
    const promptText = getPromptForTopic(topic, {
      audience: context?.match(/Target Audience: ([^,]+)/i)?.[1]?.trim() || 'general audience',
      contentType: context?.match(/Content Type: ([^,]+)/i)?.[1]?.trim() || 'article',
      platform: context?.match(/Platform: ([^,]+)/i)?.[1]?.trim() || 'general',
      sources,
      language,
      companyName,
      websiteContent,
      additionalContext: buildAdditionalContext(additionalInputs)
    });
    
    console.log(`[DIAGNOSTIC] Built prompt for Perplexity API (first 100 chars): ${promptText.substring(0, 100)}...`);
    
    // Create Perplexity client with the API key
    const perplexity = new PerplexityClient(apiKey);
    
    const startTime = Date.now();
    
    try {
      // Call Perplexity API
      console.log('[DIAGNOSTIC] Sending request to Perplexity API...');
      
      // Basic configuration options
      const options = {
        maxTokens: 4000,
        temperature: 0.2,
        language: language || 'en',
        timeoutMs: 240000 // 4 minutes timeout
      };
      
      // Make the API call
      const response = await perplexity.generateResearch(promptText, options);
      
      // Calculate time taken
      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      console.log(`Successfully received research from Perplexity API in ${timeTaken}ms`);
      
      // For company-specific research, validate that it includes the required content
      let isValid = true;
      if (companyName) {
        isValid = validateCompanyResearch(response, companyName);
        if (!isValid) {
          console.warn(`Generated research does not contain sufficient company-specific information about "${companyName}"`);
        } else {
          console.log(`Generated research contains sufficient company-specific information about "${companyName}"`);
        }
      }
      
      // Return the research result
      return NextResponse.json({ 
        research: response,
        platform: context?.match(/Platform: ([^,]+)/i)?.[1]?.trim() || 'general',
        subPlatform: context?.match(/Sub-Platform: ([^,]+)/i)?.[1]?.trim() || '',
        companyName: companyName || null,
        researchTime: timeTaken,
        companyResearchValidation: companyName ? {
          isValid,
          message: isValid 
            ? `The research contains sufficient information from ${companyName}'s website and social media.`
            : `The research doesn't contain sufficient information from ${companyName}'s website and social media.`
        } : undefined
      });
    } catch (apiError: any) {
      console.error('Error calling Perplexity API:', apiError);
      
      // Create specific error messages for different error types
      let errorMessage = apiError.message || 'Unknown API error';
      let statusCode = 500;
      
      // Network-related errors
      if (
        errorMessage.includes('fetch failed') || 
        errorMessage.includes('network') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('Failed after') ||
        errorMessage.includes('timeout')
      ) {
        errorMessage = 'Network connection failed while contacting the research service. Please check your internet connection and try again.';
        statusCode = 503; // Service Unavailable
      }
      // Authentication errors
      else if (errorMessage.includes('401') || errorMessage.includes('auth')) {
        errorMessage = 'Authentication error with the research service. Please verify your API key.';
        statusCode = 401;
      }
      // Rate limiting errors
      else if (errorMessage.includes('429') || errorMessage.includes('rate') || errorMessage.includes('limit')) {
        errorMessage = 'Rate limit exceeded for the research service. Please try again later.';
        statusCode = 429;
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        errorCode: 'research_generation_failed',
        details: process.env.NODE_ENV === 'development' ? apiError.message : undefined
      }, { status: statusCode });
    }
  } catch (error: any) {
    console.error('Error processing research request:', error);
    
    // Create user-friendly error message
    let errorMessage = 'An error occurred while processing your research request. Please try again.';
    let statusCode = 500;
    
    if (error.message.includes('parse') || error.message.includes('JSON')) {
      errorMessage = 'Invalid request format. Please check your request data.';
      statusCode = 400;
    }
    
    return NextResponse.json({ 
      error: errorMessage, 
      errorCode: 'research_request_failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: statusCode });
  }
}
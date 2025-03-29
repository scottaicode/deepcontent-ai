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
export const maxDuration = 300; // 5 minutes

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
    
    // Log additional inputs to see what's available
    console.log('=== ADDITIONAL RESEARCH INPUTS ===');
    console.log('Additional inputs available:', {
      hasYoutubeTranscript: !!additionalInputs.youtubeTranscript,
      hasImageAnalysis: !!additionalInputs.imageAnalysisResult,
      hasFollowUpAnswers: !!additionalInputs.followUpAnswers,
      hasDetailedSubject: !!additionalInputs.subjectDetails
    });
    
    // Enhanced website content logging
    if (websiteContent) {
      console.log('=== WEBSITE CONTENT DETAILS ===');
      console.log(`Title: ${websiteContent.title || 'Not available'}`);
      console.log(`Headings: ${websiteContent.headings?.length || 0}`);
      console.log(`Paragraphs: ${websiteContent.paragraphs?.length || 0}`);
      console.log(`Subpages scraped: ${websiteContent.subpagesScraped?.length || 0}`);
      console.log(`Has aboutContent: ${!!websiteContent.aboutContent}`);
      console.log(`Has productInfo: ${!!websiteContent.productInfo}`);
      console.log(`Has pricingInfo: ${!!websiteContent.pricingInfo}`);
      console.log(`Has contactInfo: ${!!websiteContent.contactInfo}`);
      
      // Add dummy data check and fix
      if (
        (!websiteContent.paragraphs || websiteContent.paragraphs.length === 0) &&
        (!websiteContent.headings || websiteContent.headings.length === 0)
      ) {
        console.warn('⚠️ WARNING: Website content structure appears empty or invalid - this might result in poor research quality');
      }
      
      // Ensure the scraped data has a proper structure if it exists but has missing fields
      if (websiteContent) {
        if (!websiteContent.paragraphs) websiteContent.paragraphs = [];
        if (!websiteContent.headings) websiteContent.headings = [];
        if (!websiteContent.subpagesScraped) websiteContent.subpagesScraped = [];
        
        // Log the first 3 paragraphs and headings as samples
        if (websiteContent.paragraphs && websiteContent.paragraphs.length > 0) {
          console.log('Sample paragraphs from website:');
          websiteContent.paragraphs.slice(0, 3).forEach((p: string, i: number) => {
            console.log(`  Paragraph ${i+1}: "${p.substring(0, 100)}${p.length > 100 ? '...' : ''}"`);
          });
        }
        
        if (websiteContent.headings && websiteContent.headings.length > 0) {
          console.log('Sample headings from website:');
          websiteContent.headings.slice(0, 5).forEach((h: string, i: number) => {
            console.log(`  Heading ${i+1}: "${h}"`);
          });
        }
      }
    } else {
      console.log('⚠️ No website content provided - research will rely on Perplexity search');
    }
    
    // Enhanced logging for company-specific research
    if (companyName) {
      console.log(`🔍 Company-specific research requested for "${companyName}" - Will prioritize official website and social media sources`);
      
      // Log if websiteContent is available
      if (websiteContent) {
        console.log(`📊 Website content provided for ${companyName}: ${websiteContent.title || 'No title'}`);
        console.log(`   - Headings: ${websiteContent.headings?.length || 0}`);
        console.log(`   - Paragraphs: ${websiteContent.paragraphs?.length || 0}`);
        console.log(`   - Has about content: ${!!websiteContent.aboutContent}`);
        console.log(`   - Has product info: ${!!websiteContent.productInfo}`);
        console.log(`   - Pages crawled: ${websiteContent.subpagesScraped?.length || 1}`);
        
        // Log first 3 headings as sample
        if (websiteContent.headings && websiteContent.headings.length > 0) {
          console.log('   - Sample headings:', websiteContent.headings.slice(0, 3).join(', ') + (websiteContent.headings.length > 3 ? '...' : ''));
        }
        
        // Log sample of paragraphs (truncated)
        if (websiteContent.paragraphs && websiteContent.paragraphs.length > 0) {
          const sampleParagraph = websiteContent.paragraphs[0].substring(0, 100) + (websiteContent.paragraphs[0].length > 100 ? '...' : '');
          console.log('   - Sample paragraph:', sampleParagraph);
        }
      } else {
        console.log(`⚠️ No website content provided for ${companyName} - Will rely on Perplexity search`);
      }
    }
    
    // Log YouTube transcript data if available
    if (additionalInputs.youtubeTranscript) {
      const transcriptLength = additionalInputs.youtubeTranscript.length;
      console.log(`📺 YouTube transcript provided - ${transcriptLength} characters`);
      console.log(`   - YouTube URL: ${additionalInputs.youtubeUrl || 'Not provided'}`);
      if (transcriptLength > 0) {
        const sampleTranscript = additionalInputs.youtubeTranscript.substring(0, 100) + (transcriptLength > 100 ? '...' : '');
        console.log(`   - Sample transcript: "${sampleTranscript}"`);
      }
    }
    
    // Log image analysis data if available
    if (additionalInputs.imageAnalysisResult) {
      console.log(`🖼️ Image analysis result provided - ${typeof additionalInputs.imageAnalysisResult === 'string' ? additionalInputs.imageAnalysisResult.length + ' characters' : 'Object format'}`);
      if (typeof additionalInputs.imageAnalysisResult === 'string' && additionalInputs.imageAnalysisResult.length > 0) {
        const sampleAnalysis = additionalInputs.imageAnalysisResult.substring(0, 100) + (additionalInputs.imageAnalysisResult.length > 100 ? '...' : '');
        console.log(`   - Sample image analysis: "${sampleAnalysis}"`);
      }
    }
    
    // Log follow-up answers if available
    if (additionalInputs.followUpAnswers && additionalInputs.followUpAnswers.length > 0) {
      console.log(`❓ Follow-up answers provided - ${additionalInputs.followUpAnswers.length} answers`);
      additionalInputs.followUpAnswers.forEach((answer: string, index: number) => {
        if (answer && answer.trim()) {
          console.log(`   - Answer ${index+1}: "${answer.substring(0, 50)}${answer.length > 50 ? '...' : ''}"`);
        }
      });
    }
    
    // Extract audience, content type, and platform from context
    let audience = 'general audience';
    let contentType = 'article';
    let platform = 'general';
    let subPlatform = '';
    
    if (context) {
      const audienceMatch = context.match(/Target Audience: ([^,]+)/i);
      if (audienceMatch && audienceMatch[1]) {
        audience = audienceMatch[1].trim();
      }
    
      const contentTypeMatch = context.match(/Content Type: ([^,]+)/i);
      if (contentTypeMatch && contentTypeMatch[1]) {
        contentType = contentTypeMatch[1].trim();
      }
    
      const platformMatch = context.match(/Platform: ([^,]+)/i);
      if (platformMatch && platformMatch[1]) {
        platform = platformMatch[1].trim();
      }
      
      // Extract sub-platform if available
      const subPlatformMatch = context.match(/Sub-Platform: ([^,]+)/i);
      if (subPlatformMatch && subPlatformMatch[1]) {
        subPlatform = subPlatformMatch[1].trim();
      }
      
      // If platform is 'social' and we have a subPlatform, use the subPlatform
      // This ensures we get platform-specific research
      if (platform.toLowerCase() === 'social' && subPlatform) {
        console.log(`Using specific sub-platform "${subPlatform}" instead of generic "social" for better research specificity`);
        platform = subPlatform;
      } else if (platform === 'social') {
        // Fallback for generic social with no specific platform
        console.log('Converting generic "social" platform to "facebook" as fallback for better research specificity');
        platform = 'facebook';
      }
    }
    
    console.log('Extracted audience from context:', JSON.stringify(audience));
    console.log('Extracted content type from context:', JSON.stringify(contentType));
    console.log('Extracted platform from context:', JSON.stringify(platform));
    console.log('Extracted sub-platform from context:', JSON.stringify(subPlatform));
    console.log('Language for research output:', language);
    if (companyName) {
      console.log('Company-specific research requested for:', companyName);
    }
    
    // Get API key from environment variables
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Perplexity API key not configured' }, { status: 500 });
    }
    
    console.log('API Key first few characters:', `${apiKey.substring(0, 5)}...`);
    
    // Build the prompt
    const promptText = getPromptForTopic(topic, {
      audience,
      contentType,
      platform,
      sources,
      language,
      companyName,
      websiteContent,
      additionalContext: buildAdditionalContext(additionalInputs) // Process all additional inputs
    });
    
    // Detect content type from the prompt
    const detectedContentType = promptText.includes('COMPANY RESEARCH STRUCTURE') ? 'business' : 
                              promptText.includes('PERSONAL BRAND RESEARCH STRUCTURE') ? 'personal_brand' :
                              promptText.includes('EXPERT RESEARCH STRUCTURE') ? 'expert' :
                              promptText.includes('CREATOR CONTENT RESEARCH STRUCTURE') ? 'hobbyist' : 'general';

    console.log(`Detected content type: ${detectedContentType}`);
    console.log('Built prompt for Perplexity API:', promptText.substring(0, 100) + '...');
    
    // Create Perplexity client with the API key
    const perplexity = new PerplexityClient(apiKey);
    
    const startTime = Date.now();
    
    // Enhanced error handling for network issues
    try {
      // Call Perplexity API with retry logic for network issues
      console.log('Sending request to Perplexity API...');
      console.log('Language for this request:', language);
      
      // Advanced options for the research request
      const options: any = {
        // Basic configuration with safe defaults
        maxTokens: 4000,
        temperature: 0.2,
        language: language || 'en' // Ensure language is passed for proper localization
      };
      
      // Call Perplexity API with the enhanced options
      const response = await perplexity.generateResearch(promptText, options);
      
      // Calculate actual time taken
      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      console.log(`Successfully received research from Perplexity API in ${timeTaken}ms`);
      
      // For company-specific research, validate that it includes the required content
      let isValid = true;
      if (companyName) {
        isValid = validateCompanyResearch(response, companyName);
        if (!isValid) {
          console.warn(`⚠️ Generated research does not contain sufficient company-specific information about "${companyName}"`);
          
          // We'll still return the research, but include a validation flag
          return NextResponse.json({ 
            research: response,
            platform,  // Include the platform that was actually used
            subPlatform,  // Include the sub-platform information
            companyName: companyName || null, // Include company name used in the research
            researchTime: timeTaken, // Include research generation time
            companyResearchValidation: {
              isValid: false,
              message: `The research doesn't contain sufficient information from ${companyName}'s website and social media. It may not adequately cover company-specific details.`
            }
          });
        } else {
          console.log(`✓ Generated research contains sufficient company-specific information about "${companyName}"`);
        }
      }
      
      // Return the research result
      return NextResponse.json({ 
        research: response,
        platform,  // Include the platform that was actually used
        subPlatform,  // Include the sub-platform information
        companyName: companyName || null, // Include company name used in the research
        researchTime: timeTaken, // Include research generation time
        companyResearchValidation: companyName ? {
          isValid: true,
          message: `The research contains sufficient information from ${companyName}'s website and social media.`
        } : undefined
      });
    } catch (apiError: any) {
      console.error('Error calling Perplexity API:', apiError);
      
      // Create more specific error messages for different error types
      let errorMessage = apiError.message || 'Unknown error';
      let statusCode = 500;
      
      // Network-related errors
      if (
        errorMessage.includes('fetch failed') || 
        errorMessage.includes('network') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('Failed after') ||
        errorMessage.includes('timeout')
      ) {
        errorMessage = 'Network connection failed while contacting the research service. Please try again.';
        statusCode = 503; // Service Unavailable
      }
      // Authentication errors
      else if (errorMessage.includes('401') || errorMessage.includes('auth')) {
        errorMessage = 'Authentication error with the research service. Please contact support.';
        statusCode = 401;
      }
      // Rate limiting errors
      else if (errorMessage.includes('429') || errorMessage.includes('rate') || errorMessage.includes('limit')) {
        errorMessage = 'Rate limit exceeded for the research service. Please try again later.';
        statusCode = 429;
      }
      
      // Provide more context for company-specific research failures
      if (companyName) {
        console.error(`Failed to generate company-specific research for "${companyName}"`);
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        errorCode: 'research_generation_failed',
        details: process.env.NODE_ENV === 'development' ? apiError.message : undefined
      }, { status: statusCode });
    }
  } catch (error: any) {
    console.error('Error generating research:', error);
    
    // Create user-friendly error message
    let errorMessage = 'An error occurred while generating research. Please try again.';
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
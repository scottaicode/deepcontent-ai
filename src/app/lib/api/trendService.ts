/**
 * Trend Service
 * 
 * This service is responsible for generating research content based on trending topics.
 * It leverages data from the trending service to create comprehensive research
 * that can be used for content creation.
 */

import { TrendingTopic } from './trendingTypes';
import { getTrendingTopics, TrendingResult } from './trendingService';

// Type definitions
export interface ResearchData {
  marketOverview: string;
  consumerPainPoints: string[];
  competitiveLandscape: string;
  effectiveMarketing: string[];
  keywords: string[];
  relatedTopics: string[];
}

export interface ResearchRequest {
  businessType: string;
  contentType?: string;
  trendingTopic?: TrendingTopic;
}

export interface ResearchResponse {
  research: ResearchData;
  trendingTopic: TrendingTopic | null;
  error?: string;
}

/**
 * Generate research based on business type and trending topics
 * This function produces comprehensive research by calling the Perplexity API
 * when available, incorporating trending topics if provided.
 */
export async function generateResearch({ 
  businessType, 
  contentType = 'general',
  trendingTopic
}: ResearchRequest): Promise<ResearchResponse> {
  try {
    // If no trending topic is provided, try to fetch one
    if (!trendingTopic) {
      try {
        const result = await getTrendingTopics(businessType);
        if (result.topics && result.topics.length > 0) {
          trendingTopic = result.topics[0]; // Use the first trending topic
        }
      } catch (error) {
        console.error('Error fetching trending topic:', error);
        // Continue with basic research without trending data
      }
    }

    // Build context for the Perplexity API
    const context = `
      Business Type: ${businessType}
      Content Type: ${contentType}
      ${trendingTopic ? `Related Trending Topic: ${trendingTopic.title}` : ''}
    `;

    // Call Perplexity research API
    try {
      const response = await fetch('/api/perplexity/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: businessType,
          context,
          sources: ['recent', 'scholar']
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the research text into our structured format
      const researchData = parseResearchFromClaudeResponse(data.research, businessType);

      return {
        research: researchData,
        trendingTopic: trendingTopic || null
      };
    } catch (apiError: any) {
      console.error('Error calling Perplexity API:', apiError);
      throw new Error(`Failed to generate research: ${apiError.message}`);
    }
  } catch (error: any) {
    console.error('Error generating research:', error);
    throw new Error(`Failed to generate research: ${error.message}`);
  }
}

/**
 * Parse research text from Claude into structured format
 */
function parseResearchFromClaudeResponse(researchText: string, businessType: string): ResearchData {
  // Initialize with empty structure
  const researchData: ResearchData = {
    marketOverview: '',
    consumerPainPoints: [],
    competitiveLandscape: '',
    effectiveMarketing: [],
    keywords: [],
    relatedTopics: []
  };

  // Extract market overview - first paragraph typically contains this
  const paragraphs = researchText.split('\n\n');
  if (paragraphs.length > 0) {
    researchData.marketOverview = paragraphs[0].replace(/^#.*\n/, '').trim();
  }

  // Extract consumer pain points - look for sections with these keywords
  const painPointsMatch = researchText.match(/(?:pain points|challenges|problems)(?:[\s\S]*?)(?:\n\n|\n#)/i);
  if (painPointsMatch) {
    const painPointsText = painPointsMatch[0];
    const bulletPoints = painPointsText.match(/[-*]\s+([^\n]+)/g);
    if (bulletPoints) {
      researchData.consumerPainPoints = bulletPoints.map(point => 
        point.replace(/^[-*]\s+/, '').trim()
      );
    }
  }

  // Extract competitive landscape - look for sections with these keywords
  const competitiveMatch = researchText.match(/(?:competitive|competition|landscape|market)(?:[\s\S]*?)(?:\n\n|\n#)/i);
  if (competitiveMatch) {
    researchData.competitiveLandscape = competitiveMatch[0].trim();
  }

  // Extract effective marketing - look for best practices or recommendations
  const marketingMatch = researchText.match(/(?:best practices|effective|recommendations|tactics)(?:[\s\S]*?)(?:\n\n|\n#)/i);
  if (marketingMatch) {
    const marketingText = marketingMatch[0];
    const bulletPoints = marketingText.match(/[-*]\s+([^\n]+)/g);
    if (bulletPoints) {
      researchData.effectiveMarketing = bulletPoints.map(point => 
        point.replace(/^[-*]\s+/, '').trim()
      );
    }
  }

  // Extract keywords - look for keywords or key terms sections
  const keywordsMatch = researchText.match(/(?:keywords|key terms|search terms)(?:[\s\S]*?)(?:\n\n|\n#)/i);
  if (keywordsMatch) {
    const keywordsText = keywordsMatch[0];
    const bulletPoints = keywordsText.match(/[-*]\s+([^\n]+)/g);
    if (bulletPoints) {
      researchData.keywords = bulletPoints.map(point => 
        point.replace(/^[-*]\s+/, '').trim()
      );
    }
  }

  // If no keywords were found, generate some based on the business type
  if (researchData.keywords.length === 0) {
    researchData.keywords = [
      `${businessType} solutions`,
      `best ${businessType} providers`,
      `${businessType} trends`,
      `${businessType} best practices`,
      `${businessType} industry`
    ];
  }

  // Extract related topics - look for related topics or related searches sections
  const relatedTopicsMatch = researchText.match(/(?:related topics|related searches|related terms)(?:[\s\S]*?)(?:\n\n|\n#|$)/i);
  if (relatedTopicsMatch) {
    const relatedTopicsText = relatedTopicsMatch[0];
    const bulletPoints = relatedTopicsText.match(/[-*]\s+([^\n]+)/g);
    if (bulletPoints) {
      researchData.relatedTopics = bulletPoints.map(point => 
        point.replace(/^[-*]\s+/, '').trim()
      );
    }
  }

  // If no related topics were found, generate some based on the business type
  if (researchData.relatedTopics.length === 0) {
    researchData.relatedTopics = [
      `${businessType} innovation`,
      `${businessType} technology`,
      `${businessType} industry trends`,
      `${businessType} sustainability`
    ];
  }

  return researchData;
} 
import { TrendingTopic } from '../api/redditApi';

// Map of business types to industry-specific keywords for relevance scoring
export const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'internet': ['internet', 'broadband', 'wifi', 'fiber', 'connection', 'speed', 'data', 'online', 'network', 'isp'],
  'health': ['health', 'wellness', 'nutrition', 'fitness', 'diet', 'medical', 'healthcare', 'supplements', 'workout', 'disease'],
  'marketing': ['marketing', 'advertising', 'brand', 'social media', 'promotion', 'campaign', 'digital', 'content', 'seo', 'customer']
};

/**
 * Calculate relevance score for a trending topic based on business type
 * Higher score = more relevant
 */
export function calculateRelevanceScore(
  topic: TrendingTopic, 
  businessType: string,
  industryKeywords: Record<string, string[]> = INDUSTRY_KEYWORDS
): number {
  let score = 0;
  const businessTypeLower = businessType.toLowerCase();
  const titleLower = topic.title.toLowerCase();
  const summaryLower = topic.summary?.toLowerCase() || '';
  
  // Extract keywords from business type (simple splitting by space)
  const businessKeywords = businessTypeLower.split(/\s+/).filter(k => k.length > 3);
  
  // Direct match with business type
  if (titleLower.includes(businessTypeLower) || summaryLower.includes(businessTypeLower)) {
    score += 10;
  }
  
  // Keyword matches from business name
  for (const keyword of businessKeywords) {
    if (titleLower.includes(keyword)) score += 5;
    if (summaryLower.includes(keyword)) score += 3;
  }
  
  // Industry-specific relevance checking
  // Get keywords for this business type from the map
  const relevantIndustries = Object.keys(industryKeywords).filter(industry => 
    businessTypeLower.includes(industry)
  );
  
  // If we have industry-specific keywords, use them
  if (relevantIndustries.length > 0) {
    for (const industry of relevantIndustries) {
      const keywords = industryKeywords[industry];
      for (const term of keywords) {
        if (titleLower.includes(term)) score += 3;
        if (summaryLower.includes(term)) score += 1;
      }
    }
  }
  
  // Recency bonus (topics from within the last 24 hours get a boost)
  const topicDate = new Date(topic.pubDate);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (topicDate > yesterday) {
    score += 3;
  }
  
  // Source-based relevance - give higher score for sources that match the business type
  if (topic.source) {
    const sourceLower = topic.source.toLowerCase();
    
    // If source contains business type or industry keywords
    if (sourceLower.includes(businessTypeLower)) {
      score += 5;
    }
    
    // Check industry-specific sources
    for (const industry of relevantIndustries) {
      if (sourceLower.includes(industry)) {
        score += 3;
      }
    }
    
    // Higher score for original source vs. aggregated content
    if (topic.sourceType === 'reddit' && sourceLower.includes('r/')) {
      // Reddit-specific scoring - relevant subreddits get bonus points
      const subreddit = sourceLower.split('r/')[1]?.split('/')[0]?.toLowerCase();
      if (subreddit) {
        // Check if subreddit aligns with any industry keywords
        for (const industry of relevantIndustries) {
          const keywords = industryKeywords[industry];
          for (const keyword of keywords) {
            if (subreddit.includes(keyword)) {
              score += 4;
              break;
            }
          }
        }
      }
    }
  }
  
  // Category-based relevance
  if (topic.categories && Array.isArray(topic.categories)) {
    for (const category of topic.categories) {
      if (businessTypeLower.includes(category.toLowerCase())) {
        score += 3;
      }
      
      // Check against industry keywords
      for (const industry of relevantIndustries) {
        const keywords = industryKeywords[industry];
        if (keywords.includes(category.toLowerCase())) {
          score += 2;
        }
      }
    }
  }
  
  return score;
} 
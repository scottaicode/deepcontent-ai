/**
 * Trending Data Types
 * 
 * This module provides common types for trending data in the application
 */

export interface TrendingTopic {
  title: string;
  summary: string;
  url: string;
  pubDate: Date;
  score: number;
  source: string;
  categories: string[];
  sourceType: string;
  relevanceScore?: number;
}

/**
 * Generate mock trending topics for demonstration purposes
 */
export function getMockTrends(businessType: string): TrendingTopic[] {
  const today = new Date();
  
  // Default topics that apply to any business type
  const generalTopics: TrendingTopic[] = [
    {
      title: "AI-powered content creation transforming digital marketing",
      summary: "Businesses are leveraging AI to create more engaging and personalized content, leading to higher conversion rates and customer satisfaction.",
      url: "https://example.com/ai-content-creation",
      pubDate: new Date(today.setDate(today.getDate() - 1)),
      score: 95,
      source: "Research",
      categories: ["AI", "Marketing", "Content Creation"],
      sourceType: "research"
    },
    {
      title: "Voice search optimization becoming essential for businesses",
      summary: "With the increasing adoption of smart speakers and voice assistants, optimizing content for voice search is becoming a priority for forward-thinking businesses.",
      url: "https://example.com/voice-search-optimization",
      pubDate: new Date(today.setDate(today.getDate() - 2)),
      score: 87,
      source: "Research",
      categories: ["SEO", "Voice Search", "Digital Marketing"],
      sourceType: "research"
    },
    {
      title: "Content personalization drives 43% higher engagement",
      summary: "Recent studies show that personalized content experiences lead to significantly higher engagement metrics, with some businesses reporting conversion increases of up to 43%.",
      url: "https://example.com/personalization-study",
      pubDate: new Date(today.setDate(today.getDate() - 3)),
      score: 92,
      source: "Research",
      categories: ["Personalization", "Engagement", "Conversion"],
      sourceType: "research"
    }
  ];
  
  return generalTopics;
} 
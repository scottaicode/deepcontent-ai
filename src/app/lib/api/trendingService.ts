/**
 * Trending Topics Service
 * 
 * This service combines trending topics from multiple sources including
 * Reddit, X (Twitter), and RSS feeds to provide a comprehensive view of current trends.
 */

import { TrendingTopic, getTrendingBusinessTopics } from './redditApi';
import { getTrendingTopicsFromRSS } from './rssFeedParser';
import { getTrendingXTopics } from './xTwitterApi';

export interface TrendingResult {
  topics: TrendingTopic[];
  sources: {
    reddit: boolean;
    rss: boolean;
  };
  timestamp: Date;
}

/**
 * Get trending topics from all configured sources
 * 
 * @param businessType - The type of business to get trends for
 * @param limit - Maximum number of trending topics to return
 * @returns Combined trending topics from all sources
 */
export async function getTrendingTopics(
  businessType: string,
  limit: number = 10,
  sourcesToInclude: string[] = ['reddit', 'rss', 'x']
): Promise<TrendingResult> {
  const timestamp = new Date();
  const sources = {
    reddit: false,
    rss: false,
    x: false
  };
  
  let allTopics: TrendingTopic[] = [];
  
  try {
    // Get Reddit trends if included
    if (sourcesToInclude.includes('reddit')) {
      try {
        const redditTopics = await getTrendingBusinessTopics(businessType);
        
        if (redditTopics.length > 0) {
          sources.reddit = true;
          allTopics = [...allTopics, ...redditTopics];
        }
      } catch (error) {
        console.error('Error fetching Reddit trending topics:', error);
        // Continue with other sources
      }
    }
    
    // Get X (Twitter) trends if included
    if (sourcesToInclude.includes('x') || sourcesToInclude.includes('twitter')) {
      try {
        const xTopics = await getTrendingXTopics(businessType);
        
        if (xTopics.length > 0) {
          sources.x = true;
          allTopics = [...allTopics, ...xTopics];
        }
      } catch (error) {
        console.error('Error fetching X trending topics:', error);
        // Continue with other sources
      }
    }
    
    // Get RSS trends if included
    if (sourcesToInclude.includes('rss')) {
      try {
        const rssTopics = await getTrendingTopicsFromRSS();
        
        if (rssTopics.length > 0) {
          sources.rss = true;
          allTopics = [...allTopics, ...rssTopics];
        }
      } catch (error) {
        console.error('Error fetching RSS trending topics:', error);
        // Continue with other sources
      }
    }
    
    // If we have no topics, return empty result instead of falling back to mock data
    if (allTopics.length === 0) {
      return {
        topics: [],
        sources,
        timestamp
      };
    }
    
    // Sort by date (newest first)
    allTopics.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    
    // Remove duplicates (based on title similarity)
    const uniqueTopics = removeDuplicateTopics(allTopics);
    
    // Limit the number of topics
    return {
      topics: uniqueTopics.slice(0, limit),
      sources,
      timestamp
    };
  } catch (error) {
    console.error('Error in getTrendingTopics:', error);
    // Throw the error instead of falling back to mock data
    throw error;
  }
}

/**
 * Remove duplicate topics based on title similarity
 */
function removeDuplicateTopics(topics: TrendingTopic[]): TrendingTopic[] {
  const uniqueTopics: TrendingTopic[] = [];
  const seenTitles = new Set<string>();
  
  for (const topic of topics) {
    // Normalize the title for comparison
    const normalizedTitle = topic.title.toLowerCase().trim();
    
    // Check if we've seen a very similar title
    let isDuplicate = false;
    // Convert Set to Array before iteration to avoid ES2015+ requirement
    const seenTitlesArray = Array.from(seenTitles);
    for (const seenTitle of seenTitlesArray) {
      if (isSimilarTitle(normalizedTitle, seenTitle)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      seenTitles.add(normalizedTitle);
      uniqueTopics.push(topic);
    }
  }
  
  return uniqueTopics;
}

/**
 * Check if two titles are similar enough to be considered duplicates
 */
function isSimilarTitle(title1: string, title2: string): boolean {
  // If one title contains the other, consider them similar
  if (title1.includes(title2) || title2.includes(title1)) {
    return true;
  }
  
  // Simple word overlap check
  const words1 = title1.split(/\s+/).filter(word => word.length > 3);
  const words2 = title2.split(/\s+/).filter(word => word.length > 3);
  
  let matchCount = 0;
  for (const word of words1) {
    if (words2.includes(word)) {
      matchCount++;
    }
  }
  
  // If more than 50% of the words match, consider them similar
  const threshold = Math.min(words1.length, words2.length) * 0.5;
  return matchCount >= threshold;
}

/**
 * Get mock trending topics for development or when APIs are unavailable
 */
function getMockTrendingTopics(businessType: string): TrendingTopic[] {
  const now = new Date();
  
  // Generic trending topics
  const genericTopics: TrendingTopic[] = [
    {
      title: "How AI is Transforming Content Creation for Small Businesses",
      summary: "Small businesses are leveraging AI tools to create professional content at a fraction of the cost of hiring agencies.",
      url: "https://example.com/ai-content-small-business",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 3), // 3 hours ago
      score: 156,
      source: "r/smallbusiness",
      categories: ["smallbusiness", "reddit"],
      sourceType: 'reddit',
    },
    {
      title: "The Rise of Video Marketing: Statistics and Strategies for 2023",
      summary: "New data shows that businesses using video marketing are seeing 66% more qualified leads per year and a 54% increase in brand awareness.",
      url: "https://example.com/video-marketing-2023",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 8), // 8 hours ago
      score: 0,
      source: "RSS - MarketingWeek",
      categories: ["MarketingWeek", "rss"],
      sourceType: 'reddit',
    },
    {
      title: "Content Creators Are Switching to These New Platforms in 2023",
      summary: "With changes to monetization policies on YouTube and Instagram, content creators are exploring alternative platforms that offer better revenue sharing and creative freedom.",
      url: "https://example.com/content-creator-platforms",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 12), // 12 hours ago
      score: 243,
      source: "r/NewTubers",
      categories: ["NewTubers", "reddit"],
      sourceType: 'reddit',
    },
    {
      title: "Email Marketing Still Outperforms Social Media for ROI, New Study Finds",
      summary: "Despite the hype around social media, email marketing continues to deliver the highest ROI for businesses across all sectors, with an average return of $42 for every $1 spent.",
      url: "https://example.com/email-marketing-roi",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 18), // 18 hours ago
      score: 0,
      source: "RSS - EmailInsider",
      categories: ["EmailInsider", "rss"],
      sourceType: 'reddit',
    },
    {
      title: "The Psychology Behind Viral Content: What Makes People Share?",
      summary: "Research into viral content reveals that emotional response, particularly high-arousal emotions like awe, anger, and anxiety, is the strongest predictor of sharing behavior.",
      url: "https://example.com/viral-content-psychology",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 24 hours ago
      score: 189,
      source: "r/marketing",
      categories: ["marketing", "reddit"],
      sourceType: 'reddit',
    }
  ];
  
  // If we have a specific business type, we could return more targeted mock data
  if (businessType.toLowerCase().includes('marketing') || 
      businessType.toLowerCase().includes('social media')) {
    return [
      ...genericTopics,
      {
        title: "TikTok's New Creator Monetization Features Explained",
        summary: "TikTok has rolled out new ways for creators to monetize their content, including expanded Creator Fund access and direct tipping options.",
        url: "https://example.com/tiktok-monetization",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 5), // 5 hours ago
        score: 312,
        source: "r/socialmedia",
        categories: ["socialmedia", "reddit"],
        sourceType: 'reddit',
      },
      {
        title: "How Brands Are Using AI to Personalize Marketing at Scale",
        summary: "Case studies of companies using AI to deliver personalized marketing messages to thousands of customer segments simultaneously.",
        url: "https://example.com/ai-personalization",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 10), // 10 hours ago
        score: 0,
        source: "RSS - MarketingAI",
        categories: ["MarketingAI", "rss"],
        sourceType: 'reddit',
      }
    ];
  }
  
  return genericTopics;
} 
/**
 * X (Twitter) API Client
 * 
 * This module provides functions to fetch trending topics from X (formerly Twitter)
 */

import { TrendingTopic } from './redditApi';

// Define interface for X trending topic
export interface XTrendingTopic {
  name: string;
  query: string;
  tweet_volume: number | null;
  url?: string;
}

/**
 * Get X OAuth access token using client credentials flow
 */
async function getXAccessToken(): Promise<string> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    console.error('Missing X API credentials:', { 
      apiKey: apiKey ? 'Present' : 'Missing',
      apiSecret: apiSecret ? 'Present' : 'Missing'
    });
    throw new Error('X API credentials not configured properly in .env.local file. Please check your TWITTER_API_KEY and TWITTER_API_SECRET values.');
  }
  
  // Encode credentials for Basic Authentication
  const encodedCredentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  
  try {
    console.log('Attempting to authenticate with X API...');
    
    // Make request for access token
    const response = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error('X API authentication failed:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText
      });
      throw new Error(`X API authentication failed with status ${response.status}: ${responseText}`);
    }
    
    const data = await response.json();
    console.log('Successfully authenticated with X API');
    
    return data.access_token;
  } catch (error) {
    console.error('Error authenticating with X API:', error);
    throw error;
  }
}

/**
 * Fetch trending topics from X, either globally or by location
 * 
 * @param woeid - Where On Earth ID location (optional, defaults to 1 for global)
 * @param accessToken - OAuth access token
 * @returns Array of trending topics
 */
async function fetchXTrending(accessToken: string, woeid: number = 1): Promise<XTrendingTopic[]> {
  try {
    // Fetch trending topics from the specified location
    const response = await fetch(`https://api.twitter.com/1.1/trends/place.json?id=${woeid}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch X trending topics: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle the nested structure of the response
    if (Array.isArray(data) && data.length > 0 && data[0].trends) {
      return data[0].trends;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching X trending topics:', error);
    throw error;
  }
}

/**
 * Get trending topics from X based on business type
 */
export async function getTrendingXTopics(businessType: string): Promise<TrendingTopic[]> {
  try {
    // Get access token
    const accessToken = await getXAccessToken();
    
    // Fetch global trending topics
    const trendingTopics = await fetchXTrending(accessToken);
    
    // Convert to standardized TrendingTopic format
    return trendingTopics.slice(0, 15).map(topic => ({
      title: topic.name,
      summary: `Trending on X with ${topic.tweet_volume ? topic.tweet_volume.toLocaleString() : 'unknown'} tweets.`,
      url: topic.url || `https://twitter.com/search?q=${encodeURIComponent(topic.query)}`,
      pubDate: new Date(), // X trends don't provide a specific date, so use current
      score: topic.tweet_volume || 0,
      source: 'X (Twitter)',
      categories: ['social', 'x', 'twitter'],
      sourceType: 'reddit' // We're reusing the 'reddit' sourceType for compatibility
    }));
  } catch (error) {
    console.error('Error fetching trending X topics:', error);
    throw error;
  }
}

/**
 * Get mock X trends for when the API is unavailable or during development
 */
export function getMockXTrends(businessType: string): TrendingTopic[] {
  const now = new Date();
  
  // Common trending topics that are relevant across most business types
  const commonTrends: TrendingTopic[] = [
    {
      title: "#AITrends2023",
      summary: "Discussions about the latest AI advancements and how they're changing business operations and workflows.",
      url: "https://twitter.com/search?q=%23AITrends2023",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 1), // 1 hour ago
      score: 56700,
      source: "X (Twitter)",
      categories: ["technology", "x", "twitter"],
      sourceType: 'reddit',
    },
    {
      title: "#WorkFromAnywhere",
      summary: "Professionals discussing remote work policies and how businesses are adapting to distributed teams.",
      url: "https://twitter.com/search?q=%23WorkFromAnywhere",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 4), // 4 hours ago
      score: 43900,
      source: "X (Twitter)",
      categories: ["business", "x", "twitter"],
      sourceType: 'reddit',
    },
    {
      title: "Content Creator Economy",
      summary: "Trending conversations about monetization strategies for digital content creators and the evolving creator economy.",
      url: "https://twitter.com/search?q=%22Content%20Creator%20Economy%22",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 9), // 9 hours ago
      score: 32600,
      source: "X (Twitter)",
      categories: ["marketing", "x", "twitter"],
      sourceType: 'reddit',
    }
  ];
  
  // Generate industry-specific mock trends
  let industryTrends: TrendingTopic[] = [];
  
  // Internet/ISP specific trends
  if (businessType.toLowerCase().includes('internet') || 
      businessType.toLowerCase().includes('isp') ||
      businessType.toLowerCase().includes('tech')) {
    industryTrends = [
      {
        title: "#InternetOutage",
        summary: "Users reporting widespread internet connectivity issues across several service providers.",
        url: "https://twitter.com/search?q=%23InternetOutage",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
        score: 32500,
        source: "X (Twitter)",
        categories: ["tech", "x", "twitter"],
        sourceType: 'reddit',
      },
      {
        title: "#5GExpansion",
        summary: "Discussions about new 5G tower installations and coverage expansion in rural areas.",
        url: "https://twitter.com/search?q=%235GExpansion",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 5), // 5 hours ago
        score: 18700,
        source: "X (Twitter)",
        categories: ["tech", "x", "twitter"],
        sourceType: 'reddit',
      },
      {
        title: "Fiber vs Satellite",
        summary: "People comparing experiences with fiber internet versus new satellite internet services.",
        url: "https://twitter.com/search?q=%22Fiber%20vs%20Satellite%22",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 8), // 8 hours ago
        score: 12300,
        source: "X (Twitter)",
        categories: ["tech", "x", "twitter"],
        sourceType: 'reddit',
      },
      {
        title: "#NetNeutrality",
        summary: "Renewed discussions about net neutrality regulations and their impact on internet service providers.",
        url: "https://twitter.com/search?q=%23NetNeutrality",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 12), // 12 hours ago
        score: 28600,
        source: "X (Twitter)",
        categories: ["tech", "x", "twitter"],
        sourceType: 'reddit',
      }
    ];
  } 
  // Health/wellness specific trends
  else if (businessType.toLowerCase().includes('health') || 
           businessType.toLowerCase().includes('wellness')) {
    industryTrends = [
      {
        title: "#WellnessWednesday",
        summary: "People sharing their wellness routines and health tips midweek.",
        url: "https://twitter.com/search?q=%23WellnessWednesday",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 3), // 3 hours ago
        score: 45600,
        source: "X (Twitter)",
        categories: ["health", "x", "twitter"],
        sourceType: 'reddit',
      },
      {
        title: "Gut Health",
        summary: "Increasing discussion about the importance of gut health and microbiome for overall wellness.",
        url: "https://twitter.com/search?q=%22Gut%20Health%22",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 6), // 6 hours ago
        score: 28900,
        source: "X (Twitter)",
        categories: ["health", "x", "twitter"],
        sourceType: 'reddit',
      },
      {
        title: "#MindfulMoments",
        summary: "Trending hashtag about incorporating mindfulness into daily routines for better mental health.",
        url: "https://twitter.com/search?q=%23MindfulMoments",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 9), // 9 hours ago
        score: 19200,
        source: "X (Twitter)",
        categories: ["health", "x", "twitter"],
        sourceType: 'reddit',
      },
      {
        title: "#HolisticHealth",
        summary: "Discussions about integrating physical, mental, and spiritual aspects of health for complete wellbeing.",
        url: "https://twitter.com/search?q=%23HolisticHealth",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 11), // 11 hours ago
        score: 22700,
        source: "X (Twitter)",
        categories: ["health", "x", "twitter"],
        sourceType: 'reddit',
      }
    ];
  }
  // Marketing specific trends
  else if (businessType.toLowerCase().includes('marketing') || 
           businessType.toLowerCase().includes('advertising')) {
    industryTrends = [
      {
        title: "#ContentStrategy",
        summary: "Marketers discussing effective content strategies for driving engagement and conversions.",
        url: "https://twitter.com/search?q=%23ContentStrategy",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
        score: 36800,
        source: "X (Twitter)",
        categories: ["marketing", "x", "twitter"],
        sourceType: 'reddit',
      },
      {
        title: "Social Media ROI",
        summary: "Discussions about measuring and improving return on investment for social media marketing campaigns.",
        url: "https://twitter.com/search?q=%22Social%20Media%20ROI%22",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 7), // 7 hours ago
        score: 19500,
        source: "X (Twitter)",
        categories: ["marketing", "x", "twitter"],
        sourceType: 'reddit',
      },
      {
        title: "#EmailMarketing",
        summary: "Marketers sharing tips and strategies for effective email campaigns that drive conversions.",
        url: "https://twitter.com/search?q=%23EmailMarketing",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 10), // 10 hours ago
        score: 27300,
        source: "X (Twitter)",
        categories: ["marketing", "x", "twitter"],
        sourceType: 'reddit',
      }
    ];
  }
  // General business trends (default)
  else {
    industryTrends = [
      {
        title: "#MondayMotivation",
        summary: "Start-of-week inspiration and motivation trending across many professional fields.",
        url: "https://twitter.com/search?q=%23MondayMotivation",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 4), // 4 hours ago
        score: 65800,
        source: "X (Twitter)",
        categories: ["business", "x", "twitter"],
        sourceType: 'reddit',
      },
      {
        title: "Remote Work",
        summary: "Ongoing conversations about remote work policies and best practices across industries.",
        url: "https://twitter.com/search?q=%22Remote%20Work%22",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 7), // 7 hours ago
        score: 43200,
        source: "X (Twitter)",
        categories: ["business", "x", "twitter"],
        sourceType: 'reddit',
      },
      {
        title: "#SmallBizTips",
        summary: "Small business owners sharing and discovering operational and marketing insights.",
        url: "https://twitter.com/search?q=%23SmallBizTips",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 10), // 10 hours ago
        score: 22700,
        source: "X (Twitter)",
        categories: ["business", "x", "twitter"],
        sourceType: 'reddit',
      },
      {
        title: "#Leadership",
        summary: "Discussions about effective leadership strategies and management approaches in the modern workplace.",
        url: "https://twitter.com/search?q=%23Leadership",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 13), // 13 hours ago
        score: 51400,
        source: "X (Twitter)",
        categories: ["business", "x", "twitter"],
        sourceType: 'reddit',
      }
    ];
  }
  
  // Combine common and industry-specific trends
  return [...commonTrends, ...industryTrends];
} 
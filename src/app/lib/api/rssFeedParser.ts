/**
 * RSS Feed Parser Module
 * 
 * This module provides functionality to fetch and parse RSS feeds
 * from various sources to identify trending topics.
 */

import { TrendingTopic } from './redditApi';

// Define the structure for RSS feed items
export interface RSSFeedItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  source: string;
}

/**
 * Fetches the content of an RSS feed and parses it into structured data
 * 
 * @param feedUrl - The URL of the RSS feed to fetch
 * @returns Array of parsed RSS feed items
 */
export async function fetchRSSFeed(feedUrl: string): Promise<RSSFeedItem[]> {
  try {
    const response = await fetch(feedUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour
    
    if (!response.ok) {
      console.error(`Failed to fetch RSS feed from ${feedUrl}: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const xmlText = await response.text();
    
    // Basic XML parsing using regex for simplicity
    // In a production app, use a proper XML parser like xml2js
    const items: RSSFeedItem[] = [];
    const sourceName = extractSourceName(feedUrl);
    
    // Extract items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];
      
      const title = extractTag(itemContent, 'title');
      const link = extractTag(itemContent, 'link');
      const pubDate = extractTag(itemContent, 'pubDate');
      const description = extractTag(itemContent, 'description');
      
      if (title && link) {
        items.push({
          title,
          link,
          pubDate: pubDate || new Date().toUTCString(),
          description,
          source: sourceName
        });
      }
    }
    
    return items;
  } catch (error) {
    console.error(`Error fetching RSS feed from ${feedUrl}:`, error);
    return [];
  }
}

/**
 * Helper function to extract content between XML tags
 */
function extractTag(content: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's');
  const match = regex.exec(content);
  if (match && match[1]) {
    // Remove CDATA sections and basic HTML tags
    return match[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
  return undefined;
}

/**
 * Extracts a readable source name from the feed URL
 */
function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove www. prefix and get the domain name
    return hostname.replace(/^www\./, '').split('.')[0];
  } catch {
    return 'Unknown Source';
  }
}

/**
 * Fetches items from multiple RSS feeds and combines them
 * 
 * @param feedUrls - Array of RSS feed URLs to fetch
 * @returns Array of feed items from all sources
 */
export async function fetchMultipleFeeds(feedUrls: string[]): Promise<RSSFeedItem[]> {
  // If no feeds are provided, return empty array
  if (!feedUrls || feedUrls.length === 0) {
    return [];
  }
  
  try {
    // Fetch all feeds in parallel
    const feedPromises = feedUrls.map(url => fetchRSSFeed(url));
    const feedResults = await Promise.all(feedPromises);
    
    // Flatten the results
    return feedResults.flat();
  } catch (error) {
    console.error('Error fetching multiple RSS feeds:', error);
    return [];
  }
}

/**
 * Sorts and filters RSS items to find trending topics
 * 
 * @param items - Array of RSS feed items
 * @param limit - Maximum number of trending topics to return
 * @returns Array of trending topics derived from RSS feeds
 */
export function extractTrendingTopicsFromRSS(items: RSSFeedItem[], limit: number = 5): TrendingTopic[] {
  if (!items || items.length === 0) {
    return [];
  }
  
  // Sort by publication date (newest first)
  const sortedItems = [...items].sort((a, b) => {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });
  
  // Take the most recent items up to the limit
  const recentItems = sortedItems.slice(0, Math.min(sortedItems.length, limit * 2));
  
  // Convert to trending topics format
  return recentItems.slice(0, limit).map(item => ({
    title: item.title,
    summary: item.description || 'No description available',
    url: item.link,
    pubDate: new Date(item.pubDate),
    score: 0,
    source: `RSS - ${item.source}`,
    categories: [item.source, 'rss'],
    sourceType: 'reddit' as const, // Using 'reddit' to match the existing interface
  }));
}

/**
 * Fetches trending topics from RSS feeds
 * 
 * @param feedUrls - Array of RSS feed URLs
 * @param limit - Maximum number of trending topics to return
 * @returns Array of trending topics from RSS feeds
 */
export async function getTrendingTopicsFromRSS(
  feedUrls: string[] = [],
  limit: number = 5
): Promise<TrendingTopic[]> {
  try {
    // Use environment variable feeds if available, otherwise use provided feeds
    const envFeeds = process.env.RSS_FEED_URLS ? process.env.RSS_FEED_URLS.split(',') : [];
    const feeds = feedUrls.length > 0 ? feedUrls : envFeeds;
    
    if (feeds.length === 0) {
      console.warn('No RSS feeds configured. Configure RSS_FEED_URLS in your .env.local file.');
      return []; // Return empty array instead of mock data
    }
    
    const items = await fetchMultipleFeeds(feeds);
    if (items.length === 0) {
      console.warn('No items found in the RSS feeds.');
      return []; // Return empty array if no items found
    }
    
    return extractTrendingTopicsFromRSS(items, limit);
  } catch (error) {
    console.error('Error getting trending topics from RSS:', error);
    return []; // Return empty array instead of mock data
  }
}

/**
 * Provides mock RSS trending topics for development or when feeds are unavailable
 * 
 * @returns Array of mock trending topics
 */
function getMockRSSTopics(): TrendingTopic[] {
  const now = new Date();
  
  return [
    {
      title: "The Future of Artificial Intelligence in Content Creation",
      summary: "New AI tools are revolutionizing how content creators work, saving time while improving quality.",
      url: "https://example.com/ai-content-creation",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 12), // 12 hours ago
      score: 0,
      source: "RSS - TechDaily",
      categories: ["TechDaily", "rss"],
      sourceType: 'reddit',
    },
    {
      title: "5 Social Media Trends Every Marketer Should Know in 2023",
      summary: "From short-form video dominance to the rise of social commerce, these trends are shaping marketing strategies.",
      url: "https://example.com/social-media-trends",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 18), // 18 hours ago
      score: 0,
      source: "RSS - MarketingWeek",
      categories: ["MarketingWeek", "rss"],
      sourceType: 'reddit',
    },
    {
      title: "Small Businesses Embracing Digital Transformation Post-Pandemic",
      summary: "Local businesses are finding new growth opportunities through e-commerce and digital marketing.",
      url: "https://example.com/small-business-digital",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 24 hours ago
      score: 0,
      source: "RSS - BusinessInsider",
      categories: ["BusinessInsider", "rss"],
      sourceType: 'reddit',
    },
    {
      title: "Content Personalization: The Key to Customer Engagement",
      summary: "How brands are using data to create highly personalized content experiences for their audiences.",
      url: "https://example.com/personalization-engagement",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 30), // 30 hours ago
      score: 0,
      source: "RSS - ContentStrategy",
      categories: ["ContentStrategy", "rss"],
      sourceType: 'reddit',
    },
    {
      title: "Video Marketing Statistics That Will Surprise You",
      summary: "New research shows 86% of businesses are now using video as a marketing tool, up from 63% in the previous year.",
      url: "https://example.com/video-marketing-stats",
      pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 36), // 36 hours ago
      score: 0,
      source: "RSS - MarketingPro",
      categories: ["MarketingPro", "rss"],
      sourceType: 'reddit',
    }
  ];
} 
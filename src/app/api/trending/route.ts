/**
 * Trending Topics API
 * 
 * This API provides trending topics based on business type.
 * It retrieves data from multiple sources including Reddit and RSS feeds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrendingTopicsFromRSS } from '@/app/lib/api/rssFeedParser';
import { TrendingResult } from '@/app/lib/api/trendingService';
import { getTrendingBusinessTopics, TrendingTopic } from '@/app/lib/api/redditApi';

// Disable caching for this API route to ensure fresh data
export const dynamic = 'force-dynamic';

/**
 * Calculate relevance score for a trending topic based on business type
 * Higher score = more relevant
 */
function calculateRelevanceScore(topic: TrendingTopic, businessType: string): number {
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
  
  // Keyword matches
  for (const keyword of businessKeywords) {
    if (titleLower.includes(keyword)) score += 5;
    if (summaryLower.includes(keyword)) score += 3;
  }
  
  // Industry-specific relevance (add more categories as needed)
  if (businessTypeLower.includes('internet') || businessTypeLower.includes('isp')) {
    const techTerms = ['internet', 'broadband', 'connectivity', 'fiber', 'wireless', 'speed', 'data', 'connection', 'wifi', 'rural', 'provider', 'outage', 'service'];
    for (const term of techTerms) {
      if (titleLower.includes(term)) score += 3;
      if (summaryLower.includes(term)) score += 1;
    }
  } 
  else if (businessTypeLower.includes('health') || businessTypeLower.includes('wellness')) {
    const healthTerms = ['health', 'wellness', 'fitness', 'nutrition', 'diet', 'exercise', 'medical', 'vitamin', 'supplement', 'lifestyle'];
    for (const term of healthTerms) {
      if (titleLower.includes(term)) score += 3;
      if (summaryLower.includes(term)) score += 1;
    }
  }
  
  // Source-specific bonuses
  if (topic.source === 'X (Twitter)') {
    // Topics from X likely represent very current trends, give them a boost
    score += 2;
  }
  
  // Recency bonus (topics from within the last 24 hours get a boost)
  const topicDate = new Date(topic.pubDate);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (topicDate > yesterday) {
    score += 3;
  }
  
  // Higher score for original source vs. aggregated content
  if (topic.sourceType === 'reddit' && topic.source.includes('r/')) {
    if (isSourceRelevantToBusinessType(topic.source, businessTypeLower)) {
      score += 4; // Bonus for topic from a relevant subreddit
    }
  }
  
  return score;
}

/**
 * Determine if a source (like a subreddit) is relevant to the business type
 */
function isSourceRelevantToBusinessType(source: string, businessType: string): boolean {
  // For Reddit sources, check if the subreddit is relevant
  if (source.startsWith('r/')) {
    const subreddit = source.substring(2).toLowerCase();
    
    // Internet/ISP related subreddits
    if (businessType.includes('internet') || businessType.includes('isp')) {
      return ['technology', 'internet', 'broadband', 'starlink', 'wisp', 'rural_internet', 'networking'].includes(subreddit);
    }
    
    // Health/wellness related subreddits
    if (businessType.includes('health') || businessType.includes('wellness')) {
      return ['health', 'nutrition', 'fitness', 'supplements', 'weightloss', 'keto', 'wellness'].includes(subreddit);
    }
    
    // Marketing related subreddits
    if (businessType.includes('marketing') || businessType.includes('advertis')) {
      return ['marketing', 'digitalmarketing', 'seo', 'ppc', 'socialmedia', 'contentmarketing'].includes(subreddit);
    }
  }
  
  return false;
}

// Helper function to convert RSS items to TrendingTopic format
function convertRssToTrendingTopics(rssItems: any[]): TrendingTopic[] {
  return rssItems.map(item => ({
    title: item.title,
    summary: item.description || 'No description available',
    url: item.link,
    pubDate: new Date(item.pubDate),
    score: 0, // RSS items don't have scores
    source: item.source || 'RSS Feed',
    categories: item.categories || ['news'],
    sourceType: 'reddit' as const, // Reusing Reddit type for compatibility
  }));
}

/**
 * GET handler for the trending API endpoint
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessType = searchParams.get('businessType') || '';
  const sources = searchParams.get('sources')?.split(',') || ['rss']; // Default to RSS only

  console.log(`Trending API called with businessType: ${businessType}, sources: ${sources.join(',')}`);

  // Initialize variables
  let redditTopics: TrendingTopic[] = [];
  let rssTopics: TrendingTopic[] = [];
  let errors: string[] = [];

  try {
    // Try to get real Reddit data
    if (sources.includes('reddit')) {
      console.log('Fetching Reddit topics...');
      redditTopics = await getTrendingBusinessTopics(businessType);
      console.log(`Retrieved ${redditTopics.length} Reddit trending topics`);
    }
  } catch (err: any) {
    const errorMessage = `Reddit API error: ${err.message}`;
    console.error(errorMessage);
    errors.push(errorMessage);
  }

  // RSS DATA FETCHING
  if (sources.includes('rss')) {
    try {
      console.log('Fetching RSS topics...');
      const rssData = await getTrendingTopicsFromRSS();
      console.log(`Retrieved ${rssData.length} raw RSS items`);
      
      if (rssData.length > 0) {
        rssTopics = convertRssToTrendingTopics(rssData);
        console.log(`Converted to ${rssTopics.length} RSS trending topics`);
      } else {
        const rssError = 'No RSS topics found';
        console.warn(rssError);
        errors.push(rssError);
      }
    } catch (err: any) {
      const errorMessage = `RSS fetch error: ${err.message}`;
      console.error(errorMessage);
      errors.push(errorMessage);
    }
  }

  // Combine and filter results
  let allTopics = [...redditTopics, ...rssTopics];
  
  // If we didn't get any topics from any source, return an error
  if (allTopics.length === 0) {
    console.error('No trending topics found from any source');
    return NextResponse.json({
      topics: [],
      sources: {
        reddit: false,
        rss: false
      },
      timestamp: new Date(),
      error: 'No trending topics found from any source'
    }, { status: 404 });
  }

  // Calculate relevance scores before sorting
  allTopics = allTopics.map(topic => ({
    ...topic,
    relevanceScore: calculateRelevanceScore(topic, businessType)
  }));

  // Sort by relevance score - higher scores first
  allTopics.sort((a, b) => {
    return (b.relevanceScore || 0) - (a.relevanceScore || 0);
  });

  // Take the top N topics (limit to 10 for now)
  const topTopics = allTopics.slice(0, 10);

  console.log(`Returning ${topTopics.length} trending topics (${redditTopics.length} from Reddit, ${rssTopics.length} from RSS)`);
  
  // Construct and return the result
  const result: TrendingResult = {
    topics: topTopics,
    sources: {
      reddit: redditTopics.length > 0,
      rss: rssTopics.length > 0
    },
    timestamp: new Date()
  };

  return NextResponse.json(result);
}

/**
 * POST handler for the trending API endpoint
 * This allows more complex querying or parameterization in the future
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { businessType = '', sources = ['rss'] } = body;
    
    console.log(`Trending API POST called with businessType: ${businessType}, sources: ${sources.join(',')}`);
    
    // Initialize variables
    let redditTopics: TrendingTopic[] = [];
    let rssTopics: TrendingTopic[] = [];
    let errors: string[] = [];
    
    try {
      // Try to get real Reddit data
      if (sources.includes('reddit')) {
        console.log('Fetching Reddit topics...');
        redditTopics = await getTrendingBusinessTopics(businessType);
        console.log(`Retrieved ${redditTopics.length} Reddit trending topics`);
      }
    } catch (err: any) {
      const errorMessage = `Reddit API error: ${err.message}`;
      console.error(errorMessage);
      errors.push(errorMessage);
    }
    
    // RSS DATA FETCHING
    if (sources.includes('rss')) {
      try {
        console.log('Fetching RSS topics...');
        const rssData = await getTrendingTopicsFromRSS();
        console.log(`Retrieved ${rssData.length} raw RSS items`);
        
        if (rssData.length > 0) {
          rssTopics = convertRssToTrendingTopics(rssData);
          console.log(`Converted to ${rssTopics.length} RSS trending topics`);
        } else {
          const rssError = 'No RSS topics found';
          console.warn(rssError);
          errors.push(rssError);
        }
      } catch (err: any) {
        const errorMessage = `RSS fetch error: ${err.message}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }
    
    // Combine and filter results
    let allTopics = [...redditTopics, ...rssTopics];
    
    // If we didn't get any topics from any source, return an error
    if (allTopics.length === 0) {
      console.error('No trending topics found from any source');
      return NextResponse.json({
        topics: [],
        sources: {
          reddit: false,
          rss: false
        },
        timestamp: new Date(),
        error: 'No trending topics found from any source'
      }, { status: 404 });
    }
    
    // Calculate relevance scores before sorting
    allTopics = allTopics.map(topic => ({
      ...topic,
      relevanceScore: calculateRelevanceScore(topic, businessType)
    }));
    
    // Sort by relevance score - higher scores first
    allTopics.sort((a, b) => {
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });
    
    // Take the top N topics (limit to 10 for now)
    const topTopics = allTopics.slice(0, 10);
    
    console.log(`Returning ${topTopics.length} trending topics (${redditTopics.length} from Reddit, ${rssTopics.length} from RSS)`);
    
    // Construct and return the result
    const result: TrendingResult = {
      topics: topTopics,
      sources: {
        reddit: redditTopics.length > 0,
        rss: rssTopics.length > 0
      },
      timestamp: new Date()
    };
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error processing trending POST request:', error);
    return NextResponse.json({
      error: `Failed to process trending request: ${error.message}`,
      topics: []
    }, { status: 500 });
  }
} 
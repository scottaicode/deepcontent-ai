/**
 * API route for retrieving trending topics from multiple sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrendingBusinessTopics } from '@/app/lib/api/redditApi';
import { getTrendingNews } from '@/app/lib/api/rssParser';

export const dynamic = 'force-dynamic'; // Ensure this route is not cached

export async function GET(request: NextRequest) {
  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const businessType = searchParams.get('businessType') || 'general';
  const researchTopic = searchParams.get('researchTopic') || '';

  try {
    // Start multiple API requests in parallel - no fallback to mock data
    const [redditTrends, rssItems] = await Promise.all([
      getTrendingBusinessTopics(businessType),
      getTrendingNews(businessType)
    ]);
    
    // Combine the results
    let allTrends = [...redditTrends, ...rssItems];
    
    // Filter by research topic if provided
    if (researchTopic && researchTopic.trim() !== '') {
      const keywords = researchTopic
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3); // Only use significant words
      
      if (keywords.length > 0) {
        allTrends = allTrends.filter(trend => {
          const text = `${trend.title} ${trend.summary}`.toLowerCase();
          return keywords.some(keyword => text.includes(keyword));
        });
      }
    }
    
    // Sort by recency
    allTrends.sort((a, b) => {
      const dateA = a.pubDate instanceof Date ? a.pubDate : new Date(a.pubDate);
      const dateB = b.pubDate instanceof Date ? b.pubDate : new Date(b.pubDate);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Return unique trends (no duplicate titles)
    const uniqueTrends = allTrends.filter((trend, index, self) => 
      index === self.findIndex(t => t.title === trend.title)
    );
    
    return NextResponse.json({
      success: true,
      data: uniqueTrends.slice(0, 20), // Return at most 20 trends
      sources: {
        reddit: redditTrends.length > 0,
        rss: rssItems.length > 0
      }
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trending topics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
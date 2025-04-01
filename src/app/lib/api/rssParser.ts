/**
 * RSS Parser
 * 
 * This module provides functions to fetch and parse RSS feeds for trending content
 * from news sources and blogs.
 */

// We'll need to install the rss-parser package
// npm install rss-parser

import Parser from 'rss-parser';

// Extend the default Parser types for better typing
interface CustomItem {
  title: string;
  link: string;
  content?: string;
  contentSnippet?: string;
  isoDate?: string;
  pubDate?: string;
  creator?: string;
  author?: string;
  categories?: string[];
}

interface CustomFeed {
  title: string;
  description?: string;
  link?: string;
  image?: {
    url: string;
    title: string;
    link: string;
  };
  generator?: string;
  lastBuildDate?: string;
}

export interface RssItem {
  title: string;
  summary: string;
  url: string;
  pubDate: Date;
  source: string;
  categories: string[];
  sourceType: 'rss';
}

// Create a new parser instance with custom types
const parser = new Parser<CustomFeed, CustomItem>({
  customFields: {
    item: [
      ['media:content', 'media'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

/**
 * Get default RSS feed URLs from environment variable or use defaults
 */
function getDefaultRssFeeds(): string[] {
  const envFeeds = process.env.RSS_FEED_URLS;
  
  if (envFeeds) {
    return envFeeds.split(',').map(feed => feed.trim());
  }
  
  // Default feeds if none are specified in environment
  return [
    'https://news.google.com/rss/topics/business',
    'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', // WSJ Markets
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml'
  ];
}

/**
 * Get topic-specific RSS feeds based on business type
 */
function getTopicSpecificFeeds(businessType: string): string[] {
  const defaultFeeds = getDefaultRssFeeds();
  
  // Add or prioritize feeds based on business type
  if (businessType.toLowerCase().includes('internet') || 
      businessType.toLowerCase().includes('isp') ||
      businessType.toLowerCase().includes('tech')) {
    return [
      'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
      'https://www.wired.com/feed/rss',
      'https://www.theverge.com/rss/index.xml',
      'https://feeds.arstechnica.com/arstechnica/technology-lab',
      'https://www.fiercetelecom.com/rss/xml',
      ...defaultFeeds
    ];
  }
  
  if (businessType.toLowerCase().includes('marketing') || 
      businessType.toLowerCase().includes('social media')) {
    return [
      'https://feeds.feedburner.com/ducttapemarketing/nRUD',
      'https://feeds2.feedburner.com/socialmediaexaminer',
      'https://blog.hubspot.com/marketing/rss.xml',
      'https://contentmarketinginstitute.com/feed/',
      ...defaultFeeds
    ];
  }
  
  if (businessType.toLowerCase().includes('finance') || 
      businessType.toLowerCase().includes('accounting')) {
    return [
      'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
      'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml',
      'https://www.forbes.com/business/feed/',
      'https://www.ft.com/rss/companies',
      ...defaultFeeds
    ];
  }
  
  return defaultFeeds;
}

/**
 * Extract a useful summary from HTML content
 */
function extractSummary(content?: string, contentSnippet?: string): string {
  // If contentSnippet is available and not too short, use it
  if (contentSnippet && contentSnippet.length > 50) {
    return contentSnippet.substring(0, 250) + (contentSnippet.length > 250 ? '...' : '');
  }
  
  // If content is available, try to extract text from HTML
  if (content) {
    // Simple HTML stripping for summary
    const strippedContent = content
      .replace(/<[^>]*>/g, ' ') // Replace HTML tags with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    return strippedContent.substring(0, 250) + (strippedContent.length > 250 ? '...' : '');
  }
  
  return 'No summary available';
}

/**
 * Parse a date string from RSS into a JavaScript Date
 */
function parseRssDate(dateString?: string): Date {
  if (!dateString) {
    return new Date();
  }
  
  try {
    return new Date(dateString);
  } catch (error) {
    console.error('Error parsing RSS date:', error);
    return new Date();
  }
}

/**
 * Fetch and parse an RSS feed
 */
async function fetchRssFeed(feedUrl: string): Promise<RssItem[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    
    return feed.items.map(item => ({
      title: item.title || 'No title',
      summary: extractSummary(item.content, item.contentSnippet),
      url: item.link || '',
      pubDate: parseRssDate(item.isoDate || item.pubDate),
      source: feed.title || new URL(feedUrl).hostname,
      categories: item.categories || [],
      sourceType: 'rss' as const,
    }));
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error);
    return [];
  }
}

/**
 * Get trending news and articles from RSS feeds based on business type
 */
export async function getTrendingNews(businessType: string = 'general'): Promise<RssItem[]> {
  const feeds = getTopicSpecificFeeds(businessType);
  
  // Limit to 3-4 feeds to avoid overloading in development
  const limitedFeeds = feeds.slice(0, 4);
  
  try {
    // Fetch all feeds in parallel
    const allFeedPromises = limitedFeeds.map(feed => fetchRssFeed(feed));
    const results = await Promise.all(allFeedPromises);
    
    // Combine all feed items into one array and filter out any empty items
    let allItems: RssItem[] = [];
    results.forEach(items => {
      allItems = [...allItems, ...items];
    });
    
    // Filter irrelevant items (optional)
    // For example, filter by keywords related to business type
    let filteredItems = allItems;
    
    if (businessType !== 'general') {
      const keywords = getKeywordsByBusinessType(businessType);
      
      if (keywords.length > 0) {
        const keywordRegex = new RegExp(keywords.join('|'), 'i');
        filteredItems = allItems.filter(item => 
          keywordRegex.test(item.title) || 
          keywordRegex.test(item.summary) ||
          (item.categories && item.categories.some(cat => keywordRegex.test(cat)))
        );
        
        // If too few items match keywords, mix in some unfiltered items
        if (filteredItems.length < 5) {
          const remainingItems = allItems
            .filter(item => !filteredItems.includes(item))
            .sort(() => 0.5 - Math.random()) // Shuffle remaining items
            .slice(0, 10 - filteredItems.length);
          
          filteredItems = [...filteredItems, ...remainingItems];
        }
      }
    }
    
    // Sort by publication date, newest first
    filteredItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    
    // Return the most recent items
    return filteredItems.slice(0, 10);
  } catch (error) {
    console.error('Error getting trending news:', error);
    return getMockRssItems(businessType);
  }
}

/**
 * Get relevant keywords for a business type to filter RSS items
 */
function getKeywordsByBusinessType(businessType: string): string[] {
  if (businessType.toLowerCase().includes('internet') || 
      businessType.toLowerCase().includes('isp') ||
      businessType.toLowerCase().includes('broadband')) {
    return [
      'internet', 'broadband', 'wifi', 'fiber', 'connectivity', 
      'rural', 'streaming', 'ISP', 'starlink', 'wireless',
      'telecom', '5G', 'satellite', 'remote work', 'digital divide'
    ];
  }
  
  if (businessType.toLowerCase().includes('marketing')) {
    return [
      'marketing', 'advertising', 'social media', 'content', 'SEO',
      'campaign', 'brand', 'digital marketing', 'customer', 'engagement',
      'lead generation', 'conversion', 'analytics', 'audience', 'strategy'
    ];
  }
  
  if (businessType.toLowerCase().includes('finance') || 
      businessType.toLowerCase().includes('accounting')) {
    return [
      'finance', 'accounting', 'tax', 'investment', 'budget',
      'financial', 'revenue', 'expense', 'profit', 'cashflow',
      'bookkeeping', 'audit', 'fiscal', 'capital', 'funding'
    ];
  }
  
  return [];
}

/**
 * Mock RSS items for development or when feeds are unavailable
 */
export function getMockRssItems(businessType: string = 'general'): RssItem[] {
  const now = new Date();
  
  if (businessType.toLowerCase().includes('internet') || 
      businessType.toLowerCase().includes('isp') ||
      businessType.toLowerCase().includes('broadband')) {
    return [
      {
        title: "FCC Approves New $3.2 Billion Program for Rural Broadband Expansion",
        summary: "The Federal Communications Commission approved a new subsidy program aimed at expanding high-speed internet access in underserved rural areas across the United States. The $3.2 billion initiative will provide funding for infrastructure development in communities where traditional ISPs have been reluctant to invest.",
        url: "https://example.com/fcc-rural-broadband",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
        source: "TechNews Daily",
        categories: ["Technology", "Rural", "Government", "Internet"],
        sourceType: 'rss',
      },
      {
        title: "Study Shows 45% of Remote Workers Experience Productivity Loss Due to Poor Internet",
        summary: "A new study from Stanford University reveals that almost half of remote workers report significant productivity challenges due to unreliable internet connections. Rural workers are most affected, with 62% reporting at least one video conference disruption per day.",
        url: "https://example.com/remote-work-internet-study",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 5), // 5 hours ago
        source: "Remote Work Insights",
        categories: ["Remote Work", "Productivity", "Internet", "Research"],
        sourceType: 'rss',
      },
      {
        title: "New Satellite Internet Technology Promises 100Mbps Speeds for Rural Areas",
        summary: "A breakthrough in satellite communication technology could bring urban-quality internet speeds to the most remote locations. The new system, developed by aerospace company Astrolink, uses a constellation of low-earth orbit satellites to deliver consistent 100Mbps download speeds with significantly lower latency than traditional satellite options.",
        url: "https://example.com/satellite-internet-breakthrough",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 8), // 8 hours ago
        source: "Space Technology Review",
        categories: ["Satellite", "Internet", "Technology", "Rural"],
        sourceType: 'rss',
      },
      {
        title: "Internet Usage in Rural Homes Increased 57% Since Pandemic, Creating New Market Opportunities",
        summary: "Data from Nielsen's Internet Consumption Report shows that rural households have dramatically increased their internet usage since 2020, creating new opportunities for service providers. Streaming services, online education, and telehealth are driving the increased demand for reliable high-speed connections outside urban centers.",
        url: "https://example.com/rural-internet-usage-report",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 14), // 14 hours ago
        source: "Business Insider",
        categories: ["Market Research", "Rural", "Internet", "Business Opportunities"],
        sourceType: 'rss',
      },
      {
        title: "Fixed Wireless Providers Expanding Coverage to Bridge Digital Divide",
        summary: "Regional fixed wireless internet providers are rapidly expanding their service areas to reach underserved communities. Unlike traditional cable or fiber options, fixed wireless can be deployed more quickly and at lower cost in rural areas, making it an increasingly popular solution for bridging the digital divide.",
        url: "https://example.com/fixed-wireless-expansion",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 20), // 20 hours ago
        source: "Telecom Monthly",
        categories: ["Fixed Wireless", "Internet", "Digital Divide", "Telecommunications"],
        sourceType: 'rss',
      }
    ];
  } else {
    // Generic business news
    return [
      {
        title: "Small Businesses Adopting AI at Unprecedented Rate, Survey Finds",
        summary: "A new report from the Small Business Administration reveals that 64% of small businesses have implemented some form of AI tools in the past year, a dramatic increase from just 12% in the previous year. Customer service automation and content creation are the most popular applications.",
        url: "https://example.com/small-business-ai-adoption",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 3), // 3 hours ago
        source: "Business Daily",
        categories: ["Small Business", "AI", "Technology", "Innovation"],
        sourceType: 'rss',
      },
      {
        title: "Inflation Concerns Easing Among Business Owners as Prices Stabilize",
        summary: "Recent data from the Bureau of Labor Statistics indicates inflation pressures are moderating, causing business confidence to improve according to the latest Chamber of Commerce survey. 72% of business owners report feeling more optimistic about economic conditions over the next six months.",
        url: "https://example.com/inflation-business-confidence",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 6), // 6 hours ago
        source: "Economic Times",
        categories: ["Economy", "Inflation", "Business Confidence"],
        sourceType: 'rss',
      },
      {
        title: "Sustainability Initiatives Driving Consumer Preference, Brand Loyalty",
        summary: "New research from McKinsey shows businesses with visible sustainability practices are seeing significant advantages in consumer preference and brand loyalty. Companies with strong environmental credentials now command a price premium averaging 12% across most retail categories.",
        url: "https://example.com/sustainability-consumer-preference",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 10), // 10 hours ago
        source: "Marketing Insights",
        categories: ["Sustainability", "Marketing", "Consumer Behavior", "Brand Loyalty"],
        sourceType: 'rss',
      },
      {
        title: "Remote Work Policies Evolving as Companies Seek Hybrid Balance",
        summary: "Three years after the pandemic-driven shift to remote work, companies are refining their workplace policies to find a sustainable balance. According to a new study from Gallup, 62% of businesses have settled on permanent hybrid arrangements, with most requiring 2-3 days of in-office presence per week.",
        url: "https://example.com/hybrid-work-evolution",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 16), // 16 hours ago
        source: "Workforce Trends",
        categories: ["Remote Work", "HR", "Workplace", "Management"],
        sourceType: 'rss',
      },
      {
        title: "Small Business Lending Shows Signs of Recovery After Tightening Period",
        summary: "After several quarters of tightening lending standards, banks are showing increased willingness to lend to small businesses, according to Federal Reserve data. Loan approval rates increased 7% in the past quarter, though they remain below pre-pandemic levels.",
        url: "https://example.com/small-business-lending-recovery",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 24 hours ago
        source: "Financial Review",
        categories: ["Finance", "Small Business", "Banking", "Economy"],
        sourceType: 'rss',
      }
    ];
  }
} 
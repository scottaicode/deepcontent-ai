/**
 * Reddit API Client
 * 
 * This module provides functions to fetch trending topics from Reddit
 */

export interface RedditPost {
  title: string;
  selftext: string;
  permalink: string;
  created_utc: number;
  score: number;
  num_comments: number;
  subreddit: string;
  url: string;
}

export interface TrendingTopic {
  title: string;
  summary: string;
  url: string;
  pubDate: Date; // Make sure to include this field for compatibility with RssItem
  score: number;
  source: string;
  categories: string[];
  sourceType: 'reddit';
  relevanceScore?: number; // Added relevance score for trending topics
}

/**
 * Get Reddit OAuth access token using installed client flow
 */
async function getRedditAccessToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('Missing Reddit API credentials:', { 
      clientId: clientId ? 'Present' : 'Missing',
      clientSecret: clientSecret ? 'Present' : 'Missing'
    });
    throw new Error('Reddit API credentials not configured properly in .env.local file. Please check your REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET values.');
  }
  
  // Create a unique device ID that remains constant for this deployment
  const deviceId = 'DEEPCONTENT_APP_ID_FIXED';
  
  // Create authorization string
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    console.log('Attempting to authenticate with Reddit API...');
    
    // Make request for access token using installed client OAuth flow
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'DeepContent/1.0.0 (by /u/DeepContentApp)'
      },
      body: `grant_type=https://oauth.reddit.com/grants/installed_client&device_id=${deviceId}`
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error('Reddit API authentication failed:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText
      });
      throw new Error(`Reddit API authentication failed with status ${response.status}: ${responseText}`);
    }
    
    const data = await response.json();
    console.log('Successfully authenticated with Reddit API');
    
    return data.access_token;
  } catch (error) {
    console.error('Error authenticating with Reddit API:', error);
    throw error;
  }
}

/**
 * Fetch trending posts from a specific subreddit
 */
async function fetchSubredditTrending(subreddit: string, accessToken: string): Promise<RedditPost[]> {
  try {
    const response = await fetch(`https://oauth.reddit.com/r/${subreddit}/hot?limit=25`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'DeepContent/1.0.0 (by /u/DeepContentApp)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from subreddit ${subreddit}: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data.children.map((child: any) => child.data) as RedditPost[];
  } catch (error) {
    console.error(`Error fetching from subreddit ${subreddit}:`, error);
    throw error;
  }
}

/**
 * Map business types to relevant subreddits for trending content
 */
function getSubredditsForBusinessType(businessType: string): string[] {
  // Default subreddits for general business trending
  const defaultSubreddits = ['business', 'marketing', 'entrepreneur', 'smallbusiness'];
  
  // Add or prioritize subreddits based on business type
  if (businessType.toLowerCase().includes('internet') || 
      businessType.toLowerCase().includes('isp') ||
      businessType.toLowerCase().includes('tech') ||
      businessType.toLowerCase().includes('broadband')) {
    return [
      'technology', 
      'broadband', 
      'Starlink',
      'wisp',
      'Rural_Internet',
      'ruralinternet',
      'telecom',
      'networking',
      ...defaultSubreddits
    ];
  }
  
  if (businessType.toLowerCase().includes('marketing') || 
      businessType.toLowerCase().includes('social media')) {
    return [
      'marketing', 
      'socialmedia', 
      'digitalmarketing',
      'contentmarketing',
      'SEO',
      'advertising',
      'socialmediamanagers',
      ...defaultSubreddits
    ];
  }
  
  if (businessType.toLowerCase().includes('finance') || 
      businessType.toLowerCase().includes('accounting')) {
    return [
      'finance', 
      'accounting', 
      'smallbusiness',
      'financialplanning',
      'tax',
      'investing',
      'entrepreneur',
      ...defaultSubreddits
    ];
  }
  
  return defaultSubreddits;
}

/**
 * Get trending topics from Reddit based on business type
 */
export async function getTrendingBusinessTopics(businessType: string): Promise<TrendingTopic[]> {
  try {
    console.log('Getting Reddit OAuth token...');
    // Get OAuth token
    const accessToken = await getRedditAccessToken();
    console.log('Successfully obtained Reddit access token');
    
    // Determine which subreddits to check based on business type
    const subreddits = getSubredditsForBusinessType(businessType);
    console.log(`Selected subreddits for "${businessType}":`, subreddits);
    
    // Only take a subset of subreddits to avoid too many API calls
    const limitedSubreddits = subreddits.slice(0, 5);
    
    // Fetch posts from each subreddit in parallel
    const subredditPromises = limitedSubreddits.map(subreddit => 
      fetchSubredditTrending(subreddit, accessToken)
        .catch(err => {
          console.error(`Error fetching from subreddit ${subreddit}:`, err);
          return []; // Don't let one failed subreddit stop the others
        })
    );
    
    console.log(`Fetching trending posts from ${limitedSubreddits.length} subreddits...`);
    const results = await Promise.all(subredditPromises);
    
    // Flatten array of post arrays into a single array
    let allPosts: RedditPost[] = [];
    results.forEach((posts, index) => {
      console.log(`Retrieved ${posts.length} posts from ${limitedSubreddits[index]}`);
      allPosts = [...allPosts, ...posts];
    });
    
    // If we didn't get any posts, throw an error
    if (allPosts.length === 0) {
      throw new Error('No trending topics found on Reddit for the specified business type');
    }
    
    // Filter out posts with low engagement (can be adjusted)
    const significantPosts = allPosts.filter(post => post.score > 5 || post.num_comments > 3);
    
    // Sort by score + comments to find "trending" posts
    significantPosts.sort((a, b) => 
      (b.score + b.num_comments * 3) - (a.score + a.num_comments * 3)
    );
    
    // Convert to TrendingTopic format
    const result = significantPosts.slice(0, 10).map(post => ({
      title: post.title,
      summary: post.selftext ? 
        (post.selftext.substring(0, 250) + (post.selftext.length > 250 ? '...' : '')) : 
        'No description available',
      url: `https://www.reddit.com${post.permalink}`,
      pubDate: new Date(post.created_utc * 1000), // Convert Unix timestamp to Date
      score: post.score,
      source: `r/${post.subreddit}`,
      categories: [post.subreddit, 'reddit'],
      sourceType: 'reddit' as const,
    }));
    
    console.log(`Returning ${result.length} trending topics from Reddit`);
    return result;
  } catch (error) {
    console.error('Error fetching trending business topics:', error);
    // No fallback to mock data - throw the error to be handled upstream
    throw error;
  }
}

/**
 * Get mock Reddit trends for when the API is unavailable or during development
 */
export function getMockRedditTrends(businessType: string): TrendingTopic[] {
  const now = new Date();
  
  if (businessType.toLowerCase().includes('internet') || 
      businessType.toLowerCase().includes('isp') ||
      businessType.toLowerCase().includes('broadband')) {
    return [
      {
        title: "What's the best internet option for a very rural area with no cell service?",
        summary: "I live in a valley with zero cell reception and the only internet option is satellite. I'm currently using HughesNet but the data caps are ridiculous and the service is unreliable during bad weather. Has anyone had success with StarLink or other alternatives in truly remote areas?",
        url: "https://www.reddit.com/r/Rural_Internet/comments/example1",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 5), // 5 hours ago
        score: 127,
        source: "r/Rural_Internet",
        categories: ["Rural_Internet", "reddit"],
        sourceType: 'reddit',
      },
      {
        title: "Starlink vs Viasat vs T-Mobile Home Internet - My 6-month comparison data",
        summary: "I've been testing all three services at my rural property for the past 6 months and wanted to share my findings. I've tracked speeds, latency, uptime, and performance during different weather conditions. Here's a detailed breakdown with charts comparing the services...",
        url: "https://www.reddit.com/r/Starlink/comments/example2",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 24 hours ago
        score: 342,
        source: "r/Starlink",
        categories: ["Starlink", "reddit"],
        sourceType: 'reddit',
      },
      {
        title: "Small local ISPs are making a comeback in rural markets",
        summary: "I've noticed an interesting trend in my work consulting for telecom companies - small, local ISPs are starting to capture significant market share in rural areas where the big providers haven't invested in infrastructure. These smaller companies are using a mix of fixed wireless, small fiber builds, and creative solutions to connect underserved communities.",
        url: "https://www.reddit.com/r/wisp/comments/example3",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 36), // 36 hours ago
        score: 98,
        source: "r/wisp",
        categories: ["wisp", "reddit"],
        sourceType: 'reddit',
      },
      {
        title: "How my rural ISP startup got to 500 customers in 6 months",
        summary: "After years of dealing with terrible internet options in my rural county, I decided to start my own fixed wireless ISP. We just hit 500 customers and I wanted to share what worked for us, from equipment selection to customer acquisition strategies. The demand is absolutely there if you can provide reliable service at a fair price.",
        url: "https://www.reddit.com/r/Entrepreneur/comments/example4",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 48), // 48 hours ago
        score: 215,
        source: "r/Entrepreneur",
        categories: ["Entrepreneur", "reddit"],
        sourceType: 'reddit',
      },
      {
        title: "The difference between 'advertised speeds' and 'actual speeds' should be illegal",
        summary: "I'm paying for '50 Mbps' internet but consistently get 5-8 Mbps during peak hours. The fine print says 'up to 50 Mbps' which seems like legalized false advertising. Rural customers have so few options that ISPs can get away with this. There should be regulations requiring providers to deliver at least 80% of advertised speeds or offer proportional refunds.",
        url: "https://www.reddit.com/r/technology/comments/example5",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 72), // 72 hours ago
        score: 1876,
        source: "r/technology",
        categories: ["technology", "reddit"],
        sourceType: 'reddit',
      }
    ];
  } else {
    // Generic business trends
    return [
      {
        title: "What's working for small business marketing in 2023?",
        summary: "I run a local service business and I'm tired of throwing money at marketing strategies that don't work. For those who are seeing good ROI, what channels and approaches are actually driving results for you this year?",
        url: "https://www.reddit.com/r/smallbusiness/comments/example1",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 3),
        score: 145,
        source: "r/smallbusiness",
        categories: ["smallbusiness", "reddit"],
        sourceType: 'reddit',
      },
      {
        title: "Content marketing vs. paid ads for B2B SaaS - Our 12-month data",
        summary: "We've been tracking our marketing performance meticulously for the past year, and I wanted to share our findings comparing content marketing vs paid ads for our B2B SaaS product. Here's the data on CAC, LTV, and conversion rates across both channels...",
        url: "https://www.reddit.com/r/marketing/comments/example2",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 18),
        score: 278,
        source: "r/marketing",
        categories: ["marketing", "reddit"],
        sourceType: 'reddit',
      },
      {
        title: "The TikTok strategy that 5x'd our e-commerce conversions",
        summary: "After struggling to gain traction on Instagram and Facebook, we decided to go all-in on TikTok for our niche e-commerce brand. In just 3 months, we've seen a 5x increase in conversions and a 70% reduction in CAC. Here's exactly what we did and how you can replicate our approach...",
        url: "https://www.reddit.com/r/Entrepreneur/comments/example3",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 32),
        score: 412,
        source: "r/Entrepreneur",
        categories: ["Entrepreneur", "reddit"],
        sourceType: 'reddit',
      },
      {
        title: "AI tools are changing small business operations faster than you think",
        summary: "As a small business consultant, I'm seeing AI adoption happening at an incredible pace among even the most traditional small businesses. From local retail shops using AI for inventory forecasting to service businesses using it for customer communications, the shift is happening now, not in some distant future.",
        url: "https://www.reddit.com/r/smallbusiness/comments/example4",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 45),
        score: 189,
        source: "r/smallbusiness",
        categories: ["smallbusiness", "reddit"],
        sourceType: 'reddit',
      },
      {
        title: "How we reduced customer acquisition costs by 62% using this audience targeting strategy",
        summary: "After months of rising ad costs and declining ROAS, we completely reimagined our audience targeting strategy and saw dramatic improvements. Instead of broad demographic targeting, we built detailed psychographic profiles based on existing customer research and created highly specific content funnels for each segment.",
        url: "https://www.reddit.com/r/marketing/comments/example5",
        pubDate: new Date(now.getTime() - 1000 * 60 * 60 * 64),
        score: 237,
        source: "r/marketing",
        categories: ["marketing", "reddit"],
        sourceType: 'reddit',
      }
    ];
  }
} 
/**
 * Content Type Detection
 * 
 * Utilities to analyze research data and suggest appropriate content types and platforms
 * based on the content of the research and the target audience.
 */

type ContentTypeRecommendation = {
  contentType: string;
  platform: string;
  confidence: number; // 0-100
  reasoning: string;
};

// Pattern matching for different content types
const CONTENT_PATTERNS: Record<string, string[]> = {
  'social-media': [
    'engagement', 'followers', 'likes', 'shares', 'comments', 'viral', 
    'short-form', 'hashtag', 'Instagram', 'Facebook', 'Twitter', 'X', 
    'LinkedIn', 'TikTok', 'post', 'social'
  ],
  'blog-post': [
    'long-form', 'article', 'blog', 'in-depth', 'comprehensive', 'detailed', 
    'SEO', 'search ranking', 'keywords', 'backlinks', 'content marketing',
    'website', 'company blog', 'Medium', 'WordPress'
  ],
  'email': [
    'newsletter', 'open rate', 'click-through', 'subject line', 'email marketing',
    'customer retention', 'lead nurturing', 'mailing list', 'subscribers',
    'inbox', 'campaign', 'drip campaign', 'welcome email', 'CRM'
  ],
  'video-script': [
    'video content', 'script', 'storyboard', 'shot list',
    'visual content', 'voiceover', 'explainer video', 'product demo',
    'tutorial', 'video marketing', 'viewers', 'watch time'
  ],
  'youtube-script': [
    'YouTube', 'video', 'channel', 'viewers', 'subscribers', 'comments',
    'algorithm', 'thumbnail', 'watch time', 'YouTube SEO', 'video length',
    'end screen', 'cards', 'monetization', 'views', 'video description', 
    'YouTube Studio', 'playlists'
  ],
  'vlog-script': [
    'vlog', 'daily vlog', 'video diary', 'vlogger', 'vlogging',
    'lifestyle content', 'behind the scenes', 'day in the life',
    'travel vlog', 'vlog camera', 'vlog setup', 'vlog editing',
    'talking to camera', 'documentary style', 'personal content'
  ]
};

// Platform patterns for specific recommendations
const PLATFORM_PATTERNS: Record<string, string[]> = {
  'facebook': ['Facebook', 'FB', 'Meta', 'feed', 'groups', 'events', 'community', 'older demographics'],
  'instagram': ['Instagram', 'IG', 'visual', 'photos', 'carousel', 'stories', 'reels', 'filters', 'lifestyle'],
  'linkedin': ['LinkedIn', 'professional', 'B2B', 'business', 'corporate', 'thought leadership', 'recruitment'],
  'twitter': ['Twitter', 'X', 'tweets', 'threads', 'news', 'trends', 'real-time', 'short updates'],
  'tiktok': ['TikTok', 'short video', 'trends', 'challenges', 'younger audience', 'Gen Z'],
  'youtube': ['YouTube', 'videos', 'channel', 'subscribe', 'video content', 'tutorials', 'YouTube Studio', 
              'watch time', 'algorithm', 'monetization', 'views', 'comments', 'likes', 'subscribers'],
  'company-blog': ['website', 'blog', 'company blog', 'corporate site', 'branded content'],
  'medium': ['Medium', 'publication', 'thought leadership', 'republishing'],
  'wordpress': ['WordPress', 'CMS', 'blog platform', 'website content'],
};

// Audience patterns to help detect the best content type
const AUDIENCE_PATTERNS: Record<string, string[]> = {
  'professionals': ['LinkedIn', 'email', 'white papers', 'case studies', 'professional', 'B2B'],
  'consumers': ['Instagram', 'Facebook', 'TikTok', 'B2C', 'lifestyle', 'product-focused'],
  'technical': ['blog posts', 'YouTube tutorials', 'in-depth content', 'documentation', 'guides'],
  'creative': ['visual platforms', 'Instagram', 'TikTok', 'design', 'creativity', 'inspiration'],
  'youth': ['TikTok', 'Instagram', 'short videos', 'trends', 'Gen Z', 'younger audience'],
  'senior': ['Facebook', 'email', 'longer content', 'traditional', 'older demographics']
};

/**
 * Analyzes research data to suggest appropriate content types and platforms
 */
export function analyzeResearchData(
  researchData: string, 
  audience: string
): ContentTypeRecommendation[] {
  if (!researchData || typeof researchData !== 'string') {
    return getDefaultRecommendations(audience);
  }

  const recommendations: ContentTypeRecommendation[] = [];
  const researchText = researchData.toLowerCase();
  
  // Calculate scores for each content type
  for (const [contentType, patterns] of Object.entries(CONTENT_PATTERNS)) {
    let contentScore = 0;
    let matchedTerms: string[] = [];
    
    patterns.forEach(pattern => {
      const regex = new RegExp(`\\b${pattern.toLowerCase()}\\b`, 'gi');
      const matches = (researchText.match(regex) || []).length;
      
      if (matches > 0) {
        contentScore += matches;
        matchedTerms.push(pattern);
      }
    });
    
    // Calculate platform scores for this content type
    const platformScores: Record<string, number> = {};
    const platformMatchedTerms: Record<string, string[]> = {};
    
    // Get platforms associated with this content type
    const relevantPlatforms = getPlatformsForContentType(contentType);
    
    // Score each relevant platform
    relevantPlatforms.forEach(platform => {
      platformScores[platform] = 0;
      platformMatchedTerms[platform] = [];
      
      if (PLATFORM_PATTERNS[platform]) {
        PLATFORM_PATTERNS[platform].forEach(pattern => {
          const regex = new RegExp(`\\b${pattern.toLowerCase()}\\b`, 'gi');
          const matches = (researchText.match(regex) || []).length;
          
          if (matches > 0) {
            platformScores[platform] += matches;
            platformMatchedTerms[platform].push(pattern);
          }
        });
      }
    });
    
    // Audience influence on scores
    Object.entries(AUDIENCE_PATTERNS).forEach(([audienceType, audiencePatterns]) => {
      if (audience.toLowerCase().includes(audienceType.toLowerCase())) {
        audiencePatterns.forEach(pattern => {
          // If audience pattern matches a platform pattern, boost that platform
          Object.entries(PLATFORM_PATTERNS).forEach(([platform, platformTerms]) => {
            if (platformTerms.some(term => term.toLowerCase() === pattern.toLowerCase())) {
              if (relevantPlatforms.includes(platform)) {
                platformScores[platform] += 2;
              }
            }
          });
          
          // If audience pattern matches a content type pattern, boost that content type
          if (CONTENT_PATTERNS[contentType].some(term => term.toLowerCase() === pattern.toLowerCase())) {
            contentScore += 2;
          }
        });
      }
    });
    
    // Skip content types with no matches
    if (contentScore === 0) continue;
    
    // Find best platform for this content type
    let bestPlatform = '';
    let bestPlatformScore = -1;
    
    for (const [platform, score] of Object.entries(platformScores)) {
      if (score > bestPlatformScore) {
        bestPlatformScore = score;
        bestPlatform = platform;
      }
    }
    
    // If no strong platform match, use default for this content type
    if (bestPlatformScore === 0) {
      bestPlatform = getDefaultPlatform(contentType);
    }
    
    // Calculate confidence (0-100)
    // Base confidence on number of term matches and their variety
    const maxPossibleMatches = Math.min(patterns.length, 10); // Cap to avoid overly high scores
    const matchVariety = new Set(matchedTerms).size; 
    const confidence = Math.min(100, Math.round((contentScore + matchVariety * 2) / maxPossibleMatches * 50));
    
    // Create reasoning text
    const reasoning = matchedTerms.length > 0 
      ? `Your research mentions ${matchedTerms.slice(0, 3).join(', ')}${matchedTerms.length > 3 ? '...' : ''} which suggests ${contentType.replace('-', ' ')} would be effective.`
      : `Based on your target audience, ${contentType.replace('-', ' ')} content typically performs well.`;
    
    recommendations.push({
      contentType,
      platform: bestPlatform,
      confidence,
      reasoning
    });
  }
  
  // Sort by confidence score descending
  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3); // Return top 3 recommendations
}

/**
 * Get default recommendations when research data is not available
 */
function getDefaultRecommendations(audience: string): ContentTypeRecommendation[] {
  return [
    {
      contentType: 'social-media',
      platform: 'linkedin',
      confidence: 60,
      reasoning: 'Social media is a versatile starting point for most content strategies.'
    },
    {
      contentType: 'blog-post',  
      platform: 'company-blog',
      confidence: 55,
      reasoning: 'Blog posts provide room for detailed content that can be repurposed for other channels.'
    },
    {
      contentType: 'email',
      platform: 'newsletter',
      confidence: 50,
      reasoning: 'Email marketing typically has the highest ROI of all digital marketing channels.'
    }
  ];
}

/**
 * Get relevant platforms for a content type
 */
function getPlatformsForContentType(contentType: string): string[] {
  switch (contentType) {
    case 'social-media':
      return ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'];
    case 'blog-post':
      return ['company-blog', 'medium', 'wordpress'];
    case 'email':
      return ['newsletter', 'marketing', 'sales', 'welcome'];
    case 'video-script':
      return ['youtube', 'explainer', 'advertisement', 'tutorial', 'product-demo'];
    case 'youtube-script':
      return ['youtube', 'education', 'entertainment', 'how-to', 'review'];
    case 'vlog-script':
      return ['youtube', 'lifestyle', 'travel', 'daily', 'behind-the-scenes'];
    default:
      return [];
  }
}

/**
 * Get default platform for a content type
 */
function getDefaultPlatform(contentType: string): string {
  switch (contentType) {
    case 'social-media':
      return 'linkedin';
    case 'blog-post':
      return 'company-blog';
    case 'email':
      return 'newsletter';
    case 'video-script':
      return 'youtube';
    case 'youtube-script':
      return 'youtube';
    case 'vlog-script':
      return 'youtube';
    default:
      return '';
  }
} 
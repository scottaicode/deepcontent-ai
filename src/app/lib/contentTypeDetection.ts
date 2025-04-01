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

// Export standard mappings for use throughout the application
export const platformToContentType: Record<string, string> = {
  'blog': 'blog-post',
  'social': 'social-media',
  'email': 'email',
  'youtube': 'youtube-script',
  'video-script': 'video-script',
  'vlog': 'vlog-script',
  'podcast': 'podcast-script',
  'presentation': 'presentation',
  'google-ads': 'google-ads',
  'research-report': 'research-report'
};

// Export standard sub-platform to content type mapping
export const subPlatformToContentType: Record<string, string> = {
  // Blog subplatforms
  'medium': 'blog-post',
  'wordpress': 'blog-post',
  'company-blog': 'blog-post',
  
  // Social subplatforms
  'facebook': 'social-media',
  'instagram': 'social-media',
  'twitter': 'social-media',
  'linkedin': 'social-media',
  'tiktok': 'social-media',
  
  // Email subplatforms
  'newsletter': 'email',
  'marketing': 'email',
  'sales': 'email',
  'welcome': 'email',
  
  // Video script subplatforms
  'explainer': 'video-script',
  'advertisement': 'video-script',
  'tutorial': 'video-script',
  'product-demo': 'video-script',
  
  // YouTube subplatforms
  'educational': 'youtube-script',
  'entertainment': 'youtube-script',
  'review': 'youtube-script',
  'vlog-style': 'youtube-script',
  'travel': 'youtube-script',
  'daily': 'youtube-script',
  'tutorial-vlog': 'youtube-script',
  
  // Podcast subplatforms
  'interview': 'podcast-script',
  'solo': 'podcast-script',
  'panel': 'podcast-script',
  
  // Presentation subplatforms
  'business': 'presentation',
  'executive': 'presentation',
  'sales-presentation': 'presentation',
  'training': 'presentation',
  'investor': 'presentation',
  
  // Google Ads subplatforms
  'search-ads': 'google-ads',
  'display-ads': 'google-ads',
  'video-ads': 'google-ads',
  'shopping-ads': 'google-ads',
  
  // Research Report subplatforms
  'market-analysis': 'research-report',
  'competitor-analysis': 'research-report',
  'industry-trends': 'research-report',
  'consumer-insights': 'research-report'
};

// Define standard content type display names for all languages
export const contentTypeDisplayNames: Record<string, { en: string; es: string }> = {
  'blog-post': { en: 'Blog Post', es: 'Entrada de Blog' },
  'social-media': { en: 'Social Media Post', es: 'Publicación de Redes Sociales' },
  'social-post': { en: 'Social Media Post', es: 'Publicación de Redes Sociales' },
  'email': { en: 'Email', es: 'Correo Electrónico' },
  'youtube-script': { en: 'YouTube Script', es: 'Guión de YouTube' },
  'video-script': { en: 'Video Script', es: 'Guión de Video' },
  'vlog-script': { en: 'Vlog Script', es: 'Guión de Vlog' },
  'podcast-script': { en: 'Podcast Script', es: 'Guión de Podcast' },
  'presentation': { en: 'Presentation', es: 'Presentación' },
  'google-ads': { en: 'Google Ads', es: 'Anuncios de Google' },
  'research-report': { en: 'Research Report', es: 'Informe de Investigación' },
  'company-blog': { en: 'Company Blog', es: 'Blog de la Compañía' }
};

// Define standard platform display names for all languages
export const platformDisplayNames: Record<string, { en: string; es: string }> = {
  'blog': { en: 'Blog', es: 'Blog' },
  'social': { en: 'Social Media', es: 'Redes Sociales' },
  'email': { en: 'Email', es: 'Correo Electrónico' },
  'youtube': { en: 'YouTube', es: 'YouTube' },
  'video-script': { en: 'Video', es: 'Video' },
  'vlog': { en: 'Vlog', es: 'Vlog' },
  'podcast': { en: 'Podcast', es: 'Podcast' },
  'presentation': { en: 'Presentation', es: 'Presentación' },
  'google-ads': { en: 'Google Ads', es: 'Anuncios de Google' },
  'research-report': { en: 'Research', es: 'Investigación' },
  'company-blog': { en: 'Company Blog', es: 'Blog de la Compañía' },
  'medium': { en: 'Medium', es: 'Medium' },
  'wordpress': { en: 'WordPress', es: 'WordPress' },
  'facebook': { en: 'Facebook', es: 'Facebook' },
  'instagram': { en: 'Instagram', es: 'Instagram' },
  'twitter': { en: 'Twitter', es: 'Twitter' },
  'linkedin': { en: 'LinkedIn', es: 'LinkedIn' },
  'tiktok': { en: 'TikTok', es: 'TikTok' },
  'newsletter': { en: 'Newsletter', es: 'Boletín' },
  'marketing': { en: 'Marketing Email', es: 'Correo de Marketing' },
  'sales': { en: 'Sales Email', es: 'Correo de Ventas' },
  'welcome': { en: 'Welcome Email', es: 'Correo de Bienvenida' },
  'explainer': { en: 'Explainer Video', es: 'Video Explicativo' },
  'advertisement': { en: 'Advertisement', es: 'Anuncio' },
  'tutorial': { en: 'Tutorial', es: 'Tutorial' },
  'product-demo': { en: 'Product Demo', es: 'Demostración de Producto' },
  'educational': { en: 'Educational', es: 'Educativo' },
  'entertainment': { en: 'Entertainment', es: 'Entretenimiento' },
  'review': { en: 'Review', es: 'Reseña' },
  'vlog-style': { en: 'Vlog Style', es: 'Estilo Vlog' },
  'travel': { en: 'Travel Vlog', es: 'Vlog de Viajes' },
  'daily': { en: 'Daily Vlog', es: 'Vlog Diario' },
  'tutorial-vlog': { en: 'Tutorial Vlog', es: 'Vlog Tutorial' },
  'interview': { en: 'Interview', es: 'Entrevista' },
  'solo': { en: 'Solo Episode', es: 'Episodio Solo' },
  'panel': { en: 'Panel Discussion', es: 'Panel de Discusión' },
  'business': { en: 'Business Presentation', es: 'Presentación de Negocios' },
  'executive': { en: 'Executive Summary', es: 'Resumen Ejecutivo' },
  'sales-presentation': { en: 'Sales Presentation', es: 'Presentación de Ventas' },
  'training': { en: 'Training Material', es: 'Material de Capacitación' },
  'investor': { en: 'Investor Pitch', es: 'Presentación para Inversores' },
  'search-ads': { en: 'Search Ads', es: 'Anuncios de Búsqueda' },
  'display-ads': { en: 'Display Ads', es: 'Anuncios de Display' },
  'video-ads': { en: 'Video Ads', es: 'Anuncios de Video' },
  'shopping-ads': { en: 'Shopping Ads', es: 'Anuncios de Compras' },
  'market-analysis': { en: 'Market Analysis', es: 'Análisis de Mercado' },
  'competitor-analysis': { en: 'Competitor Analysis', es: 'Análisis de Competencia' },
  'industry-trends': { en: 'Industry Trends', es: 'Tendencias de la Industria' },
  'consumer-insights': { en: 'Consumer Insights', es: 'Insights del Consumidor' }
};

/**
 * Helper function to get display names consistently throughout the application
 */
export function getDisplayNames(
  contentType: string,
  platform: string,
  subPlatform: string = '',
  currentLanguage: string = 'en'
): { displayContentType: string, displayPlatform: string } {
  const lang = currentLanguage === 'es' ? 'es' : 'en';
  
  // Determine content type display name
  let contentTypeKey = '';
  
  if (subPlatform === 'medium' || subPlatform === 'wordpress' || platform === 'medium') {
    contentTypeKey = 'blog-post';
  } else if (platform === 'company-blog' || subPlatform === 'company-blog') {
    contentTypeKey = 'blog-post';
  } else if (['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'].includes(subPlatform)) {
    contentTypeKey = 'social-media';
  } else if (platform === 'presentation' || ['business', 'executive', 'sales-presentation', 'training', 'investor'].includes(subPlatform)) {
    contentTypeKey = 'presentation';
  } else if (['newsletter', 'marketing', 'sales', 'welcome'].includes(subPlatform) || platform === 'email') {
    contentTypeKey = 'email';
  } else if (subPlatform) {
    contentTypeKey = subPlatformToContentType[subPlatform] || platformToContentType[platform] || contentType || 'social-media';
  } else {
    contentTypeKey = platformToContentType[platform] || contentType || 'social-media';
  }
  
  // Get content type display name
  let displayContentType = contentTypeDisplayNames[contentTypeKey] 
    ? contentTypeDisplayNames[contentTypeKey][lang]
    : (contentTypeKey.charAt(0).toUpperCase() + contentTypeKey.slice(1).replace(/-/g, ' '));
  
  // Determine platform display name
  let platformKey = subPlatform || platform;
  
  // Get platform display name
  let displayPlatform = platformDisplayNames[platformKey]
    ? platformDisplayNames[platformKey][lang]
    : (platformKey.charAt(0).toUpperCase() + platformKey.slice(1).replace(/-/g, ' '));
  
  return { displayContentType, displayPlatform };
}

/**
 * Analyze text content to determine if it already has a call-to-action
 * This helps avoid adding redundant CTAs when regenerating content
 */
export function analyzeTextForCTA(text: string): boolean {
  if (!text) return false;
  
  // Common CTA phrases to check for
  const ctaPhrases = [
    'call us',
    'contact us',
    'get in touch',
    'sign up',
    'subscribe',
    'register',
    'book now',
    'try it',
    'buy now',
    'learn more',
    'find out more',
    'read more',
    'click here',
    'visit our',
    'follow us',
    'share this',
    'like and share',
    'leave a comment',
    'comment below',
    'download now',
    'get started',
    'join now',
    'apply now',
    'contact me',
    'email us',
    'dm us',
    'message us',
    'call today',
    'schedule a',
    'book a',
    'reserve your',
    'start your',
    'begin your',
    'check out',
    'don\'t miss',
    'don\'t wait',
    'limited time',
    'act now',
    'hurry',
    'while supplies last'
  ];
  
  // Look for questions that seem to be engaging the reader to take action
  const ctaQuestionPatterns = [
    /what are you waiting for\?/i,
    /ready to get started\?/i,
    /interested in learning more\?/i,
    /want to learn more\?/i,
    /why not give it a try\?/i,
    /have questions\?/i
  ];
  
  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Check for any CTA phrase
  if (ctaPhrases.some(phrase => lowerText.includes(phrase.toLowerCase()))) {
    return true;
  }
  
  // Check for CTA question patterns
  if (ctaQuestionPatterns.some(pattern => pattern.test(text))) {
    return true;
  }
  
  return false;
}

// Function to get content type from platform with backwards compatibility
export function getContentTypeFromPlatform(platform: string): string {
  // Add backwards compatibility for removed direct platform mappings
  if (platform === 'company-blog' || platform === 'medium' || platform === 'wordpress') {
    return 'blog-post';
  }
  
  return platformToContentType[platform] || 'article';
} 
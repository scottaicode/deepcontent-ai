import { NextRequest, NextResponse } from 'next/server';
import cheerio from 'cheerio';

// Disable caching to ensure fresh data
export const dynamic = 'force-dynamic';

// Set a timeout for the API call
export const maxDuration = 30; // 30 seconds

// Allow larger response size for website content
export const fetchCache = 'force-no-store';

// Detect if we're running on Vercel
const isVercel = process.env.VERCEL === '1';

interface ScrapingRequest {
  url: string;
  context?: {
    topic?: string;
    platform?: string;
    subPlatform?: string;
    targetAudience?: string;
    audienceNeeds?: string;
  };
}

// Simplified ExtractedData structure as ScrapingBee returns full HTML
interface ExtractedData {
  title?: string;
  metaDescription?: string;
  headings?: string[];
  paragraphs?: string[];
  fullText?: string; // Can potentially extract this with cheerio
  // Specific sections like about/contact/product/pricing might need smarter cheerio logic
  subpagesScraped?: string[];
}

// Define keywords for priority link finding based on context
const CONTEXT_KEYWORDS: Record<string, string[]> = {
  product: ['product', 'shop', 'store', 'item', 'collection', 'catalog', 'merch'],
  service: ['service', 'offering', 'solution', 'capability', 'platform'],
  pricing: ['price', 'pricing', 'plan', 'cost', 'subscribe', 'buy'],
  about: ['about', 'company', 'story', 'mission', 'team', 'who-we-are'],
  contact: ['contact', 'support', 'help', 'reach', 'connect'],
  blog: ['blog', 'article', 'news', 'update', 'insight'],
};

// Function to get context keywords based on request context
function getPriorityKeywords(context?: ScrapingRequest['context']): string[] {
  const keywords = new Set<string>();
  // Always include basic priorities
  for (const k of CONTEXT_KEYWORDS.about) { keywords.add(k); }
  for (const k of CONTEXT_KEYWORDS.contact) { keywords.add(k); }

  if (!context) return Array.from(keywords);

  const topicLower = (context.topic || '').toLowerCase();
  const platformLower = (context.platform || '').toLowerCase();
  const subPlatformLower = (context.subPlatform || '').toLowerCase();
  const audienceNeedsLower = (context.audienceNeeds || '').toLowerCase();

  if (topicLower.includes('product') || topicLower.includes('item') || topicLower.includes('shop')) {
    CONTEXT_KEYWORDS.product.forEach(k => keywords.add(k));
    CONTEXT_KEYWORDS.pricing.forEach(k => keywords.add(k));
  }
  if (topicLower.includes('service') || topicLower.includes('solution')) {
    CONTEXT_KEYWORDS.service.forEach(k => keywords.add(k));
    CONTEXT_KEYWORDS.pricing.forEach(k => keywords.add(k));
  }
  if (platformLower.includes('blog') || subPlatformLower.includes('blog')) {
    CONTEXT_KEYWORDS.blog.forEach(k => keywords.add(k));
  }
  if (audienceNeedsLower.includes('price') || audienceNeedsLower.includes('cost')) {
    CONTEXT_KEYWORDS.pricing.forEach(k => keywords.add(k));
  }

  console.log('[DIAG] Priority Keywords based on context:', Array.from(keywords));
  return Array.from(keywords);
}

// Function to extract content using ScrapingBee API (modified for multi-page)
async function extractWithScrapingBee(url: string, context?: ScrapingRequest['context']): Promise<{ success: boolean, url: string, data?: ExtractedData, error?: string }> {
  console.log(`Starting multi-page website scraping for ${url} using ScrapingBee`);
  
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) {
    console.error('ScrapingBee API key not configured.');
    return { success: false, url, error: 'Scraping service API key not configured.' };
  }

  const scrapingBeeUrl = 'https://app.scrapingbee.com/api/v1/';
  const fetchPage = async (targetUrl: string): Promise<string | null> => {
    console.log(`[ScrapingBee] Fetching: ${targetUrl}`);
    const params = new URLSearchParams({ api_key: apiKey, url: targetUrl, render_js: 'true' });
    try {
      const response = await fetch(`${scrapingBeeUrl}?${params.toString()}`);
      if (!response.ok) {
        console.warn(`[ScrapingBee] API error for ${targetUrl}: ${response.status} ${response.statusText}`);
        return null; // Return null on error, don't fail the whole process
      }
      const html = await response.text();
      console.log(`[ScrapingBee] Received HTML for ${targetUrl}, length: ${html.length}`);
      return html;
    } catch (fetchError) {
      console.warn(`[ScrapingBee] Network error fetching ${targetUrl}:`, fetchError);
      return null;
    }
  };

  try {
    // 1. Fetch Homepage
    const homepageHtml = await fetchPage(url);
    if (!homepageHtml) {
      throw new Error('Failed to fetch homepage content from ScrapingBee.');
    }

    const $ = cheerio.load(homepageHtml);
    const baseDomain = new URL(url).hostname;
    let combinedHtml = homepageHtml;
    const scrapedPages = [url];

    // 2. Extract & Prioritize Links
    const internalLinks = new Map<string, number>(); // url -> score
    const priorityKeywords = getPriorityKeywords(context);
    
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, url).toString().split('#')[0].split('?')[0]; // Normalize
        if (new URL(absoluteUrl).hostname === baseDomain && absoluteUrl !== url) {
          let score = 1; // Base score for internal link
          const linkText = $(el).text().toLowerCase();
          const urlLower = absoluteUrl.toLowerCase();

          // Score based on keywords
          priorityKeywords.forEach(keyword => {
            if (urlLower.includes(keyword) || linkText.includes(keyword)) {
              score += 5; // Higher score for keyword match
            }
          });

          // Prioritize shorter paths
          const pathSegments = new URL(absoluteUrl).pathname.split('/').filter(Boolean).length;
          score -= pathSegments * 0.5;
          
          internalLinks.set(absoluteUrl, Math.max(1, score + (internalLinks.get(absoluteUrl) || 0))); // Add score, ensure minimum 1
        }
      } catch (e) { /* Ignore invalid URLs */ }
    });

    // 3. Select Top 2 Priority Links
    const sortedLinks = Array.from(internalLinks.entries()).sort((a, b) => b[1] - a[1]);
    const linksToFetch = sortedLinks.slice(0, 2).map(entry => entry[0]);
    console.log(`[DIAG] Top 2 links selected for fetching: ${linksToFetch.join(', ')}`);

    // 4. Fetch Priority Pages Concurrently
    if (linksToFetch.length > 0) {
      const additionalHtmlPromises = linksToFetch.map(link => fetchPage(link));
      const additionalHtmlResults = await Promise.all(additionalHtmlPromises);
      
      additionalHtmlResults.forEach((html, index) => {
        if (html) {
          combinedHtml += `\n\n<!-- Page: ${linksToFetch[index]} -->\n\n${html}`;
          scrapedPages.push(linksToFetch[index]);
        }
      });
    }

    // 5. Parse Combined Content
    const combined$ = cheerio.load(combinedHtml);
    const title = combined$('title').first().text() || undefined;
    const metaDescription = combined$('meta[name="description"]').attr('content') || undefined;
    const headings = combined$('h1, h2, h3').map((i: number, el: cheerio.Element) => combined$(el).text().trim()).get().filter(Boolean);
    const paragraphs = combined$('p').map((i: number, el: cheerio.Element) => combined$(el).text().trim()).get().filter((p: string) => p.length > 20);
    const fullText = combined$('body').text().replace(/\s+/g, ' ').trim();

    const extractedData: ExtractedData = {
      title,
      metaDescription,
      headings: headings.length > 0 ? [...new Set(headings)] : undefined, // Deduplicate
      paragraphs: paragraphs.length > 0 ? [...new Set(paragraphs)] : undefined, // Deduplicate
      fullText: fullText.length > 100 ? fullText.substring(0, 10000) : undefined, // Increase limit
      subpagesScraped: scrapedPages // Include list of scraped pages
    };

    return {
      success: true,
      url,
      data: extractedData
    };

  } catch (error: any) {
    console.error(`Error scraping ${url} with ScrapingBee (multi-page):`, error);
    return {
      success: false,
      url,
      error: error.message || 'Unknown error occurred during multi-page scraping'
    };
  }
}

// Placeholder/Simplified optimize function - adjust as needed
function optimizeForResearch(extractedData: ExtractedData, url: string): any {
  const domain = new URL(url).hostname;
  return {
    metadata: {
      source: url,
      domain: domain,
      title: extractedData.title || domain,
      description: extractedData.metaDescription || 'No meta description found.',
      extractionDate: new Date().toISOString(),
      pagesScraped: extractedData.subpagesScraped?.length || 1, // Use count from data
    },
    contentSummary: {
      totalHeadings: extractedData.headings?.length || 0,
      totalParagraphs: extractedData.paragraphs?.length || 0,
      scrapedPages: extractedData.subpagesScraped || [url], // Use list from data
    },
    structuredContent: {
       mainContent: extractedData.paragraphs || [], // Use paragraphs as main content
       fullTextPreview: extractedData.fullText?.substring(0, 2000) // Include preview if available
    }
    // Add back keyTopics, semanticEntities extraction if needed (using cheerio or another library)
  };
}

// --- REMOVED OLD FUNCTIONS: extractWebsiteContent, extractDataFromPage, collectLinks, mergeExtractedData, extractWithFallback ---

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`Scraping API called at ${new Date().toISOString()} (using ScrapingBee Multi-Page)`);
  
  try {
    const body = await request.json() as ScrapingRequest;
    
    if (!body.url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }
    
    // Validate/Normalize URL
    try {
      if (!body.url.startsWith('http')) {
         body.url = 'https://' + body.url;
      }
      new URL(body.url);
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
    }
    
    console.log(`Processing scrape request for: ${body.url} via ScrapingBee (Context: ${JSON.stringify(body.context || {})})`);

    // Call the multi-page ScrapingBee extraction function, passing context
    const result = await extractWithScrapingBee(body.url, body.context);

    const executionTime = Date.now() - startTime;
    console.log(`ScrapingBee execution completed in ${executionTime}ms`);

    if (result.success && result.data) {
      const researchOptimizedData = optimizeForResearch(result.data, body.url);
      return NextResponse.json({
        success: true,
        data: result.data, // Return basic extracted data
        researchOptimized: researchOptimizedData,
        executionTime: `${executionTime}ms`,
        environment: isVercel ? 'vercel' : 'local'
      });
    } else {
      console.error('Scraping failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Scraping failed for unknown reason.',
          executionTime: `${executionTime}ms`,
          environment: isVercel ? 'vercel' : 'local'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error('Error in scrape-website API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        details: error.stack || '',
        environment: isVercel ? 'vercel' : 'local',
        executionTime: `${executionTime}ms`
      },
      { status: 500 }
    );
  } 
}
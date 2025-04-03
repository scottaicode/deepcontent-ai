import { NextRequest, NextResponse } from 'next/server';
// import cheerio from 'cheerio'; // Remove top-level import

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
  // scrapeType and maxDepth are no longer relevant with ScrapingBee
}

// Simplified ExtractedData structure as ScrapingBee returns full HTML
interface ExtractedData {
  title?: string;
  metaDescription?: string;
  headings?: string[];
  paragraphs?: string[];
  fullText?: string; // Can potentially extract this with cheerio
  // Specific sections like about/contact/product/pricing might need smarter cheerio logic
}

// Function to extract content using ScrapingBee API
async function extractWithScrapingBee(url: string): Promise<{ success: boolean, url: string, data?: ExtractedData, error?: string }> {
  console.log(`Starting website scraping for ${url} using ScrapingBee`);
  
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) {
    console.error('ScrapingBee API key not configured.');
    return { success: false, url, error: 'Scraping service API key not configured.' };
  }

  const scrapingBeeUrl = 'https://app.scrapingbee.com/api/v1/';
  const params = new URLSearchParams({
    api_key: apiKey,
    url: url,
    render_js: 'true', // Enable JavaScript rendering
    // block_resources: 'false', // Allow all resources for better rendering (default)
    // premium_proxy: 'true' // Use premium proxies if needed (costs more credits)
  });

  try {
    const response = await fetch(`${scrapingBeeUrl}?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ScrapingBee API error for ${url}: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`ScrapingBee API error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const htmlContent = await response.text();
    console.log(`Received HTML content from ScrapingBee for ${url}, length: ${htmlContent.length}`);

    // Use Cheerio to parse the HTML and extract basic data
    const cheerio = require('cheerio'); // Use require inside the function
    const $ = cheerio.load(htmlContent);
    
    const title = $('title').first().text() || undefined;
    const metaDescription = $('meta[name="description"]').attr('content') || undefined;
    
    const headings = $('h1, h2, h3').map((i: number, el: cheerio.Element) => $(el).text().trim()).get().filter(Boolean);
    const paragraphs = $('p').map((i: number, el: cheerio.Element) => $(el).text().trim()).get().filter((p: string) => p.length > 20); // Basic filter
    const fullText = $('body').text().replace(/\s+/g, ' ').trim(); // Simple full text extraction

    const extractedData: ExtractedData = {
      title,
      metaDescription,
      headings: headings.length > 0 ? headings : undefined,
      paragraphs: paragraphs.length > 0 ? paragraphs : undefined,
      fullText: fullText.length > 100 ? fullText.substring(0, 5000) : undefined, // Limit full text length
    };

    return {
      success: true,
      url,
      data: extractedData
    };

  } catch (error: any) {
    console.error(`Error scraping ${url} with ScrapingBee:`, error);
    return {
      success: false,
      url,
      error: error.message || 'Unknown error occurred during scraping'
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
      pagesScraped: 1, // Only scraped one page with API call
    },
    contentSummary: {
      totalHeadings: extractedData.headings?.length || 0,
      totalParagraphs: extractedData.paragraphs?.length || 0,
      scrapedPages: [url],
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
  console.log(`Scraping API called at ${new Date().toISOString()} (using ScrapingBee)`);
  
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
    
    console.log(`Processing scrape request for: ${body.url} via ScrapingBee`);

    // Call the ScrapingBee extraction function
    const result = await extractWithScrapingBee(body.url);

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
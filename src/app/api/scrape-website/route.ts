import { NextRequest, NextResponse } from 'next/server';
import * as puppeteer from 'puppeteer';

// Disable caching to ensure fresh data
export const dynamic = 'force-dynamic';

// Set a timeout for the scraping operation
export const maxDuration = 60; // 60 seconds (max allowed on hobby plan)

interface ScrapingRequest {
  url: string;
  scrapeType?: 'basic' | 'comprehensive'; // basic by default
  maxDepth?: number; // How many levels deep to crawl
}

interface ExtractedData {
  title?: string;
  metaDescription?: string;
  headings?: string[];
  paragraphs?: string[];
  fullText?: string;
  aboutContent?: string;
  contactInfo?: {
    emails?: string[];
    phones?: string[];
    socialLinks?: string[];
  };
  productInfo?: string;
  pricingInfo?: string;
  subpagesScraped?: string[]; // List of scraped subpages
}

// Priority paths to look for
const PRIORITY_PATHS = [
  '/about', '/about-us', '/company', '/who-we-are',
  '/pricing', '/plans', '/plans-and-pricing', '/products', '/services',
  '/contact', '/contact-us'
];

/**
 * Function to extract content from a webpage
 * Handles both basic and comprehensive scraping modes
 * Now supports following and processing sublinks
 */
async function extractWebsiteContent(url: string, scrapeType: 'basic' | 'comprehensive' = 'basic', maxDepth: number = 2) {
  console.log(`Starting website scraping for ${url} with mode: ${scrapeType}, maxDepth: ${maxDepth}`);
  
  let browser = null;
  try {
    // More robust browser launch options for local development
    const browserOptions = {
      headless: true, // Use boolean value for headless
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
      ignoreHTTPSErrors: true,
    };
    
    console.log('Launching browser with options:', JSON.stringify(browserOptions));
    browser = await puppeteer.launch(browserOptions);
    
    // Extract domain for relative URL resolution
    const baseUrlObj = new URL(url);
    const baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;
    console.log(`Base URL for relative link resolution: ${baseUrl}`);
    
    // Track visited URLs to avoid duplicates
    const visitedUrls = new Set<string>();
    // Track URLs to visit, with their depth
    const urlsToVisit: Array<{url: string, depth: number}> = [{url, depth: 0}];
    // Store extracted data from all pages
    let combinedData: ExtractedData = {
      headings: [],
      paragraphs: [],
      subpagesScraped: []
    };
    
    // Process URLs until queue is empty or max page count reached
    const MAX_PAGES = 10; // Limit total number of pages to scrape
    let pagesScraped = 0;
    
    while (urlsToVisit.length > 0 && pagesScraped < MAX_PAGES) {
      const currentItem = urlsToVisit.shift();
      if (!currentItem) break;
      
      const {url: currentUrl, depth} = currentItem;
      
      // Skip if already visited
      if (visitedUrls.has(currentUrl)) {
        continue;
      }
      
      visitedUrls.add(currentUrl);
      console.log(`Scraping page ${pagesScraped + 1}/${MAX_PAGES}: ${currentUrl} (depth: ${depth})`);
      
      const page = await browser.newPage();
      
      // Set user agent to avoid being blocked
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set a timeout for navigation
      await page.setDefaultNavigationTimeout(30000);
      
      try {
        // More robust navigation approach
        const response = await page.goto(currentUrl, { 
          waitUntil: ['domcontentloaded', 'networkidle2'],
          timeout: 30000 
        });
        
        if (!response) {
          console.log(`Failed to get response from ${currentUrl}, skipping...`);
          await page.close();
          continue;
        }
        
        const status = response.status();
        if (status >= 400) {
          console.log(`Page returned status code ${status} for ${currentUrl}, skipping...`);
          await page.close();
          continue;
        }
        
        console.log(`Successfully loaded ${currentUrl} with status: ${status}`);
        
        // Wait for content to be available
        await page.waitForSelector('body', { timeout: 5000 });
        
        // Extract data from current page
        console.log(`Extracting data from ${currentUrl}...`);
        const pageData = await extractDataFromPage(page, currentUrl);
        
        // Add to subpages scraped list
        if (combinedData.subpagesScraped) {
          combinedData.subpagesScraped.push(currentUrl);
        }
        
        // Merge page data into combined data
        combinedData = mergeExtractedData(combinedData, pageData);
        
        // Only collect links if we haven't reached max depth
        if (depth < maxDepth) {
          const links = await collectLinks(page, baseUrl);
          
          // Add links to queue
          for (const link of links) {
            // Skip if already visited or in queue
            if (visitedUrls.has(link) || urlsToVisit.some(item => item.url === link)) {
              continue;
            }
            
            // Add to queue with increased depth
            urlsToVisit.push({url: link, depth: depth + 1});
          }
          
          // Sort queue by priority paths
          urlsToVisit.sort((a, b) => {
            const aIsPriority = PRIORITY_PATHS.some(path => a.url.includes(path));
            const bIsPriority = PRIORITY_PATHS.some(path => b.url.includes(path));
            
            if (aIsPriority && !bIsPriority) return -1;
            if (!aIsPriority && bIsPriority) return 1;
            return 0;
          });
        }
        
        pagesScraped++;
      } catch (pageError) {
        console.error(`Error processing ${currentUrl}:`, pageError);
      } finally {
        await page.close();
      }
      
      // Add a small delay between requests to avoid overloading the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`Completed scraping ${pagesScraped} pages on ${baseUrl}`);
    
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
    
    // Return empty data arrays instead of undefined
    if (!combinedData.paragraphs) combinedData.paragraphs = [];
    if (!combinedData.headings) combinedData.headings = [];
    
    return {
      success: true,
      url,
      data: combinedData
    };
  } catch (error: any) {
    console.error(`Error scraping ${url}:`, error);
    
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed after error');
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    return {
      success: false,
      url,
      error: error.message || 'Unknown error occurred during scraping'
    };
  }
}

/**
 * Extract data from a specific page
 */
async function extractDataFromPage(page: puppeteer.Page, url: string): Promise<ExtractedData> {
  try {
    // Basic data extraction
    const basicData = await page.evaluate(() => {
      // Extract page title
      const title = document.title || '';
      
      // Extract meta description
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      
      // Function to filter out technical/gibberish content from text
      const cleanupText = (text: string) => {
        if (!text) return '';
        
        // Filter out obvious code snippets and technical content
        if (text.includes('function(') || 
            text.includes('var ') || 
            text.includes('const ') || 
            text.includes('let ') ||
            text.includes('{') && text.includes('}') && text.includes(':') ||
            text.includes('window.') ||
            text.includes('document.') ||
            /U\+[0-9A-F]{4}/i.test(text) || // Unicode references
            /@font-face/i.test(text) ||
            /@keyframes/i.test(text) ||
            /rgba?\([0-9,.\s]+\)/i.test(text) || // CSS colors
            /translate3d/i.test(text) ||
            /transform:/i.test(text) ||
            /webkit-/i.test(text)) {
          return '';
        }
        
        // Remove excessive whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        // If text is just numbers and symbols and longer than 20 chars, likely gibberish
        if (text.length > 20 && /^[0-9\s\.\-\:\/\\\+\=\{\}\[\]\(\)\,\;\"\'\`\~\!\@\#\$\%\^\&\*\_\|]+$/.test(text)) {
          return '';
        }
        
        return text;
      };
      
      // Extract main content text with filtering
      const bodyText = document.body.innerText || '';
      const cleanBodyText = cleanupText(bodyText);
      
      // Extract all headings with filtering
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => cleanupText(h.textContent?.trim() || ''))
        .filter(Boolean) as string[];
      
      // Extract paragraphs from the main content with filtering
      const paragraphs = Array.from(document.querySelectorAll('p, li, .content, article, section, [role="main"] div'))
        .map(p => {
          const text = p.textContent?.trim() || '';
          return cleanupText(text);
        })
        .filter(text => text && text.length > 20) // Filter out very short texts
        .filter(Boolean) as string[];
      
      return {
        title,
        metaDescription,
        headings,
        paragraphs,
        fullText: cleanBodyText.substring(0, 50000) // Limit to 50k chars to avoid massive payloads
      };
    });
    
    // Specialized data extraction - modified to better filter content
    const specializedData = await page.evaluate(() => {
      // Page type detection
      const isAboutPage = (
        document.URL.toLowerCase().includes('/about') ||
        document.title.toLowerCase().includes('about') ||
        Array.from(document.querySelectorAll('h1, h2, h3')).some(el => 
          el.textContent?.toLowerCase().includes('about us') || 
          el.textContent?.toLowerCase().includes('our story')
        )
      );
      
      const isPricingPage = (
        document.URL.toLowerCase().includes('/pricing') ||
        document.URL.toLowerCase().includes('/plans') ||
        document.title.toLowerCase().includes('pricing') ||
        document.title.toLowerCase().includes('plans') ||
        Array.from(document.querySelectorAll('h1, h2, h3')).some(el => 
          el.textContent?.toLowerCase().includes('pricing') || 
          el.textContent?.toLowerCase().includes('plans') ||
          el.textContent?.toLowerCase().includes('subscription')
        )
      );
      
      // Filter for meaningful text content
      const filterCodeAndGibberish = (text: string): string => {
        if (!text) return '';
        
        // Skip JavaScript-looking content
        if (text.includes('function(') || 
            text.includes('var ') || 
            text.includes('window.') ||
            text.includes('document.')) {
          return '';
        }
        
        // Skip CSS-looking content
        if (text.includes('@media') ||
            text.includes('@keyframes') ||
            text.includes('@font-face') ||
            text.includes('animation-timing-function') ||
            text.includes('transform:') ||
            text.includes('-webkit-')) {
          return '';
        }
        
        // Skip font definitions and Unicode ranges
        if (text.includes('unicode-range:') ||
            text.includes('U+') ||
            text.includes('font-stretch:') ||
            text.includes('font-display:')) {
          return '';
        }
        
        // Skip obvious data urls and long technical strings
        if (text.includes('data:image/') ||
            text.includes('rgba(') ||
            (text.length > 100 && text.split(' ').length < 10)) {
          return '';
        }
        
        // Clean spaces and trim
        return text.replace(/\s+/g, ' ').trim();
      };
      
      // Extract "About" information
      const aboutContent = (() => {
        // If this is an About page, get more of the content
        if (isAboutPage) {
          // Find actual content blocks, not just any paragraphs
          const contentElements = Array.from(document.querySelectorAll('article p, main p, .content p, section p, [role="main"] p, .about-content p, #about-content p'));
          
          // If we found specific content, use that
          if (contentElements.length > 0) {
            return contentElements
              .map(el => filterCodeAndGibberish(el.textContent || ''))
              .filter(text => text.length > 20) // Skip very short snippets
              .join(' ');
          }
          
          // Otherwise get all paragraphs
          const mainContent = Array.from(document.querySelectorAll('p'))
            .map(p => filterCodeAndGibberish(p.textContent || ''))
            .filter(text => text.length > 20) // Skip very short snippets
            .join(' ');
          
          return mainContent.substring(0, 1500); // Take more content for about pages
        }
        
        // Otherwise look for "About" sections on this page
        const aboutSections = Array.from(document.querySelectorAll('section, div, article'))
          .filter(el => {
            const id = el.id?.toLowerCase() || '';
            const className = el.className?.toLowerCase() || '';
            return id.includes('about') || className.includes('about');
          });
        
        if (aboutSections.length > 0) {
          return aboutSections
            .map(el => filterCodeAndGibberish(el.textContent || ''))
            .filter(text => text.length > 20) // Skip very short snippets
            .join(' ');
        }
        
        return '';
      })();
      
      // Extract contact information
      const contactInfo = (() => {
        // Look for potential phone numbers using a simple regex
        const phoneRegex = /(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
        const bodyText = document.body.innerText;
        const phones = bodyText.match(phoneRegex) || [];
        
        // Look for email addresses
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = bodyText.match(emailRegex) || [];
        
        // Look for social media links
        const socialLinks = Array.from(document.querySelectorAll('a[href*="facebook"], a[href*="twitter"], a[href*="linkedin"], a[href*="instagram"], a[href*="youtube"]'))
          .map(a => a.getAttribute('href'))
          .filter(Boolean) as string[];
        
        return {
          phones,
          emails,
          socialLinks
        };
      })();
      
      // Extract product information
      const productInfo = (() => {
        // Look for product sections specifically
        const productSections = Array.from(document.querySelectorAll('section[id*="product"], div[id*="product"], article[id*="product"], section[class*="product"], div[class*="product"], section[id*="service"], div[id*="service"]'));
        
        if (productSections.length > 0) {
          return productSections
            .map(el => filterCodeAndGibberish(el.textContent || ''))
            .filter(text => text.length > 20) // Skip very short snippets
            .join('\n\n');
        }
        
        // Fallback to generic product detection
        const possibleProductElements = Array.from(document.querySelectorAll('h2, h3'))
          .filter(el => {
            const text = el.textContent?.toLowerCase() || '';
            return text.includes('product') || text.includes('service') || text.includes('feature');
          })
          .map(el => {
            // Get the heading and the next element or parent container
            const heading = filterCodeAndGibberish(el.textContent || '');
            const nextContent = el.nextElementSibling ? 
              filterCodeAndGibberish(el.nextElementSibling.textContent || '') : '';
            const parentContent = el.parentElement ?
              filterCodeAndGibberish(el.parentElement.textContent || '') : '';
            
            return `${heading}\n${nextContent || parentContent}`;
          })
          .filter(text => text.length > 20); // Skip very short snippets
        
        return possibleProductElements.join('\n\n');
      })();
      
      // Extract pricing information (enhanced for pricing pages)
      const pricingInfo = (() => {
        // Price regex to identify currency values
        const priceRegex = /(?:\$|€|£|USD|EUR|GBP)\s?[0-9]+(?:\.[0-9]{2})?/g;
        
        if (isPricingPage) {
          // First try to find pricing tables or dedicated pricing sections
          const pricingSections = Array.from(document.querySelectorAll('.pricing, #pricing, .plans, #plans, [id*="price"], [class*="price"]'));
          
          if (pricingSections.length > 0) {
            return pricingSections
              .map(section => {
                const text = filterCodeAndGibberish(section.textContent || '');
                
                // Ensure it contains pricing information
                if (priceRegex.test(text)) {
                  return text;
                }
                return '';
              })
              .filter(Boolean)
              .join('\n\n');
          }
          
          // If no pricing sections found, extract any elements with price information
          const elementsWithPrices = Array.from(document.querySelectorAll('*'))
            .filter(el => priceRegex.test(el.textContent || ''))
            .map(el => filterCodeAndGibberish(el.textContent || ''))
            .filter(text => text.length > 10 && text.length < 500); // Reasonable length for price descriptions
          
          return Array.from(new Set(elementsWithPrices)).join('\n\n');
        }
        
        return '';
      })();
      
      return {
        aboutContent,
        contactInfo,
        productInfo,
        pricingInfo
      };
    });
    
    // Combine the data
    return {
      ...basicData,
      ...specializedData
    };
  } catch (error) {
    console.error(`Error extracting data from page: ${url}`, error);
    return {}; // Return empty object on error
  }
}

/**
 * Collect relevant links from the page
 */
async function collectLinks(page: puppeteer.Page, baseUrl: string): Promise<string[]> {
  return page.evaluate((baseUrl: string, PRIORITY_PATHS: string[]) => {
    // Get all links on the page
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    const links = anchors
      .map(a => a.getAttribute('href'))
      .filter(Boolean) as string[];
    
    // Process links to get valid URLs
    return links
      .map(href => {
        try {
          // Handle relative URLs
          if (href.startsWith('/')) {
            return new URL(href, baseUrl).href;
          }
          
          // Ignore anchors, javascript links, and mailto links
          if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return null;
          }
          
          // Create URL object to normalize
          const url = new URL(href, baseUrl);
          
          // Filter out external domains - only keep links from the same domain
          if (url.host !== new URL(baseUrl).host) {
            return null;
          }
          
          // Remove hash and search params for cleaner URLs and better deduplication
          url.hash = '';
          
          return url.href;
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean) as string[];
  }, baseUrl, PRIORITY_PATHS);
}

/**
 * Merge two ExtractedData objects
 */
function mergeExtractedData(base: ExtractedData, addition: ExtractedData): ExtractedData {
  const result = { ...base };
  
  // Use the first non-empty title and meta description
  if (!result.title && addition.title) {
    result.title = addition.title;
  }
  
  if (!result.metaDescription && addition.metaDescription) {
    result.metaDescription = addition.metaDescription;
  }
  
  // Merge arrays
  if (addition.headings?.length) {
    result.headings = [...(result.headings || []), ...addition.headings];
  }
  
  if (addition.paragraphs?.length) {
    result.paragraphs = [...(result.paragraphs || []), ...addition.paragraphs];
  }
  
  // Merge or concatenate text fields
  if (addition.aboutContent) {
    result.aboutContent = result.aboutContent 
      ? `${result.aboutContent}\n\n${addition.aboutContent}`
      : addition.aboutContent;
  }
  
  if (addition.productInfo) {
    result.productInfo = result.productInfo 
      ? `${result.productInfo}\n\n${addition.productInfo}`
      : addition.productInfo;
  }
  
  if (addition.pricingInfo) {
    result.pricingInfo = result.pricingInfo 
      ? `${result.pricingInfo}\n\n${addition.pricingInfo}`
      : addition.pricingInfo;
  }
  
  // Merge contact information
  if (addition.contactInfo) {
    if (!result.contactInfo) {
      result.contactInfo = { emails: [], phones: [], socialLinks: [] };
    }
    
    if (addition.contactInfo.emails?.length) {
      result.contactInfo.emails = [
        ...(result.contactInfo.emails || []),
        ...addition.contactInfo.emails
      ];
    }
    
    if (addition.contactInfo.phones?.length) {
      result.contactInfo.phones = [
        ...(result.contactInfo.phones || []),
        ...addition.contactInfo.phones
      ];
    }
    
    if (addition.contactInfo.socialLinks?.length) {
      result.contactInfo.socialLinks = [
        ...(result.contactInfo.socialLinks || []),
        ...addition.contactInfo.socialLinks
      ];
    }
  }
  
  return result;
}

/**
 * Handler for the website scraping API endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request with defaults
    const body: ScrapingRequest = await request.json();
    
    // Ensure URL is provided and valid
    if (!body.url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Validate URL format
    try {
      new URL(body.url);
    } catch (error) {
      // Attempt to prefix with https:// if missing protocol
      try {
        if (!body.url.startsWith('http')) {
          body.url = 'https://' + body.url;
          new URL(body.url); // Will throw if still invalid
        } else {
          throw error; // Re-throw the original error
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }
    
    // Extract content from website
    console.log(`Processing scrape request for: ${body.url}`);
    const result = await extractWebsiteContent(
      body.url,
      body.scrapeType || 'comprehensive',
      body.maxDepth || 2
    );
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        result,
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in scrape-website API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        details: error.stack
      },
      { status: 500 }
    );
  }
} 
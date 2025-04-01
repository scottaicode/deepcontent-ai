import { NextRequest, NextResponse } from 'next/server';
import { launchBrowser, Browser, BrowserPage } from '@/lib/scraping/browserLauncher';

// Disable caching to ensure fresh data
export const dynamic = 'force-dynamic';

// Set a timeout for the scraping operation
export const maxDuration = 60; // 60 seconds (max allowed on hobby plan)

// Allow larger response size for website content
export const fetchCache = 'force-no-store';

// Detect if we're running on Vercel
const isVercel = process.env.VERCEL === '1';

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
  
  let browser: Browser | null = null;
  try {
    // Launch browser using our cross-platform launcher
    browser = await launchBrowser();
    
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
    // Limit page count more severely on Vercel due to time/memory constraints
    const MAX_PAGES = isVercel ? 3 : 8; 
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
      
      try {
        // More robust navigation approach with tighter timeout on Vercel
        await page.goto(currentUrl, { 
          waitUntil: 'networkidle',
          timeout: isVercel ? 15000 : 30000  // Shorter timeout on Vercel
        });
        
        // Wait for content to be available (shorter timeout)
        await page.waitForSelector('body', { timeout: isVercel ? 3000 : 5000 });
        
        // Extract data from current page
        console.log(`Extracting data from ${currentUrl}...`);
        const pageData = await extractDataFromPage(page, currentUrl);
        
        // Add to subpages scraped list
        if (combinedData.subpagesScraped) {
          combinedData.subpagesScraped.push(currentUrl);
        }
        
        // Merge page data into combined data
        combinedData = mergeExtractedData(combinedData, pageData);
        
        // Only collect links if we haven't reached max depth and are in comprehensive mode
        if (depth < maxDepth && scrapeType === 'comprehensive') {
          const links = await collectLinks(page, baseUrl);
          
          // Add links to queue (limited to 10 links per page on Vercel)
          const maxLinksToAdd = isVercel ? 5 : 15;
          let linksAdded = 0;
          
          for (const link of links) {
            // Skip if already visited or in queue or we've reached max links
            if (visitedUrls.has(link) || 
                urlsToVisit.some(item => item.url === link) || 
                linksAdded >= maxLinksToAdd) {
              continue;
            }
            
            // Add to queue with increased depth
            urlsToVisit.push({url: link, depth: depth + 1});
            linksAdded++;
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
      // Vercel functions have limited execution time, so use a shorter delay
      await new Promise(resolve => setTimeout(resolve, isVercel ? 300 : 500));
    }
    
    console.log(`Completed scraping ${pagesScraped} pages on ${baseUrl}`);
    
    // Return empty arrays instead of undefined
    if (!combinedData.paragraphs) combinedData.paragraphs = [];
    if (!combinedData.headings) combinedData.headings = [];
    
    return {
      success: true,
      url,
      data: combinedData
    };
  } catch (error: any) {
    console.error(`Error scraping ${url}:`, error);
    
    return {
      success: false,
      url,
      error: error.message || 'Unknown error occurred during scraping'
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

/**
 * Extract data from a specific page
 */
async function extractDataFromPage(page: BrowserPage, url: string): Promise<ExtractedData> {
  try {
    console.log(`Extracting data from page: ${url}`);
    
    // First ensure the page is loaded properly
    try {
      const content = await page.content();
      console.log(`Page content length: ${content.length} characters`);
    } catch (contentError) {
      console.error('Error getting page content:', contentError);
    }
    
    // Basic data extraction using a simpler approach with better error handling
    try {
      const basicData = await page.evaluate(function(currentUrl: string) {
        // Extract page title
        const title = document.title || '';
        
        // Extract meta description
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        
        // Function to cleanup text
        function cleanupText(text: string): string {
          if (!text) return '';
          return text.trim();
        }
        
        // Extract headings simply
        const headings: string[] = [];
        document.querySelectorAll('h1, h2, h3').forEach(function(heading) {
          const text = cleanupText(heading.textContent || '');
          if (text && text.length > 0) {
            headings.push(text);
          }
        });
        
        // Extract paragraphs simply
        const paragraphs: string[] = [];
        document.querySelectorAll('p').forEach(function(paragraph) {
          const text = cleanupText(paragraph.textContent || '');
          if (text && text.length > 20) {
            paragraphs.push(text);
          }
        });
        
        return {
          title: title || currentUrl,
          metaDescription,
          headings: headings.length > 0 ? headings : ['Example Domain'],
          paragraphs: paragraphs.length > 0 ? paragraphs : ['This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.'],
          aboutContent: '',
          pricingInfo: '',
          productInfo: '',
          contactInfo: {
            emails: [],
            phones: [],
            socialLinks: []
          }
        };
      }, url);
    
      console.log(`Extracted ${basicData.headings?.length || 0} headings and ${basicData.paragraphs?.length || 0} paragraphs`);
      
      // Now add the specialized data extraction with fixed selectors
      try {
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
            
            // Otherwise look for "About" sections on this page using standard selectors
            // Instead of section:has(h1):contains("About") which is invalid
            const aboutSections = Array.from(document.querySelectorAll('[id*="about"], [class*="about"], [id*="company"], [class*="company"]'));
            
            if (aboutSections.length > 0) {
              return aboutSections
                .map(el => filterCodeAndGibberish(el.textContent || ''))
                .filter(text => text.length > 20) // Skip very short snippets
                .join(' ');
            }
            
            // Additional approach: look for headings about "About us" and get their parent sections
            const aboutHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(el => 
              (el.textContent || '').toLowerCase().includes('about')
            );
            
            if (aboutHeadings.length > 0) {
              return aboutHeadings
                .map(heading => {
                  // Try to get the parent section or div
                  let currentEl: Element | null = heading;
                  while (currentEl && !['SECTION', 'ARTICLE', 'DIV'].includes(currentEl.tagName)) {
                    currentEl = currentEl.parentElement;
                  }
                  
                  // If we found a container, use that, otherwise just use the heading's content
                  return filterCodeAndGibberish((currentEl || heading).textContent || '');
                })
                .filter(text => text.length > 20)
                .join('\n\n');
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
      } catch (specializedError) {
        console.error('Error in specialized data extraction:', specializedError);
        // Return just the basic data if specialized extraction fails
        return basicData;
      }
    } catch (evaluateError) {
      console.error('Error in page.evaluate during data extraction:', evaluateError);
      
      // Return minimal data if we encounter an error with the evaluation
      return {
        title: url,
        headings: [`Content from ${url}`],
        paragraphs: [`Content extraction encountered an error. Please try with a different URL or contact support if the issue persists.`]
      };
    }
  } catch (error) {
    console.error('Error extracting data from page:', error);
    return {
      title: url,
      headings: [`Failed to extract data from ${url}`],
      paragraphs: [`Could not extract content from ${url} due to an error.`]
    };
  }
}

/**
 * Collect all relevant links from a page
 */
async function collectLinks(page: BrowserPage, baseUrl: string): Promise<string[]> {
  try {
    return await page.evaluate((baseUrl: string) => {
      try {
        const links: string[] = [];
        const visitedLinks = new Set<string>();
        
        // Collect all anchor tags - using a safer approach
        document.querySelectorAll('a[href]').forEach(anchor => {
          if (anchor instanceof HTMLAnchorElement) {
            let href = anchor.href;
            
            // Only consider links to the same domain
            if (href && href.startsWith(baseUrl)) {
              // Normalize URL
              href = href.split('#')[0]; // Remove fragment
              href = href.split('?')[0]; // Remove query parameters
              
              // Skip already collected links or invalid URLs
              if (!visitedLinks.has(href) && href.length > 0) {
                visitedLinks.add(href);
                links.push(href);
              }
            }
          }
        });
        
        // Sort links by preference - prioritize shorter, cleaner URLs
        return links.sort((a, b) => {
          // Prefer URLs with fewer segments
          const aSegments = a.split('/').length;
          const bSegments = b.split('/').length;
          
          return aSegments - bSegments;
        }).slice(0, 20); // Only return top 20 links to avoid overloading
      } catch (innerError) {
        console.error('Error collecting links in evaluate:', innerError);
        return []; // Return empty array on error
      }
    }, baseUrl);
  } catch (error) {
    console.error('Error collecting links:', error);
    return [];
  }
}

/**
 * Merge extracted data from multiple pages
 */
function mergeExtractedData(base: ExtractedData, addition: ExtractedData): ExtractedData {
  // Use the first encountered title and meta description (usually the main page)
  const title = base.title || addition.title;
  const metaDescription = base.metaDescription || addition.metaDescription;
  
  // Merge headings and paragraphs, avoiding duplicates
  const headings = [...(base.headings || [])];
  const paragraphs = [...(base.paragraphs || [])];
  
  // Add new headings
  addition.headings?.forEach(heading => {
    if (!headings.includes(heading)) {
      headings.push(heading);
    }
  });
  
  // Add new paragraphs
  addition.paragraphs?.forEach(paragraph => {
    if (!paragraphs.includes(paragraph)) {
      paragraphs.push(paragraph);
    }
  });
  
  // Try to collect the best about content
  let aboutContent = base.aboutContent || '';
  if (addition.aboutContent && (!aboutContent || addition.aboutContent.length > aboutContent.length)) {
    aboutContent = addition.aboutContent;
  }
  
  // Try to collect the best pricing info
  let pricingInfo = base.pricingInfo || '';
  if (addition.pricingInfo && (!pricingInfo || addition.pricingInfo.length > pricingInfo.length)) {
    pricingInfo = addition.pricingInfo;
  }
  
  // Try to collect the best product info
  let productInfo = base.productInfo || '';
  if (addition.productInfo && (!productInfo || addition.productInfo.length > productInfo.length)) {
    productInfo = addition.productInfo;
  }
  
  // Merge contact info
  const contactInfo = {
    emails: [...(base.contactInfo?.emails || [])],
    phones: [...(base.contactInfo?.phones || [])],
    socialLinks: [...(base.contactInfo?.socialLinks || [])]
  };
  
  // Add new emails
  addition.contactInfo?.emails?.forEach(email => {
    if (!contactInfo.emails.includes(email)) {
      contactInfo.emails.push(email);
    }
  });
  
  // Add new phones
  addition.contactInfo?.phones?.forEach(phone => {
    if (!contactInfo.phones.includes(phone)) {
      contactInfo.phones.push(phone);
    }
  });
  
  // Add new social links
  addition.contactInfo?.socialLinks?.forEach(link => {
    if (!contactInfo.socialLinks.includes(link)) {
      contactInfo.socialLinks.push(link);
    }
  });
  
  // Return merged data
  return {
    title,
    metaDescription,
    headings,
    paragraphs,
    aboutContent,
    pricingInfo,
    productInfo,
    contactInfo,
    subpagesScraped: base.subpagesScraped
  };
}

// Basic handling for websites that block scraping
async function extractWithFallback(url: string, maxDepth: number) {
  try {
    // Primary approach - full analysis
    const result = await extractWebsiteContent(url, 'comprehensive', maxDepth);
    if (result.success && result.data && 
       ((result.data.paragraphs && result.data.paragraphs.length > 0) || 
        (result.data.headings && result.data.headings.length > 0))) {
      return result;
    }
    
    // If primary approach didn't yield useful content, try basic approach
    console.log('Primary scraping approach yielded limited content, trying basic approach...');
    return await extractWebsiteContent(url, 'basic', 1);
  } catch (error: any) {
    console.error('Error in primary scraping approach:', error);
    // Try basic approach as fallback
    try {
      console.log('Trying basic fallback scraping...');
      return await extractWebsiteContent(url, 'basic', 1);
    } catch (fallbackError: any) {
      console.error('Error in fallback scraping approach:', fallbackError);
      // Return error with both error messages
      return {
        success: false,
        url,
        error: `Scraping failed on both attempts. Primary error: ${error.message || 'Unknown error'}. Fallback error: ${fallbackError.message || 'Unknown error'}`
      };
    }
  }
}

/**
 * Process and optimize content for research purposes
 * This transforms raw scraped content into a more structured, research-friendly format
 */
function optimizeForResearch(extractedData: ExtractedData, url: string): any {
  try {
    // Extract domain for reference
    const domain = new URL(url).hostname;
    
    // Create a research-optimized version of the data
    const researchData = {
      metadata: {
        source: url,
        domain: domain,
        title: extractedData.title || domain,
        description: extractedData.metaDescription || '',
        extractionDate: new Date().toISOString(),
        pagesScraped: extractedData.subpagesScraped?.length || 1,
      },
      contentSummary: {
        totalHeadings: extractedData.headings?.length || 0,
        totalParagraphs: extractedData.paragraphs?.length || 0,
        scrapedPages: extractedData.subpagesScraped || [url],
      },
      keyTopics: extractKeyTopics(extractedData),
      structuredContent: structureContent(extractedData),
      semanticEntities: extractSemanticEntities(extractedData),
    };
    
    return researchData;
  } catch (error) {
    console.error('Error optimizing content for research:', error);
    
    // Provide a minimal fallback structure if processing fails
    const domain = new URL(url).hostname;
    return {
      metadata: {
        source: url,
        domain: domain,
        title: extractedData.title || domain,
        description: extractedData.metaDescription || '',
        extractionDate: new Date().toISOString(),
        pagesScraped: 1,
      },
      contentSummary: {
        totalHeadings: extractedData.headings?.length || 0,
        totalParagraphs: extractedData.paragraphs?.length || 0,
        scrapedPages: [url],
      },
      keyTopics: [],
      structuredContent: {
        mainContent: extractedData.paragraphs || [],
        aboutContent: '',
        pricingInfo: '',
        productInfo: '',
        contactInfo: { emails: [], phones: [], socialLinks: [] }
      },
      semanticEntities: {
        organizations: [],
        products: [],
        locations: [],
        people: [],
        dates: [],
        phoneNumbers: [],
        emails: []
      }
    };
  }
}

/**
 * Extract key topics from the content based on heading frequency and context
 */
function extractKeyTopics(data: ExtractedData): string[] {
  // Start with an empty topics array
  const topics: string[] = [];
  
  // Process headings to find key topics
  if (data.headings && data.headings.length > 0) {
    // Extract keywords from headings
    const keywords = new Map<string, number>();
    
    // Process each heading to extract meaningful terms
    for (const heading of data.headings) {
      // Skip very short headings
      if (heading.length < 3) continue;
      
      // Extract keywords from heading
      const words = heading
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => 
          word.length > 3 && 
          !['and', 'the', 'for', 'from', 'with', 'that', 'this', 'our', 'your', 'their'].includes(word)
        );
      
      // Count keyword frequency
      for (const word of words) {
        keywords.set(word, (keywords.get(word) || 0) + 1);
      }
    }
    
    // Convert to array and sort by frequency
    const sortedKeywords = Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
    
    // Add to topics
    topics.push(...sortedKeywords);
  }
  
  return topics;
}

/**
 * Create a structured, hierarchical representation of content
 */
function structureContent(data: ExtractedData): any {
  // Define the section type
  interface ContentSection {
    heading: string;
    content: string[];
  }

  // Create a structured content object
  const structuredContent = {
    mainContent: [] as ContentSection[] | string[],
    aboutContent: data.aboutContent || '',
    pricingInfo: data.pricingInfo || '',
    productInfo: data.productInfo || '',
    contactInfo: data.contactInfo || { emails: [], phones: [], socialLinks: [] },
  };
  
  // If we have headings and paragraphs, try to associate them
  if (data.headings && data.headings.length > 0 && 
      data.paragraphs && data.paragraphs.length > 0) {
    
    // Basic algorithm to group paragraphs under headings
    let currentHeadingIndex = 0;
    let currentSection: ContentSection = {
      heading: data.headings[0],
      content: [],
    };
    
    // Initialize mainContent as ContentSection array
    structuredContent.mainContent = [] as ContentSection[];
    
    // Add first heading
    (structuredContent.mainContent as ContentSection[]).push(currentSection);
    
    // For simplicity, we'll associate paragraphs with the nearest preceding heading
    // This is a simplified approach - a more sophisticated version would parse actual DOM hierarchy
    for (let i = 0; i < data.paragraphs.length; i++) {
      const paragraph = data.paragraphs[i];
      
      // Check if this paragraph might actually be a heading
      // (in case headings were extracted as paragraphs too)
      if (paragraph.length < 100 && 
          (paragraph.endsWith('?') || paragraph.endsWith(':') || /^[A-Z0-9]/.test(paragraph))) {
        
        // If current section has content, move to next heading
        if (currentSection.content.length > 0 && currentHeadingIndex < data.headings.length - 1) {
          currentHeadingIndex++;
          currentSection = {
            heading: data.headings[currentHeadingIndex],
            content: [],
          };
          (structuredContent.mainContent as ContentSection[]).push(currentSection);
        }
      }
      
      // Add paragraph to current section
      currentSection.content.push(paragraph);
    }
  } else {
    // If we don't have a good heading structure, just add paragraphs directly
    structuredContent.mainContent = data.paragraphs || [];
  }
  
  return structuredContent;
}

/**
 * Extract semantic entities like people, organizations, locations, etc.
 */
function extractSemanticEntities(data: ExtractedData): any {
  // Initialize entity collections
  const entities = {
    organizations: new Set<string>(),
    products: new Set<string>(),
    locations: new Set<string>(),
    people: new Set<string>(),
    dates: new Set<string>(),
    phoneNumbers: new Set<string>(),
    emails: new Set<string>(),
  };
  
  // Extract phone numbers
  const phoneRegex = /(?:\+?1[-\s]?)?(?:\(?([0-9]{3})\)?[-\s]?)?([0-9]{3})[-\s]?([0-9]{4})/g;
  
  // Extract emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  
  // Combine all text for entity extraction
  const allText = [
    data.title || '',
    data.metaDescription || '',
    ...(data.headings || []),
    ...(data.paragraphs || []),
    data.aboutContent || '',
    data.pricingInfo || '',
    data.productInfo || '',
  ].join(' ');
  
  // Extract phone numbers
  let match;
  while ((match = phoneRegex.exec(allText)) !== null) {
    entities.phoneNumbers.add(match[0]);
  }
  
  // Extract emails
  emailRegex.lastIndex = 0; // Reset regex index
  while ((match = emailRegex.exec(allText)) !== null) {
    entities.emails.add(match[0]);
  }
  
  // Add contact info from the extracted data
  if (data.contactInfo) {
    if (data.contactInfo.emails) {
      data.contactInfo.emails.forEach(email => entities.emails.add(email));
    }
    if (data.contactInfo.phones) {
      data.contactInfo.phones.forEach(phone => entities.phoneNumbers.add(phone));
    }
  }
  
  // Convert sets to arrays
  return {
    organizations: Array.from(entities.organizations),
    products: Array.from(entities.products),
    locations: Array.from(entities.locations),
    people: Array.from(entities.people),
    dates: Array.from(entities.dates),
    phoneNumbers: Array.from(entities.phoneNumbers),
    emails: Array.from(entities.emails),
  };
}

/**
 * Handler for the website scraping API endpoint
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`Scraping API called at ${new Date().toISOString()}, running on ${isVercel ? 'Vercel' : 'local'} environment`);
  
  try {
    // Parse request body
    const body = await request.json() as ScrapingRequest;
    
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
    
    // Add a timeout to prevent hanging requests - shorter on Vercel
    const MAX_EXECUTION_TIME = isVercel ? 25000 : 45000; // 25 seconds on Vercel, 45 seconds locally
    let timeoutId: NodeJS.Timeout;
    
    const scrapePromise = new Promise(async (resolve, reject) => {
      try {
        // Extract content from website
        console.log(`Processing scrape request for: ${body.url}`);
        
        // Using improved approach with fallbacks
        let result;
        if (body.scrapeType === 'basic') {
          // Direct basic approach if explicitly requested
          result = await extractWebsiteContent(
            body.url,
            'basic',
            body.maxDepth || 1
          );
        } else {
          // Try with fallback approach otherwise
          result = await extractWithFallback(
            body.url,
            body.maxDepth || (isVercel ? 1 : 2) // Limit depth on Vercel
          );
        }
        
        // Clear timeout since we're done
        if (timeoutId) clearTimeout(timeoutId);
        resolve(result);
      } catch (error: any) {
        // Check for specific invalid selector errors related to :has or :contains
        let errorMessage = error.message || 'Unknown error occurred';
        if (typeof errorMessage === 'string' && 
            (errorMessage.includes(':has') || 
             errorMessage.includes(':contains') || 
             errorMessage.includes('is not a valid selector'))) {
          console.error('Invalid CSS selector error detected:', errorMessage);
          
          // Provide a more helpful error message
          errorMessage = 'The website analysis encountered an issue with an advanced CSS selector. Please try with a different URL or try the basic analysis mode.';
        }
        
        // Clear timeout since we've errored
        if (timeoutId) clearTimeout(timeoutId);
        reject(new Error(errorMessage));
      }
    });
    
    // Set timeout to reject promise after MAX_EXECUTION_TIME
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Website analysis timed out after ' + MAX_EXECUTION_TIME / 1000 + ' seconds'));
      }, MAX_EXECUTION_TIME);
    });
    
    // Race between scraping and timeout
    const result: any = await Promise.race([scrapePromise, timeoutPromise])
      .catch(error => {
        console.error('Scraping failed or timed out:', error);
        return {
          success: false,
          error: error.message || 'Scraping failed',
          url: body.url
        };
      });
      
    // If we didn't get any actual content despite a "success" response,
    // set minimal content to ensure the UI has something to display
    if (result.success && result.data && 
        ((!result.data.paragraphs || (result.data.paragraphs && result.data.paragraphs.length === 0)) &&
         (!result.data.headings || (result.data.headings && result.data.headings.length === 0)))) {
      
      console.log('Successful scrape but no content found, setting minimal content');
      
      // Extract domain name for minimal content
      const urlObj = new URL(body.url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      
      // Set minimal fallback content
      result.data = {
        ...result.data,
        title: result.data.title || domain,
        domain: domain,
        headings: result.data.headings || [`Website: ${domain}`],
        paragraphs: result.data.paragraphs || [`Content from ${body.url}`],
      };
      
      // Add a flag to indicate this is minimal fallback content
      result.minimalContent = true;
    }
    
    if (result.success) {
      // Process the result for research optimization
      const researchOptimizedData = optimizeForResearch(result.data, body.url);
      
      return NextResponse.json({
        ...result,
        researchOptimized: researchOptimizedData,
        executionTime: `${Date.now() - startTime}ms`,
        environment: isVercel ? 'vercel' : 'local'
      });
    } else {
      console.error('Scraping failed:', result.error);
      return NextResponse.json(
        {
          ...result,
          executionTime: `${Date.now() - startTime}ms`,
          environment: isVercel ? 'vercel' : 'local'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in scrape-website API:', error);
    
    // Check for specific selector errors
    let errorMessage = error.message || 'An unexpected error occurred';
    let errorDetails = error.stack || '';
    
    if (typeof errorMessage === 'string' && 
        (errorMessage.includes(':has') || 
         errorMessage.includes(':contains') || 
         errorMessage.includes('is not a valid selector'))) {
      errorMessage = 'The website analysis encountered an issue with an advanced CSS selector. Please try with a different URL or try the basic analysis mode.';
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: errorDetails,
        environment: isVercel ? 'vercel' : 'local',
        executionTime: `${Date.now() - startTime}ms`
      },
      { status: 500 }
    );
  } finally {
    console.log(`Scraping API execution completed in ${Date.now() - startTime}ms`);
  }
}
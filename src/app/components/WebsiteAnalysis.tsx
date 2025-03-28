import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useToast } from '@/lib/hooks/useToast';
import { BiLink, BiCheckCircle, BiErrorCircle, BiChevronDown, BiChevronUp, BiCode, BiWorld } from 'react-icons/bi';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface WebsiteAnalysisProps {
  onScrapedContent?: (content: any) => void;
}

// Helper function to detect content type (business, personal_brand, expert, hobbyist)
function detectContentType(websiteContent: any, websiteUrl: string): string {
  if (!websiteContent) return 'business';
  
  // Count signals for different content types
  let businessSignals = 0;
  let personalBrandSignals = 0;
  let expertSignals = 0;
  let hobbyistSignals = 0;
  
  // Check website title
  const title = websiteContent.title || '';
  if (title.toLowerCase().includes('coach') || 
      title.toLowerCase().includes('trainer') || 
      title.toLowerCase().includes('consultant') ||
      title.toLowerCase().includes('expert') ||
      title.toLowerCase().includes('specialist')) {
    personalBrandSignals += 2;
  }
  
  // Check for personal pronouns in content
  const allText = [
    ...(websiteContent.paragraphs || []),
    ...(websiteContent.headings || []),
    websiteContent.aboutContent || '',
  ].join(' ').toLowerCase();
  
  // Personal brand signals
  if (allText.includes('i help') || 
      allText.includes('my clients') || 
      allText.includes('my services') ||
      allText.includes('my approach') ||
      allText.includes('my philosophy')) {
    personalBrandSignals += 3;
  }
  
  // Expert signals
  if (allText.includes('research') || 
      allText.includes('publication') || 
      allText.includes('methodology') ||
      allText.includes('framework') ||
      allText.includes('approach')) {
    expertSignals += 2;
  }
  
  // Hobbyist signals
  if (allText.includes('recipe') || 
      allText.includes('craft') || 
      allText.includes('diy') ||
      allText.includes('hobby') ||
      allText.includes('passion')) {
    hobbyistSignals += 3;
  }
  
  // Business signals
  if (allText.includes('our team') || 
      allText.includes('our company') || 
      allText.includes('our products') ||
      allText.includes('founded in') ||
      allText.includes('our mission')) {
    businessSignals += 2;
  }
  
  // Check for pricing pages or ecommerce
  if (websiteContent.pricingInfo || 
      allText.includes('pricing') || 
      allText.includes('subscription') ||
      allText.includes('package')) {
    businessSignals += 2;
  }
  
  // Determine the content type based on highest signal count
  const signalCounts = [
    { type: 'business', count: businessSignals },
    { type: 'personal_brand', count: personalBrandSignals },
    { type: 'expert', count: expertSignals },
    { type: 'hobbyist', count: hobbyistSignals }
  ];
  
  console.log('Content type detection signals:', JSON.stringify(signalCounts));
  
  // Sort by count in descending order
  signalCounts.sort((a, b) => b.count - a.count);
  
  // If highest signal is significant enough, use that type
  if (signalCounts[0].count > 0) {
    return signalCounts[0].type;
  }
  
  return 'business'; // Default to business
}

const WebsiteAnalysis: React.FC<WebsiteAnalysisProps> = ({ onScrapedContent }) => {
  // Use only useTranslation for consistency
  const { t } = useTranslation();
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedContent, setScrapedContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [maxDepth, setMaxDepth] = useState(2); // Control crawl depth
  const [showAllHeadings, setShowAllHeadings] = useState(false); // New state for showing all headings

  // Simplified function to get component-specific translations with optional replacements
  const getComponentText = (key: string, defaultValue: string, replacements?: Record<string, string>) => {
    const fullKey = `websiteAnalysis.${key}`;
    if (replacements) {
      return t(fullKey, { defaultValue, ...replacements });
    } else {
      return t(fullKey, { defaultValue });
    }
  };

  // Safely show toast notifications
  const showToast = (message: string, type: 'success' | 'error') => {
    // Always set the state-based message as a fallback
    if (type === 'success') {
      setSuccessMessage(message);
    } else {
      setError(message);
    }
    
    // Only attempt to use toast if the toast system is ready
    if (toast.isReady) {
      try {
        if (type === 'success') {
          toast.success(message);
        } else {
          toast.error(message);
        }
      } catch (err) {
        console.error('Error showing toast:', err);
        // Error already handled via state above
      }
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Reset error state when input changes
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleMaxDepthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMaxDepth(parseInt(e.target.value, 10));
  };

  const handleSubmit = async () => {
    // Validate URL
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    // Normalize URL - add https:// if no protocol is specified
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // URL validation with normalized URL
    try {
      new URL(normalizedUrl);
    } catch (e) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    // Clear previous content when starting a new analysis
    setScrapedContent(null);

    try {
      const response = await fetch('/api/scrape-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: normalizedUrl, // Use the normalized URL with https:// prefix
          scrapeType: 'comprehensive', // Use comprehensive mode for better company insights
          maxDepth: maxDepth // Pass the selected crawl depth
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || 'Failed to extract website content');
      }

      setScrapedContent(data.data);
      setExpanded(false); // Reset expanded state when new content is loaded
      
      if (onScrapedContent) {
        onScrapedContent(data.data);
      }

      // Try to detect the content type (business, personal_brand, expert, hobbyist)
      const detectedContentType = detectContentType(data.data, data.url);

      // Also store the scraped content in sessionStorage to ensure it's available
      // for the research process even if not passed through the callback
      try {
        // Get existing content details from sessionStorage
        const existingContentDetails = sessionStorage.getItem('contentDetails');
        if (existingContentDetails) {
          // Parse existing content details
          const contentDetails = JSON.parse(existingContentDetails);
          
          // Update the websiteContent field with the scraped data
          contentDetails.websiteContent = data.data;
          
          // Try to extract company/business name from website title
          if (data.data.title && !contentDetails.businessName) {
            // Extract business name from title (before any separators like | or -)
            const titleParts = data.data.title.split(/[|:\-–—]/);
            if (titleParts.length > 0) {
              const businessName = titleParts[0].trim();
              contentDetails.businessName = businessName;
              console.log('Extracted business name from website title:', businessName);
            }
          }
          
          // Also try to set a more descriptive company name from the About content if available
          if (data.data.aboutContent && (!contentDetails.businessName || contentDetails.businessName === data.url)) {
            // Try to find company name patterns in the about content
            const aboutText = data.data.aboutContent;
            
            // Look for common patterns like "About [Company]", "[Company] was founded", etc.
            const companyPatterns = [
              /About\s+([A-Z][A-Za-z0-9\s]{2,25})\b/,
              /([A-Z][A-Za-z0-9\s]{2,25})\s+was founded/,
              /([A-Z][A-Za-z0-9\s]{2,25})\s+is a company/,
              /Welcome to\s+([A-Z][A-Za-z0-9\s]{2,25})\b/
            ];
            
            for (const pattern of companyPatterns) {
              const match = aboutText.match(pattern);
              if (match && match[1]) {
                const potentialName = match[1].trim();
                // Only use if it's not too generic
                const genericTerms = ['company', 'about', 'us', 'our', 'the', 'this', 'website'];
                if (potentialName.length > 2 && !genericTerms.includes(potentialName.toLowerCase())) {
                  contentDetails.businessName = potentialName;
                  console.log('Extracted business name from about content:', potentialName);
                  break;
                }
              }
            }
          }
          
          // If we still don't have a business name, try to extract from the domain
          if (!contentDetails.businessName || contentDetails.businessName.length < 2) {
            try {
              const domain = new URL(data.url).hostname;
              // Remove www. and .com/.org etc.
              let domainName = domain.replace(/^www\./, '').split('.')[0];
              // Capitalize first letter
              domainName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
              
              contentDetails.businessName = domainName;
              console.log('Extracted business name from domain:', domainName);
            } catch (e) {
              console.error('Error extracting domain name:', e);
            }
          }
          
          // Detect content type and save it
          contentDetails.contentCreatorType = detectedContentType;
          console.log('Detected content type:', detectedContentType);
          
          // Save the updated content details back to sessionStorage
          sessionStorage.setItem('contentDetails', JSON.stringify(contentDetails));
          console.log('Saved website content to sessionStorage:', 
            data.data.paragraphs?.length || 0, 'paragraphs,', 
            data.data.headings?.length || 0, 'headings,',
            'businessName:', contentDetails.businessName,
            'contentType:', contentDetails.contentCreatorType);
        } else {
          console.log('No existing contentDetails in sessionStorage to update with website content');
        }
      } catch (storageError) {
        console.error('Error updating sessionStorage with website content:', storageError);
      }

      // Show success toast with number of pages processed
      const pagesScraped = data.data.subpagesScraped?.length || 1;
      showToast(`Website analyzed successfully! Processed ${pagesScraped} pages.`, 'success');
    } catch (err: any) {
      console.error('Error scraping website:', err);
      const errorMessage = err.message || getComponentText('errors.generic', 'An error occurred while analyzing the website');
      setError(errorMessage);
      setScrapedContent(null);
      
      showToast('Failed to analyze website', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Add a toggle function for all headings
  const toggleAllHeadings = () => {
    setShowAllHeadings(!showAllHeadings);
  };

  const renderScrapedContentSummary = () => {
    if (!scrapedContent) return null;

    // Extract key information to display
    const paragraphCount = scrapedContent.paragraphs?.length || 0;
    const headingCount = scrapedContent.headings?.length || 0;
    const title = scrapedContent.title || '';
    const aboutContent = scrapedContent.aboutContent || '';
    const contactInfo = scrapedContent.contactInfo || {};
    const productInfo = scrapedContent.productInfo || '';
    const pricingInfo = scrapedContent.pricingInfo || '';
    const paragraphs = scrapedContent.paragraphs || [];
    const headings = scrapedContent.headings || [];
    const subpagesScraped = scrapedContent.subpagesScraped || [];

    return (
      <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-100 text-sm text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <BiCheckCircle className="text-green-500 mr-2" size={18} />
            <span className="font-medium">
              {getComponentText('contentExtractedMultiple', 'Website content extracted from {pageCount} pages', { pageCount: subpagesScraped.length.toString() })}
            </span>
          </div>
          
          <button 
            onClick={toggleExpanded}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            aria-label={expanded ? "Collapse website content" : "Expand website content"}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        
        {title && (
          <div className="mb-2 font-medium">
            {title}
          </div>
        )}
        
        <p className="text-xs opacity-80 mb-2">
          {getComponentText('contentSummaryMultiple', 'Extracted {paragraphCount} paragraphs, {headingCount} headings, and additional content from multiple pages', { 
            paragraphCount: paragraphCount.toString(), 
            headingCount: headingCount.toString() 
          })}
        </p>
        
        <div className="flex items-center text-xs opacity-80 mb-2 bg-green-100 dark:bg-green-900/40 rounded px-2 py-1.5">
          <BiCode className="mr-1.5" size={14} />
          <span>
            {getComponentText('contentFiltered', 'Technical code and irrelevant content automatically filtered out')}
          </span>
        </div>
        
        <div className="flex items-center text-xs opacity-80 mb-2 bg-green-100 dark:bg-green-900/40 rounded px-2 py-1.5">
          <BiWorld className="mr-1.5" size={14} />
          <span>
            {getComponentText('pagesScraped', 'Crawled {pageCount} pages from this website', { pageCount: subpagesScraped.length.toString() })}
          </span>
        </div>
        
        {!expanded && aboutContent && (
          <div className="mt-2 border-t border-green-200 dark:border-green-700 pt-2 text-xs">
            <p className="line-clamp-2">{aboutContent.substring(0, 150)}...</p>
          </div>
        )}

        {expanded && (
          <div className="mt-3 border-t border-green-200 dark:border-green-700 pt-3 text-xs">
            {/* Title and Meta */}
            <div className="mb-3">
              <h4 className="font-semibold mb-1">{getComponentText('websiteInfo', 'Website Information')}</h4>
              <p><span className="font-medium">{getComponentText('titleLabel', 'Title')}:</span> {title}</p>
              {scrapedContent.metaDescription && (
                <p><span className="font-medium">{getComponentText('metaDescription', 'Meta Description')}:</span> {scrapedContent.metaDescription}</p>
              )}
            </div>
            
            {/* Pages Scraped */}
            {subpagesScraped.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1 flex items-center">
                  <BiWorld className="mr-1.5 text-green-600 dark:text-green-400" />
                  {getComponentText('pagesAnalyzedTitle', 'Pages Analyzed')}
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  {subpagesScraped.slice(0, 7).map((page: string, index: number) => (
                    <li key={index} className="truncate hover:text-blue-600 dark:hover:text-blue-400">
                      {page}
                    </li>
                  ))}
                  {subpagesScraped.length > 7 && (
                    <li className="italic">{getComponentText('andMorePages', '...and {count} more pages', { count: (subpagesScraped.length - 7).toString() })}</li>
                  )}
                </ul>
              </div>
            )}
            
            {/* About Content */}
            {aboutContent && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1">{getComponentText('aboutSection', 'About')}</h4>
                <p className="whitespace-pre-wrap">{aboutContent}</p>
              </div>
            )}

            {/* Pricing Information - New section */}
            {pricingInfo && (
              <div className="mb-3 bg-green-100/50 dark:bg-green-900/30 p-2 rounded">
                <h4 className="font-semibold mb-1">{getComponentText('pricingInfo', 'Pricing Information')}</h4>
                <p className="whitespace-pre-wrap">{pricingInfo}</p>
              </div>
            )}

            {/* Product Information */}
            {productInfo && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1">{getComponentText('productInfo', 'Product Information')}</h4>
                <p className="whitespace-pre-wrap">{productInfo}</p>
              </div>
            )}

            {/* Contact Information */}
            {contactInfo && (contactInfo.emails?.length > 0 || contactInfo.phones?.length > 0 || contactInfo.socialLinks?.length > 0) && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1">{getComponentText('contactInfo', 'Contact Information')}</h4>
                {contactInfo.emails?.length > 0 && (
                  <div className="mb-1">
                    <span className="font-medium">{getComponentText('emails', 'Emails')}: </span>
                    {contactInfo.emails.slice(0, 3).join(', ')}
                    {contactInfo.emails.length > 3 && '...'}
                  </div>
                )}
                {contactInfo.phones?.length > 0 && (
                  <div className="mb-1">
                    <span className="font-medium">{getComponentText('phones', 'Phones')}: </span>
                    {contactInfo.phones.slice(0, 3).join(', ')}
                    {contactInfo.phones.length > 3 && '...'}
                  </div>
                )}
                {contactInfo.socialLinks?.length > 0 && (
                  <div>
                    <span className="font-medium">{getComponentText('socialLinks', 'Social Links')}: </span>
                    {contactInfo.socialLinks.length} {getComponentText('found', 'found')}
                  </div>
                )}
              </div>
            )}

            {/* Headings sample with View All Headings feature */}
            {headings.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold mb-1">{getComponentText('sampleHeadings', 'Sample Headings')}</h4>
                  {headings.length > 7 && (
                    <button 
                      onClick={toggleAllHeadings}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {showAllHeadings ? getComponentText('showLess', 'Show Less') : getComponentText('showMore', 'Show More')}
                    </button>
                  )}
                </div>
                <ul className="list-disc pl-5">
                  {(showAllHeadings ? headings : headings.slice(0, 7)).map((heading: string, index: number) => (
                    <li key={index} className={index >= 7 && !showAllHeadings ? 'hidden' : ''}>{heading}</li>
                  ))}
                  {headings.length > 7 && !showAllHeadings && (
                    <li className="italic">{getComponentText('andMoreHeadings', '...and {count} more headings', { count: (headings.length - 7).toString() })}</li>
                  )}
                </ul>
                
                {/* View All Headings - Collapsible Section */}
                {showAllHeadings && headings.length > 15 && (
                  <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium">
                        {getComponentText('allHeadings', 'All {count} Headings', { count: headings.length.toString() })}
                      </span>
                      
                      {/* Option to copy all headings */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(headings.join('\n'));
                          showToast(getComponentText('headingsCopied', 'All headings copied to clipboard'), 'success');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {getComponentText('copyHeadings', 'Copy All')}
                      </button>
                    </div>
                    
                    {/* Search filter for headings if more than 25 */}
                    {headings.length > 25 && (
                      <div className="mb-2">
                        <input
                          type="text"
                          placeholder={getComponentText('searchHeadings', 'Search headings...')}
                          className="w-full px-3 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                          onChange={(e) => {
                            // Filter headings by search text - just a visual filter, not changing the underlying data
                            const searchText = e.target.value.toLowerCase();
                            const headingElements = document.querySelectorAll('.heading-item');
                            headingElements.forEach((el) => {
                              const content = el.textContent?.toLowerCase() || '';
                              if (searchText === '' || content.includes(searchText)) {
                                (el as HTMLElement).style.display = '';
                              } else {
                                (el as HTMLElement).style.display = 'none';
                              }
                            });
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Display all headings in a scrollable div with good organization */}
                    <div className="max-h-80 overflow-y-auto pr-1 bg-white/50 dark:bg-gray-800/50 rounded p-2 text-xs">
                      {headings.map((heading: string, index: number) => (
                        <div 
                          key={`full-${index}`} 
                          className="heading-item py-1 px-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-sm"
                        >
                          {heading}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <BiWorld className="w-5 h-5 mr-2 text-blue-500" />
          {getComponentText('title', 'Website Analysis')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {getComponentText('description', 'Extract information from company websites to enhance your research.')}
        </p>
        
        <div className="flex">
          <div className="flex-grow">
            <input
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder={getComponentText('urlPlaceholder', 'Enter website URL (e.g., example.com)')}
              className="w-full p-2 border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              disabled={isLoading}
            />
          </div>
          
          <div className="ml-2">
            <select 
              value={maxDepth} 
              onChange={handleMaxDepthChange}
              className="p-2 border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white min-w-[200px]"
              disabled={isLoading}
            >
              <option value={1}>{getComponentText('mainPage', 'Main page')}</option>
              <option value={2}>{getComponentText('importantPages', 'Important pages')}</option>
              <option value={3}>{getComponentText('fullSite', 'Full site')}</option>
            </select>
          </div>
          
          <div className="ml-2">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {getComponentText('analyzing', 'Analyzing...')}
                </div>
              ) : (
                getComponentText('analyze', 'Analyze Website')
              )}
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {getComponentText('urlHint', 'You can enter URLs with or without https://')}
          {maxDepth > 1 && (
            <span className="ml-1 text-blue-600 dark:text-blue-400">
              • {getComponentText('crawlLevelInfo', 'Will crawl up to {maxDepth} levels of links', { maxDepth: maxDepth.toString() })}
            </span>
          )}
        </p>
      </div>
      
      {error && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-800/40">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-300">
            {getComponentText('websiteError', 'Website Error')}
          </h4>
          <p className="mt-1 text-xs text-red-700 dark:text-red-400">
            {getComponentText('websiteErrorDescription', 'Could not access website. Please check the URL and try again.')}
          </p>
        </div>
      )}
      
      {successMessage && !scrapedContent && (
        <div className="p-3 bg-green-50 rounded-md border border-green-100 text-sm text-green-800 flex items-start dark:bg-green-900/20 dark:border-green-800 dark:text-green-200">
          <BiCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
          <span>{successMessage}</span>
        </div>
      )}
      
      {scrapedContent && renderScrapedContentSummary()}
    </div>
  );
};

export default WebsiteAnalysis;
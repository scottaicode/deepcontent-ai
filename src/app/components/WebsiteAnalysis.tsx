import React, { useState, useEffect } from 'react';
import { 
  BiCheckCircle, 
  BiChevronUp, 
  BiChevronDown, 
  BiNetworkChart, 
  BiListUl, 
  BiCopy, 
  BiSearchAlt, 
  BiBookContent,
  BiErrorCircle,
  BiAnalyse,
  BiWorld
} from 'react-icons/bi';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useToast } from '@/lib/hooks/useToast';

interface WebsiteAnalysisProps {
  onScrapedContent?: (content: any) => void;
  contentContext?: {
    topic?: string;
    platform?: string;
    subPlatform?: string;
    targetAudience?: string;
    audienceNeeds?: string;
  };
}

// Define the type for optimized research data
interface ResearchOptimizedData {
  metadata: {
    source: string;
    domain: string;
    title: string;
    description: string;
    extractionDate: string;
    pagesScraped: number;
  };
  contentSummary: {
    totalHeadings: number;
    totalParagraphs: number;
    scrapedPages: string[];
  };
  keyTopics: string[];
  structuredContent: {
    mainContent: any[]; // Can be array of sections or paragraphs
    aboutContent: string;
    pricingInfo: string;
    productInfo: string;
    contactInfo: {
      emails: string[];
      phones: string[];
      socialLinks: string[];
    };
  };
  semanticEntities: {
    organizations: string[];
    products: string[];
    locations: string[];
    people: string[];
    dates: string[];
    phoneNumbers: string[];
    emails: string[];
  };
}

interface ScrapedContent {
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
  subpagesScraped?: string[];
  researchOptimized?: ResearchOptimizedData; // Add the new research-optimized data
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
  const [retryCount, setRetryCount] = useState(0); // Add retry counter

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
      setError(t('websiteAnalysis.errors.emptyUrl', { defaultValue: 'Please enter a URL' }));
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
      setError(t('websiteAnalysis.errors.invalidUrl', { defaultValue: 'Please enter a valid URL' }));
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

      // Handle HTTP errors
      if (!response.ok) {
        let errorMessage = 'Failed to extract website content';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || data.details || 'Failed to extract website content');
      }

      // Check if we actually got useful data
      if (!data.data || 
         (!data.data.paragraphs?.length && !data.data.headings?.length)) {
        throw new Error('No useful content could be extracted from this website');
      }

      // Success! Update UI and store data
      setScrapedContent(data.data);
      
      // Always expand the view when new content is loaded to show all details
      setExpanded(false);
      
      // Construct a success message based on what we scraped
      const pageCount = data.data.subpagesScraped?.length || 1;
      const successMsg = t('websiteAnalysis.successMultiple', { 
        defaultValue: 'Website analyzed successfully! Processed {pageCount} pages.',
        pageCount: String(pageCount)
      });
      showToast(successMsg, 'success');
      
      if (onScrapedContent) {
        // Make sure we send the data in a format that's useful for research
        const enrichedData = {
          ...data.data,
          url: normalizedUrl,
          pageCount,
          analysisDate: new Date().toISOString(),
          // Ensure content is properly formatted for deep research
          formattedForResearch: true,
          fullContent: {
            title: data.data.title || '',
            metaDescription: data.data.metaDescription || '',
            allHeadings: data.data.headings || [],
            allParagraphs: data.data.paragraphs || [],
            aboutContent: data.data.aboutContent || '',
            productInfo: data.data.productInfo || '',
            pricingInfo: data.data.pricingInfo || '',
            contactInfo: data.data.contactInfo || { emails: [], phones: [], socialLinks: [] },
            analyzedPages: data.data.subpagesScraped || []
          }
        };
        
        console.log('Sending scraped content to parent:', enrichedData);
        onScrapedContent(enrichedData);
        
        // Also store in sessionStorage as a backup
        try {
          sessionStorage.setItem('websiteAnalysisData', JSON.stringify(enrichedData));
        } catch (storageError) {
          console.warn('Could not store website data in sessionStorage:', storageError);
        }
      }

      // Try to detect the content type (business, personal_brand, expert, hobbyist)
      const detectedContentType = detectContentType(data.data, normalizedUrl);

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
              
              // Show a toast to inform the user
              showToast(
                t('websiteAnalysis.businessNameExtracted', { 
                  defaultValue: 'Business name extracted: {name}', 
                  name: businessName 
                }),
                'success'
              );
            }
          }
          
          // Save the updated content details back to sessionStorage
          sessionStorage.setItem('contentDetails', JSON.stringify(contentDetails));
        }
      } catch (sessionError) {
        console.error('Error updating session storage:', sessionError);
      }
    } catch (error: any) {
      console.error('Error in website analysis:', error);
      
      // Handle specific error cases with user-friendly messages
      let errorMessage = error.message || 'Unknown error';
      
      // Network or connection errors
      if (errorMessage.includes('NetworkError') || 
          errorMessage.includes('network') || 
          errorMessage.includes('ECONNREFUSED') || 
          errorMessage.includes('timeout')) {
        errorMessage = t('websiteAnalysis.errors.connectionFailed', { 
          defaultValue: 'Could not connect to the website. Please check the URL and try again.'
        });
      }
      
      // Timeout errors
      else if (errorMessage.includes('timeout')) {
        errorMessage = t('websiteAnalysis.errors.timeout', { 
          defaultValue: 'The website took too long to respond. Try using a simpler analysis depth.'
        });
      }
      
      // No content errors
      else if (errorMessage.includes('No useful content')) {
        errorMessage = t('websiteAnalysis.errors.noContent', { 
          defaultValue: 'No useful content could be extracted from this website. The website may be using technologies that prevent scraping.'
        });
      }
      
      // Reset retry count when a new error occurs
      if (retryCount >= 2) {
        // If we've already retried twice, give up
        showToast(t('websiteAnalysis.errors.failed', { 
          defaultValue: 'Failed to analyze website: {error}', 
          error: errorMessage 
        }), 'error');
        setError(`Error: ${errorMessage}`);
        setRetryCount(0);
      } else {
        // Increment retry count and try again with a less intensive scrape
        setRetryCount(prev => prev + 1);
        setError(t('websiteAnalysis.retryingWithSimpler', { 
          defaultValue: 'Error: {error}. Retrying with simpler analysis...', 
          error: errorMessage 
        }));
        
        // Try again with a simpler approach after a short delay
        setTimeout(() => {
          handleRetryWithSimpler();
        }, 1000);
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a method to retry with simpler settings
  const handleRetryWithSimpler = async () => {
    if (!url) return;
    
    // Normalize URL - add https:// if no protocol is specified
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    setIsLoading(true);
    setError(t('websiteAnalysis.retryingWithSimpler', { 
      defaultValue: `Retrying with simpler analysis (attempt ${retryCount})...` 
    }));
    
    try {
      const response = await fetch('/api/scrape-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: normalizedUrl,
          scrapeType: 'basic', // Use basic mode for second attempt
          maxDepth: 1 // Only look at the home page
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to extract website content');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || data.details || 'Failed to extract website content');
      }
      
      // Even with a failed/partial scrape, try to get whatever data we can
      const extractedData = data.data || {
        title: normalizedUrl,
        paragraphs: [`Content from ${normalizedUrl}`],
        headings: [`Website: ${normalizedUrl}`]
      };
      
      setScrapedContent(extractedData);
      
      // Try to extract a domain name
      const domainMatch = normalizedUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
      const domain = domainMatch ? domainMatch[1] : normalizedUrl;
      
      // Create minimal data if we didn't get much
      const minimalData = {
        title: extractedData.title || domain,
        url: normalizedUrl,
        domain,
        headings: extractedData.headings || [],
        paragraphs: extractedData.paragraphs || [],
        fullText: extractedData.fullText || '',
        pageCount: 1,
        analysisDate: new Date().toISOString(),
      };
      
      // Send even minimal data to parent
      if (onScrapedContent) {
        console.log('Sending minimal scraped content to parent:', minimalData);
        onScrapedContent(minimalData);
      }
      
      showToast(t('websiteAnalysis.partialSuccess', { 
        defaultValue: 'Partial data extracted from website'
      }), 'success');
      
      // Also update sessionStorage
      try {
        const existingContentDetails = sessionStorage.getItem('contentDetails');
        if (existingContentDetails) {
          const contentDetails = JSON.parse(existingContentDetails);
          contentDetails.websiteContent = minimalData;
          
          // Try to extract business name from title or domain
          if ((minimalData.title || domain) && !contentDetails.businessName) {
            // Get business name from title first
            let businessName = domain;
            
            if (minimalData.title) {
              // Extract business name from title (before any separators like | or -)
              const titleParts = minimalData.title.split(/[|:\-–—]/);
              if (titleParts.length > 0) {
                businessName = titleParts[0].trim();
              }
            }
            
            // Update content details with extracted business name
            contentDetails.businessName = businessName;
            
            // Show a toast to inform the user
            showToast(
              t('websiteAnalysis.businessNameExtracted', { 
                defaultValue: 'Business name extracted: {name}', 
                name: businessName 
              }),
              'success'
            );
          }
          
          sessionStorage.setItem('contentDetails', JSON.stringify(contentDetails));
        }
      } catch (sessionError) {
        console.error('Error updating session storage:', sessionError);
      }
    } catch (error: any) {
      console.error('Error in retry attempt:', error);
      
      // Handle specific error cases for retry attempts
      let errorMessage = error.message || 'Unknown error';
      
      // Network or connection errors during retry
      if (errorMessage.includes('NetworkError') || 
          errorMessage.includes('network') || 
          errorMessage.includes('ECONNREFUSED')) {
        errorMessage = t('websiteAnalysis.errors.connectionFailed', { 
          defaultValue: 'Could not connect to the website. Please check the URL and try again.'
        });
      }
      
      // When all retries fail, provide a more detailed error
      showToast(
        t('websiteAnalysis.errors.failed', { 
          defaultValue: 'Failed to analyze website: {error}', 
          error: errorMessage
        }), 
        'error'
      );
      
      // Create basic fallback data even on complete failure
      if (onScrapedContent) {
        try {
          const domainMatch = normalizedUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/i);
          const domain = domainMatch ? domainMatch[1] : normalizedUrl;
          
          // Create extremely minimal data with just the URL as info
          const emergencyData = {
            title: domain,
            url: normalizedUrl,
            domain,
            headings: [`Website: ${domain}`],
            paragraphs: [`Content from ${normalizedUrl} (URL only - content extraction failed)`],
            fullText: `${domain} - Website content could not be extracted automatically.`,
            pageCount: 1,
            analysisDate: new Date().toISOString(),
            extractionFailed: true
          };
          
          // Still send something to the parent
          console.log('Sending emergency minimal data to parent:', emergencyData);
          onScrapedContent(emergencyData);
          
          // Update sessionStorage with just the URL info
          try {
            const existingContentDetails = sessionStorage.getItem('contentDetails');
            if (existingContentDetails) {
              const contentDetails = JSON.parse(existingContentDetails);
              contentDetails.websiteUrl = normalizedUrl;
              contentDetails.businessName = domain;
              sessionStorage.setItem('contentDetails', JSON.stringify(contentDetails));
            }
          } catch (sessionError) {
            console.error('Error updating session storage:', sessionError);
          }
        } catch (finalError) {
          console.error('Final error handling failed:', finalError);
        }
      }
      
      setError(`${t('websiteAnalysis.errors.failed', { defaultValue: 'Failed to analyze website' })}: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setRetryCount(0); // Reset retry count
    }
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const renderScrapedContentSummary = () => {
    if (!scrapedContent) return null;
    
    // Extract data with proper defaults to prevent rendering issues
    const title = scrapedContent.title || '';
    const metaDescription = scrapedContent.metaDescription || '';
    const headings = scrapedContent.headings || [];
    const paragraphs = scrapedContent.paragraphs || [];
    const aboutContent = scrapedContent.aboutContent || '';
    const productInfo = scrapedContent.productInfo || '';
    const pricingInfo = scrapedContent.pricingInfo || '';
    const contactInfo = scrapedContent.contactInfo || { emails: [], phones: [], socialLinks: [] };
    const subpagesScraped = Array.isArray(scrapedContent.subpagesScraped) ? scrapedContent.subpagesScraped : [];
    const pageCount = subpagesScraped.length || 1;
    const headingCount = headings.length;
    const paragraphCount = paragraphs.length;
    
    // Prepare text for copy button
    let textToCopy = `${title}\n\n`;
    if (metaDescription) textToCopy += `Meta Description: ${metaDescription}\n\n`;
    if (subpagesScraped.length > 0) textToCopy += `Pages Analyzed (${subpagesScraped.length}):\n${subpagesScraped.join('\n')}\n\n`;
    if (headings.length > 0) textToCopy += `Sample Headings (${headingCount}):\n${headings.join('\n')}\n\n`;
    if (paragraphs.length > 0) textToCopy += `Sample Paragraphs (${paragraphCount}):\n${paragraphs.join('\n\n')}\n\n`;
    // Add other sections if they exist in future
    textToCopy = textToCopy.trim();

    return (
      <div className="mt-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/40 overflow-hidden">
        {/* Header with Title, Copy Button, and Toggle */}
        <div className="p-3 flex justify-between items-center">
          <div className='flex-grow'>
            <h3 className="text-base font-medium text-green-800 dark:text-green-200 flex items-center">
              <BiCheckCircle className="mr-2 text-green-500 flex-shrink-0" />
              <span className='truncate'>{title || t('websiteAnalysis.websiteContent', { defaultValue: 'Website Content' })}</span>
            </h3>
             <p className="text-xs text-green-600 dark:text-green-400 mt-1">
               {t('websiteAnalysis.extractedFromPages', { defaultValue: 'Extracted from {count} pages.', count: pageCount.toString() })}
            </p>
          </div>
          <div className='flex items-center flex-shrink-0 ml-2'>
             <button
               onClick={() => {
                 if (typeof window !== 'undefined' && textToCopy) {
                   navigator.clipboard.writeText(textToCopy);
                   showToast(t('websiteAnalysis.copiedAll', { defaultValue: 'All content copied' }), 'success');
                 }
               }}
               className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mr-1"
               aria-label={t('websiteAnalysis.copyAllContent', { defaultValue: 'Copy All Content' })}
               title={t('websiteAnalysis.copyAllContent', { defaultValue: 'Copy All Content' })}
               disabled={!textToCopy}
             >
               <BiCopy size={18} />
             </button>
             <button
               onClick={() => setExpanded(!expanded)}
               className="text-green-600 dark:text-green-400 p-1 hover:bg-green-100 dark:hover:bg-green-800/30 rounded"
               aria-label={expanded ? 'Collapse' : 'Expand'}
               title={expanded ? 'Hide details' : 'Show details'}
             >
               {expanded ? <BiChevronUp size={24} /> : <BiChevronDown size={24} />}
             </button>
          </div>
        </div>

        {/* Expandable Content Area */}
        {expanded && (
          <div id="website-content-details" className="bg-white dark:bg-gray-800 p-4 border-t border-green-200 dark:border-green-800/40 space-y-4 text-xs">
             {/* Website Info */}
             <div id="website-info-section" >
                <h5 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">{t('websiteAnalysis.websiteInfo', { defaultValue: 'Website Information' })}</h5>
                <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 pl-1">
                   <p><strong>{t('websiteAnalysis.titleLabel', { defaultValue: 'Title' })}:</strong> {title || 'N/A'}</p>
                   <p><strong>{t('websiteAnalysis.metaDescription', { defaultValue: 'Meta Description' })}:</strong> {metaDescription || 'N/A'}</p>
                </div>
             </div>

            {/* Pages Analyzed */}
            {subpagesScraped && subpagesScraped.length > 0 && (
              <div id="pages-analyzed-section">
                 <h5 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-200 flex items-center">
                    <BiWorld className="mr-1.5 flex-shrink-0" /> {t('websiteAnalysis.pagesAnalyzedTitle', { defaultValue: 'Pages Analyzed ({count}) ', count: subpagesScraped.length.toString() })}
                 </h5>
                 <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                   {subpagesScraped.map((page: string, i: number) => (
                     <li key={i} className="truncate" title={page}>{page}</li>
                   ))}
                 </ul>
              </div>
            )}

            {/* Sample Headings */}
            {headings.length > 0 && (
               <div id="headings-section">
                 <h5 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">{t('websiteAnalysis.sampleHeadings', { defaultValue: 'Sample Headings ({count}) ', count: headingCount.toString() })}</h5>
                 <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc pl-5 space-y-1 max-h-60 overflow-y-auto">
                    {headings.map((heading: string, i: number) => (
                       <li key={i}>{heading}</li>
                    ))}
                 </ul>
              </div>
            )}

            {/* Sample Paragraphs */}
            {paragraphs.length > 0 && (
               <div id="paragraphs-section">
                 <h5 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">{t('websiteAnalysis.sampleParagraphs', { defaultValue: 'Sample Paragraphs ({count}) ', count: paragraphCount.toString() })}</h5>
                 <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2 max-h-80 overflow-y-auto">
                    {paragraphs.map((p: string, i: number) => (
                      <p key={i}>{p}</p>
                    ))}
                 </div>
              </div>
            )}

            {/* Additional Info Sections */}
            {aboutContent && (
               <div id="about-section" className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-100 dark:border-gray-700">
                 <h5 className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t('websiteAnalysis.aboutSection', { defaultValue: 'About' })}</h5>
                 <p className="text-xs text-gray-600 dark:text-gray-400 max-h-60 overflow-y-auto">{aboutContent}</p>
               </div>
            )}
             {productInfo && (
               <div id="product-section" className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-100 dark:border-gray-700">
                 <h5 className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t('websiteAnalysis.productSection', { defaultValue: 'Products/Services' })}</h5>
                 <p className="text-xs text-gray-600 dark:text-gray-400 max-h-60 overflow-y-auto">{productInfo}</p>
               </div>
            )}
             {pricingInfo && (
               <div id="pricing-section" className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-100 dark:border-gray-700">
                 <h5 className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">{t('websiteAnalysis.pricingSection', { defaultValue: 'Pricing' })}</h5>
                 <p className="text-xs text-gray-600 dark:text-gray-400 max-h-60 overflow-y-auto">{pricingInfo}</p>
               </div>
            )}
            { (contactInfo.emails?.length || contactInfo.phones?.length || contactInfo.socialLinks?.length) && (
               <div id="contact-section" className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-100 dark:border-gray-700">
                  <h5 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">{t('websiteAnalysis.contactSection', { defaultValue: 'Contact Information' })}</h5>
                  <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 max-h-60 overflow-y-auto">
                     {contactInfo.emails?.length > 0 && <p><strong>{t('websiteAnalysis.emails', { defaultValue: 'Emails' })}:</strong> {contactInfo.emails.join(', ')}</p>}
                     {contactInfo.phones?.length > 0 && <p><strong>{t('websiteAnalysis.phones', { defaultValue: 'Phones' })}:</strong> {contactInfo.phones.join(', ')}</p>}
                     {contactInfo.socialLinks?.length > 0 && <p><strong>{t('websiteAnalysis.socialLinks', { defaultValue: 'Social Links' })}:</strong> {contactInfo.socialLinks.length} found</p>}
                  </div>
               </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render error message with more information and retry button
  const renderErrorMessage = () => {
    if (!error) return null;
    
    return (
      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-800/40">
        <div className="flex items-start">
          <BiErrorCircle className="mt-0.5 flex-shrink-0 text-red-500 dark:text-red-400 mr-2" size={18} />
          <div>
            <h4 className="text-sm font-medium text-red-800 dark:text-red-300">
              {t('websiteAnalysis.websiteError', { defaultValue: 'Website Analysis Error' })}
            </h4>
            <p className="mt-1 text-xs text-red-700 dark:text-red-400">
              {error}
            </p>
            
            {retryCount > 0 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                {t('websiteAnalysis.retrying', { defaultValue: 'Retrying analysis ({attempt})...', attempt: String(retryCount) })}
              </p>
            )}
            
            {retryCount === 0 && (
              <button
                onClick={() => {
                  setRetryCount(1);
                  handleRetryWithSimpler();
                }}
                className="mt-2 text-xs bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-700/40"
              >
                {t('websiteAnalysis.retrySimpler', { defaultValue: 'Try with simpler analysis' })}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 website-analysis-component">
      <style jsx>{`
        /* Hide duplicate action buttons */
        .website-analysis-component :global([id^="websiteAnalysis-contentDetails"]:not(:first-of-type)),
        .website-analysis-component :global([id^="websiteAnalysis-copyAll"]:not(:first-of-type)),
        .website-analysis-component :global([id^="websiteAnalysis-optimizedFormat"]:not(:first-of-type)) {
          display: none !important;
        }
      `}</style>
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <BiAnalyse className="w-5 h-5 mr-2 text-blue-500" />
          {t('websiteAnalysis.title', { defaultValue: 'Website Analysis' })}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {t('websiteAnalysis.description', { defaultValue: 'Extract information from company websites to enhance your research.' })}
        </p>
        
        <div className="flex">
          <div className="flex-grow">
            <input
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder={t('websiteAnalysis.urlInputPlaceholder', { defaultValue: 'Enter website URL (e.g., example.com)' })}
              className="w-full p-2 border border-gray-300 rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              disabled={isLoading}
            />
          </div>
          
          <div className="ml-2">
            {/* Remove Important pages dropdown and associated elements */}
            {/* 
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <BiNetworkChart className="mr-1" />
              {t('websiteAnalysis.crawlInfo', { defaultValue: 'Will crawl links for comprehensive analysis' })}
            </div>
            */}
            {/*
            <select
              value={maxDepth}
              onChange={handleMaxDepthChange}
              disabled={isLoading}
              className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value={1}>{t('websiteAnalysis.depth.homeOnly', { defaultValue: 'Home page only' })}</option>
              <option value={2}>{t('websiteAnalysis.depth.importantPages', { defaultValue: 'Important pages (About, Contact, etc.)' })}</option>
              <option value={3}>{t('websiteAnalysis.depth.comprehensive', { defaultValue: 'More comprehensive (up to 5 pages)' })}</option>
            </select>
            */}
            <button
              type="button"
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
                  {t('websiteAnalysis.analyzing', { defaultValue: 'Analyzing...' })}
                </div>
              ) : (
                t('websiteAnalysis.analyze', { defaultValue: 'Analyze Website' })
              )}
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('websiteAnalysis.urlHint', { defaultValue: 'You can enter URLs with or without https://' })}
          {maxDepth > 1 && (
            <span className="ml-1 text-blue-600 dark:text-blue-400">
              • {t('websiteAnalysis.crawlLevelInfo', { defaultValue: 'Will crawl up to {maxDepth} levels of links', maxDepth: maxDepth.toString() })}
            </span>
          )}
        </p>
      </div>
      
      {renderErrorMessage()}
      
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
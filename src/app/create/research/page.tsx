/**
 * Research Page Component
 * 
 * This page displays research options for content generation. Users can choose between:
 * 1. Using Perplexity Deep Research to generate basic research
 * 2. Using trending topics from Reddit and RSS feeds
 * 
 * After initial research, users can generate more detailed analysis with the research process.
 */

"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AppShell from '../../../components/AppShell';
import { TrendingTopic } from '@/app/lib/api/trendingTypes';
import { TrendingResult } from '@/app/lib/api/trendingService';
import { generateResearch } from '@/app/lib/api/trendService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeSanitize from 'rehype-sanitize';
import ApiKeySetupGuide from '../../../components/ApiKeySetupGuide';
import ContentTypeRecommendations from '@/components/ContentTypeRecommendations';
import { toast } from 'react-hot-toast';
import { MODEL_CONFIG, getProcessDescription } from '@/app/lib/modelConfig';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { IconArrowDown, IconArrowRight } from '@tabler/icons-react';
import { useAuth } from '@/lib/hooks/useAuth';  // Add useAuth import
import ResearchActionButtons from '@/components/ResearchActionButtons';
import { 
  platformToContentType, 
  contentTypeDisplayNames, 
  platformDisplayNames, 
  getDisplayNames 
} from '@/app/lib/contentTypeDetection';

// Add declaration for global EventSource property
declare global {
  interface Window {
    researchEventSource: EventSource | null;
  }
}

// Define type for the ReactMarkdown code component to include inline property
type CodeProps = {
  node?: any;
  inline?: boolean; 
  className?: string;
  children?: React.ReactNode;
};

// Add back the ResearchResults interface at the top level
interface ResearchResults {
  researchMethod: 'perplexity' | 'trending' | 'claude' | 'perplexity-fallback' | 'perplexity-mock' | 'fallback' | 'emergency-fallback';
  perplexityResearch?: string;
  trendingTopics?: TrendingTopic[];
  dataSources?: {
    reddit: boolean;
    rss: boolean;
  };
  claudeResearch?: string;
}

// Add ContentDetails interface definition
interface ContentDetails {
  contentType: string;
  platform: string;
  researchTopic: string;
  targetAudience: string;
  businessType: string;
  userId?: string; // Make userId optional
  isPersonalUseCase?: boolean; // Make isPersonalUseCase optional
  youtubeTranscript?: string;
  youtubeUrl?: string;
  language?: string;
  // Add the missing properties
  subPlatform?: string;
  audienceNeeds?: string;
  primarySubject?: string;
  subjectDetails?: string;
  businessName?: string; // Add businessName field
  websiteContent?: {
    title?: string;
    paragraphs?: string[];
    headings?: string[];
    aboutContent?: string;
    productInfo?: string;
    contactInfo?: {
      emails?: string[];
      phones?: string[];
    };
  };
}

// Replace the existing platformToContentType mapping with an expanded version
// Now using the imported definition from contentTypeDetection.ts

// Helper function to get display names
const getFormattedContentType = (
  contentType: string, 
  platform: string, 
  subPlatform?: string,
  currentLanguage: string = 'en'
): { displayContentType: string, displayPlatform: string } => {
  // Use the imported getDisplayNames function
  return getDisplayNames(contentType, platform, subPlatform || '', currentLanguage);
};

// Add detectPersonalUseCase definition
const detectPersonalUseCase = (topic: string): boolean => {
  if (!topic) return false;
  
  const topicLower = topic.toLowerCase();
  
  // Business-oriented keywords
  const businessKeywords = [
    'business', 'company', 'professional', 'commerce',
    'product', 'service', 'market', 'client', 'customer'
  ];
  
  // Check for business indicators
  if (businessKeywords.some(keyword => topicLower.includes(keyword))) {
    return false;
  }
  
  // Personal-oriented keywords
  const personalKeywords = [
    'personal', 'family', 'hobby', 'home', 'travel', 'lifestyle',
    'recipe', 'cooking', 'fitness', 'education'
  ];
  
  // Look for personal keywords
  return personalKeywords.some(keyword => topicLower.includes(keyword));
};

export default function ResearchPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { user, loading: authLoading } = useAuth(); // Add auth usage
  
  // Add state for auth prompt
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  // Add error state
  const [errorState, setErrorState] = useState<{
    hasError: boolean;
    message: string;
  }>({
    hasError: false,
    message: ''
  });
  
  // Helper function to ensure we always get a string from translation
  const safeTranslate = (key: string, fallback: string): string => {
    const translated = t(key);
    if (typeof translated === 'string') {
      return translated;
    }
    console.warn(`Translation for key "${key}" returned non-string value:`, translated);
    return fallback;
  };
  
  /**
   * Removes thinking tags from content
   */
  const removeThinkingTags = (content: string): string => {
    if (!content) return '';
    
    return content
      // Remove both thinking tag variants
      .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
      .replace(/<thinking[\s\S]*?thinking>/g, '')
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/<think[\s\S]*?think>/g, '');
  };
  
  /**
   * Thoroughly clean research content to remove any template language or placeholders
   */
  const cleanResearchContent = (content: string): string => {
    if (!content) return '';
    
    // Remove thinking tags and their content
    let cleaned = removeThinkingTags(content);

    // Remove excessive blank lines (more than 2 consecutive)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Enhance headings with better formatting
    cleaned = cleaned.replace(/^# (.*?)$/gm, '# 📊 $1');
    cleaned = cleaned.replace(/^## (.*?)$/gm, '## 🔍 $1');
    cleaned = cleaned.replace(/^### (.*?)$/gm, '### 📈 $1');
    
    // Enhance key sections with better formatting
    cleaned = cleaned.replace(/(?:market overview|Market Overview)/g, '## 🌐 Market Overview');
    cleaned = cleaned.replace(/(?:competitive landscape|Competitive Landscape)/g, '## 🏆 Competitive Landscape');
    cleaned = cleaned.replace(/(?:consumer pain points|Consumer Pain Points|Customer Pain Points)/g, '## 😣 Consumer Pain Points');
    cleaned = cleaned.replace(/(?:key takeaways|Key Takeaways)/g, '## 💡 Key Takeaways');
    cleaned = cleaned.replace(/(?:recommendations|Recommendations|Action Items)/g, '## 🚀 Recommendations');
    cleaned = cleaned.replace(/(?:keywords|Keywords|Key Terms)/g, '## 🔑 Keywords');
    cleaned = cleaned.replace(/(?:best practices|Best Practices)/g, '## ✅ Best Practices');
    cleaned = cleaned.replace(/(?:statistics|Statistics|Key Stats)/g, '## 📊 Statistics');
    cleaned = cleaned.replace(/(?:trends|Trends|Current Trends)/g, '## 📈 Trends');
    
    // Enhance bullet points with better formatting
    cleaned = cleaned.replace(/^(\s*)-\s+(.+)$/gm, '$1• $2');
    
    // Highlight data points and percentages
    cleaned = cleaned.replace(/(\d+%)/g, '**$1**');
    cleaned = cleaned.replace(/(\$\d+(?:\.\d+)? (?:billion|million|trillion))/gi, '**$1**');
    
    // Highlight year ranges
    cleaned = cleaned.replace(/\b(20\d\d-20\d\d)\b/g, '**$1**');
    
    // Add markdown table formatting to improve any tabular data
    cleaned = cleaned.replace(/(\|\s*[^|]+\s*\|\s*[^|]+\s*\|)/g, '$1\n| --- | --- |');
    
    // Add a professional summary box at the end if there's no conclusion
    if (!cleaned.includes('# Conclusion') && !cleaned.includes('## Conclusion')) {
      cleaned += '\n\n## 🔄 Summary\n\nThis research provides a comprehensive overview of the topic, including market analysis, competitive landscape, and strategic recommendations. Use these insights to inform your content strategy and connect with your target audience effectively.';
    }
    
    return cleaned;
  };
  
  /**
   * Generate research with Perplexity
   * Simplified implementation to fix the error
   */
  const generatePerplexityResearch = async (
    topic: string,
    context: string,
    sources?: string[],
    language?: string,
    companyName?: string,
    websiteContent?: any
  ): Promise<string> => {
    console.log('Calling Perplexity research API with:', { 
      topic, 
      context,
      sources: sources || [],
      language,
      companyName,
      hasWebsiteContent: !!websiteContent
    });
    
    // Validate topic to ensure it's not empty
    if (!topic || topic.trim() === '') {
      throw new Error('Empty research topic provided to Perplexity API');
    }
    
    // Log special message for company-specific research
    if (companyName) {
      console.log(`📊 Performing company-specific research on "${companyName}" - Will prioritize official website and social media sources`);
    }
    
    // Add timestamp for tracking request duration
    const startTime = Date.now();
    
    const response = await fetch('/api/perplexity/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: topic.trim(),
        context: context.trim(),
        sources: sources || [],
        language,
        companyName,
        websiteContent // Include website content if available
      }),
    });
    
    // Calculate request duration
    const duration = Date.now() - startTime;
    console.log(`Perplexity research request completed in ${duration}ms`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Better handling for specific error types
      if (response.status === 504) {
        console.error('Perplexity research request timed out (504 Gateway Timeout)');
        throw new Error('Research generation timed out. Please try again with a more specific topic or try later when the service is less busy.');
      } else if (response.status === 503) {
        console.error('Perplexity research service temporarily unavailable (503)');
        throw new Error('The research service is temporarily unavailable. Please try again in a few minutes.');
      } else {
        console.error(`API error (${response.status}):`, errorData);
        throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
    }
    
    const data = await response.json();
    
    // Check for company research validation
    if (companyName && data.companyResearchValidation && !data.companyResearchValidation.isValid) {
      console.warn(`⚠️ Company research validation failed: ${data.companyResearchValidation.message}`);
      
      // Show toast notification about the issue
      if (typeof window !== 'undefined' && window.document) {
        // Add to session storage to display warning on research page
        sessionStorage.setItem('companyResearchWarning', data.companyResearchValidation.message);
      }
    }
    
    // Verify that company research was included if requested
    if (companyName && data.research) {
      const researchText = data.research.toLowerCase();
      const companyLower = companyName.toLowerCase();
      
      // Check if company name appears frequently in the research
      const companyNameMatches = (researchText.match(new RegExp(companyLower, 'g')) || []).length;
      
      if (companyNameMatches < 5) {
        console.warn(`⚠️ Warning: Company name "${companyName}" only appears ${companyNameMatches} times in the research. The research may not contain sufficient company-specific information.`);
      } else {
        console.log(`✓ Company name "${companyName}" appears ${companyNameMatches} times in the research.`);
      }
      
      // Check for website citations
      const hasWebsiteCitation = researchText.includes(`${companyLower}'s website`) || 
                                researchText.includes(`${companyLower} website`) ||
                                researchText.includes(`official website`);
                                
      // Check for LinkedIn citations
      const hasLinkedInCitation = researchText.includes('linkedin') || researchText.includes('linked in');
      
      // Check for social media citations
      const hasSocialMediaCitation = researchText.includes('facebook') || 
                                    researchText.includes('twitter') || 
                                    researchText.includes('instagram') ||
                                    researchText.includes('social media');
      
      if (!hasWebsiteCitation) {
        console.warn(`⚠️ Warning: No explicit citations of ${companyName}'s website found in the research.`);
      }
      
      if (!hasLinkedInCitation) {
        console.warn(`⚠️ Warning: No LinkedIn citations found in the research.`);
      }
      
      if (!hasSocialMediaCitation) {
        console.warn(`⚠️ Warning: No social media citations found in the research.`);
      }
    }
    
    if (!data.research) {
      throw new Error('No research content returned from Perplexity API');
    }
    
    return data.research;
  };
  
  /**
   * Fetch trending topics from the API based on business type
   * Simplified implementation to fix the error
   */
  const fetchTrendingTopics = async (businessType: string, sources: string[] = ['rss']): Promise<TrendingResult> => {
    try {
      // Build sources parameter - default to RSS
      const sourcesParam = sources.length > 0 
        ? sources.join(',') 
        : 'rss'; // Default to RSS if none selected
      
      // Fetch trending topics with real data only
      const response = await fetch(`/api/trending?businessType=${encodeURIComponent(businessType)}&sources=${sourcesParam}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || `Failed to fetch trending topics: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching trending topics:', error);
      throw error;
    }
  };
  
  // State variables
  const [currentStep, setCurrentStep] = useState(1);
  const [contentDetails, setContentDetails] = useState<ContentDetails | null>(null);
  const [selectedResearchMethods, setSelectedResearchMethods] = useState<string[]>(['perplexity']);
  const [researchStep, setResearchStep] = useState(1);
  const [showResearchResults, setShowResearchResults] = useState(true);
  
  // State for Perplexity research
  const [basicResearch, setBasicResearch] = useState<string | null>(null);
  const [deepResearch, setDeepResearch] = useState<string | null>(null);
  const [showFullResearch, setShowFullResearch] = useState(false);
  
  // Add loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Add missing state variables for trending topics
  const [trendingResult, setTrendingResult] = useState<TrendingResult | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<TrendingTopic[]>([]);
  
  // State for follow-up questions
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [selectedFollowUpQuestions, setSelectedFollowUpQuestions] = useState<string[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>(['', '', '']);
  const [showFollowUpQuestions, setShowFollowUpQuestions] = useState(false);
  const [followUpSubmitted, setFollowUpSubmitted] = useState(false);
  
  // Add state for API setup guide
  const [showApiSetupGuide, setShowApiSetupGuide] = useState(false);
  const [apiTypeToSetup, setApiTypeToSetup] = useState<'anthropic' | 'perplexity'>('anthropic');
  
  // Add the missing state variables
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>(['reddit', 'rss']);
  const [selectedTrendingTopics, setSelectedTrendingTopics] = useState<TrendingTopic[]>([]);
  const [selectedTrendingSources, setSelectedTrendingSources] = useState<string[]>(['rss']);
  
  // Add state for preview connections
  const [topicConnections, setTopicConnections] = useState<{ [key: string]: string }>({});
  const [showingConnections, setShowingConnections] = useState(false);
  
  // Add a ref to track if we're already fetching trending topics
  const isFetchingTrendingRef = useRef(false);
  
  // Add this near the top of your component, with other state declarations
  const [isGenerateDeepResearchDebounced, setIsGenerateDeepResearchDebounced] = useState(false);
  
  // Add a state to track if we're in personal mode
  const [isPersonalUseCase, setIsPersonalUseCase] = useState<boolean>(false);
  
  // Add a state for retry count
  const [retryCount, setRetryCount] = useState<number>(0);
  const MAX_RETRIES = 2; // Maximum number of automatic retries
  
  // Add a controller ref at the component level
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Add research results state
  const [researchResults, setResearchResults] = useState<{
    claudeResearch?: string;
    perplexityResearch?: string;
    researchMethod?: 'claude' | 'perplexity' | 'perplexity-fallback' | 'perplexity-mock' | 'fallback' | 'emergency-fallback';
  }>({});
  
  // Add state for research content expansion
  const [isResearchExpanded, setIsResearchExpanded] = useState(false);
  const researchRef = useRef<HTMLDivElement>(null);
  
  // Add toggle function for research content expansion
  const toggleResearchExpansion = () => {
    setIsResearchExpanded(!isResearchExpanded);
  };
  
  // Initialize content details from URL or session storage
  useEffect(() => {
    // Only try to load content details if in the browser environment
    if (typeof window !== 'undefined') {
      try {
        const savedContentDetails = sessionStorage.getItem('contentDetails');
        if (savedContentDetails) {
          const parsedContentDetails = JSON.parse(savedContentDetails);
          
          // Determine appropriate content type based on platform/subplatform
          let contentType = (() => {
            // For blog-related platforms/subplatforms, always use blog-post
            if (parsedContentDetails.platform === 'blog' || 
                parsedContentDetails.platform === 'medium' || 
                parsedContentDetails.subPlatform === 'medium' || 
                parsedContentDetails.subPlatform === 'wordpress' || 
                parsedContentDetails.subPlatform === 'company-blog') {
              console.log('Setting content type to blog-post for Blog-related platform/subplatform');
              return 'blog-post';
            }
            
            // For social platforms
            if (parsedContentDetails.platform === 'social' || 
                ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'].includes(parsedContentDetails.subPlatform || '')) {
              return 'social-post';
            }
            
            // For other platforms, use the provided content type
            return parsedContentDetails.contentType || '';
          })();
          
          // Build a safe object with fallbacks for all required fields
          const safeContentDetails = {
            researchTopic: 
              parsedContentDetails.researchTopic || 
              parsedContentDetails.primarySubject || 
              parsedContentDetails.topic || 
              'content creation',
            businessType: parsedContentDetails.businessType || '',
            targetAudience: parsedContentDetails.targetAudience || '',
            audienceNeeds: parsedContentDetails.audienceNeeds || '',
            platform: parsedContentDetails.platform || '',
            contentType: contentType,
            subPlatform: parsedContentDetails.subPlatform || '',
            isPersonalUseCase: detectPersonalUseCase(parsedContentDetails.researchTopic || parsedContentDetails.primarySubject || ''),
            primarySubject: parsedContentDetails.primarySubject || parsedContentDetails.researchTopic || '',
            subjectDetails: parsedContentDetails.subjectDetails || '',
            youtubeTranscript: parsedContentDetails.youtubeTranscript || '',
            youtubeUrl: parsedContentDetails.youtubeUrl || '',
            businessName: parsedContentDetails.businessName || '', // Add businessName field
            websiteContent: parsedContentDetails.websiteContent || null, // Add websiteContent field
          };
          
          // Update state with validated content details
          setContentDetails(safeContentDetails);
        }
      } catch (error) {
        // Silent fail - default values will be used
      }
    }
  }, []);
  
  // Add this right after the useEffect for initializing content details
  // This will check the URL for a query parameter specifying which step to show

  useEffect(() => {
    // Only try to parse URL params in the browser environment
    if (typeof window !== 'undefined') {
      // Get the step from the URL query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const stepParam = urlParams.get('step');
      
      if (stepParam) {
        const parsedStep = parseInt(stepParam, 10);
        // Only set the step if it's valid (1-5)
        if (!isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= 5) {
          setResearchStep(parsedStep);
        }
      }
    }
  }, []);
  
  // Function to generate follow-up questions
  // Now using AI to generate truly tailored questions
  const generateFollowUpQuestions = async () => {
    if (!contentDetails) return;
    
    setIsLoading(true);
    setError(''); // Clear any previous errors
    
    try {
      // Prepare request payload
      const payload = {
        ...contentDetails,
        isPersonalUseCase: detectPersonalUseCase(contentDetails.researchTopic),
        language // Pass the current language to the API
      };
      
      console.log('[DEBUG] Generating follow-up questions with language:', language);
      
      const response = await fetch('/api/claude/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate follow-up questions');
      }
      
      const data = await response.json();
      
      if (data.questions && Array.isArray(data.questions)) {
        setFollowUpQuestions(data.questions);
        setResearchStep(2); // Use the correct state setter
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      setError(`Failed to generate questions: ${error.message}`);
      toast.error(error.message || 'Failed to generate follow-up questions');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a useEffect to log step changes for debugging
  useEffect(() => {
    console.log(`[DEBUG] Research step changed to: ${researchStep}`);
    console.log(`[DEBUG] Deep research data present: ${!!deepResearch}`);
    console.log(`[DEBUG] Is generating: ${isGenerating}`);
    console.log(`[DEBUG] Error state: ${error ? 'Yes' : 'No'}`);
  }, [researchStep, deepResearch, isGenerating, error]);
  
  // Handle fetching data based on selected research method
  const fetchInitialResearch = async () => {
    if (!safeContentDetails) {
      console.error('Cannot generate research: Content details are missing');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Build simple context with content details
      const context = `Target Audience: ${safeContentDetails.targetAudience || 'general audience'}, 
                     Audience Needs: ${safeContentDetails.audienceNeeds || 'not specified'}, 
                     Content Type: ${safeContentDetails.contentType || 'social-media'}, 
                     Platform: ${safeContentDetails.platform || 'facebook'}`;
      
      const sources = ['recent', 'scholar'];
      
      console.log('Generating basic research with Perplexity');
      console.log('Language:', language);
      
      // Call generatePerplexityResearch with the language parameter
      const research = await generatePerplexityResearch(
        safeContentDetails.researchTopic || '',
        context,
        sources,
        language
      );
      
      // Clean the research content before setting it
      setBasicResearch(cleanResearchContent(research));
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching initial research:', error);
      setIsLoading(false);
    }
  };
  
  // Add a useEffect to automatically transition to step 3 when research is complete
  useEffect(() => {
    if (deepResearch && !isGenerating) {
      console.log('Auto-transitioning to research complete step');
      
      // Use a slight delay to ensure UI is updated
      const timer = setTimeout(() => {
        setResearchStep(3);
        // Make sure we save the research results again just in case
        const researchResults: ResearchResults = {
          researchMethod: 'perplexity',
          perplexityResearch: deepResearch,
          trendingTopics: [],
          dataSources: {
            reddit: true,
            rss: true
          }
        };
        sessionStorage.setItem('researchResults', JSON.stringify(researchResults));
        console.log('Research step set to 3 (complete) and data saved');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [deepResearch, isGenerating]);
  
  // Update the handleGenerateDeepResearch function to use Perplexity instead of Claude
  const handleGenerateDeepResearch = async () => {
    // Prevent multiple simultaneous calls using debounce
    if (isGenerating || isGenerateDeepResearchDebounced) {
      console.log('[DEBUG] Skipping research generation - already in progress');
      return;
    }
    
    console.log('[DEBUG] Button clicked! Starting research generation with Perplexity');
    
    // Reset error state at the beginning
    setErrorState({
      hasError: false,
      message: ''
    });
    
    try {
      // Set debounce flag to prevent multiple calls
      setIsGenerateDeepResearchDebounced(true);
      
      console.log('[DEBUG] Starting deep research generation with Perplexity Deep Research');
      setIsLoading(true);
      setIsGenerating(true);
      setStatusMessage(language === 'es' 
        ? 'Generando análisis profundo con Perplexity Deep Research...' 
        : 'Generating deep analysis with Perplexity Deep Research...');
      setGenerationProgress(0);
      
      // Make sure we use the safe version of contentDetails with defaults
      const safeContentDetails = contentDetails ? {
        ...contentDetails,
        // Ensure consistent content type based on platform/subPlatform
        contentType: (() => {
          // For blog-related platforms/subplatforms, always use blog-post
          if (contentDetails.platform === 'blog' || 
              contentDetails.platform === 'medium' || 
              contentDetails.subPlatform === 'medium' || 
              contentDetails.subPlatform === 'wordpress' || 
              contentDetails.subPlatform === 'company-blog') {
            return 'blog-post';
          }
          
          // For social platforms
          if (contentDetails.platform === 'social' || 
              ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'].includes(contentDetails.subPlatform || '')) {
            return 'social-post';
          }
          
          // For presentation platforms
          if (contentDetails.platform === 'presentation' || 
              ['business', 'executive', 'sales', 'training', 'investor'].includes(contentDetails.subPlatform || '')) {
            return 'presentation';
          }
          
          // For email platforms
          if (contentDetails.platform === 'email' || 
              ['newsletter', 'marketing', 'sales', 'welcome'].includes(contentDetails.subPlatform || '')) {
            return 'email';
          }
          
          // For YouTube/video platforms
          if (contentDetails.platform === 'youtube' || 
              contentDetails.platform === 'video-script' ||
              ['educational', 'entertainment', 'review', 'travel', 'daily', 'tutorial-vlog'].includes(contentDetails.subPlatform || '')) {
            return contentDetails.platform === 'youtube' ? 'youtube-script' : 'video-script';
          }
          
          // Default: use the existing content type or fallback to social-media
          return contentDetails.contentType || 'social-media';
        })(),
      } : {
        contentType: 'social-media',
        platform: 'facebook',
        subPlatform: '',
        targetAudience: 'general audience',
        audienceNeeds: '',
        businessType: '',
        researchTopic: '',
        primarySubject: '',
        businessName: '',
        subjectDetails: '',
        youtubeTranscript: '',
        youtubeUrl: '',
        websiteContent: null // Add websiteContent to the safe defaults
      };
      
      // Use optional chaining for all contentDetails access
      const topic = safeContentDetails.primarySubject || safeContentDetails.businessType || '';
      
      console.log('[DEBUG] Research topic:', topic);
      
      if (!topic) {
        throw new Error(language === 'es' 
          ? 'No se ha especificado un tema de investigación' 
          : 'No research topic specified');
      }
      
      // Enhanced company name detection - check multiple sources
      // First check if businessName is available and non-empty
      let companyName = safeContentDetails.businessName?.trim() || '';
      
      // If no businessName but we have businessType, use that as fallback
      if (!companyName && safeContentDetails.businessType) {
        // Only use businessType as company name if it's not already part of the topic
        // This avoids duplication in research prompts
        if (!topic.toLowerCase().includes(safeContentDetails.businessType.toLowerCase())) {
          companyName = safeContentDetails.businessType.trim();
        }
      }
      
      // Check for company mentions in primarySubject
      if (!companyName && safeContentDetails.primarySubject) {
        // Check if primarySubject contains a potential company name 
        // Look for capitalized words that might be company names
        const words = safeContentDetails.primarySubject.split(' ');
        for (const word of words) {
          // Look for capitalized words that might be company names
          if (word.length > 2 && word[0] === word[0].toUpperCase() && !['The', 'And', 'For', 'With'].includes(word)) {
            companyName = word.replace(/[,.;:'"!?()]/g, ''); // Remove punctuation
            console.log('[DEBUG] Extracted potential company name from primary subject:', companyName);
            break;
          }
        }
      }
      
      // For "Tranont" specific handling - if user mentioned it in topic or audience needs
      if (!companyName) {
        // Check if Tranont appears in the research topic
        if (topic.toLowerCase().includes('tranont')) {
          companyName = 'Tranont';
        } 
        // Check if Tranont appears in audience needs
        else if (safeContentDetails.audienceNeeds?.toLowerCase().includes('tranont')) {
          companyName = 'Tranont';
        }
      }
      
      console.log('[DEBUG] Company name for research:', companyName || 'None specified');
      
      // Build base context without trending topics
      const baseContext = `Target Audience: ${safeContentDetails.targetAudience || 'general audience'}, 
                        Audience Needs: ${safeContentDetails.audienceNeeds || 'not specified'}, 
                        Content Type: ${safeContentDetails.contentType || 'social-media'}, 
                        Platform: ${safeContentDetails.platform || 'facebook'},
                        ${safeContentDetails.subPlatform ? `Sub-Platform: ${safeContentDetails.subPlatform}` : ''}`;
      
      // Sources for Perplexity research - using both recent and scholarly sources
      const sources = ['recent', 'scholar'];
      
      // Generate research with Perplexity
      setStatusMessage(safeTranslate('researchPage.progress.starting', 'Starting {service} analysis...').replace('{service}', 'Perplexity Deep Research'));
      
      console.log(`Starting research generation with business name: ${companyName || 'N/A'}`);
      
      // Get website content from contentDetails and log details
      const websiteContent = safeContentDetails.websiteContent;
      if (websiteContent) {
        console.log('📊 Website content will be used for enhanced company research:');
        console.log(`   - Title: ${websiteContent.title || 'Not available'}`);
        console.log(`   - Headings: ${websiteContent.headings?.length || 0}`);
        console.log(`   - Paragraphs: ${websiteContent.paragraphs?.length || 0}`);
        console.log(`   - Has About content: ${!!websiteContent.aboutContent}`);
        console.log(`   - Has Product info: ${!!websiteContent.productInfo}`);
        if (websiteContent.contactInfo) {
          console.log(`   - Contact info: ${websiteContent.contactInfo.emails?.length || 0} emails, ${websiteContent.contactInfo.phones?.length || 0} phones`);
        }
      } else {
        console.log('⚠️ No website content available - research will rely on Perplexity search only');
      }
      
      // Show 25% progress while preparing request
      setGenerationProgress(25);
      
      // Use SSE (Server-Sent Events) instead of regular fetch for streaming response
      const eventSourceUrl = `/api/perplexity/research-sse?t=${Date.now()}`;
      console.log(`[DEBUG] Opening SSE connection to: ${eventSourceUrl}`);
      
      // Close any existing connection first
      if (window.researchEventSource && window.researchEventSource.readyState !== 2) {
        console.log('[DEBUG] Closing existing EventSource connection');
        window.researchEventSource.close();
      }
      
      // Create new connection with proper error handling
      const eventSource = new EventSource(eventSourceUrl);
      // Store in window for potential cleanup later
      window.researchEventSource = eventSource;
      
      let researchText = '';
      let retryCount = 0;
      const MAX_RETRIES = 3;
      
      // Set up connection open handler
      eventSource.onopen = (event) => {
        console.log('[DEBUG] SSE connection opened successfully');
        retryCount = 0; // Reset retry count on successful connection
        
        // After connection is established, send the actual request
        fetch('/api/perplexity/research-sse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: safeContentDetails?.researchTopic || '',
            context: safeContentDetails?.researchTopic 
              ? `Topic: "${safeContentDetails.researchTopic}"
Platform: ${safeContentDetails.platform || 'facebook'}, 
Sub-Platform: ${safeContentDetails.subPlatform || ''},
Content Type: ${safeContentDetails.contentType || 'social-post'},
Target Audience: ${safeContentDetails.targetAudience || 'general'},
Business Name: ${safeContentDetails.businessName || ''},
Language: ${language || 'en'}`
              : '', 
            sources: ['recent', 'scholar', 'news'],
            language,
            companyName: safeContentDetails?.businessName || '',
            websiteContent: safeContentDetails?.websiteContent || null
          }),
        }).catch(error => {
          console.error('[DEBUG] Error initiating research request:', error);
          eventSource.close();
          setError('Failed to start research process. Please try again.');
          setIsGenerating(false);
          setIsLoading(false);
        });
      };
      
      // Define interface for SSE event with data property
      interface MessageEvent extends Event {
        data: string;
      }
      
      // Set up listeners for the different event types
      eventSource.addEventListener('progress', (event: Event) => {
        const messageEvent = event as MessageEvent;
        try {
          const data = JSON.parse(messageEvent.data);
          console.log('[DEBUG] Progress update:', data);
          setGenerationProgress(data.progress);
          setStatusMessage(data.status);
        } catch (e) {
          console.error('[DEBUG] Error parsing progress event data:', e);
        }
      });
      
      eventSource.addEventListener('complete', (event: Event) => {
        const messageEvent = event as MessageEvent;
        try {
          const data = JSON.parse(messageEvent.data);
          console.log('[DEBUG] Research complete:', data);
          
          // Save the full research
          if (data.research) {
            // Clean the research text and store it
            const cleanedResearch = removeThinkingTags(data.research);
            researchText = cleanedResearch;
            setDeepResearch(cleanedResearch);
            
            // Store the clean research in session storage
            sessionStorage.setItem('deepResearch', cleanedResearch);
            
            // Save research results
            const researchResults = {
              researchMethod: 'perplexity',
              perplexityResearch: cleanedResearch
            };
            sessionStorage.setItem('researchResults', JSON.stringify(researchResults));
            
            // Move to the next step
            setResearchStep(4);
            
            // Show success toast
            toast.success(safeTranslate('researchPage.researchCompleteToast', 'Perplexity Deep Research completed successfully!'));
            
            // Update progress to 100%
            setGenerationProgress(100);
            setStatusMessage(safeTranslate('researchPage.progress.complete', 'Research complete!'));
          }
          
          // Close the connection when complete
          eventSource.close();
          setIsGenerating(false);
          setIsLoading(false);
        } catch (e) {
          console.error('[DEBUG] Error parsing complete event data:', e);
          setError('Error processing research results. Please try again.');
          eventSource.close();
          setIsGenerating(false);
          setIsLoading(false);
        }
      });
      
      eventSource.addEventListener('error', (event: Event) => {
        console.error('[DEBUG] SSE error event received:', event);
        
        // Try to extract error details from the event
        let errorMessage = 'An error occurred during research generation.';
        try {
          // Try to parse error data if available
          const messageEvent = event as MessageEvent;
          if (messageEvent.data) {
            const errorData = JSON.parse(messageEvent.data);
            errorMessage = errorData.error || errorMessage;
          }
        } catch (e) {
          // If we can't parse the error, use a generic message
          console.error('Could not parse error data:', e);
        }
        
        // With Pro plan's longer function duration, timeouts are less likely
        // but still possible for very complex research
        if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          errorMessage = 'The research request is taking longer than expected. With your Pro plan, we can process complex requests up to 5 minutes. Please wait a moment and try again if needed.';
        }
        
        // Set error message
        setError(errorMessage);
        setStatusMessage('Error generating research');
        
        // Close the SSE connection
        eventSource.close();
        setIsGenerating(false);
        setIsLoading(false);
        
        // Show error toast
        toast.error(errorMessage);
      });
      
      // Handle general connection errors (this is different from the error event)
      eventSource.onerror = (error) => {
        console.error('[DEBUG] SSE connection error:', error);
        
        // Implement retry logic
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`[DEBUG] Attempting to reconnect... (Attempt ${retryCount})`);
          // No need to create a new EventSource, it will try to reconnect automatically
          return;
        }
        
        // If we've exceeded retry attempts, give up and close the connection
        const errorMessage = 'Research generation connection error. The process may still be running in the background. Please try refreshing the page to check for results or try again.';
        
        // Set error message
        setError(errorMessage);
        setStatusMessage('Connection error');
        
        // Close the SSE connection
        eventSource.close();
        setIsGenerating(false);
        setIsLoading(false);
        
        // Show error toast
        toast.error(errorMessage);
      };
      
      // Set a backup timeout to close the connection if nothing happens for 10 minutes
      const timeoutId = setTimeout(() => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          console.log('[DEBUG] Closing SSE connection after 10 minute timeout');
          eventSource.close();
          setError('Research generation timed out after 10 minutes. Please check back later for results or try again.');
          setIsGenerating(false);
          setIsLoading(false);
          toast.error('Research generation timed out after 10 minutes.');
        }
      }, 600000); // 10 minutes
      
      // Add a cleanup function for component unmount
      return () => {
        clearTimeout(timeoutId);
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
        }
      };
    } catch (error: any) {
      console.error('[DEBUG] Error in handleDeepAnalysisClick:', error);
      
      // Create a user-friendly error message
      let errorMessage = `Error: ${error.message || 'Unknown error. Please try again.'}`;
      
      setError(errorMessage);
      setIsLoading(false);
      setIsGenerating(false);
      
      // Show toast notification
      toast.error(errorMessage);
    }
  };

  // Helper function to build research context - simplified without trending data
  const buildResearchContext = (trendingData: TrendingResult | null, selectedTopicsList?: TrendingTopic[]) => {
    // Determine the most specific platform to use (prefer subPlatform over generic platform)
    let platformToUse = safeContentDetails?.platform || 'facebook';
    
    // If platform is 'social' but we have a more specific subPlatform, use that instead
    if (platformToUse === 'social' && safeContentDetails?.subPlatform) {
      platformToUse = safeContentDetails.subPlatform;
      console.log('Using specific sub-platform for research:', platformToUse);
    }
    
    // Use the getFormattedContentType helper to get properly formatted display values
    const { displayPlatform, displayContentType } = getFormattedContentType(
      safeContentDetails?.contentType || 'social-media',
      platformToUse,
      safeContentDetails?.subPlatform
    );
    
    // Base context from content details with optional chaining and formatted values
    const baseContext = `Target Audience: ${safeContentDetails?.targetAudience || 'general audience'}, 
                       Audience Needs: ${safeContentDetails?.audienceNeeds || 'not specified'}, 
                       Content Type: ${displayContentType}, 
                       Platform: ${displayPlatform}`;
    
    // Log the context being used
    console.log('Research context built:', baseContext);
    
    return baseContext;
  };
  
  // Handle fetching trending topics when user switches to trending mode
  useEffect(() => {
    const fetchTrending = async () => {
      // Check if we should fetch trending topics and aren't already fetching
      if (
        selectedResearchMethods.includes('trending') && 
        !trendingResult && 
        contentDetails?.businessType && // Use optional chaining
        researchStep === 2 && 
        !isFetchingTrendingRef.current
      ) {
        try {
          // Set the ref to true to prevent multiple fetches
          isFetchingTrendingRef.current = true;
          setIsLoading(true);
          setError(null);
          
          // Use optional chaining consistently
          const businessType = contentDetails?.businessType || '';
          console.log('Fetching trending topics for:', businessType, 'with sources:', selectedTrendingSources);
          const result = await fetchTrendingTopics(businessType, selectedTrendingSources);
          console.log('Trending topics result:', result);
          setTrendingResult(result);
        } catch (err: any) {
          console.error('Failed to fetch trending topics:', err);
          setError(err.message || 'Failed to fetch trending topics');
        } finally {
          setIsLoading(false);
          // Always reset the ref after fetch completes (success or error)
          isFetchingTrendingRef.current = false;
        }
      }
    };
    
    fetchTrending();
  }, [selectedResearchMethods, contentDetails?.businessType, researchStep, selectedTrendingSources, trendingResult]); // Use optional chaining in dependency array
  
  // Toggle topic selection
  const toggleTopicSelection = (topic: TrendingTopic) => {
    if (selectedTopics.some(t => t.title === topic.title)) {
      const newTopics = selectedTopics.filter(t => t.title !== topic.title);
      setSelectedTopics(newTopics);
      // Save to session storage
      sessionStorage.setItem('selectedTrendingTopics', JSON.stringify(newTopics));
    } else {
      const newTopics = [...selectedTopics, topic];
      setSelectedTopics(newTopics);
      // Save to session storage
      sessionStorage.setItem('selectedTrendingTopics', JSON.stringify(newTopics));
    }
  };
  
  // Update the toggleResearchMethod function to better support multiple selections
  const toggleResearchMethod = (method: string) => {
    // If it's already selected, remove it unless it's the only one selected
    if (selectedResearchMethods.includes(method)) {
      if (selectedResearchMethods.length > 1) {
        setSelectedResearchMethods(selectedResearchMethods.filter(m => m !== method));
      }
    } else {
      // Add the method
      setSelectedResearchMethods([...selectedResearchMethods, method]);
      
      // If this is trending method, reset any previous trending results to force a new fetch
      if (method === 'trending') {
        setTrendingResult(null);
        setSelectedTopics([]);
        // Reset the fetching flag just in case it got stuck
        isFetchingTrendingRef.current = false;
      }
    }
  };
  
  // Reset to step 1
  const handleReset = () => {
    // Reset state variables
    setResearchStep(1);
    setTrendingResult(null);
    setSelectedTopics([]);
    setBasicResearch(null);
    setDeepResearch(null);
    setShowFullResearch(false);
    setFollowUpQuestions([]);
    setSelectedFollowUpQuestions([]);
    setFollowUpAnswers(['', '', '']);
    setShowFollowUpQuestions(false);
    setFollowUpSubmitted(false);
    setShowApiSetupGuide(false);
    setError(null);
  };
  
  // Add this function near the other utilities to provide a fallback research result
  const getFallbackResearch = (topic: string, businessType: string): string => {
    // Check if the topic is about cooking chicken
    if (topic?.toLowerCase().includes('chicken') && topic?.toLowerCase().includes('cook')) {
      return `# Research on Cooking Chicken Perfectly for Viewers

## Overview

Cooking chicken perfectly for a viewing audience requires a balance of technical cooking knowledge, presentation skills, and understanding viewer expectations. Here's a summary of key points to consider:

### Essential Cooking Techniques for Chicken

1. **Temperature Control**
   - Chicken breasts: Cook to 165°F (74°C) internal temperature
   - Chicken thighs: Best at 175°F (80°C) for tenderness
   - Whole chicken: Breast to 165°F, thighs to 175°F
   - Resting period: 5-10 minutes to redistribute juices

2. **Preparation Methods**
   - Brining: 4% salt solution for 30 minutes to 2 hours improves moisture retention
   - Dry brining: Salt chicken and let it rest uncovered in refrigerator 4-24 hours
   - Spatchcocking: Removing backbone and flattening for even cooking
   - Pounding breasts to even thickness prevents dry edges

3. **Popular Cooking Methods**
   - Pan-searing: High heat to develop crust, medium to finish
   - Oven-roasting: 375-425°F depending on cut
   - Grilling: Direct heat for smaller pieces, indirect for larger cuts
   - Air frying: 370°F for 20-25 minutes for juicy results
   - Sous vide: 145-155°F for supremely juicy results (still requires finishing sear)

### Visual Presentation for Viewers

1. **Camera-Ready Techniques**
   - Color development: Enhance browning with honey or sugar in marinades
   - Garnishing: Fresh herbs added at the end for vibrant color contrast
   - Plating: White plates show off golden chicken best
   - Lighting: Side lighting shows texture better than overhead

2. **Demonstration Elements**
   - "Doneness check" moments create tension and educational value
   - Cutting into chicken to show juiciness is essential viewer satisfaction
   - Steam rising from freshly cooked chicken signals success visually
   - Audio of crispy skin or juicy interior adds sensory engagement

### Viewer Expectations and Preferences

1. **Common Pain Points**
   - Fear of undercooked chicken (show temperature checks)
   - Dry, overcooked results (emphasize moisture preservation techniques)
   - Bland flavor (demonstrate layering of seasonings)
   - Inconsistent results (explain principles, not just recipes)

2. **Trending Preferences**
   - Health-conscious methods: Air fryer and sheet pan meals
   - Global flavors: Beyond basic recipes to international techniques
   - Time-saving techniques: One-pan or make-ahead components
   - Budget considerations: Making the most of whole chickens

## Next Steps

You can proceed to content creation using this information as a foundation. When creating your content, focus on:
- Demonstrating clear visual cues for perfectly cooked chicken
- Explaining the "why" behind techniques, not just instructions
- Addressing common viewer concerns about food safety
- Incorporating personality and unique approaches to stand out

Need to generate more specific content? Try again with a more specific focus on the type of chicken dish or cooking method you want to feature.`;
    } else if (isPersonalUseCase) {
      // Existing personal use case fallback
      return `# Research Results for ${topic || safeContentDetails.businessType || 'Your Topic'}

## Overview
Due to a technical issue, we couldn't generate a complete research report. Here's some general information that might be helpful:

### Key Points About ${topic || safeContentDetails.businessType || 'This Topic'}
- This would typically include relevant information and insights on your topic
- Reader interests and preferences would be detailed here
- Similar content and inspiration would be presented
- Current best practices would be outlined

## Next Steps
You can still proceed to content creation and our AI will help you generate content based on:
- Your topic: ${topic || safeContentDetails.businessType || 'Not specified'}
- Your target readers: ${safeContentDetails.targetAudience || 'General audience'}
- Your content type: ${safeContentDetails.contentType || 'Not specified'}

## Try Again Later
If you'd like complete research, please try again later when our research service is back online.
`;
    } else {
      // Existing business use case fallback
      return `# Research Results for ${topic || safeContentDetails.businessType || 'Your Topic'}

## Overview
Due to a technical issue, we couldn't generate a complete research report. Here's some general information that might be helpful:

### Key Points About ${topic || safeContentDetails.businessType || 'This Topic'}
- This would typically include market trends and analysis
- Audience demographics and preferences would be detailed here
- Competitive landscape information would be presented
- Current industry best practices would be outlined

## Next Steps
You can still proceed to content creation and our AI will help you generate content based on:
- Your provided subject: ${topic || safeContentDetails.businessType || 'Not specified'}
- Your target audience: ${safeContentDetails.targetAudience || 'General audience'}
- Your content type: ${safeContentDetails.contentType || 'Not specified'}

## Try Again Later
If you'd like complete research, please try again later when our research service is back online.
`;
    }
  };

  // Update this useEffect to handle empty research results
  useEffect(() => {
    // Add more verbose logging for debugging purposes
    console.log(`[DEBUG TRANSITION] Current step: ${researchStep}, isGenerating: ${isGenerating}, deepResearch length: ${deepResearch?.length || 0}`);
    
    // Check state changes that should trigger a transition
    if (deepResearch && researchStep < 4) {
      console.log('[DEBUG TRANSITION] Research data detected but not in step 4 - auto-transitioning');
      
      // Move to research step 4 (results) directly if we have data
      const timer = setTimeout(() => {
        console.log('[DEBUG TRANSITION] Forcing transition to step 4 with research data');
        setResearchStep(4);
        
        // Save research results for redundancy
        const researchResults: ResearchResults = {
          researchMethod: 'perplexity',
          perplexityResearch: deepResearch,
          trendingTopics: [],
          dataSources: {
            reddit: true,
            rss: true
          }
        };
        sessionStorage.setItem('researchResults', JSON.stringify(researchResults));
      }, 500);
      
      return () => clearTimeout(timer);
    }
    
    // Also transition if generation has stopped but we're still in step 2
    if ((isGenerating === false) && deepResearch && researchStep === 2) {
      console.log('[DEBUG TRANSITION] Generation complete but still in step 2');
      
      // Use a slight delay to ensure UI is updated
      const timer = setTimeout(() => {
        console.log('[DEBUG TRANSITION] Moving from step 2 to step 4 with research data');
        setResearchStep(4);
        
        // Make sure we save the research results
        const researchResults: ResearchResults = {
          researchMethod: 'perplexity',
          perplexityResearch: deepResearch,
          trendingTopics: [],
          dataSources: {
            reddit: true,
            rss: true
          }
        };
        sessionStorage.setItem('researchResults', JSON.stringify(researchResults));
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [deepResearch, isGenerating, researchStep]);

  // Add handler for follow-up answer changes
  const handleFollowUpChange = (index: number, value: string) => {
    const newAnswers = [...followUpAnswers];
    newAnswers[index] = value;
    setFollowUpAnswers(newAnswers);
  };

  // Handle proceeding from follow-up questions to research generation
  const handleProceedToResearch = () => {
    setFollowUpSubmitted(true);
    setShowFollowUpQuestions(false);
    
    // Process follow-up answers if they exist
    let enrichedSubject = safeContentDetails.researchTopic || '';
    let enrichedDetails = safeContentDetails.audienceNeeds || '';
    
    if (followUpAnswers.some(answer => answer.trim() !== '')) {
      // Combine original topic with follow-up answers to create enriched information
      const relevantAnswers = followUpAnswers.filter(a => a.trim() !== '');
      
      if (relevantAnswers.length > 0) {
        // Use the additional context from answers
        const additionalContext = relevantAnswers.join('. ');
        enrichedDetails = enrichedDetails 
          ? `${enrichedDetails}. ${additionalContext}` 
          : additionalContext;
            
        // Update content details with enriched information
        setContentDetails({
          ...safeContentDetails,
          primarySubject: enrichedSubject,
          subjectDetails: enrichedDetails
        });
        
        // Save to session storage
        sessionStorage.setItem('contentDetails', JSON.stringify({
          ...safeContentDetails,
          primarySubject: enrichedSubject,
          subjectDetails: enrichedDetails
        }));
      }
    }
    
    // Move to research generation step
    setResearchStep(3);
  };

  // Add a better error display component for API quota issues
  // First, add a state variable to track if the error is specifically an API quota issue
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  // Function to handle clicking the "Generate Research" button
  const handleDeepAnalysisClick = async () => {
    // Ensure content details are available
    if (!contentDetails?.researchTopic) {
      setError('Please enter a research topic');
      return;
    }
    
    // Reset states
    setError(null);
    setDeepResearch('');
    setIsLoading(true);
    setIsGenerating(true);
    setGenerationProgress(0);
    setStatusMessage('Preparing research request...');
    
    // Create abort controller for cancellation support
    const abortController = new AbortController();
    
    // Set timeout for cancellation - 5 minutes max (to match Vercel Pro limit)
    const fetchTimeoutId = setTimeout(() => {
      console.log('[DIAG] Research generation timed out - aborting');
      abortController.abort();
      setError('Research generation timed out. The API service may be experiencing high load. Please try again later.');
      setIsLoading(false);
      setIsGenerating(false);
    }, 290000); // 4 minutes 50 seconds timeout (just under the 5 minute limit)
    
    try {
      // Build context with all the selected metadata
      const contextString = `Topic: "${contentDetails?.researchTopic || ''}"
Platform: ${contentDetails?.platform || 'facebook'}, 
Sub-Platform: ${contentDetails?.subPlatform || ''},
Content Type: ${contentDetails?.contentType || 'social-post'},
Target Audience: ${contentDetails?.targetAudience || 'general'},
Business Name: ${contentDetails?.businessName || ''},
Language: ${language || 'en'}`;
      
      // Show progressive status updates
      setGenerationProgress(10);
      setStatusMessage(safeTranslate('researchPage.progress.starting', 'Starting {service} analysis...').replace('{service}', 'Perplexity Deep Research'));
      
      console.log(`[DIAG] Starting research generation with topic: "${contentDetails?.researchTopic}"`);
      console.log(`[DIAG] Business name: ${contentDetails?.businessName || 'N/A'}`);
      
      // Set up progress simulation
      const progressIntervalId = setInterval(() => {
        // Increase progress gradually to show activity
        setGenerationProgress((prev) => {
          if (prev < 90) {
            // Smaller increments to spread progress over ~5 minutes
            return Math.min(90, prev + (Math.random() * 1 + 0.5));
          }
          return prev;
        });
        
        // Update status messages
        const progressValue = generationProgress;
        let statusMessage = 'Researching...';
        
        if (progressValue < 30) {
          statusMessage = 'Querying knowledge databases...';
        } else if (progressValue < 50) {
          statusMessage = 'Analyzing information sources...';
        } else if (progressValue < 70) {
          statusMessage = 'Synthesizing research findings...';
        } else if (progressValue < 85) {
          statusMessage = 'Organizing research insights...';
        } else {
          statusMessage = 'Finalizing research document...';
        }
        
        setStatusMessage(statusMessage);
      }, 3000); // Update every 3 seconds
      
      // Call Perplexity API directly (not using SSE)
      console.log('[DIAG] Making fetch request to /api/perplexity/research at', new Date().toISOString());
      
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const perplexityData = await fetch('/api/perplexity/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        },
        body: JSON.stringify({
          topic: contentDetails?.researchTopic || '',
          context: contextString, 
          sources: ['recent', 'scholar', 'news'],
          language,
          companyName: contentDetails?.businessName || '',
          websiteContent: contentDetails?.websiteContent || null,
          requestId // Include request ID for correlation
        }),
        signal: abortController.signal
      });
      
      // Clear the progress interval
      clearInterval(progressIntervalId);
      
      // Set progress to indicate we're processing the response
      setGenerationProgress(95);
      setStatusMessage(safeTranslate('researchPage.progress.statusMessages.formatting', 'Formatting research results...'));
      
      console.log(`[DIAG] API response received: status ${perplexityData.status}`);
      
      if (!perplexityData.ok) {
        // Try to get error details from the response
        let errorData;
        try {
          errorData = await perplexityData.json();
        } catch (e) {
          errorData = { error: `API error: ${perplexityData.status}` };
        }
        
        console.error('[DIAG] Perplexity API error:', perplexityData.status, errorData);
        
        // Create user-friendly error message based on status
        let errorMessage = '';
        switch (perplexityData.status) {
          case 401:
            errorMessage = 'Authentication error with the research service. Please verify your API key.';
            break;
          case 429:
            errorMessage = 'Rate limit exceeded for the research service. Please try again later.';
            break;
          case 500:
            errorMessage = 'The research service encountered an internal error. Please try again later.';
            break;
          case 503:
            errorMessage = 'The research service is temporarily unavailable. Please try again later.';
            break;
          case 504:
            errorMessage = 'The research service timed out. This is likely due to high server load. Please try again in a few minutes.';
            break;
          default:
            errorMessage = errorData.error || errorData.message || `Research service error (${perplexityData.status})`;
        }
        
        setError(errorMessage);
        setIsLoading(false);
        setIsGenerating(false);
        return;
      }
      
      const data = await perplexityData.json();
      
      console.log('[DIAG] Successfully parsed API response data at', new Date().toISOString());
      
      if (!data || !data.research) {
        setError('The research service returned an empty response. Please try again later.');
        setIsLoading(false);
        setIsGenerating(false);
        return;
      }
      
      // Complete progress and show success message
      setGenerationProgress(100);
      setStatusMessage(safeTranslate('researchPage.progress.statusMessages.complete', 'Research complete!'));
      
      // Process the research content
      const cleanedResearch = removeThinkingTags(data.research);
      
      // Store the research data
      setDeepResearch(cleanedResearch);
      
      // Store in session storage
      sessionStorage.setItem('deepResearch', cleanedResearch);
      
      // Save research results
      const researchResults = {
        researchMethod: 'perplexity',
        perplexityResearch: cleanedResearch
      };
      sessionStorage.setItem('researchResults', JSON.stringify(researchResults));
      
      // Show success toast
      toast.success(safeTranslate('researchPage.researchCompleteToast', 'Perplexity Deep Research completed successfully!'));
      
      // Move to the next step
      setResearchStep(4);
      
    } catch (error: any) {
      console.error('[DIAG] Error in handleDeepAnalysisClick:', error);
      
      // Check for abort/timeout errors
      const isTimeoutError = error.name === 'AbortError' || 
                            error.message?.includes('timeout') || 
                            error.message?.includes('Timeout');
      
      // Create a user-friendly error message
      let errorMessage = isTimeoutError 
        ? 'Research generation timed out. The service may be experiencing high load. Please try again later.'
        : `Error: ${error.message || 'Unknown error. Please try again.'}`;
      
      setError(errorMessage);
    } finally {
      // Always cleanup
      setIsLoading(false);
      setIsGenerating(false);
      clearTimeout(fetchTimeoutId);
    }
  };

  // Helper function to generate fallback research when the API fails
  const generateFallbackResearch = (topic: string, audience: string, platform: string, contentType: string, language: string): string => {
    const platformText = platform ? `${platform.charAt(0).toUpperCase() + platform.slice(1)}` : 'Social Media';
    const contentTypeText = contentType ? `${contentType.charAt(0).toUpperCase() + contentType.slice(1)}` : 'Article';
    const dateNow = new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const isSpanish = language === 'es';
    
    // Template based on language
    const researchTemplate = isSpanish
      ? `# Investigación sobre ${topic}

## Información general
Este es un informe de investigación básico generado localmente.

## Tendencias del mercado
- El mercado está mostrando un crecimiento continuo
- Los consumidores buscan soluciones personalizadas
- La sostenibilidad es un factor clave en las decisiones de compra

## Análisis de la audiencia
El público objetivo (${audience}) se caracteriza por:
- Interés en contenido auténtico y relevante
- Preferencia por experiencias personalizadas
- Alta actividad en plataformas digitales

## Estrategias recomendadas para ${platformText}
1. Publicar contenido regularmente (3-5 veces por semana)
2. Utilizar elementos visuales atractivos
3. Interactuar activamente con los seguidores

## Mejores prácticas para ${contentTypeText}
- Mantener un tono de voz consistente
- Incluir llamadas a la acción claras
- Optimizar el contenido para dispositivos móviles

Este informe fue generado como contenido de respaldo el ${dateNow}.`
      : `# Research on ${topic}

## General Information
This is a basic research report generated locally.

## Market Trends
- The market is showing continued growth
- Consumers are seeking personalized solutions
- Sustainability is a key factor in purchasing decisions

## Audience Analysis
The target audience (${audience}) is characterized by:
- Interest in authentic and relevant content
- Preference for personalized experiences
- High activity on digital platforms

## Recommended Strategies for ${platformText}
1. Post content regularly (3-5 times per week)
2. Use engaging visual elements
3. Actively interact with followers

## Best Practices for ${contentTypeText}
- Maintain a consistent tone of voice
- Include clear calls-to-action
- Optimize content for mobile devices

This report was generated as backup content on ${dateNow}.`;

    return researchTemplate;
  };

  // Add a function to handle cancellation
  const handleCancelResearch = () => {
    if (abortControllerRef.current) {
      console.log('[DEBUG] User canceled research generation');
      abortControllerRef.current.abort();
      
      // Set a specific error message for cancellation
      setError('Research generation was canceled by user.');
      
      // Do not use fallback research
      
      // Reset states
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // Next, update the button text to be clearer about what happens next
  // Use this in all the Generate buttons throughout the file
  const getActionButtonText = () => {
    // For Perplexity research
    if (needsPerplexityResearch) {
      return "Run Perplexity Deep Research";
    }
    return "Generate Research with Perplexity";
  };

  // Update the main research button
  const mainResearchButton = () => (
    <div className="mt-6">
    <button
        id="research-button"
        onClick={handleDeepAnalysisClick}
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm font-semibold"
      >
        {getActionButtonText()}
    </button>
    </div>
  );

  // Add a useEffect to load saved trending topics on initial load
  useEffect(() => {
    // Restore selected trending topics from session storage if they exist
    const savedSelectedTopics = sessionStorage.getItem('selectedTrendingTopics');
    if (savedSelectedTopics) {
      try {
        const parsedTopics = JSON.parse(savedSelectedTopics);
        if (Array.isArray(parsedTopics) && parsedTopics.length > 0) {
          setSelectedTopics(parsedTopics);
          console.log('[DEBUG] Restored selected trending topics from session storage:', parsedTopics.length);
        }
      } catch (error) {
        console.error('[DEBUG] Error parsing saved trending topics:', error);
      }
    }
  }, []);

  // Add a useEffect to handle research step transitions and ensure topics are preserved
  useEffect(() => {
    // When moving to step 3 (results view), ensure selected topics are restored if needed
    if (researchStep === 3 && selectedTopics.length === 0) {
      // Try to restore from session storage
      const savedTopics = sessionStorage.getItem('selectedTrendingTopics');
      if (savedTopics) {
        try {
          const parsedTopics = JSON.parse(savedTopics);
          if (Array.isArray(parsedTopics) && parsedTopics.length > 0) {
            setSelectedTopics(parsedTopics);
            console.log('[DEBUG] Restored topics when moving to step 3:', parsedTopics.length);
          }
        } catch (error) {
          console.error('[DEBUG] Error parsing saved topics during step transition:', error);
        }
      }
    }
  }, [researchStep]);

  // Function to proceed to content creation with research data
  const proceedToContentCreation = async () => {
    if (!safeContentDetails) {
      setError('Missing content details');
      return;
    }
    
    try {
      setIsLoading(true);
      toast.success('Preparing to navigate to content creation...');
      
      // Prepare research data for content creation
      const researchMethod = researchResults?.researchMethod || 'perplexity';
      
      let researchData = '';
      if (deepResearch) {
        // Clean the research content before passing it to content creation
        researchData = cleanResearchContent(deepResearch);
      } else if (basicResearch) {
        // Clean the basic research content if deep research isn't available
        researchData = cleanResearchContent(basicResearch);
      } else if (researchResults?.perplexityResearch) {
        // Clean the perplexity research from research results
        researchData = cleanResearchContent(researchResults.perplexityResearch);
      } else if (researchResults?.claudeResearch) {
        // Clean the claude research from research results
        researchData = cleanResearchContent(researchResults.claudeResearch);
      }
      
      // Save updated research results with cleaned data to session storage
      const updatedResearchResults = {
        researchMethod,
        perplexityResearch: researchData,
        // Use empty arrays/objects as defaults if properties don't exist
        trendingTopics: [],
        dataSources: {
          reddit: true,
          rss: true
        }
      };
      
      console.log('Storing data to session storage...');
      
      // Store the enhanced research results - do this synchronously to ensure it completes
      sessionStorage.setItem('researchResults', JSON.stringify(updatedResearchResults));
      
      // Save content details with proper synchronous execution
      const normalizeContentDetails = () => {
        // Check if we have a stored content type in session storage
        let storedContentType = '';
        try {
          storedContentType = sessionStorage.getItem('contentType') || '';
        } catch (e) {
          console.error('Error checking for stored content type:', e);
        }
        
        // Normalize content type and platform values before saving
        let normalizedContentType = storedContentType || safeContentDetails.contentType || 'social-media';
        let normalizedPlatform = safeContentDetails.platform || 'facebook';
        let platformSubtype = safeContentDetails.subPlatform || '';

        // All the normalization logic...
        
        // Handle video-script special case
        if (normalizedPlatform === 'video-script' && platformSubtype) {
          normalizedContentType = `${platformSubtype}-video-script`;
          console.log('Setting video script content type to:', normalizedContentType);
        }

        // First, handle platform normalization
        if (normalizedPlatform === 'social') {
          normalizedPlatform = platformSubtype || 'facebook';
          console.log('Normalized generic "social" platform to', normalizedPlatform);
          // Ensure content type is set correctly
          normalizedContentType = 'social-media';
        }

        // Fix for "email" platform
        if (normalizedPlatform === 'email') {
          normalizedPlatform = platformSubtype || 'marketing';
          console.log('Normalized generic "email" platform to', normalizedPlatform);
          // Ensure content type is set correctly - force override to prevent "newsletter-post" type issues
          normalizedContentType = 'email';
        }

        // Special case for email sub-platforms that might have been selected directly
        if (platformSubtype && ['newsletter', 'marketing', 'sales', 'welcome'].includes(platformSubtype)) {
          console.log('Detected email subtype:', platformSubtype);
          normalizedContentType = 'email';
        }

        // Fix for "presentation" platform
        if (normalizedPlatform === 'presentation') {
          normalizedPlatform = platformSubtype || 'business';
          console.log('Normalized generic "presentation" platform to', normalizedPlatform);
          // Ensure content type is set correctly - force override this value
          normalizedContentType = 'presentation';
        }

        // Special case for presentation sub-platforms that might have been selected directly
        if (platformSubtype && ['sales', 'business', 'executive', 'training', 'investor'].includes(platformSubtype)) {
          console.log('Detected presentation subtype:', platformSubtype);
          normalizedContentType = 'presentation';
        }

        // Fix for all other platform types with subtypes
        if (platformSubtype && !['social', 'email', 'presentation'].includes(normalizedPlatform)) {
          normalizedPlatform = platformSubtype;
          console.log(`Normalized ${normalizedPlatform} to its subtype:`, platformSubtype);
        }

        // Fix for "social-post" content type
        if (normalizedContentType === 'social-post' || normalizedContentType === 'social') {
          normalizedContentType = 'social-media';
          console.log('Normalized "social-post" content type to "social-media"');
        }

        // Create normalized content details
        const normalizedContentDetails = {
          ...safeContentDetails,
          contentType: normalizedContentType,
          platform: normalizedPlatform
        };
        
        // Save contentType separately to ensure it's preserved
        sessionStorage.setItem('contentType', normalizedContentType);
        
        // Save normalized content details to session storage
        sessionStorage.setItem('contentDetails', JSON.stringify(normalizedContentDetails));
        
        // Also update research data with normalized values if we're saving that separately
        const normalizedResearchData = {
          topic: safeContentDetails.researchTopic || '',
          contentType: normalizedContentType,
          platform: normalizedPlatform,
          targetAudience: safeContentDetails.targetAudience || 'general audience',
          businessType: safeContentDetails.businessType || '',
          research: researchData || '',
          youtubeTranscript: safeContentDetails.youtubeTranscript || '',
          youtubeUrl: safeContentDetails.youtubeUrl || '',
          userId: safeContentDetails.userId || '', // Use the existing userId if available
          isPersonalUseCase: safeContentDetails.isPersonalUseCase || false, // Add isPersonalUseCase
          createdAt: new Date().toISOString(),
        };
        
        // Save normalized research data to session storage
        sessionStorage.setItem('researchData', JSON.stringify(normalizedResearchData));
      };
      
      // Execute the normalization function
      normalizeContentDetails();
      
      console.log('Navigation preparation complete.');
      toast.success('Navigation to content creation...');
      
      // Set the preventLanguageRedirect flag to avoid language redirect issues
      sessionStorage.setItem('preventLanguageRedirect', 'true');
      console.log('[ResearchPage] Setting preventLanguageRedirect flag for content generation');
      
      // Set a brief timeout to ensure storage operations complete
      setTimeout(() => {
        // Use direct window location navigation for most reliable behavior
        window.location.href = '/create/content';
      }, 100);
      
    } catch (error) {
      console.error('Error proceeding to content creation:', error);
      setError('Failed to proceed to content creation. Please try again.');
      setIsLoading(false);
      
      // Even if there's an error, try to navigate anyway as a fallback
      setTimeout(() => {
        window.location.href = '/create/content';
      }, 1000);
    }
  };
  
  // Function to start the research process
  const handleStartResearch = async () => {
    // Validate required fields
    if (!safeContentDetails.researchTopic) {
      setError('Please enter a research topic');
      return;
    }
    
    if (!safeContentDetails.targetAudience) {
      setError('Please enter a target audience');
      return;
    }
    
    // Clear any previous errors
    setError(null);
    
    try {
      // Generate follow-up questions based on initial input
      generateFollowUpQuestions();
      
      // Move to step 2 (follow-up questions)
      setResearchStep(2);
    } catch (error) {
      console.error('Error starting research:', error);
      setError(`Failed to start research: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Update effect to detect personal use case when topic changes
  useEffect(() => {
    if (contentDetails?.researchTopic) {
      const isPersonal = detectPersonalUseCase(contentDetails.researchTopic);
      setIsPersonalUseCase(isPersonal);
    }
  }, [contentDetails?.researchTopic]);

  // Add at the start of the ResearchPage component, after initializing state variables
  
  // Add a comprehensive null check for all contentDetails operations
  const safeContentDetails = contentDetails || {
    contentType: 'social-media',
    platform: 'facebook',
    subPlatform: '', // Add missing field
    targetAudience: 'general audience',
    audienceNeeds: '',
    businessType: '',
    researchTopic: '',
    primarySubject: '',
    subjectDetails: '',
    youtubeTranscript: '', // Add missing field
    youtubeUrl: ''         // Add missing field
  };
  
  // Use safeContentDetails instead of contentDetails throughout the component
  // This ensures we always have default values instead of null

  // Add early auth check effect
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('User not authenticated. Showing auth prompt.');
      setShowAuthPrompt(true);
    }
  }, [user, authLoading]);

  // Add auth prompt component function
  const renderAuthPrompt = () => {
    if (!showAuthPrompt) return null;
    
    return (
      <div className="my-6 p-6 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/30 dark:border-blue-800">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-200">
          {t('authPrompt.title', { defaultValue: 'Authentication Required' })}
        </h3>
        <p className="mt-2 text-blue-700 dark:text-blue-300">
          {t('authPrompt.message', { defaultValue: 'Please sign in or create an account to continue with your content research. Your work will be saved automatically.' })}
        </p>
        <div className="mt-4 flex space-x-4">
          <button 
            onClick={() => router.push('/login')} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700"
          >
            {t('authPrompt.signIn', { defaultValue: 'Sign In' })}
          </button>
          <button 
            onClick={() => router.push('/signup')}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/50"
          >
            {t('authPrompt.createAccount', { defaultValue: 'Create Account' })}
          </button>
        </div>
      </div>
    );
  };

  // Render the content for Step 1 (Research Setup)
  const renderStep1Content = () => {
    return (
      <div className="space-y-8">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Research Setup
          </h3>
          
          <div className="space-y-6">
            {/* Subject Information */}
            <div className="space-y-4">
              <h4 className="text-md font-medium">Subject Information</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Research Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={safeContentDetails.researchTopic || ''}
                  onChange={(e) => setContentDetails({...safeContentDetails, researchTopic: e.target.value})}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-700"
                  placeholder="Enter your research topic"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  What would you like to research? Be specific for better results.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isPersonalUseCase ? "Category or Context" : "Business Type"}
                </label>
                <input
                  type="text"
                  value={safeContentDetails.businessType || ''}
                  onChange={(e) => setContentDetails({...safeContentDetails, businessType: e.target.value})}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-700"
                  placeholder={isPersonalUseCase 
                    ? "E.g., Hobby, Education, Personal Development" 
                    : "E.g., SaaS, E-commerce, Local Business"}
                />
                
                {/* Add mode indicator */}
                <div className="mt-2 flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isPersonalUseCase 
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' 
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    <svg className="mr-1.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    {isPersonalUseCase ? 'Personal Use Mode' : 'Business Use Mode'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPersonalUseCase(!isPersonalUseCase)}
                    className="ml-2 text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    Switch to {isPersonalUseCase ? 'Business' : 'Personal'} Mode
                  </button>
                </div>
              </div>
            </div>
            
            {/* Audience Information */}
            <div className="space-y-4">
              <h4 className="text-md font-medium">
                {isPersonalUseCase ? "Reader Information" : "Audience Information"}
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isPersonalUseCase ? "Target Readers" : "Target Audience"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={safeContentDetails.targetAudience || ''}
                  onChange={(e) => setContentDetails({...safeContentDetails, targetAudience: e.target.value})}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-700"
                  placeholder={isPersonalUseCase 
                    ? "E.g., Friends, Family, Community members, Fellow enthusiasts" 
                    : "E.g., Marketing Professionals, Small Business Owners"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isPersonalUseCase ? "Reader Interests" : "Audience Needs"}
                </label>
                <textarea
                  value={safeContentDetails.audienceNeeds || ''}
                  onChange={(e) => setContentDetails({...safeContentDetails, audienceNeeds: e.target.value})}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-700"
                  placeholder={isPersonalUseCase
                    ? "What are your readers interested in learning about?"
                    : "What does your audience need to know?"}
                  rows={3}
                />
              </div>
            </div>
            
            {/* Content Type */}
            <div className="space-y-4">
              <h4 className="text-md font-medium">Content Information</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={safeContentDetails.contentType || 'social-media'}
                  onChange={(e) => setContentDetails({...safeContentDetails, contentType: e.target.value})}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value="social-media">Social Media Post</option>
                  <option value="blog-post">Blog Post</option>
                  <option value="email">{isPersonalUseCase ? "Email/Newsletter" : "Email"}</option>
                  <option value="video-script">{isPersonalUseCase ? "Video Script/Vlog" : "Video Script"}</option>
                </select>
              </div>
              
              {safeContentDetails.contentType === 'social-media' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Platform <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Replace the read-only field with a dropdown */}
                  <select
                    value={safeContentDetails.platform || ''}
                    onChange={(e) => {
                      // Get the selected platform from the dropdown
                      const selectedPlatform = e.target.value;
                      
                      // Create updated details with both platform and subPlatform set to the same value
                      const updatedDetails = {
                        ...safeContentDetails, 
                        platform: selectedPlatform,
                        subPlatform: selectedPlatform  // Set subPlatform to match platform for consistency
                      };
                      
                      // Update state
                      setContentDetails(updatedDetails);
                      
                      // Save to session storage immediately
                      try {
                        sessionStorage.setItem('contentDetails', JSON.stringify(updatedDetails));
                        console.log('Updated platform and subPlatform in session storage:', selectedPlatform);
                      } catch (error) {
                        console.error('Error updating platform in session storage:', error);
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-700"
                    required
                  >
                    <option value="">Select a platform</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Choose a specific platform for your social media content to get platform-specific research.
                  </p>
                </div>
              )}
              {/* YouTube Transcript Analysis - Always available for all content types */}
              
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  YouTube Transcript Feature Moved
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                  The YouTube transcript feature is now available on the first page of content creation for easier access.
                </p>
                
                {safeContentDetails.youtubeTranscript && (
                  <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <p className="text-xs text-green-700 dark:text-green-400">
                      <span className="font-semibold">Transcript included:</span> The transcript from {safeContentDetails.youtubeUrl} has been included in your research.
                    </p>
                  </div>
                )}
              </div>
              
              {/* YouTube transcript feature message */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">YouTube Transcript Feature</h3>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      The YouTube transcript feature is now available on the first page of the content creation process.
                      {safeContentDetails.youtubeTranscript && (
                        <> Your transcript from <strong>{safeContentDetails.youtubeUrl}</strong> has been included in your research.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Show successful transcript inclusion if available */}
              {safeContentDetails.youtubeTranscript && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 text-green-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800 dark:text-green-300">YouTube Transcript Included</h3>
                      <p className="text-xs text-green-700 dark:text-green-400">
                        Transcript from {safeContentDetails.youtubeUrl} has been included in your research parameters.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Navigation buttons */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleStartResearch}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                disabled={!safeContentDetails.researchTopic || !safeContentDetails.targetAudience}
              >
                Start Research
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the content for Step 2 (Follow-up Questions)
  const renderFollowUpQuestionsContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Generating tailored questions...</p>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="text-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Question Generation Failed</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The Claude API could not generate follow-up questions. Please check your API configuration or try again.
            </p>
            <button
              onClick={() => generateFollowUpQuestions()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/create')}
              className="px-4 py-2 ml-4 border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Back to Content Setup
            </button>
          </div>
        </div>
      );
    }
    
    if (!followUpQuestions || followUpQuestions.length === 0) {
      return (
        <div className="text-center p-8">
          <p className="text-gray-600 dark:text-gray-400">No follow-up questions available. Please try generating them again.</p>
          <button
            onClick={() => generateFollowUpQuestions()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Generate Questions
          </button>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Help Us Understand Your Needs Better
          </h3>
          
          <div className="space-y-6">
            {/* Add a summary of current content details */}
            <div className="mb-6 rounded-md bg-gray-50 p-4 dark:bg-gray-700/50">
              <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Content Summary
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Content Type:</span>{' '}
                  <span className="text-gray-800 dark:text-gray-200">
                    {safeContentDetails.contentType === 'social-media' 
                      ? 'Social Media Post' 
                      : safeContentDetails.contentType === 'blog-post'
                        ? 'Blog Post'
                        : safeContentDetails.contentType === 'email'
                          ? isPersonalUseCase ? 'Email/Newsletter' : 'Email'
                          : safeContentDetails.contentType === 'video-script'
                            ? isPersonalUseCase ? 'Video Script/Vlog' : 'Video Script'
                            : safeContentDetails.contentType || 'Not specified'}
                  </span>
                </div>
                {safeContentDetails.contentType === 'social-media' && (
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Platform:</span>{' '}
                    <span className="text-gray-800 dark:text-gray-200">
                      {safeContentDetails.platform.charAt(0).toUpperCase() + safeContentDetails.platform.slice(1)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Target Audience:</span>{' '}
                  <span className="text-gray-800 dark:text-gray-200">
                    {safeContentDetails.targetAudience || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Research Topic:</span>{' '}
                  <span className="text-gray-800 dark:text-gray-200">
                    {safeContentDetails.researchTopic || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please answer these follow-up questions to help us generate more tailored research for <span className="font-medium">{safeContentDetails.researchTopic || 'your topic'}</span>.
            </p>
            
            {followUpQuestions.map((question, index) => (
              <div key={index} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {question}
                </label>
                <textarea
                  value={followUpAnswers[index] || ''}
                  onChange={(e) => handleFollowUpChange(index, e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-700"
                  placeholder="Your answer"
                  rows={2}
                />
              </div>
            ))}
            
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => router.push('/create')}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Back to Content Setup
              </button>
              
              <button
                onClick={handleProceedToResearch}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Proceed to Research
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add a simple debug handler for the research button
  const debugButtonClick = () => {
    console.log('DEBUG: Button clicked!');
    
    // Check if button should be disabled
    if (isGenerating || isLoading) {
      console.log('DEBUG: Button is disabled - isGenerating:', isGenerating, 'isLoading:', isLoading);
      return;
    }
    
    // If not disabled, proceed with the actual handler
    console.log('DEBUG: Proceeding with handleDeepAnalysisClick');
    handleDeepAnalysisClick();
  };

  // Add state for company research warning
  const [companyResearchWarning, setCompanyResearchWarning] = useState<string | null>(null);
  
  // Check for company research warning in session storage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const warning = sessionStorage.getItem('companyResearchWarning');
      if (warning) {
        setCompanyResearchWarning(warning);
        // Clear the warning from session storage
        sessionStorage.removeItem('companyResearchWarning');
      }
    }
  }, []);

  // Component to display company research warning
  const CompanyResearchWarning = () => {
    if (!companyResearchWarning) return null;
    
    return (
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-900/20 dark:border-yellow-800">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              {language === 'es' ? 'Advertencia sobre la investigación de empresa' : 'Company Research Warning'}
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
              <p>{companyResearchWarning}</p>
            </div>
            <div className="mt-3">
              <button
                onClick={() => setCompanyResearchWarning(null)}
                className="text-sm font-medium text-yellow-800 hover:text-yellow-600 dark:text-yellow-300 dark:hover:text-yellow-400"
              >
                {language === 'es' ? 'Entendido' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the content for Step 4 (Research Results)
  const renderStep4Content = () => {
    // Use the existing deepResearch state variable
    const research = deepResearch || '';
    
    return (
      <div className="mb-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">{safeTranslate('researchPage.researchResults.title', 'Research Results')}</h2>
        
        {/* Display company research warning if present */}
        {companyResearchWarning && <CompanyResearchWarning />}
        
        <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
          {/* Research Summary at the top */}
          <div className="research-summary mb-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-md">
            <h4 className="text-md font-medium mb-2">{safeTranslate('researchPage.results.summary', 'Research Summary')}</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="font-medium">{safeTranslate('researchPage.results.topic', 'Topic:')} </span> 
                <span>{safeContentDetails.researchTopic || 'Not specified'}</span>
              </div>
              <div>
                <span className="font-medium">{safeTranslate('researchPage.results.contentType', 'Content Type:')} </span>
                <span>
                  {(() => {
                    // Use the display names system for consistent display
                    const { displayContentType } = getDisplayNames(
                      safeContentDetails.contentType || '',
                      safeContentDetails.platform || '',
                      safeContentDetails.subPlatform || '',
                      language
                    );
                    return displayContentType;
                  })()}
                </span>
              </div>
              <div>
                <span className="font-medium">{safeTranslate('researchPage.results.targetAudience', 'Target Audience:')} </span>
                <span>{safeContentDetails.targetAudience || 'Not specified'}</span>
              </div>
              <div>
                <span className="font-medium">{safeTranslate('researchPage.results.platform', 'Platform:')} </span>
                <span>
                  {(() => {
                    // Display both platform and subPlatform when needed for clarity
                    if (safeContentDetails.platform === 'blog' && safeContentDetails.subPlatform === 'company-blog') {
                      return language === 'es' ? 'Blog de Empresa' : 'Company Blog';
                    }
                    
                    // Use the display names system for consistent display
                    const { displayPlatform } = getDisplayNames(
                      safeContentDetails.contentType || '',
                      safeContentDetails.platform || '',
                      safeContentDetails.subPlatform || '',
                      language
                    );
                    return displayPlatform;
                  })()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">
              {safeTranslate('researchPage.results.title', 'Generated Research')}
            </h3>
            
            <ResearchActionButtons 
              research={research}
              isExpanded={isResearchExpanded}
              topicName={`research-${safeContentDetails.researchTopic || 'content'}`}
              onToggleExpand={toggleResearchExpansion}
              translationFunc={safeTranslate}
            />
          </div>
          
          {/* Display loading state if needed */}
          {!research && <p className="text-gray-500">Loading research results...</p>}
          
          {/* Display the actual research content with improved formatting */}
          {research && (
            <div 
              ref={researchRef}
              className={`prose max-w-none dark:prose-invert bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${
                isResearchExpanded ? 'p-6' : 'p-6 max-h-96 overflow-hidden relative'
              }`}
            >
              <div className="markdown-content research-content">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSlug, rehypeSanitize]}
                  components={{
                    h1: ({children, ...props}) => <h1 className="text-2xl font-bold my-5 pb-2 border-b dark:border-gray-700 text-gray-900 dark:text-white" {...props}>{children}</h1>,
                    h2: ({children, ...props}) => <h2 className="text-xl font-bold my-4 pt-2 pb-1 border-b dark:border-gray-700 text-gray-800 dark:text-gray-100" {...props}>{children}</h2>,
                    h3: ({children, ...props}) => <h3 className="text-lg font-bold my-3 text-gray-800 dark:text-gray-200" {...props}>{children}</h3>,
                    p: ({children, ...props}) => <p className="my-3 text-base leading-7 text-gray-700 dark:text-gray-300" {...props}>{children}</p>,
                    ul: ({children, ...props}) => <ul className="list-disc pl-6 my-3 space-y-2 text-gray-700 dark:text-gray-300" {...props}>{children}</ul>,
                    ol: ({children, ...props}) => <ol className="list-decimal pl-6 my-3 space-y-2 text-gray-700 dark:text-gray-300" {...props}>{children}</ol>,
                    li: ({children, ...props}) => <li className="my-1.5" {...props}>{children}</li>,
                    a: ({children, ...props}) => <a className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>,
                    blockquote: ({children, ...props}) => <blockquote className="border-l-4 border-indigo-300 dark:border-indigo-600 pl-4 italic my-3 text-gray-600 dark:text-gray-400" {...props}>{children}</blockquote>,
                    code: ({children, inline, ...props}: CodeProps) => 
                      inline 
                        ? <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200" {...props}>{children}</code>
                        : <code className="block bg-gray-200 dark:bg-gray-700 p-3 rounded my-3 text-sm font-mono overflow-x-auto text-gray-800 dark:text-gray-200" {...props}>{children}</code>,
                    table: ({children, ...props}) => <table className="border-collapse border border-gray-300 dark:border-gray-700 my-4 min-w-full bg-white dark:bg-gray-900" {...props}>{children}</table>,
                    th: ({children, ...props}) => <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-gray-800 dark:text-gray-200" {...props}>{children}</th>,
                    td: ({children, ...props}) => <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-700 dark:text-gray-300" {...props}>{children}</td>,
                    hr: ({...props}) => <hr className="my-6 border-t border-gray-300 dark:border-gray-700" {...props} />,
                    strong: ({children, ...props}) => <strong className="font-bold text-gray-900 dark:text-white" {...props}>{children}</strong>,
                    em: ({children, ...props}) => <em className="italic text-gray-800 dark:text-gray-300" {...props}>{children}</em>
                  }}
                >
                  {research}
                </ReactMarkdown>
              </div>
              
              {/* Enhanced gradient fade effect when collapsed */}
              {!isResearchExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-800 pointer-events-none"></div>
              )}
            </div>
          )}
          
          {/* Show expand button at the bottom when collapsed */}
          {research && !isResearchExpanded && (
            <div className="mt-2 text-center">
              <button
                onClick={toggleResearchExpansion}
                className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {safeTranslate('researchPage.results.expandResearch', 'Show full research')}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex space-x-4">
          <button
            onClick={() => setResearchStep(3)}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            {language === 'es' ? 'Atrás' : 'Back'}
          </button>
          <button
            onClick={proceedToContentCreation}
            className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 flex items-center"
          >
            {t('researchPage.buttons.continueToContent', { defaultValue: 'Proceed to Content Creation' })}
          </button>
        </div>
      </div>
    );
  };

  // Inside the ResearchPage component, add the needsPerplexityResearch variable
  const [researchMethod, setResearchMethod] = useState<'perplexity' | 'trending' | 'claude' | null>(null);

  // First get perplexityResearch from results
  const perplexityResearch = researchResults?.perplexityResearch;
  
  // Now use it in needsPerplexityResearch
  const needsPerplexityResearch = selectedResearchMethods.includes('perplexity') && !perplexityResearch;

  // Create a function to translate error messages
  const getTranslatedError = (errorMessage: string | null): string => {
    if (!errorMessage) return '';
    
    if (errorMessage.includes('Failed to fetch')) {
      return t('errors.connectionFailed') || 'Error: Failed to fetch';
    }
    
    if (errorMessage.includes('Research generation was canceled')) {
      return t('errors.researchCanceled') || 'Research generation was canceled by user.';
    }
    
    return errorMessage;
  };

  // Render a clean version of Step 3 for research generation
  const renderMinimalStep3Content = () => {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
          {(() => {
            // First try the regular translation with safeTranslate
            const translated = safeTranslate('researchPage.results.generatedResearch', 'Generate Research');
            
            // If the result still has the raw key, it means translation failed
            if (translated.includes('researchPage.results.generatedResearch')) {
              // Return a hardcoded value based on the language
              return language === 'es' ? 'Investigación Generada' : 'Generate Research';
            }
            
            return translated;
          })()}
        </h3>
        
        <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
            {language === 'es' ? 'Resumen de Investigación' : 'Research Summary'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {language === 'es' ? 'Tema:' : 'Topic:'} <span className="font-normal ml-1">{safeContentDetails.researchTopic || (language === 'es' ? 'No especificado' : 'Not Specified')}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {language === 'es' ? 'Tipo de Contenido:' : 'Content Type:'} <span className="font-normal ml-1">
                  {(() => {
                    // Use the display names system for consistent display
                    const { displayContentType } = getDisplayNames(
                      safeContentDetails.contentType || '',
                      safeContentDetails.platform || '',
                      safeContentDetails.subPlatform || '',
                      language
                    );
                    return displayContentType;
                  })()}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {language === 'es' ? 'Audiencia Objetivo:' : 'Target Audience:'} <span className="font-normal ml-1">{safeContentDetails.targetAudience || (language === 'es' ? 'No especificado' : 'Not Specified')}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {language === 'es' ? 'Plataforma:' : 'Platform:'} <span className="font-normal ml-1">
                  {(() => {
                    // Display both platform and subPlatform when needed for clarity
                    if (safeContentDetails.platform === 'blog' && safeContentDetails.subPlatform === 'company-blog') {
                      return language === 'es' ? 'Blog de Empresa' : 'Company Blog';
                    }
                    
                    // Use the display names system for consistent display
                    const { displayPlatform } = getDisplayNames(
                      safeContentDetails.contentType || '',
                      safeContentDetails.platform || '',
                      safeContentDetails.subPlatform || '',
                      language
                    );
                    return displayPlatform;
                  })()}
                </span>
              </p>
            </div>
          </div>
        </div>
                
        {error && (
          error.includes('connection error') ? (
            <ConnectionErrorMessage onRetry={() => {
              setError(null);
              handleDeepAnalysisClick();
            }} />
          ) : (
            <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414-1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{t('common.error')}</h3>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">{getTranslatedError(error)}</p>
                </div>
              </div>
            </div>
          )
        )}
                
        <div className="flex justify-between items-center mt-8">
          <button 
            onClick={() => setResearchStep(2)}
            type="button"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {language === 'es' ? 'Volver' : 'Back'}
          </button>
          
          <div className="flex space-x-4">
            {/* Add quick access to content creation if research is already available */}
            {deepResearch && (
              <button
                onClick={proceedToContentCreation}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                {language === 'es' ? 'Ir a Creación de Contenido' : 'Go to Content Creation'}
              </button>
            )}
          
            <button
              onClick={handleDeepAnalysisClick}
              className="flex items-center justify-center px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {language === 'es' ? 'Generando...' : 'Generating...'}
                </>
              ) : (
                language === 'es' ? 'Generar Investigación' : 'Generate Research'
              )}
            </button>
          </div>
        </div>

        {isGenerating && (
          <div className="mt-8 p-5 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="w-20 h-20 mb-4">
                <div className="w-full h-full rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin"></div>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {language === 'es' ? 'Investigación en Progreso' : 'Research in Progress'}
              </h3>
              <p className="text-gray-500 mb-6">
                {language === 'es' ? 'Comenzando investigación...' : 'Starting research...'}
              </p>

              <div className="w-full max-w-lg mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-blue-600">
                    {language === 'es' ? 'Progreso' : 'Progress'}
                  </span>
                  <span className="text-sm font-medium text-blue-600">{Math.round(generationProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${generationProgress}%` }}
                  ></div>
                </div>
              </div>

              <p className="text-gray-600">
                {(() => {
                  if (language === 'es') {
                    if (generationProgress < 20) {
                      return 'Consultando fuentes de datos...';
                    } else if (generationProgress < 40) {
                      return 'Analizando datos de fuentes...';
                    } else if (generationProgress < 60) {
                      return 'Sintetizando hallazgos de investigación...';
                    } else if (generationProgress < 80) {
                      return 'Organizando información clave...';
                    } else {
                      return 'Finalizando documento de investigación...';
                    }
                  } else {
                    if (generationProgress < 20) {
                      return 'Querying data sources...';
                    } else if (generationProgress < 40) {
                      return 'Analyzing data from sources...';
                    } else if (generationProgress < 60) {
                      return 'Synthesizing research findings...';
                    } else if (generationProgress < 80) {
                      return 'Organizing key insights...';
                    } else {
                      return 'Finalizing research document...';
                    }
                  }
                })()}
              </p>

              {isGenerating && (
                <button
                  onClick={() => {
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort();
                      console.log('Research generation was canceled by user');
                      setIsGenerating(false);
                      setIsLoading(false);
                      setError(language === 'es' ? 'La generación de investigación fue cancelada.' : 'Research generation was canceled.');
                    }
                  }}
                  className="mt-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Add loader styles to ensure consistency with the content page
  useEffect(() => {
    // Add loader styles to document
    const style = document.createElement('style');
    style.innerHTML = `
      .loader {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    // Clean up function
    return () => {
      // Remove the style tag when component unmounts
      const styleElement = document.head.querySelector('style:last-child');
      if (styleElement && styleElement.innerHTML.includes('.loader')) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  // In the useEffect for loading stored research data
  useEffect(() => {
    // Skip if we're coming from a push state navigation
    if (sessionStorage.getItem('navigationSource') === 'pushState') {
      sessionStorage.removeItem('navigationSource');
      return;
    }
    
    // Try to load content details from session storage
    try {
      const storedContentDetails = sessionStorage.getItem('contentDetails');
      
      if (storedContentDetails) {
        console.log('Loaded content details from session storage');
        setContentDetails(JSON.parse(storedContentDetails));
      }
      
      // Load research results if they exist
      const storedResearchResults = sessionStorage.getItem('researchResults');
      if (storedResearchResults) {
        console.log('Loaded research results from session storage');
        const parsedResults = JSON.parse(storedResearchResults);
        
        // Clean any research content that exists in the results
        if (parsedResults.perplexityResearch) {
          parsedResults.perplexityResearch = cleanResearchContent(parsedResults.perplexityResearch);
        }
        if (parsedResults.claudeResearch) {
          parsedResults.claudeResearch = cleanResearchContent(parsedResults.claudeResearch);
        }
        
        setResearchResults(parsedResults);
      }
      
      // Load deep research if it exists
      const storedDeepResearch = sessionStorage.getItem('deepResearch');
      if (storedDeepResearch) {
        console.log('Loaded deep research from session storage');
        // Clean the research content before setting it
        setDeepResearch(cleanResearchContent(storedDeepResearch));
        // Auto-advance to step 3
        setResearchStep(3);
      }
      
      // Load basic research if it exists
      const storedBasicResearch = sessionStorage.getItem('basicResearch');
      if (storedBasicResearch) {
        console.log('Loaded basic research from session storage');
        // Clean the basic research content before setting it
        setBasicResearch(cleanResearchContent(storedBasicResearch));
      }
      
      // Load research step if it exists
      const storedResearchStep = sessionStorage.getItem('researchStep');
      if (storedResearchStep) {
        console.log('Loaded research step from session storage:', storedResearchStep);
        setResearchStep(parseInt(storedResearchStep, 10));
      }
      
    } catch (error) {
      console.error('Error loading data from session storage:', error);
    }
  }, []);

  // Initialize window.researchEventSource if it doesn't exist
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.researchEventSource = window.researchEventSource || null;
    }
    
    // Cleanup function to close any open connections when component unmounts
    return () => {
      if (typeof window !== 'undefined' && window.researchEventSource) {
        window.researchEventSource.close();
        window.researchEventSource = null;
      }
    };
  }, []);

  // Component for connection error message
  const ConnectionErrorMessage = ({ onRetry }: { onRetry: () => void }) => {
    return (
      <div className="p-4 mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Connection Issue</h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>The research generation process takes about 6 minutes to complete. With your Pro plan, we're able to process complex requests up to 5 minutes.</p>
              <p className="mt-2">Your connection was interrupted, but you have two options:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Wait a few minutes and refresh the page to check if your results are ready</li>
                <li>Try generating the research again</li>
              </ul>
            </div>
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 dark:bg-yellow-800 dark:text-yellow-100 dark:hover:bg-yellow-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add a progress simulation fallback 
  useEffect(() => {
    // Only run the fallback when actively generating and progress seems stuck
    if (isGenerating && generationProgress <= 25) {
      console.log('[DEBUG] Starting progress simulation fallback');
      
      // Start a timer that will increment progress if we don't get real updates
      const simulationTimer = setTimeout(() => {
        // Start a simulation interval that slowly increases progress
        const simulationInterval = setInterval(() => {
          setGenerationProgress(prev => {
            // Slowly increase up to 90% maximum (leave room for the real completion)
            if (prev < 90) {
              const increment = Math.max(0.5, (90 - prev) / 50); // Faster at start, slower as it approaches 90%
              return prev + increment;
            }
            return prev;
          });
          
          // Also update status messages based on simulated progress
          setStatusMessage(prevStatus => {
            // Only update if it's one of our standard messages (not error messages)
            if (prevStatus.includes('Analyzing') || 
                prevStatus.includes('Querying') || 
                prevStatus.includes('Synthesizing') || 
                prevStatus.includes('Organizing') || 
                prevStatus.includes('Finalizing')) {
              
              // Choose progress message based on current progress level
              const progress = generationProgress;
              if (progress < 40) {
                return 'Querying knowledge databases...';
              } else if (progress < 60) {
                return 'Analyzing information sources...';
              } else if (progress < 75) {
                return 'Synthesizing research findings...';
              } else if (progress < 85) {
                return 'Organizing research insights...';
              } else {
                return 'Finalizing research document...';
              }
            }
            return prevStatus;
          });
        }, 3000); // Update every 3 seconds
        
        // Cleanup function for the interval
        return () => {
          clearInterval(simulationInterval);
        };
      }, 15000); // Wait 15 seconds to see if real progress updates come in
      
      // Clean up the simulation timer if the component unmounts
      return () => {
        clearTimeout(simulationTimer);
      };
    }
  }, [isGenerating, generationProgress]);

  // Function to check if research has completed on the server
  const checkForCompletedResearch = async () => {
    try {
      console.log('[DEBUG] Checking for completed research on server');
      const response = await fetch('/api/perplexity/check-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: safeContentDetails?.researchTopic || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Research check result:', data);
        
        // If research is found, display it
        if (data.research) {
          console.log('[DEBUG] Research was found on server!');
          
          // Clean the research content
          const cleanedResearch = removeThinkingTags(data.research);
          
          // Save the research and update UI
          setDeepResearch(cleanedResearch);
          sessionStorage.setItem('deepResearch', cleanedResearch);
          
          // Save research results
          const researchResults = {
            researchMethod: 'perplexity',
            perplexityResearch: cleanedResearch
          };
          sessionStorage.setItem('researchResults', JSON.stringify(researchResults));
          
          // Update progress to 100%
          setGenerationProgress(100);
          setStatusMessage('Research complete!');
          
          // Show success toast
          toast.success(safeTranslate('researchPage.researchCompleteToast', 'Perplexity Deep Research completed successfully!'));
          
          // Move to the next step
          setResearchStep(4);
          
          // Reset states
          setIsGenerating(false);
          setIsLoading(false);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('[DEBUG] Error checking for completed research:', error);
      return false;
    }
  };

  // Add an effect to periodically check for research results when connection issues occur
  useEffect(() => {
    // Only run when research is generating and we haven't received updates for a while
    if (isGenerating && generationProgress > 30 && error?.includes('connection')) {
      console.log('[DEBUG] Starting periodic research result check due to connection error');
      
      // Check immediately
      checkForCompletedResearch();
      
      // Then set up a periodic check
      const checkInterval = setInterval(() => {
        checkForCompletedResearch().then(found => {
          if (found) {
            // Clear the interval if research was found
            clearInterval(checkInterval);
          }
        });
      }, 30000); // Check every 30 seconds
      
      // Clean up the interval when component unmounts
      return () => {
        clearInterval(checkInterval);
      };
    }
  }, [isGenerating, generationProgress, error]);

  // Replace the return statement near the end of the file with a flex layout that includes the footer
  return (
    <AppShell hideHeader={true}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{safeTranslate('researchPage.title', 'Content Research')}</h1>
        
        {renderAuthPrompt()}
        
        {/* Research Steps - Update to include follow-up questions step */}
        <div className="mb-8">
          <ol className="flex items-center">
            {[1, 2, 3, 4, 5].map((step) => (
              <li 
                key={step} 
                className={`flex items-center ${step < 5 ? 'w-full' : ''}`}
              >
                <span 
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                    researchStep >= step 
                      ? 'border-indigo-600 bg-indigo-600 text-white' 
                      : 'border-gray-300 bg-white text-gray-500'
                  }`}
                >
                  {step}
                </span>
                {step < 5 && (
                  <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700">
                    <div 
                      className="h-0.5 bg-indigo-600 transition-all duration-700 ease-in-out" 
                      style={{ 
                        width: researchStep > step ? '100%' : researchStep === step ? '50%' : '0%',
                      }}
                    ></div>
                  </div>
                )}
              </li>
            ))}
          </ol>
          
          <div className="mt-2 flex justify-between text-sm">
            <span className={researchStep >= 1 ? 'text-indigo-600' : 'text-gray-500'}>
              {safeTranslate('researchPage.initialSetup', 'Initial Setup')}
            </span>
            <span className={researchStep >= 2 ? 'text-indigo-600' : 'text-gray-500'}>
              {safeTranslate('researchPage.followUpQuestions', 'Follow-up Questions')}
            </span>
            <span className={researchStep >= 3 ? 'text-indigo-600' : 'text-gray-500'}>
              {safeTranslate('researchPage.generateResearch', 'Generate Research')}
            </span>
            <span className={researchStep >= 4 ? 'text-indigo-600' : 'text-gray-500'}>
              {safeTranslate('researchPage.researchResults.title', 'Research Results')}
            </span>
            <span className={researchStep >= 5 ? 'text-indigo-600' : 'text-gray-500'}>
              {safeTranslate('researchPage.createContent', 'Create Content')}
            </span>
          </div>
        </div>
        
        {/* Step Content - Update to include follow-up questions step */}
        <div className="mt-8">
          {researchStep === 1 && renderStep1Content()}
          {researchStep === 2 && renderFollowUpQuestionsContent()}
          {researchStep === 3 && (
            <div className="mb-6">
              {renderMinimalStep3Content()}
            </div>
          )}
          {researchStep === 4 && renderStep4Content()}
        </div>
      </div>
    </AppShell>
  );
} 
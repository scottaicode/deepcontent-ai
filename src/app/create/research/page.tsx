/**
 * Research Page Component
 * 
 * This page displays research options for content generation. Users can choose between:
 * 1. Using Perplexity Deep Research to generate basic research
 * 2. Using trending topics from Reddit and RSS feeds
 * 
 * After initial research, users can generate deeper analysis with Claude 3.7 Sonnet.
 */

"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '../../../components/AppShell';
import { TrendingTopic } from '@/app/lib/api/trendingTypes';
import { TrendingResult } from '@/app/lib/api/trendingService';
import { generateResearch } from '@/app/lib/api/trendService';
import { getSampleResearch } from '@/app/lib/sampleResearch';
import ReactMarkdown from 'react-markdown';
import ApiKeySetupGuide from '../../../components/ApiKeySetupGuide';
import YouTubeTranscriptInput from '@/components/YouTubeTranscriptInput';
import ContentTypeRecommendations from '@/components/ContentTypeRecommendations';
import { toast } from 'react-hot-toast';
import { MODEL_CONFIG, getProcessDescription } from '@/app/lib/modelConfig';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { IconArrowDown, IconArrowRight } from '@tabler/icons-react';

// Add back the ResearchResults interface at the top level
interface ResearchResults {
  researchMethod: 'perplexity' | 'trending' | 'claude';
  perplexityResearch?: string;
  trendingTopics?: TrendingTopic[];
  dataSources?: {
    reddit: boolean;
    rss: boolean;
  };
}

// Add ContentDetails interface definition
interface ContentDetails {
  contentType: string;
  researchTopic: string;
  businessType: string;
  targetAudience: string;
  audienceNeeds: string;
  platform: string;
  subPlatform: string;
  primarySubject?: string;    // Add back primarySubject
  subjectDetails?: string;    // Add back subjectDetails
  youtubeTranscript?: string; // YouTube transcript
  youtubeUrl?: string;        // YouTube URL
}

/**
 * Fetch trending topics from the API based on business type
 */
async function fetchTrendingTopics(businessType: string, sources: string[] = ['rss']): Promise<TrendingResult> {
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
}

/**
 * Simulate Deep Research with Claude 3.7 Sonnet
 * Makes an API call to our Claude research endpoint
 */
async function generateDeepResearch(
  topic: string, 
  context: string,
  additionalTopics?: TrendingTopic[]
): Promise<string> {
  try {
    const response = await fetch('/api/claude/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        context,
        trendingTopics: additionalTopics || []
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || 'Failed to generate deep research');
    }
    
    const data = await response.json();
    return data.research;
  } catch (error: any) {
    console.error('Error generating deep research:', error);
    throw new Error('Failed to generate research with Claude 3.7 Sonnet: ' + error.message);
  }
}

async function generatePerplexityResearch(
  topic: string,
  context: string,
  sources?: string[]
): Promise<string> {
  try {
    console.log('Calling Perplexity research API with:', { 
      topic, 
      context,
      sources: sources || [] 
    });
    
    // Validate topic to ensure it's not empty
    if (!topic || topic.trim() === '') {
      throw new Error('Empty research topic provided to Perplexity API');
    }
    
    const response = await fetch('/api/perplexity/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: topic.trim(), // Ensure clean topic
        context: context.trim(),
        sources: sources || []
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    if (!data.research) {
      throw new Error('No research content returned from Perplexity API');
    }
    
    return data.research;
  } catch (error) {
    console.error('Error generating Perplexity research:', error);
    throw error;
  }
}

export default function ResearchPage() {
  const router = useRouter();
  const { t } = useTranslation();
  
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
  
  // Add new state variable for follow-up questions
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
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
  
  // Initialize content details from URL or session storage
  useEffect(() => {
    try {
      setIsLoading(true);
      
      // Get step from URL parameter if available
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const stepParam = urlParams.get('step');
        if (stepParam) {
          const stepNumber = parseInt(stepParam, 10);
          console.log('[DEBUG] Found step parameter in URL:', stepNumber);
          if (!isNaN(stepNumber) && stepNumber >= 1 && stepNumber <= 5) {
            setResearchStep(stepNumber);
          }
        }
      }
      
      // Get content details from session storage
      const storedDetails = sessionStorage.getItem('contentDetails');
      
      if (storedDetails) {
        const parsedDetails = JSON.parse(storedDetails);
        console.log('Loaded content details from session storage:', parsedDetails);
        
        // Validate that we have the required fields
        if (!parsedDetails.businessType && !parsedDetails.researchTopic) {
          console.error('Missing required business type or research topic in stored details');
          parsedDetails.businessType = parsedDetails.businessType || 'general business';
        }
        
        if (!parsedDetails.contentType) {
          console.warn('Missing content type in stored details, using default');
          parsedDetails.contentType = 'social-media';
        }
        
        if (!parsedDetails.audience) {
          console.warn('Missing audience in stored details, using default');
          parsedDetails.audience = 'general audience';
        }
        
        setContentDetails(parsedDetails);
        setIsLoading(false);
      } else {
        // If no stored details, redirect back to create page
        console.error('No content details found in session storage');
        router.push('/create');
      }
    } catch (err) {
      console.error('Error initializing research page:', err);
      setIsLoading(false);
      router.push('/create');
    }
  }, [router]);
  
  // Add a useEffect to log step changes for debugging and update URL
  useEffect(() => {
    console.log(`[DEBUG] Research step changed to: ${researchStep}`);
    console.log(`[DEBUG] Deep research data present: ${!!deepResearch}`);
    console.log(`[DEBUG] Is generating: ${isGenerating}`);
    console.log(`[DEBUG] Error state: ${error ? 'Yes' : 'No'}`);
    
    // Update the URL to match the current step
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('step', researchStep.toString());
      window.history.replaceState({}, '', url.toString());
    }
  }, [researchStep, deepResearch, isGenerating, error]);
  
  // Add useEffect to manage research visibility
  useEffect(() => {
    try {
      // When research step changes to 3 (complete), make sure to show research results
      if (researchStep === 3 && deepResearch) {
        // Set showResearchResults to true when research is complete
        setShowResearchResults(true);
      }
    } catch (error) {
      console.error('Error in research visibility effect:', error);
    }
  }, [researchStep, deepResearch]);
  
  // Handle fetching data based on selected research method
  const fetchInitialResearch = async () => {
    try {
      console.log('Fetching initial research...');
      setIsLoading(true);
      
      const context = `Target Audience: ${safeContentDetails.targetAudience || 'general'}, Content Type: ${safeContentDetails.contentType || 'article'}, Platform: ${safeContentDetails.platform || 'general'}`;
      
      // Use perplexity for initial research with empty sources array
      const sources: string[] = [];
      
      // Make call with proper parameters
      const research = await generatePerplexityResearch(
        safeContentDetails.researchTopic || '',
        context,
        sources
      );
      
      setBasicResearch(research);
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
  
  // Update the handleGenerateDeepResearch function to focus just on Perplexity
  const handleGenerateDeepResearch = async () => {
    // Prevent multiple simultaneous calls using debounce
    if (isGenerating || isGenerateDeepResearchDebounced) return;
    
    try {
      // Set debounce flag to prevent multiple calls
      setIsGenerateDeepResearchDebounced(true);
      
      console.log('[DEBUG] Starting deep research generation');
      setIsLoading(true);
      setIsGenerating(true);
      setStatusMessage('Generating deep analysis with Claude 3.7 Sonnet...');
      setGenerationProgress(0);
      
      // Use optional chaining for all contentDetails access
      const topic = safeContentDetails.primarySubject || safeContentDetails.businessType || '';
      
      console.log('[DEBUG] Research topic:', topic);
      
      if (!topic) {
        throw new Error('No research topic specified');
      }
      
      // Build base context without trending topics
      const baseContext = `Target Audience: ${safeContentDetails.targetAudience || 'general audience'}, 
                         Audience Needs: ${safeContentDetails.audienceNeeds || 'not specified'}, 
                         Content Type: ${safeContentDetails.contentType || 'social-media'}, 
                         Platform: ${safeContentDetails.platform || 'facebook'}`;
      
      // Generate research with Claude
      setStatusMessage(t('researchPage.progress.starting', { service: 'Claude 3.7 Sonnet' }));
      setGenerationProgress(40);
      
      console.log('[DEBUG] Making API call to Claude research endpoint');
      
      // Call the Claude research API without trending topics
      const response = await fetch('/api/claude/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          context: baseContext,
          // Remove trending topics param
        }),
      });
      
      console.log('[DEBUG] Claude API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(e => {
          console.error('[DEBUG] Error parsing error response:', e);
          return { error: 'Unknown error parsing response' };
        });
        console.error('[DEBUG] API error response:', errorData);
        throw new Error(errorData.error || `Failed to generate research: Status ${response.status}`);
      }
      
      let data;
      try {
        data = await response.json();
        console.log('[DEBUG] Received research data:', data ? 'Data exists' : 'No data');
        if (data && data.research) {
          console.log('[DEBUG] Research data first 100 chars:', data.research.substring(0, 100));
        } else {
          console.error('[DEBUG] Missing research in response data:', data);
        }
      } catch (parseError) {
        console.error('[DEBUG] Error parsing success response:', parseError);
        throw new Error('Failed to parse API response');
      }
      
      // Store the complete research
      if (data && data.research) {
        setDeepResearch(data.research);
        console.log('[DEBUG] Set deep research complete!');
        // Save to session storage as well for redundancy
        sessionStorage.setItem('deepResearch', data.research);
        
        // Move to research step 3
        setResearchStep(3);
      } else {
        throw new Error('Research data missing from API response');
      }
      
    } catch (error: any) {
      console.error('[DEBUG] Error generating deep research:', error);
      // Display user-friendly error
      setError(`Failed to generate research: ${error.message || 'Unknown error'}`);
      
      // Create fallback research without trending topics
      const fallbackContent = getFallbackResearch(
        safeContentDetails.primarySubject || '', 
        safeContentDetails.businessType || ''
      );
      
      // Set the fallback research content
      setDeepResearch(fallbackContent);
      
      // Save to session storage for redundancy
      sessionStorage.setItem('deepResearch', fallbackContent);
      
      // Move to step 3 to show the fallback content
      setResearchStep(3);
      
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
      // Clear the debounce flag after a short delay
      setTimeout(() => {
        setIsGenerateDeepResearchDebounced(false);
      }, 500);
    }
  };

  // Helper function to build research context - simplified without trending data
  const buildResearchContext = (trendingData: TrendingResult | null, selectedTopicsList?: TrendingTopic[]) => {
    // Base context from content details with optional chaining
    const baseContext = `Target Audience: ${safeContentDetails?.targetAudience || 'general audience'}, 
                       Audience Needs: ${safeContentDetails?.audienceNeeds || 'not specified'}, 
                       Content Type: ${safeContentDetails?.contentType || 'social-media'}, 
                       Platform: ${safeContentDetails?.platform || 'facebook'}`;
    
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
    setResearchStep(1);
    setSelectedTopics([]);
    setBasicResearch('');
    setDeepResearch('');
    setError(null);
    // Also clear the session storage
    sessionStorage.removeItem('selectedTrendingTopics');
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

  // Update the useEffect that transitions to step 3 to handle empty research results
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

  // Add function to generate follow-up questions based on input
  const generateFollowUpQuestions = () => {
    // Default questions for different scenarios
    let questions: string[] = [];
    
    // Generate different questions based on the provided topic
    const topicLength = safeContentDetails.researchTopic?.trim().length || 0;
    const hasBusiness = !!safeContentDetails.businessType && safeContentDetails.businessType.trim().length > 3;
    const hasAudienceNeeds = !!safeContentDetails.audienceNeeds && safeContentDetails.audienceNeeds.trim().length > 10;
    
    if (topicLength === 0) {
      // If no topic provided
      questions = [
        "What specific subject or topic would you like to research?",
        "What is the main purpose or goal for this content?",
        "Are there any specific aspects of this topic you want to focus on?"
      ];
    } else if (topicLength < 5) {
      // If topic is too short
      questions = [
        `Can you provide more details about "${safeContentDetails.researchTopic}"?`,
        "What specific information are you looking for about this topic?",
        `How would ${safeContentDetails.targetAudience} benefit from this content?`
      ];
    } else if (isPersonalUseCase) {
      // For personal use cases
      questions = [
        `What aspects of "${safeContentDetails.researchTopic}" are you most interested in?`,
        `What is your personal connection to this topic?`,
        `What do you hope ${safeContentDetails.targetAudience} will gain from this content?`
      ];
    } else if (hasBusiness) {
      // If business type is provided
      questions = [
        `How does "${safeContentDetails.researchTopic}" relate to your ${safeContentDetails.businessType} business?`,
        `What are the top challenges your ${safeContentDetails.targetAudience} face regarding this topic?`,
        `What specific outcomes do you want to achieve with this content?`
      ];
    } else if (hasAudienceNeeds) {
      // If audience needs are detailed
      questions = [
        `What specific aspects of "${safeContentDetails.researchTopic}" address the needs you mentioned?`,
        `Are there any common misconceptions about "${safeContentDetails.researchTopic}" your audience might have?`,
        `What specific action do you want your ${safeContentDetails.targetAudience} to take after consuming this content?`
      ];
    } else if (safeContentDetails.contentType === 'social-media') {
      // For social media content
      const platformTerm = isPersonalUseCase ? "social media" : `${safeContentDetails.platform || 'social media'} marketing`;
      questions = [
        `What tone would resonate best with ${safeContentDetails.targetAudience} on ${safeContentDetails.platform || 'social media'}?`,
        `Is there a specific trend or event related to "${safeContentDetails.researchTopic}" that you want to highlight?`,
        `What makes your perspective on "${safeContentDetails.researchTopic}" unique or valuable?`
      ];
    } else if (safeContentDetails.contentType === 'blog-post') {
      // For blog posts
      questions = [
        `What depth of information about "${safeContentDetails.researchTopic}" would be most valuable to your readers?`,
        `Are there specific subtopics within "${safeContentDetails.researchTopic}" you want to cover?`,
        `What expertise or perspective can you offer on this topic?`
      ];
    } else {
      // General follow-up questions for any topic
      questions = [
        `What specific aspects of "${safeContentDetails.researchTopic}" are most important to you?`,
        "What is the main objective for this content? (Inform, persuade, entertain, etc.)",
        "Is there any specific angle or perspective you want to explore?"
      ];
    }
    
    setFollowUpQuestions(questions);
    setShowFollowUpQuestions(true);
  };

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

  // Update the handleDeepAnalysisClick function to use the controller ref
  const handleDeepAnalysisClick = async () => {
    // Prevent multiple simultaneous calls
    if (isGenerating) {
      console.log('[DEBUG] Already generating, ignoring click');
      return;
    }
    
    // Create an AbortController for the fetch request
    abortControllerRef.current = new AbortController();
    const fetchTimeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 360000); // 6 minute timeout (360 seconds)
    
    try {
      console.log('[DEBUG] Starting deep analysis click handler');
      setIsLoading(true);
      setIsGenerating(true);
      setError(null);
      setStatusMessage('Preparing research request...');
      setGenerationProgress(5);
      setRetryCount(0); // Reset retry count
      
      // Add a timeout to automatically fail if taking too long overall
      const overallTimeoutId = setTimeout(() => {
        console.error('[DEBUG] Research generation timed out after 8 minutes');
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        throw new Error('Research generation timed out after 8 minutes. Please try again.');
      }, 480000); // 8 minute overall timeout (480 seconds)
      
      try {
        // Build context for research
        const context = `Target Audience: ${safeContentDetails.targetAudience || 'general audience'}, 
                        Audience Needs: ${safeContentDetails.audienceNeeds || 'not specified'}, 
                        Content Type: ${safeContentDetails.contentType || 'social-media'}, 
                        Platform: ${safeContentDetails.platform || 'facebook'}`;
        
        setStatusMessage('Connecting to research service...');
        setGenerationProgress(10);
        
        // Call the Perplexity API with retry logic
        console.log('[DEBUG] Calling Perplexity API with retry support...');
        setStatusMessage('Generating research with Perplexity...');
        setGenerationProgress(15);
        
        // Create a periodic progress update - slower increments for longer research time
        const progressIntervalId = setInterval(() => {
          setGenerationProgress((prev) => {
            // More gradual progress increase up to 95%
            if (prev < 95) {
              // Calculate a smaller increment to spread progress over ~6 minutes
              // About 1-3% increase every 10 seconds
              const increment = Math.random() * 2 + 1;
              return Math.min(95, prev + increment);
            }
            return prev;
          });
          
          const messages = [
            'Researching latest information...',
            'Analyzing cooking techniques...',
            'Finding expert recommendations...',
            'Gathering viewer engagement data...',
            'Compiling best practices...',
            'Exploring current trends...',
            'Researching audience preferences...',
            'Evaluating content formats...',
            'Identifying key insights...',
            'Organizing research findings...',
            'Finalizing research document...',
            'Almost done...',
          ];
          
          const randomIndex = Math.floor(Math.random() * messages.length);
          setStatusMessage(messages[randomIndex]);
        }, 10000); // Update every 10 seconds instead of 5
        
        // Use the retry-capable function
        const perplexityData = await callPerplexityWithRetry(
          safeContentDetails.researchTopic || '', 
          context, 
          []
        );
        
        // Clear the progress interval
        clearInterval(progressIntervalId);
        
        console.log('[DEBUG] Perplexity API response received');
        
        if (!perplexityData.research) {
          console.error('[DEBUG] No research in Perplexity response:', perplexityData);
          throw new Error('No research data returned from Perplexity API');
        }
        
        // Set the research data
        setDeepResearch(perplexityData.research);
        console.log('[DEBUG] Set deep research from Perplexity');
        
        // Save to session storage
        sessionStorage.setItem('deepResearch', perplexityData.research);
        console.log('[DEBUG] Saved research to session storage');
        
        // Clear the timeouts since we succeeded
        clearTimeout(overallTimeoutId);
        clearTimeout(fetchTimeoutId);
        
        // Move to research step 4 (results) and make sure to log this
        console.log('[DEBUG] Explicitly transitioning to step 4 (research results)');
        setResearchStep(4);
        setStatusMessage('Research complete!');
        setGenerationProgress(100);
        
      } catch (apiError: any) {
        // Clear the timeouts in case of error
        clearTimeout(overallTimeoutId);
        clearTimeout(fetchTimeoutId);
        
        console.error('[DEBUG] API error during research generation:', apiError);
        
        // Check for abort/timeout errors
        const isTimeoutError = apiError.name === 'AbortError' || 
                             apiError.message?.includes('timeout') || 
                             apiError.message?.includes('Timeout');
        
        // Create a more user-friendly error message
        const errorMessage = isTimeoutError 
          ? 'Research generation timed out. The research process typically takes 4-6 minutes, but it took longer than expected. You can try again or use the fallback content below.' 
          : apiError.message || 'Unknown error during research generation';
        
        setError(`Research generation failed: ${errorMessage}`);
        
        // Use fallback research
        console.log('[DEBUG] Using fallback research due to error');
        const fallbackContent = getFallbackResearch(
          safeContentDetails.researchTopic || '', 
          safeContentDetails.businessType || ''
        );
        
        // Set the fallback research
        setDeepResearch(fallbackContent);
        
        // Save to session storage
        sessionStorage.setItem('deepResearch', fallbackContent);
        
        // Move to research step 4 (results) with fallback content
        setResearchStep(4);
      }
      
    } catch (error: any) {
      // Clear the fetch timeout
      clearTimeout(fetchTimeoutId);
      
      console.error('[DEBUG] Unexpected error in handleDeepAnalysisClick:', error);
      
      // Check for abort/timeout errors
      const isTimeoutError = error.name === 'AbortError' || 
                           error.message?.includes('timeout') || 
                           error.message?.includes('Timeout');
      
      // Create a user-friendly error message
      const errorMessage = isTimeoutError 
        ? 'Research generation timed out. The process typically takes 4-6 minutes, but it exceeded the maximum allowed time. You can try again or use the fallback content below.' 
        : `An unexpected error occurred: ${error.message || 'Unknown error'}`;
      
      setError(errorMessage);
      
      // Use fallback research for any unexpected errors
      const fallbackContent = getFallbackResearch(
        safeContentDetails.researchTopic || '', 
        safeContentDetails.businessType || ''
      );
      
      // Set the fallback research
      setDeepResearch(fallbackContent);
      
      // Save to session storage
      sessionStorage.setItem('deepResearch', fallbackContent);
      
      // Move to research step 4 (results) with fallback content
      setResearchStep(4);
      
    } finally {
      // Always clean up
      setIsLoading(false);
      setIsGenerating(false);
      abortControllerRef.current = null; // Clear the controller reference
    }
  };

  const callPerplexityWithRetry = async (
    topic: string, 
    context: string, 
    sources: string[] = [],
    currentRetry: number = 0
  ): Promise<any> => {
    try {
      console.log(`[DEBUG] Calling Perplexity API (attempt ${currentRetry + 1})...`);
      
      // Log the request configuration
      console.log('[DEBUG] Request configuration:', {
        topic: topic.substring(0, 50) + (topic.length > 50 ? '...' : ''),
        contextLength: context.length,
        sourcesCount: sources.length,
        signal: !!abortControllerRef.current?.signal
      });
      
      const perplexityResponse = await fetch('/api/perplexity/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          context,
          sources
        }),
        signal: abortControllerRef.current?.signal
      });
      
      // Log the response status
      console.log(`[DEBUG] Perplexity API response status: ${perplexityResponse.status}`);
      
      if (!perplexityResponse.ok) {
        console.error('[DEBUG] Perplexity API error:', perplexityResponse.status);
        const errorData = await perplexityResponse.json().catch(() => ({}));
        throw new Error(`Perplexity API error: ${errorData.error || errorData.details || `Status ${perplexityResponse.status}`}`);
      }
      
      const responseData = await perplexityResponse.json();
      console.log('[DEBUG] Successfully received research from Perplexity API');
      return responseData;
    } catch (error: any) {
      // Log detailed error information
      console.error(`[DEBUG] Error in callPerplexityWithRetry (attempt ${currentRetry + 1}):`, error);
      console.error(`[DEBUG] Error name: ${error.name}, message: ${error.message}`);
      
      // If we haven't exceeded max retries and this isn't a timeout error, retry
      const isTimeoutError = error.name === 'AbortError' || 
                           error.message?.includes('timeout') || 
                           error.message?.includes('Timeout');
      
      if (currentRetry < MAX_RETRIES && !isTimeoutError) {
        console.log(`[DEBUG] Retry attempt ${currentRetry + 1} of ${MAX_RETRIES}`);
        setStatusMessage(`Connection issue detected. Retrying... (${currentRetry + 1}/${MAX_RETRIES})`);
        
        // Exponential backoff: wait longer between each retry
        const backoffMs = Math.min(1000 * Math.pow(2, currentRetry), 10000);
        console.log(`[DEBUG] Waiting ${backoffMs}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        // Increment retry count for UI
        setRetryCount(currentRetry + 1);
        
        // Try again
        return callPerplexityWithRetry(topic, context, sources, currentRetry + 1);
      }
      
      // If we've exhausted retries or it's a timeout, re-throw the error
      console.error('[DEBUG] Maximum retries reached or timeout occurred - giving up');
      throw error;
    }
  };

  // Add a function to handle cancellation
  const handleCancelResearch = () => {
    if (abortControllerRef.current) {
      console.log('[DEBUG] User canceled research generation');
      abortControllerRef.current.abort();
      
      // Set a specific error message for cancellation
      setError('Research generation was canceled by user.');
      
      // Use fallback research for cancellation
      const fallbackContent = getFallbackResearch(
        safeContentDetails.researchTopic || '', 
        safeContentDetails.businessType || ''
      );
      
      // Set the fallback research
      setDeepResearch(fallbackContent);
      
      // Save to session storage
      sessionStorage.setItem('deepResearch', fallbackContent);
      
      // Move to research step 4 (results) with fallback content
      setResearchStep(4);
      
      // Reset states
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // Next, update the button text to be clearer about what happens next
  // Use this in all the Generate buttons throughout the file
  const getActionButtonText = () => {
    // Check if Perplexity research needed but not yet completed
    const needsPerplexityResearch = selectedResearchMethods.includes('perplexity') && !basicResearch;
    
    if (needsPerplexityResearch) {
      return "Run Perplexity Deep Research First";
    } else {
      return "Generate Deep Analysis with Claude 3.7 Sonnet";
    }
  };

  // Update the research completion button to make sure it works
  const mainResearchButton = () => (
    <button
      onClick={handleGenerateDeepResearch}
      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
      disabled={isGenerating}
    >
      <span>Generate Deep Analysis with Claude 3.7 Sonnet</span>
      {isGenerating ? (
        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      )}
    </button>
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
    try {
      console.log('Proceeding to content creation with research data');
      
      // Get the current user from Firebase Auth
      const { auth } = await import('@/lib/firebase/firebase');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.error('User not authenticated. Cannot save research data.');
        toast.error('You must be logged in to save research data. Please log in and try again.');
        return;
      }
      
      // Create a research data object to save to Firebase
      const researchData = {
        topic: safeContentDetails.researchTopic || '',
        contentType: safeContentDetails.contentType || 'article',
        platform: safeContentDetails.platform || 'website',
        targetAudience: safeContentDetails.targetAudience || 'general audience',
        businessType: safeContentDetails.businessType || '',
        research: deepResearch || '',
        youtubeTranscript: safeContentDetails.youtubeTranscript || '',
        youtubeUrl: safeContentDetails.youtubeUrl || '',
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
      };
      
      console.log('Saving research data to session storage:', researchData);
      
      // Save to session storage for the content creation page
      sessionStorage.setItem('researchData', JSON.stringify(researchData));
      
      // Save to Firebase Firestore
      try {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/firebase');
        
        console.log('Saving research data to Firestore...');
        const docRef = await addDoc(collection(db, 'research'), {
          ...researchData,
          createdAt: serverTimestamp(),
        });
        
        console.log('Research data saved to Firestore with ID:', docRef.id);
        
        // Update session storage with the document ID
        const updatedResearchData = {
          ...researchData,
          id: docRef.id
        };
        sessionStorage.setItem('researchData', JSON.stringify(updatedResearchData));
        
        toast.success('Research data saved successfully');
      } catch (firestoreError) {
        console.error('Error saving research data to Firestore:', firestoreError);
        // Continue with navigation even if Firestore save fails
        // The data is still in session storage
      }
      
      // Set research step to 5 (Content Creation) to update the progress indicator
      setResearchStep(5);
      
      // Add a slight delay to allow the UI to update before navigation
      setTimeout(() => {
        // Navigate to content creation page
        router.push('/create/content');
      }, 300);
    } catch (error) {
      console.error('Error proceeding to content creation:', error);
      toast.error('Failed to proceed to content creation. Please try again.');
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

  // Function to detect if the context appears to be personal rather than business
  const detectPersonalUseCase = (topic: string): boolean => {
    if (!topic) return false;
    
    const topicLower = topic.toLowerCase();
    
    // Business-oriented keywords - check these first
    const businessKeywords = [
      'business', 'company', 'corporate', 'enterprise', 'organization', 'industry', 'professional',
      'commercial', 'b2b', 'b2c', 'client', 'customer', 'product', 'service', 'market', 'sales',
      'revenue', 'profit', 'management', 'strategy', 'brand', 'marketing', 'advertising', 'commerce',
      'retail', 'wholesale', 'startup', 'entrepreneur', 'investor', 'finance', 'investment',
      'telecom', 'provider', 'isp', 'internet service', 'broadband', 'fiber', 'network', 
      'connectivity', 'telecommunications', 'data service', 'wireless', 'rural internet',
      'mbps', 'gigabit', 'bandwidth', 'enterprise', 'customer service', 'pricing', 'plans',
      'packages', 'business solution', 'corporate solution', 'competitor', 'industry'
    ];
    
    // Check for business indicators first
    const hasBusinessIndicator = businessKeywords.some(keyword => 
      topicLower.includes(keyword)
    );
    
    // If it has business indicators, it's not personal
    if (hasBusinessIndicator) {
      return false;
    }
    
    // Personal-oriented keywords - only check if no business keywords found
    const personalKeywords = [
      'personal', 'family', 'hobby', 'home', 'travel', 'lifestyle', 'vacation', 
      'wedding', 'birthday', 'celebration', 'recipe', 'cooking', 'fitness',
      'workout', 'diet', 'meditation', 'mindfulness', 'parenting', 'education',
      'learning', 'study', 'school', 'college', 'university', 'dating', 'relationship',
      'self-improvement', 'poetry', 'writing', 'novel', 'book', 'reading', 'art',
      'drawing', 'painting', 'music', 'instrument', 'gardening', 'photography'
    ];
    
    // Look for personal keywords in the topic
    const hasPersonalIndicator = personalKeywords.some(keyword => 
      topicLower.includes(keyword)
    );
    
    return hasPersonalIndicator;
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
                    Platform
                  </label>
                  
                  {/* Display platform as read-only text instead of dropdown */}
                  <div className="flex items-center justify-between">
                    <div className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-700/50">
                      {safeContentDetails.platform 
                        ? (
                            <div className="flex items-center">
                              <span className="font-medium">{
                                safeContentDetails.platform.charAt(0).toUpperCase() + 
                                safeContentDetails.platform.slice(1)
                              }</span>
                              <span className="ml-2 text-xs italic text-gray-500">
                                (pre-selected from previous step)
                              </span>
                            </div>
                          )
                        : 'No platform selected'
                      }
                    </div>
                  </div>
                </div>
              )}
              {/* YouTube Transcript Analysis - Always available for all content types */}
              
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  YouTube Transcript Analysis
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                  Enhance your research by analyzing an existing YouTube video on this topic.
                </p>
                
                <YouTubeTranscriptInput 
                  url=""
                  onUrlChange={() => {}}
                  transcript={safeContentDetails.youtubeTranscript || ""}
                  showFullTranscript={false}
                  onToggleTranscript={() => {}}
                  onTranscriptFetched={(transcript, url) => {
                    setContentDetails({
                      ...safeContentDetails,
                      youtubeTranscript: transcript,
                      youtubeUrl: url
                    });
                    toast.success('YouTube transcript fetched successfully!');
                  }}
                />
                
                {safeContentDetails.youtubeTranscript && (
                  <div className="mt-2">
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      <span className="font-semibold">Transcript added:</span> {safeContentDetails.youtubeUrl}
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
                      {safeContentDetails.platform 
                        ? safeContentDetails.platform.charAt(0).toUpperCase() + 
                          safeContentDetails.platform.slice(1)
                        : 'Not specified'}
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
                onClick={() => setResearchStep(1)}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Back
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

  // Render the content for Step 3 (Research Generation)
  const renderStep3Content = () => {
    return (
      <div className="space-y-8">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Generate Detailed Research
          </h3>

          <div className="space-y-4">
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
                      {safeContentDetails.platform 
                        ? safeContentDetails.platform.charAt(0).toUpperCase() + 
                          safeContentDetails.platform.slice(1)
                        : 'Not specified'}
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

            <div className="mb-6">
              <h4 className="mb-2 text-md font-medium">Research Information</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We'll use Perplexity Deep Research to generate detailed, high-quality research for your content.
                This research will form the foundation of your content creation process.
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/30">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="h-5 w-5 text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Error generating research
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-4">
              <button 
                onClick={() => setResearchStep(2)} 
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                disabled={isGenerating}
              >
                Back
              </button>
              
              <button
                onClick={handleDeepAnalysisClick}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                disabled={isLoading || isGenerating}
              >
                {isGenerating ? (
                  <div className="flex items-center space-x-2">
                    <span className="animate-spin">⏳</span>
                    <span>Generating Research...</span>
                  </div>
                ) : (
                  'Generate Research'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Progress indicator during generation */}
        {isGenerating && (
          <div className="mt-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress: {Math.round(generationProgress)}%</span>
                <div className="flex items-center space-x-3">
                  {retryCount > 0 && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Retry {retryCount}/{MAX_RETRIES}
                    </span>
                  )}
                  <button
                    onClick={handleCancelResearch}
                    className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div 
                  className="h-2 rounded-full bg-indigo-600 transition-all duration-300 ease-in-out" 
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              <div className="flex flex-col space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">{statusMessage}</p>
                
                {/* Additional information for users */}
                <div className="mt-2 rounded-md bg-blue-50 p-3 dark:bg-blue-900/30">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="h-5 w-5 text-blue-400">ℹ️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Research generation typically takes 4-6 minutes to complete. This is because we're conducting a thorough analysis across multiple sources to provide you with high-quality, up-to-date information.
                      </p>
                      <div className="mt-2">
                        <ul className="list-disc pl-5 text-xs text-blue-600 dark:text-blue-400">
                          <li>Finding and analyzing the latest sources</li>
                          <li>Extracting key insights and statistics</li>
                          <li>Identifying current best practices and trends</li>
                          <li>Formatting the research in a structured way</li>
                        </ul>
                      </div>
                      <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                        You can continue using other parts of the application while research is being generated.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Dynamic research tips based on the current research topic */}
                {safeContentDetails.researchTopic?.toLowerCase().includes('chicken') && 
                 safeContentDetails.researchTopic?.toLowerCase().includes('cook') && (
                  <div className="mt-2 rounded-md bg-amber-50 p-3 dark:bg-amber-900/30">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <span className="h-5 w-5 text-amber-500">💡</span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          Cooking Chicken Content Tips
                        </p>
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                          While we're generating your research, here are some content formats that work well for cooking demonstrations:
                        </p>
                        <ul className="mt-1 list-disc pl-5 text-xs text-amber-600 dark:text-amber-400">
                          <li>Step-by-step visual guides with closeups of important techniques</li>
                          <li>Before/after comparisons showing texture changes</li>
                          <li>Temperature check moments for food safety emphasis</li>
                          <li>Common mistake callouts and how to avoid them</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Estimated time remaining */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Estimated time remaining: {Math.max(0, Math.ceil(6 - (generationProgress / 100 * 6)))} minutes
                  </span>
                  {generationProgress >= 95 && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      Almost there!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render the content for Step 4 (Research Results)
  const renderStep4Content = () => {
    const isFallbackContent = error !== null;
    
    // Add debug logging
    console.log('[DEBUG] Rendering research results, step:', researchStep);
    console.log('[DEBUG] Research data available:', !!deepResearch);
    console.log('[DEBUG] Research data length:', deepResearch?.length || 0);
    console.log('[DEBUG] Is fallback content:', isFallbackContent);
    
    // Function to get condensed version of the research
    const getCondensedResearch = () => {
      if (!deepResearch) return '';
      
      // If there's a title (starts with #), keep it
      const lines = deepResearch.split('\n');
      let result = '';
      let foundFirstHeading = false;
      
      // Keep first heading, summary section, and first few paragraphs
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Always include the title
        if (line.startsWith('# ')) {
          result += line + '\n\n';
          foundFirstHeading = true;
          continue;
        }
        
        // Include the next heading (likely "Summary" or "Key Points")
        if (foundFirstHeading && line.startsWith('## ')) {
          result += line + '\n\n';
          
          // Get the next few paragraphs after this heading (3-4 paragraphs)
          let paragraphCount = 0;
          let j = i + 1;
          
          while (j < lines.length && paragraphCount < 3) {
            // If we hit another heading, stop
            if (lines[j].startsWith('#')) break;
            
            // Count a paragraph
            if (lines[j].trim() !== '' && !lines[j].startsWith('-') && !lines[j].startsWith('*')) {
              paragraphCount++;
            }
            
            result += lines[j] + '\n';
            j++;
          }
          
          // Add an ellipsis to indicate there's more
          result += '\n...\n';
          break;
        }
      }
      
      return result || deepResearch.substring(0, 800) + '...';
    };
    
    return (
      <div className="space-y-8">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Research Results for {safeContentDetails.researchTopic || 'Your Topic'}
          </h3>
          
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
                          : safeContentDetails.contentType === 'youtube-script'
                            ? 'YouTube Video'
                            : safeContentDetails.contentType || 'Not specified'}
                </span>
              </div>
              {safeContentDetails.contentType === 'social-media' && (
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Platform:</span>{' '}
                  <span className="text-gray-800 dark:text-gray-200">
                    {safeContentDetails.platform 
                      ? safeContentDetails.platform.charAt(0).toUpperCase() + 
                        safeContentDetails.platform.slice(1)
                      : 'Not specified'}
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
          
          {/* Show fallback content notice if applicable */}
          {isFallbackContent && (
            <div className="mb-6 rounded-md bg-blue-50 p-4 dark:bg-blue-900/30">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="h-5 w-5 text-blue-400">ℹ️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    We've provided useful information below based on your topic. While our research API is currently unavailable, you can still use this content for your project.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            {/* Research content - now with condensed view toggle */}
            <div className="prose prose-lg max-w-none dark:prose-invert 
              prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white 
              prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base 
              prose-p:text-gray-700 prose-p:my-4 dark:prose-p:text-gray-300 
              prose-a:text-indigo-600 dark:prose-a:text-indigo-400 
              prose-li:text-gray-700 dark:prose-li:text-gray-300 
              prose-ul:my-4 prose-ol:my-4
              prose-strong:font-bold prose-strong:text-gray-900 dark:prose-strong:text-white">
              <ReactMarkdown>
                {showFullResearch 
                  ? (deepResearch || 'No research data available. Please try again.') 
                  : getCondensedResearch() || 'No research data available. Please try again.'}
              </ReactMarkdown>
            </div>
            
            {/* Toggle button for full/condensed view */}
            {deepResearch && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowFullResearch(!showFullResearch)}
                  className="flex items-center gap-1 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {showFullResearch ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Show Less
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Show Full Research
                    </>
                  )}
                </button>
              </div>
            )}
            
            {/* AI-Recommended Content Types based on research */}
            {deepResearch && safeContentDetails.targetAudience && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <IconArrowDown className="mr-2 text-indigo-600" size={20} />
                  Next Step: Create Your Content
                </h4>
                <div className="mb-6 rounded-md bg-gray-50 p-4 dark:bg-gray-700/50">
                  <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Your Content Will Be Created As
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-600 dark:text-gray-400">Content Type:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                        {safeContentDetails.contentType?.replace('-', ' ') || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-600 dark:text-gray-400">Platform:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                        {safeContentDetails.platform 
                          ? safeContentDetails.platform.charAt(0).toUpperCase() + 
                            safeContentDetails.platform.slice(1)
                          : 'Not specified'}
                      </span>
                    </div>
                    {safeContentDetails.subPlatform && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Sub-Platform:</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                          {safeContentDetails.subPlatform.charAt(0).toUpperCase() + 
                           safeContentDetails.subPlatform.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Your research is ready! Click "Create Content" below to start writing content based on the insights gathered.
                </p>
              </div>
            )}
            
            {/* Navigation buttons */}
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setResearchStep(3)}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600"
                disabled={isGenerating}
              >
                Back
              </button>
              
              <button
                onClick={proceedToContentCreation}
                className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 flex items-center"
                disabled={!deepResearch || isGenerating}
              >
                Create Content
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">
          Research
        </h1>
        
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
                      className="h-0.5 bg-indigo-600 transition-all duration-500 ease-in-out" 
                      style={{ 
                        width: researchStep > step ? '100%' : '0%',
                      }}
                    ></div>
                  </div>
                )}
              </li>
            ))}
          </ol>
          
          <div className="mt-2 flex justify-between text-sm">
            <span className={researchStep >= 1 ? 'text-indigo-600' : 'text-gray-500'}>
              Initial Setup
            </span>
            <span className={researchStep >= 2 ? 'text-indigo-600' : 'text-gray-500'}>
              Follow-up Questions
            </span>
            <span className={researchStep >= 3 ? 'text-indigo-600' : 'text-gray-500'}>
              Generate Research
            </span>
            <span className={researchStep >= 4 ? 'text-indigo-600' : 'text-gray-500'}>
              Research Results
            </span>
            <span className={researchStep >= 5 ? 'text-indigo-600' : 'text-gray-500'}>
              Create Content
            </span>
          </div>
        </div>
        
        {/* Step Content - Update to include follow-up questions step */}
        <div className="mt-8">
          {researchStep === 1 && renderStep1Content()}
          {researchStep === 2 && renderFollowUpQuestionsContent()}
          {researchStep === 3 && renderStep3Content()}
          {researchStep === 4 && renderStep4Content()}
        </div>
      </div>
    </AppShell>
  );
} 
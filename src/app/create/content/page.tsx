/**
 * Content Generation Page - Simplified Version
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { getDisplayNames } from '@/app/lib/contentTypeDetection';
import AppShell from "@/components/AppShell";
import { useContent } from '@/lib/hooks/useContent';
import ConfirmDialog from '@/components/ConfirmDialog';
import { db } from "@/lib/firebase/firebase";
import ReactMarkdown from 'react-markdown';

// Enhanced research results interface
interface ResearchResults {
  researchMethod: 'perplexity' | 'trending' | 'claude' | 'placeholder';
  perplexityResearch?: string;
}

// Content details interface
interface ContentDetails {
  contentType: string;
  platform: string;
  subPlatform?: string;
  targetAudience: string;
  researchTopic: string;
  businessType: string;
  businessName?: string;
  primarySubject?: string;
  subjectType?: string;
  subjectDetails?: string;
  youtubeTranscript?: string;
  youtubeUrl?: string;
}

// Content settings interface
interface ContentSettings {
  style: string;
  length: string;
  includeCTA: boolean;
  includeHashtags: boolean;
  customHashtags?: string;
  slideCount?: string;
  presentationFormat?: string;
  technicalLevel?: string;
  includeExecutiveSummary?: boolean;
  includeActionItems?: boolean;
  includeDataVisualizations?: boolean;
}

// Add interface for version history
interface ContentVersion {
  content: string;
  timestamp: string;
  persona: string;
}

// Add this helper function at the top level
const renderSimpleMarkdown = (text: string) => {
  if (!text) return null;
  return (
    <div className="prose max-w-none">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
};

export default function ContentGenerator() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { saveContent } = useContent();
  const { user } = useAuth();
  const toast = useToast();
  
  // State for content details from previous step
  const [contentDetails, setContentDetails] = useState<ContentDetails>({
    contentType: '',
    platform: '',
    targetAudience: '',
    researchTopic: '',
    businessType: ''
  });

  const [researchResults, setResearchResults] = useState<ResearchResults | null>(null);
  const [contentSettings, setContentSettings] = useState<ContentSettings>({
    style: 'ariastar',
    length: 'medium',
    includeCTA: true,
    includeHashtags: true
  });
  
  // State for content generation
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // State for content refinement
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefinementLoading, setIsRefinementLoading] = useState(false);
  const [showContentRefinement, setShowContentRefinement] = useState(true);
  
  // State for personas
  const [currentPersona, setCurrentPersona] = useState(contentSettings.style);
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  
  // State for content expansion
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  
  // State for version history
  const [contentVersions, setContentVersions] = useState<ContentVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Safety counter to detect potential infinite loading problems
  const [loadAttempts, setLoadAttempts] = useState(0);
  
  // Prerendered content for better performance
  const [prerenderedContent, setPrerenderedContent] = useState<React.ReactNode | null>(null);

  // Error and loading states
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogConfirmAction, setDialogConfirmAction] = useState<() => void>(() => {});
  const [dialogCancelAction, setDialogCancelAction] = useState<() => void>(() => {});

  // Add heartbeat management
  const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);

  // Add a progress indicator during generation
  const [generationProgress, setGenerationProgress] = useState(0);

  // Helper to safely update state without blocking UI
  const safeUpdate = useCallback(() => {
    // Use a queue of microtasks to avoid blocking the main thread
    let updateQueue: (() => void)[] = [];

    // Add update to the queue
    const queueUpdate = (updateFn: () => void) => {
      updateQueue.push(updateFn);
    };

    // Process the update queue safely
    const processQueue = () => {
      const queue = [...updateQueue];
      updateQueue = [];

      if (queue.length > 0) {
        // Process first item immediately
        queue[0]();
        
        // Process remaining items with a small delay
        if (queue.length > 1) {
          setTimeout(() => {
            queue.slice(1).forEach(update => update());
          }, 0);
        }
      }
    };

    // Process queued updates on next tick to avoid UI blocking
    setTimeout(processQueue, 0);

    return queueUpdate;
  }, []);

  // Safely queue content updates using function form to avoid type problems
  const queueContentUpdate = useCallback(() => {
    const update = safeUpdate();
    
    // Set error to null
    update(() => setError(null));
    
    // Set loading to false
    update(() => setIsLoading(false));
    
    // Pre-render content if available
    if (generatedContent) {
      const rendered = renderSimpleMarkdown(generatedContent);
      update(() => setPrerenderedContent(rendered));
    }
    
    return update;
  }, [generatedContent, safeUpdate]);
  
  // Optimize research data loading
  useEffect(() => {
    if (contentDetails && contentDetails.contentType && contentDetails.platform) {
      console.log("[DIAGNOSTIC] Content details ready, preparing page content");
      
      // Add an instant demo option if research is available but might be taking time to process
      if (researchResults && !generatedContent && !isGenerating) {
        // Queue updates
        const update = queueContentUpdate();
        update(() => setError(null));
      }
    }
  }, [contentDetails, researchResults, generatedContent, isGenerating, queueContentUpdate]);
  
  // Handle navigation from research to content page
  useEffect(() => {
    // Check if we're coming directly from the research page
    const fromResearch = document.referrer.includes('/create/research');
    
    if (fromResearch) {
      console.log("[DIAGNOSTIC] Detected navigation from research page, optimizing transition");
      
      // Make the transition smoother by avoiding excessive processing
      if (isLoading) {
        // Reduce loading time if coming directly from research
        setTimeout(() => {
          if (isLoading) {
            console.log("[DIAGNOSTIC] Reducing loading time after research navigation");
            setIsLoading(false);
          }
        }, 1000);
      }
    }

    // Prevent language-related redirects on the content page when in a content generation flow
    // This fixes the issue where Spanish mode redirects back to homepage after research
    const preventLanguageRedirects = () => {
      try {
        // Set a flag in session storage to indicate we're in content generation flow
        sessionStorage.setItem('preventLanguageRedirect', 'true');
        
        // Add event listener to prevent language-triggered navigation away from this page
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
          const url = new URL(window.location.href);
          if (url.searchParams.has('lang')) {
            console.log("[DIAGNOSTIC] Detected potential language redirect, preventing navigation");
            // Clear the redirect flag when actually leaving the page intentionally
            sessionStorage.removeItem('preventLanguageRedirect');
          }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
      } catch (error) {
        console.error("[DIAGNOSTIC] Error in preventing language redirects:", error);
      }
    };
    
    return preventLanguageRedirects();
  }, [isLoading]);
  
  // Preload rendered content to avoid flicker
  useEffect(() => {
    // Pre-render markdown when content changes to avoid UI jank
    if (generatedContent) {
      const rendered = renderSimpleMarkdown(generatedContent);
      setPrerenderedContent(rendered);
    } else {
      setPrerenderedContent(null);
    }
  }, [generatedContent]);

  // Show a message if we detect the unresponsive dialog might appear
  useEffect(() => {
    let longOperationTimeout: NodeJS.Timeout;
    
    // If we're in a loading state for too long, show a more helpful message
    if (isLoading) {
      longOperationTimeout = setTimeout(() => {
        console.log("[DIAGNOSTIC] Long operation detected, adding helpful context");
        // This will run if the page is taking too long but hasn't triggered the browser's unresponsive dialog yet
        if (isLoading) {
          const statusMsg = "Loading is taking longer than expected. If a browser dialog appears asking to wait, please click 'Wait'.";
          setStatusMessage(statusMsg);
        }
      }, 2000);
    }
    
    return () => {
      if (longOperationTimeout) clearTimeout(longOperationTimeout);
    };
  }, [isLoading]);

  // Function to handle page reload when needed
  const handleReload = useCallback(() => {
    // Clean problematic data from session storage before reload
    try {
      console.log("[DIAGNOSTIC] Cleaning problematic session storage data before reload");
      
      // Remove the problematic platformOptions entries
      sessionStorage.removeItem('platformOptions.company-blog');
      sessionStorage.removeItem('platformOptions.medium');
      sessionStorage.removeItem('platformOptions.wordpress');
      
      // Clean and normalize content details
      const contentDetailsStr = sessionStorage.getItem('contentDetails');
      if (contentDetailsStr) {
        try {
          const details = JSON.parse(contentDetailsStr);
          
          // Fix platform issues
          if (details.platform === 'company-blog' || 
              details.platform === 'medium' || 
              details.platform === 'wordpress') {
            details.subPlatform = details.platform;
            details.platform = 'blog';
          }
          
          // Fix content type issues
          if (details.contentType === 'company-blog') {
            details.contentType = 'blog-post';
          }
          
          // Save fixed version back to session storage
          sessionStorage.setItem('contentDetails', JSON.stringify(details));
          console.log("[DIAGNOSTIC] Fixed content details saved to session storage");
        } catch (e) {
          console.error("[DIAGNOSTIC] Error fixing content details, removing corrupted data", e);
          sessionStorage.removeItem('contentDetails');
        }
      }
    } catch (e) {
      console.error("[DIAGNOSTIC] Error cleaning session storage", e);
    }
    
    // Force page reload
    window.location.reload();
  }, []);

  // Load content details from session storage
  useEffect(() => {
    console.log("==== CONTENT PAGE INITIALIZATION DIAGNOSTIC ====");
    
    // Log all session storage keys for debugging
    console.log("[DIAGNOSTIC] ALL SESSION STORAGE KEYS:", Object.keys(sessionStorage));
    
    // Dump the actual raw content of key session storage items
    try {
      console.log("[DIAGNOSTIC] Raw contentDetails:", sessionStorage.getItem('contentDetails'));
      console.log("[DIAGNOSTIC] Raw researchResults:", sessionStorage.getItem('researchResults'));
    } catch (e) {
      console.error("[DIAGNOSTIC] Error accessing session storage:", e);
    }

    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.error('[DIAGNOSTIC] Loading timeout reached - forcing load completion');
        console.log('[DIAGNOSTIC] Component state at timeout:', { 
          contentDetails, 
          isLoading, 
          error, 
          platform: contentDetails?.platform,
          subPlatform: contentDetails?.subPlatform,
          loadAttempts 
        });
        
        // If we haven't exceeded max retries, try loading again
        if (loadAttempts < 3) {
          console.log('[DIAGNOSTIC] Attempting retry...');
          initializePageData();
        } else {
          setIsLoading(false);
          setError('Loading took too long. Some data might not be available. Please reload the page and try again.');
        }
      }
    }, 60000); // Increased timeout to 60 seconds (from 30 seconds) for slower connections
    
    // Initialize the page data
    const initializePageData = async () => {
      setLoadAttempts(prev => prev + 1);
      setIsLoading(true);
      
      try {
        // Try to restore from session storage
        const storedDetails = sessionStorage.getItem('contentDetails');
        if (storedDetails) {
          try {
            console.log('[DIAGNOSTIC] Found stored content details');
            const parsedDetails = JSON.parse(storedDetails);
            
            console.log('[DIAGNOSTIC] Parsed content details:', {
              contentType: parsedDetails.contentType,
              platform: parsedDetails.platform,
              subPlatform: parsedDetails.subPlatform,
              researchTopic: parsedDetails.researchTopic,
              targetAudience: parsedDetails.targetAudience
            });
            
            // Fix platform issues if needed
            if (parsedDetails.platform === 'company-blog' || 
                parsedDetails.platform === 'medium' || 
                parsedDetails.platform === 'wordpress') {
              parsedDetails.subPlatform = parsedDetails.platform;
              parsedDetails.platform = 'blog';
              console.log('[DIAGNOSTIC] Fixed platform issues:', {
                platform: parsedDetails.platform,
                subPlatform: parsedDetails.subPlatform
              });
            }
            
            setContentDetails(parsedDetails);
            console.log('[DIAGNOSTIC] Content details state set successfully');
          } catch (parseError) {
            console.error('[DIAGNOSTIC] Failed to parse content details:', parseError);
            console.error('[DIAGNOSTIC] Raw content details that failed to parse:', storedDetails);
            setError('Failed to parse content details. Please go back and try again.');
            // Don't set default content details - require real data
          }
        } else {
          console.log('[DIAGNOSTIC] No content details found in session storage');
          setError('No content details found. Please start from the beginning.');
        }
        
        // Try to get research results from session storage
        const storedResearchResults = sessionStorage.getItem('researchResults');
        if (storedResearchResults) {
          try {
            console.log('[DIAGNOSTIC] Found stored research results');
            const parsedResults = JSON.parse(storedResearchResults);
            console.log('[DIAGNOSTIC] Research results length:', 
                        parsedResults?.perplexityResearch?.length || 0, 
                        'method:', parsedResults?.researchMethod);
            setResearchResults(parsedResults);
            console.log('[DIAGNOSTIC] Research results state set successfully');
          } catch (error) {
            console.error('[DIAGNOSTIC] Error parsing research results:', error);
            console.error('[DIAGNOSTIC] Raw research results that failed to parse:', storedResearchResults);
            setError('Failed to parse research results. Please start from the beginning.');
          }
        } else {
          console.log('[DIAGNOSTIC] No research results found in session storage');
          setError('No research results found. Please start from the beginning.');
        }
        
        // Set loading to false after initialization is complete
        setIsLoading(false);
        console.log('[DIAGNOSTIC] Page initialization complete: isLoading set to false');
      } catch (error) {
        console.error('[DIAGNOSTIC] Critical error initializing page:', error);
        setIsLoading(false);
        setError('Failed to initialize page. Please reload and try again.');
      }
    };
    
    // Run initialization
    initializePageData();
    
    // Clear timeout on component unmount or if loading completes
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, []);

  // Initialize heartbeat when generation starts
  useEffect(() => {
    if (isGenerating) {
      // Start heartbeat
      const interval = setInterval(() => {
        console.log('[HEARTBEAT] Content generation active');
      }, 5000); // Send heartbeat every 5 seconds
      setHeartbeatInterval(interval);
    } else {
      // Clear heartbeat when generation stops
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        setHeartbeatInterval(null);
      }
    }
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [isGenerating]);

  // Helper function to get content type text for display
  const getContentTypeText = () => {
    const { contentType, platform, subPlatform } = contentDetails;
    
    try {
      // Use the centralized display name function from contentTypeDetection.ts
      const { displayContentType } = getDisplayNames(
        contentType,
        platform,
        subPlatform || '',
        language
      );
      
      return displayContentType;
    } catch (error) {
      console.error('Error formatting content type:', error);
      // Fallback to the raw content type value
      return contentType || 'Content';
    }
  };
  
  // Render platform text from the same centralized source
  const getPlatformText = () => {
    const { contentType, platform, subPlatform } = contentDetails;
    
    try {
      // Use the centralized display name function from contentTypeDetection.ts
      const { displayPlatform } = getDisplayNames(
        contentType,
        platform,
        subPlatform || '',
        language
      );
      
      return displayPlatform;
    } catch (error) {
      console.error('Error formatting platform:', error);
      // Fallback to the raw platform value
      return platform || 'Not specified';
    }
  };

  // Add a helper function to format content type display
  const formatContentTypeDisplay = () => {
    // Special case for blog post on company blog platform
    if (contentDetails?.contentType === 'blog-post' && 
        (contentDetails?.platform === 'company-blog' || contentDetails?.subPlatform === 'company-blog')) {
      return language === 'es' ? 'Entrada de Blog (Blog de Empresa)' : 'Blog Post (Company Blog)';
    }
    
    // Use standard content type display
    return getContentTypeText();
  };

  // Helper function to open the confirm dialog
  const openConfirmDialog = (message: string, onConfirm: () => void, onCancel: () => void) => {
    setDialogMessage(message);
    setDialogConfirmAction(() => onConfirm);
    setDialogCancelAction(() => onCancel);
    setDialogOpen(true);
  };

  // Helper function to safely render contentGeneration translations with fallbacks
  const safeContentGenerationTranslate = (key: string, defaultValue: string) => {
    const translated = t(key, { defaultValue });
    // Check if we got a raw key back (translation failure)
    if (translated.includes('contentGeneration.') || translated === key) {
      console.warn(`Translation failed for key: ${key}, using default value`);
      return defaultValue;
    }
    return translated;
  };

  // Define content styles
  const getContentStyles = useCallback(() => {
    // AI Personas
    const aiPersonas = [
      { id: 'ariastar', name: t('personaDisplayNames.ariastar', { defaultValue: 'AriaStar (Relatable Best Friend)' }) },
      { id: 'specialist_mentor', name: t('personaDisplayNames.specialist_mentor', { defaultValue: 'MentorPro (Expert Specialist)' }) },
      { id: 'ai_collaborator', name: t('personaDisplayNames.ai_collaborator', { defaultValue: 'AIInsight (AI Collaborator)' }) },
      { id: 'sustainable_advocate', name: t('personaDisplayNames.sustainable_advocate', { defaultValue: 'EcoEssence (Sustainable Advocate)' }) },
      { id: 'data_visualizer', name: t('personaDisplayNames.data_visualizer', { defaultValue: 'DataStory (Data Visualizer)' }) },
      { id: 'multiverse_curator', name: t('personaDisplayNames.multiverse_curator', { defaultValue: 'NexusVerse (Multiverse Curator)' }) },
      { id: 'ethical_tech', name: t('personaDisplayNames.ethical_tech', { defaultValue: 'TechTranslate (Ethical Tech)' }) },
      { id: 'niche_community', name: t('personaDisplayNames.niche_community', { defaultValue: 'CommunityForge (Niche Community)' }) },
      { id: 'synthesis_maker', name: t('personaDisplayNames.synthesis_maker', { defaultValue: 'SynthesisSage (Synthesis Maker)' }) },
    ];
    
    // Map of content style IDs to translation keys with content-specific styles
    const styles: Record<string, any> = {
      'blog-post': aiPersonas,
      'social-media': aiPersonas,
      'email': aiPersonas,
      'video-script': aiPersonas,
      'youtube-script': aiPersonas,
      'vlog-script': aiPersonas,
      'podcast-script': aiPersonas,
      'presentation': aiPersonas,
      'google-ads': aiPersonas,
      'research-report': aiPersonas
    };
    
    return styles;
  }, [t]);

  // Helper function to format persona name for display
  const getFormattedPersonaName = (personaId: string) => {
    switch (personaId) {
      case 'ariastar':
        return 'AriaStar';
      case 'specialist_mentor':
        return 'MentorPro';
      case 'ai_collaborator':
        return 'AIInsight';
      case 'sustainable_advocate':
        return 'EcoEssence';
      case 'data_visualizer':
        return 'DataStory';
      case 'multiverse_curator':
        return 'NexusVerse';
      case 'ethical_tech':
        return 'TechTranslate';
      case 'niche_community':
        return 'CommunityForge';
      case 'synthesis_maker':
        return 'SynthesisSage';
      default:
        return personaId;
    }
  };

  // Update the startGeneration function
  const startGeneration = async () => {
    // Prevent multiple generation attempts
    if (isGenerating) return;
    
    try {
      setError(null);
      setIsGenerating(true);
      setStatusMessage('Preparing content generation...');
      
      // Check if we have valid research data
      if (!researchResults?.perplexityResearch && !contentDetails.youtubeTranscript) {
        throw new Error("No research data available for content generation. Please go back to research page.");
      }
      
      // Log the research data length for debugging
      const researchDataLength = researchResults?.perplexityResearch?.length || 0;
      const transcriptLength = contentDetails.youtubeTranscript?.length || 0;
      console.log(`[DIAGNOSTIC] Research data length: ${researchDataLength} characters, transcript length: ${transcriptLength} characters`);
      
      // If research data is very large, warn the user
      if (researchDataLength > 60000 || transcriptLength > 60000) {
        console.warn('[DIAGNOSTIC] Large research data detected - may cause longer content generation');
        toast.info('Large amount of research data detected. Content generation may take up to 5 minutes, but will preserve all important information.');
      }
      
      // Use AbortController for request cancellation
      const abortController = new AbortController();
      
      // Set up a timeout for the request
      const timeoutId = setTimeout(() => {
        console.log('[DIAGNOSTIC] Request timeout reached, aborting request');
        abortController.abort();
      }, 300000); // 5 minute timeout (increased from 3 minutes)
      
      // Prepare enhanced content request with all available data
      console.log('Starting content generation with research data...');
      
      const response = await fetch('/api/claude/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: contentDetails.contentType,
          platform: contentDetails.platform,
          audience: contentDetails.targetAudience,
          context: prompt,
          researchData: researchResults?.perplexityResearch || '',
          youtubeTranscript: contentDetails.youtubeTranscript || '',
          youtubeUrl: contentDetails.youtubeUrl || '',
          style: contentSettings.style,
          language,
          styleIntensity: 1,
          subPlatform: contentDetails.subPlatform || '',
          length: contentSettings.length,
          includeCTA: contentSettings.includeCTA,
          includeHashtags: contentSettings.includeHashtags,
          businessType: contentDetails.businessType,
          businessName: contentDetails.businessName,
          researchTopic: contentDetails.researchTopic
        }),
        signal: abortController.signal
      });
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Try to get error details from the response
        let errorMsg = 'Failed to generate content';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        
        // For timeout errors, provide more helpful guidance
        if (errorMsg.includes('timed out') || errorMsg.includes('timeout')) {
          errorMsg += '. This is likely due to the large amount of research data. Try generating content with more focused research or try again.';
        }
        
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      
      if (!data.content) {
        throw new Error('No content was generated');
      }
      
      // Add version tracking for the newly generated content
      const newVersion = {
        content: data.content,
        timestamp: new Date().toISOString(),
        persona: contentSettings.style
      };
      
      setContentVersions(prev => {
        // Check if this is the first version or a duplicate of the last version
        if (prev.length === 0 || prev[prev.length - 1].content !== newVersion.content) {
          return [...prev, newVersion];
        }
        return prev;
      });
      
      setGeneratedContent(data.content);
      
      // Pre-render the content to avoid UI jank
      const rendered = renderSimpleMarkdown(data.content);
      setPrerenderedContent(rendered);
      
      // Show a success message
      toast.success('Content generated successfully!');
    } catch (error: any) {
      console.error('[ERROR] Content generation failed:', error);
      
      // Provide user-friendly error messages based on the error
      let errorMessage = error.message || 'An error occurred during content generation';
      
      // For AbortError (timeout), provide more specific guidance
      if (error.name === 'AbortError') {
        errorMessage = 'Content generation timed out. This could be due to the large amount of research data. Try again with more focused research.';
      }
      
      // For connection errors, suggest retry
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        errorMessage = 'Connection error during content generation. Please check your internet connection and try again.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      
      // If we have research results but no generated content, try to recover
      if (researchResults?.perplexityResearch && !generatedContent) {
        console.log('[RECOVERY] Attempting emergency content generation with reduced research data');
        
        // Show recovery attempt message
        toast.info('Attempting recovery with reduced research data');
        
        try {
          // Create a condensed version of the research data
          const research = researchResults.perplexityResearch;
          const condensedResearch = research.length > 20000 
            ? research.substring(0, 8000) + "\n\n[...]\n\n" + research.substring(research.length - 8000)
            : research;
          
          // Try a simplified request with condensed data
          const recoveryResponse = await fetch('/api/claude/content', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contentType: contentDetails.contentType,
              platform: contentDetails.platform,
              audience: contentDetails.targetAudience,
              context: prompt,
              researchData: condensedResearch,
              style: contentSettings.style,
              language
            })
          });
          
          if (recoveryResponse.ok) {
            const recoveryData = await recoveryResponse.json();
            if (recoveryData.content) {
              console.log('[RECOVERY] Emergency content generation succeeded');
              
              // Create a recovery version
              const recoveryVersion = {
                content: recoveryData.content,
                timestamp: new Date().toISOString(),
                persona: contentSettings.style
              };
              
              setContentVersions(prev => [...prev, recoveryVersion]);
              setGeneratedContent(recoveryData.content);
              
              // Pre-render the content to avoid UI jank
              const rendered = renderSimpleMarkdown(recoveryData.content);
              setPrerenderedContent(rendered);
              
              // Clear error and show success message
              setError(null);
              toast.success('Content generation recovered with condensed research!');
            }
          }
        } catch (recoveryError) {
          console.error('[RECOVERY] Emergency content generation failed:', recoveryError);
        }
      }
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };
  
  // Function to regenerate with a new persona
  const changePersonaAndRegenerate = async (newPersona: string) => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setStatusMessage(`Creating content with ${getFormattedPersonaName(newPersona)}...`);
    setContentSettings(prev => ({ ...prev, style: newPersona }));
    setCurrentPersona(newPersona);
    
    // Scroll to the absolute top of the page when regeneration starts
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    try {
      // Log the request details
      console.log('[DIAGNOSTIC] Persona change request:', {
        from: currentPersona,
        to: newPersona, 
        contentType: contentDetails.contentType,
        platform: contentDetails.platform,
        researchLength: researchResults?.perplexityResearch?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      setStatusMessage(`Creating content with ${getFormattedPersonaName(newPersona)}...`);
      
      const response = await fetch('/api/claude/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: contentDetails.contentType,
          platform: contentDetails.platform,
          audience: contentDetails.targetAudience,
          researchData: researchResults?.perplexityResearch || '',
          style: newPersona,
          length: contentSettings.length,
          includeCTA: contentSettings.includeCTA,
          includeHashtags: contentSettings.includeHashtags,
          persona: newPersona,
          businessType: contentDetails.businessType,
          businessName: contentDetails.businessName,
          researchTopic: contentDetails.researchTopic,
          isPersonaChange: true, // Flag to indicate this is a persona change request
          previousPersona: currentPersona,
          previousContent: generatedContent,
          language: language // Explicitly pass the language to the API
        }),
      });
      
      setStatusMessage('Finalizing your content...');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      // Get the raw response text first
      const rawText = await response.text();
      console.log('[DIAGNOSTIC] Raw response length:', rawText.length);
      
      // Parse the JSON carefully
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('[DIAGNOSTIC] JSON parse error:', parseError);
        console.error('[DIAGNOSTIC] Raw response:', rawText);
        throw new Error('Failed to parse API response');
      }
      
      if (!data.content) {
        console.error('[DIAGNOSTIC] No content in response:', data);
        throw new Error('No content received from API');
      }
      
      // Log content details before setting state
      console.log('[DIAGNOSTIC] Persona change content result:', {
        rawLength: rawText.length,
        contentLength: data.content.length,
        newPersona: newPersona,
        status: response.status,
        timestamp: new Date().toISOString()
      });

      // Check if we're in Spanish mode and fix common English elements that might appear
      let cleanedContent = data.content;
      if (language === 'es') {
        // Common English phrases that might appear and their Spanish translations
        const commonEnglishPhrases = [
          { english: "That feeling when you think you're the only one struggling? Not true.", spanish: "¿Esa sensación cuando piensas que eres el único que lucha? No es cierto." },
          { english: "Ever notice how", spanish: "¿Alguna vez has notado cómo" },
          { english: "Did you know that", spanish: "¿Sabías que" },
          { english: "The key difference between", spanish: "La diferencia clave entre" },
          { english: "feels like trying to solve a Rubik's cube blindfolded?", spanish: "¿se siente como intentar resolver un cubo de Rubik con los ojos vendados?" },
          { english: "How frustrating is it", spanish: "Qué frustrante es" },
          { english: "An advanced strategy I recommend is", spanish: "Una estrategia avanzada que recomiendo es" },
          { english: "Looking for reliable", spanish: "¿Buscando" },
          { english: "Struggling with", spanish: "¿Luchando con" },
          { english: "Are you tired of", spanish: "¿Estás cansado de" },
          { english: "Searching for", spanish: "¿Buscando" },
          { english: "Having reliable", spanish: "Tener" },
          { english: "Living in rural areas", spanish: "Vivir en zonas rurales" },
          { english: "Rural connectivity", spanish: "La conectividad rural" },
          { english: "Internet service", spanish: "El servicio de internet" },
          { english: "Today,", spanish: "Hoy," },
          { english: "Let's face it:", spanish: "Seamos sinceros:" },
          { english: "Based on recent data,", spanish: "Según datos recientes," },
          { english: "Picture this:", spanish: "Imagina esto:" },
          { english: "SOLUTION:", spanish: "SOLUCIÓN:" },
          { english: "NEWS!", spanish: "¡NOTICIA!" },
          { english: "Current technology allows", spanish: "La tecnología actual permite" },
          { english: "Key considerations when", spanish: "Consideraciones clave al" },
          { english: "Practical applications of", spanish: "Aplicaciones prácticas de" }
        ];
        
        // Replace any English phrases with their Spanish equivalents
        commonEnglishPhrases.forEach(({english, spanish}) => {
          cleanedContent = cleanedContent.replace(new RegExp(english, 'gi'), spanish);
        });

        console.log('[DIAGNOSTIC] Applied Spanish content fixes to persona change content');
      }
      
      // Store the generated content
      setGeneratedContent(cleanedContent);
      
      // Add to version history
      const versionEntry: ContentVersion = {
        content: cleanedContent,
        timestamp: new Date().toISOString(),
        persona: newPersona
      };
      setContentVersions(prev => [...prev, versionEntry]);
      
      // Pre-render the content with error boundary
      try {
        const rendered = renderSimpleMarkdown(cleanedContent);
        setPrerenderedContent(rendered);
      } catch (renderError) {
        console.error('[DIAGNOSTIC] Render error:', renderError);
        // Fall back to plain text display if markdown rendering fails
        setPrerenderedContent(<pre className="whitespace-pre-wrap">{cleanedContent}</pre>);
      }
      
      setStatusMessage(`Content created with ${getFormattedPersonaName(newPersona)}!`);
      
      // Reset content expansion
      setIsContentExpanded(false);
      
      // Auto-scroll to the content
      setTimeout(() => {
        document.getElementById('generated-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
      
    } catch (error) {
      console.error('[DIAGNOSTIC] Persona change error:', error);
      setError(error instanceof Error ? error.message : 'Failed to regenerate content with new persona');
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        setStatusMessage('');
      }, 3000);
      
      // Scroll to the absolute top of the page after regeneration completes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Simple function to determine if CTA and hashtags should be hidden
  const shouldHideCTAAndHashtags = () => {
    const contentType = contentDetails?.contentType?.toLowerCase() || '';
    const platform = contentDetails?.platform?.toLowerCase() || '';
    return contentType.includes('presentation') || platform.includes('presentation');
  };

  // Helper function to copy content to clipboard
  const copyToClipboard = () => {
    if (!generatedContent) return;
    
    navigator.clipboard.writeText(generatedContent)
      .then(() => {
        toast.toast({
          title: t('actions.copyClipboard', { defaultValue: 'Content copied to clipboard!' }),
          variant: "default"
        });
      })
      .catch(err => {
        console.error('Failed to copy content: ', err);
        toast.toast({
          title: t('actions.copyClipboardError', { defaultValue: 'Failed to copy content. Please try selecting and copying manually.' }),
          variant: "destructive"
        });
      });
  };

  // Export content as text file
  const exportAsText = () => {
    if (!generatedContent) return;
    
    const element = document.createElement('a');
    const file = new Blob([generatedContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${contentDetails.researchTopic || 'content'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Function to save content to dashboard
  const handleSaveContent = async () => {
    if (!generatedContent || !user) {
      toast.toast({
        title: t('actions.saveToDashboardError', { defaultValue: 'Content or user information missing' }),
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Create a content object with all necessary metadata
      const contentToSave = {
        userId: user.uid,
        content: generatedContent,
        title: contentDetails.researchTopic || 'Untitled Content',
        contentType: contentDetails.contentType,
        platform: contentDetails.platform,
        subPlatform: contentDetails.subPlatform,
        targetAudience: contentDetails.targetAudience,
        businessType: contentDetails.businessType,
        persona: currentPersona,
        length: contentSettings.length as 'short' | 'medium' | 'long',
        status: 'published' as const,
      };
      
      // Save the content using the content service
      const savedContent = await saveContent(contentToSave);
      
      // Show success message
      toast.toast({
        title: t('actions.saveToDashboardSuccess', { defaultValue: 'Content saved to dashboard successfully!' }),
        variant: "default"
      });
      
      // Optionally, redirect to the dashboard
      // Set refresh flag so dashboard knows to reload content
      sessionStorage.setItem('dashboardRefreshNeeded', 'true');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Error saving content:', error);
      toast.toast({
        title: t('actions.saveToDashboardError', { defaultValue: 'Failed to save content. Please try again.' }),
        variant: "destructive"
      });
    }
  };

  // Handle content refinement submission
  const handleRefinementSubmit = async () => {
    if (!refinementPrompt.trim()) {
      toast.error(t('contentGeneration.emptyFeedbackError', { defaultValue: 'Please provide feedback for refinement' }));
      return;
    }
    
    setIsRefinementLoading(true);
    
    try {
      // Show the loading state but keep content visible
      setStatusMessage(t('contentGeneration.refiningContent', { defaultValue: 'Refining content based on your feedback...' }));

      const response = await fetch('/api/claude/refine-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalContent: generatedContent,
          feedback: refinementPrompt,
          style: currentPersona,
          contentType: contentDetails?.contentType || '',
          platform: contentDetails?.platform || '',
          language: language
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t('contentGeneration.refinementError', { defaultValue: 'Failed to refine content' }));
      }
      
      const data = await response.json();
      if (!data.content) {
        throw new Error(t('contentGeneration.noRefinedContent', { defaultValue: 'No refined content received' }));
      }
      
      // Add to version history
      const versionEntry: ContentVersion = {
        content: generatedContent,
        timestamp: new Date().toISOString(),
        persona: currentPersona
      };
      setContentVersions(prev => [...prev, versionEntry]);
      
      // Update the content
      setGeneratedContent(data.content);
      setPrerenderedContent(renderSimpleMarkdown(data.content));
      setRefinementPrompt('');
      toast.success(t('contentGeneration.refinementSuccess', { defaultValue: 'Content refined successfully!' }));
    } catch (error) {
      console.error('Refinement error:', error);
      toast.error(t('contentGeneration.refinementFailure', { defaultValue: 'Failed to refine content. Please try again.' }));
    } finally {
      setIsRefinementLoading(false);
    }
  };

  // Reusable disabled footer link component
  const DisabledFooterLink = ({ text }: { text: string }) => (
    <li>
      <span 
        className="text-gray-500 cursor-not-allowed transition-colors hover:text-gray-400" 
        title={t('common.comingSoon', { defaultValue: 'Coming Soon' })}
      >
        {text}
      </span>
    </li>
  );

  // Add a function to update progress for better user feedback
  useEffect(() => {
    if (isGenerating) {
      // Start a progress simulation for better user experience
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 2;
        if (progress > 95) {
          progress = 95; // Cap at 95% until complete
          clearInterval(interval);
        }
        setGenerationProgress(Math.floor(progress));
        
        // Update status message based on progress with proper translations
        if (progress < 20) {
          setStatusMessage(language === 'es' 
            ? 'Analizando datos de investigación...' 
            : 'Analyzing research data...');
        } else if (progress < 40) {
          setStatusMessage(language === 'es' 
            ? 'Estructurando contenido con voz de persona...' 
            : 'Structuring content with persona voice...');
        } else if (progress < 60) {
          setStatusMessage(language === 'es' 
            ? 'Desarrollando puntos clave e ideas...' 
            : 'Developing key points and insights...');
        } else if (progress < 80) {
          setStatusMessage(language === 'es' 
            ? 'Optimizando para plataforma y audiencia...' 
            : 'Optimizing for platform and audience...');
        } else {
          setStatusMessage(language === 'es' 
            ? 'Finalizando generación de contenido...' 
            : 'Finalizing content generation...');
        }
      }, 2000);
      
      return () => clearInterval(interval);
    } else {
      setGenerationProgress(0);
    }
  }, [isGenerating, language]);

  return (
    <AppShell hideHeader={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Logo header */}
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">
                {safeContentGenerationTranslate('contentGeneration.pageTitle', 'Content Generation')}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    {t('contentGeneration.loading.title', { defaultValue: 'Loading Content Generator' })}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {t('contentGeneration.loading.subtitle', { defaultValue: 'Please wait while we load your research and content details' })}
                  </p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="rounded-full h-12 w-12 bg-red-100 mx-auto flex items-center justify-center">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">{error}</h3>
                  <div className="mt-6">
                    <Link
                      href="/create/research"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t('contentGeneration.backToResearch', { defaultValue: 'Back to Research' })}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Content Parameters */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {safeContentGenerationTranslate('contentGeneration.parameters', 'Content Parameters')}
                      </h3>
                      <dl className="grid grid-cols-1 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">
                            {safeContentGenerationTranslate('contentGeneration.contentType', 'Content Type')}
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatContentTypeDisplay()}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">
                            {safeContentGenerationTranslate('contentGeneration.platform', 'Platform')}
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">{getPlatformText()}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">
                            {safeContentGenerationTranslate('contentGeneration.targetAudience', 'Target Audience')}
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">{contentDetails.targetAudience}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">
                            {safeContentGenerationTranslate('contentGeneration.businessType', 'Business Type')}
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">{contentDetails.businessType}</dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {safeContentGenerationTranslate('contentGeneration.settings', 'Content Settings')}
                      </h3>
                      <dl className="grid grid-cols-1 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">
                            {safeContentGenerationTranslate('contentGeneration.currentStyle', 'Current Style')}
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">{getFormattedPersonaName(currentPersona) || t('common.notSelected', { defaultValue: 'Not selected' })}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">
                            {safeContentGenerationTranslate('contentGeneration.length', 'Length')}
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            <select
                              value={contentSettings.length}
                              onChange={(e) => setContentSettings(prev => ({ ...prev, length: e.target.value }))}
                              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                              aria-label={safeContentGenerationTranslate('contentGeneration.contentLength', 'Content length')}
                            >
                              <option value="short">
                                {safeContentGenerationTranslate('contentGeneration.short', 'Short')}
                              </option>
                              <option value="medium">
                                {safeContentGenerationTranslate('contentGeneration.medium', 'Medium')}
                              </option>
                              <option value="long">
                                {safeContentGenerationTranslate('contentGeneration.long', 'Long')}
                              </option>
                            </select>
                          </dd>
                        </div>
                        {!shouldHideCTAAndHashtags() && (
                          <>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">
                                {safeContentGenerationTranslate('contentGeneration.includeCTA', 'Include CTA')}
                              </dt>
                              <dd className="mt-1 text-sm text-gray-900">
                                <div className="flex items-center space-x-2">
                                  <label className="inline-flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={contentSettings.includeCTA}
                                      onChange={(e) => setContentSettings(prev => ({ ...prev, includeCTA: e.target.checked }))}
                                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                    />
                                    <span className="ml-2">{contentSettings.includeCTA ? t('common.yes', { defaultValue: 'Yes' }) : t('common.no', { defaultValue: 'No' })}</span>
                                  </label>
                                </div>
                              </dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">
                                {safeContentGenerationTranslate('contentGeneration.includeHashtags', 'Include Hashtags')}
                              </dt>
                              <dd className="mt-1 text-sm text-gray-900">
                                <div className="flex items-center space-x-2">
                                  <label className="inline-flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={contentSettings.includeHashtags}
                                      onChange={(e) => setContentSettings(prev => ({ ...prev, includeHashtags: e.target.checked }))}
                                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                    />
                                    <span className="ml-2">{contentSettings.includeHashtags ? t('common.yes', { defaultValue: 'Yes' }) : t('common.no', { defaultValue: 'No' })}</span>
                                  </label>
                                </div>
                              </dd>
                            </div>
                          </>
                        )}
                      </dl>
                    </div>
                  </div>

                  {/* Persona Selection - Show if no content generated */}
                  {!generatedContent && !isGenerating && (
                    <div className="text-center py-8 space-y-6">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {safeContentGenerationTranslate('contentGeneration.choosePersona', 'Choose an AI Persona for Your Content')}
                      </h3>
                      <p className="text-sm text-gray-500 mb-6">
                        {safeContentGenerationTranslate('contentGeneration.selectStyleText', 'Select the writing style that best matches your needs')}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                        {(() => {
                          // Define all personas in a variable for easier management
                          const allPersonas = [
                            {
                              id: 'ariastar',
                              name: 'AriaStar',
                              description: t('personas.ariastar.description', { defaultValue: 'Friendly, relatable tone perfect for social media and blogs' }),
                              icon: '👋'
                            },
                            {
                              id: 'specialist_mentor',
                              name: 'MentorPro',
                              description: t('personas.specialist_mentor.description', { defaultValue: 'Professional, authoritative voice for technical content' }),
                              icon: '👨‍🏫'
                            },
                            {
                              id: 'ai_collaborator',
                              name: 'AIInsight',
                              description: t('personas.ai_collaborator.description', { defaultValue: 'Balanced, analytical tone for research and reports' }),
                              icon: '🤖'
                            },
                            {
                              id: 'sustainable_advocate',
                              name: 'EcoEssence',
                              description: t('personas.sustainable_advocate.description', { defaultValue: 'Passionate voice for sustainability and social impact' }),
                              icon: '🌱'
                            },
                            {
                              id: 'data_visualizer',
                              name: 'DataStory',
                              description: t('personas.data_visualizer.description', { defaultValue: 'Clear, data-driven narrative style' }),
                              icon: '📊'
                            },
                            {
                              id: 'multiverse_curator',
                              name: 'NexusVerse',
                              description: t('personas.multiverse_curator.description', { defaultValue: 'Creative, engaging tone for multimedia content' }),
                              icon: '🎨'
                            },
                            {
                              id: 'ethical_tech',
                              name: 'TechTranslate',
                              description: t('personas.ethical_tech.description', { defaultValue: 'Balanced voice for explaining complex technical concepts' }),
                              icon: '⚙️'
                            },
                            {
                              id: 'niche_community',
                              name: 'CommunityForge',
                              description: t('personas.niche_community.description', { defaultValue: 'Engaging tone for building community and connection' }),
                              icon: '👥'
                            },
                            {
                              id: 'synthesis_maker',
                              name: 'SynthesisSage',
                              description: t('personas.synthesis_maker.description', { defaultValue: 'Insightful tone for connecting ideas across domains' }),
                              icon: '🧠'
                            }
                          ];
                          
                          console.log('Initial selection - rendering', allPersonas.length, 'personas');
                          
                          return allPersonas.map((persona, index) => (
                            <button
                              key={`initial-${persona.id}-${index}`}
                              onClick={() => {
                                setContentSettings(prev => ({ ...prev, style: persona.id }));
                                setCurrentPersona(persona.id);
                                startGeneration();
                              }}
                              className={`p-6 border rounded-lg text-left transition-all hover:border-blue-500 hover:shadow-md h-full ${
                                currentPersona === persona.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                              }`}
                            >
                              <div className="text-3xl mb-2">{persona.icon}</div>
                              <h4 className="text-lg font-medium text-gray-900">{persona.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">{persona.description}</p>
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Generation Progress */}
                  {isGenerating && (
                    <div className="text-center py-8">
                      {/* Replace progress bar with simple spinner */}
                      <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin"></div>
                      </div>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        {statusMessage || `Creating content with ${getFormattedPersonaName(currentPersona || contentSettings.style)}...`}
                      </h3>
                    </div>
                  )}

                  {/* Content Actions - Show after content is generated */}
                  {generatedContent && (
                    <div className="flex flex-wrap gap-4 justify-center mb-6">
                      <button
                        onClick={copyToClipboard}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <svg className="mr-2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {t('contentGeneration.copyToClipboard', { defaultValue: 'Copy to Clipboard' })}
                      </button>
                      <button
                        onClick={exportAsText}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <svg className="mr-2 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {t('contentGeneration.exportAsText', { defaultValue: 'Export as Text' })}
                      </button>
                      <button
                        onClick={handleSaveContent}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        {t('contentGeneration.saveToPanel', { defaultValue: 'Save to Dashboard' })}
                      </button>
                    </div>
                  )}

                  {/* Generated Content Display */}
                  {generatedContent && !isGenerating && (
                    <div className="prose max-w-none" id="generated-content">
                      <div className="mb-4 px-4 py-3 bg-gray-50 rounded-md border border-gray-200">
                        <div className="flex items-center">
                          <div className="mr-3 text-2xl">
                            {(() => {
                              // Return appropriate emoji based on persona
                              switch (currentPersona) {
                                case 'ariastar': return '👋';
                                case 'specialist_mentor': return '👨‍🏫';
                                case 'ai_collaborator': return '🤖';
                                case 'sustainable_advocate': return '🌱';
                                case 'data_visualizer': return '📊';
                                case 'multiverse_curator': return '🎨';
                                case 'ethical_tech': return '⚙️';
                                case 'niche_community': return '👥';
                                case 'synthesis_maker': return '🧠';
                                default: return '✍️';
                              }
                            })()}
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 m-0">
                              {getFormattedPersonaName(currentPersona)}
                            </h3>
                            <p className="text-sm text-gray-500 m-0">
                              {(() => {
                                // Return persona description based on selected persona
                                switch (currentPersona) {
                                  case 'ariastar': 
                                    return 'Friendly, relatable tone perfect for social media and blogs';
                                  case 'specialist_mentor': 
                                    return 'Professional, authoritative voice for technical content';
                                  case 'ai_collaborator': 
                                    return 'Balanced, analytical tone for research and reports';
                                  case 'sustainable_advocate': 
                                    return 'Passionate voice for sustainability and social impact';
                                  case 'data_visualizer': 
                                    return 'Clear, data-driven narrative style';
                                  case 'multiverse_curator': 
                                    return 'Creative, engaging tone for multimedia content';
                                  case 'ethical_tech': 
                                    return 'Balanced voice for explaining complex technical concepts';
                                  case 'niche_community': 
                                    return 'Engaging tone for building community and connection';
                                  case 'synthesis_maker': 
                                    return 'Insightful tone for connecting ideas across domains';
                                  default: 
                                    return 'Custom writing style';
                                }
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className={`transition-all duration-500 ${isContentExpanded ? 'max-h-none' : 'max-h-96 overflow-hidden relative'}`}>
                        {prerenderedContent}
                        {!isContentExpanded && (
                          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
                        )}
                      </div>
                      <button
                        onClick={() => setIsContentExpanded(!isContentExpanded)}
                        className="mt-4 text-blue-600 hover:text-blue-800 font-medium flex items-center"
                      >
                        {isContentExpanded ? 
                          <span>{t('common.showLess', { defaultValue: 'Show Less' })}</span> : 
                          <span>{t('common.showMore', { defaultValue: 'Show More' })}</span>}
                        <svg 
                          className={`ml-1 h-5 w-5 transition-transform duration-200 ${isContentExpanded ? 'transform rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Content Refinement - MOVED TO HERE */}
                  {showContentRefinement && generatedContent && !isGenerating && (
                    <div className="mt-8 border-t border-gray-200 pt-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        {t('refineContent.title', { defaultValue: 'Refine Content' })}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {t('refineContent.promptInstructions', { defaultValue: 'Provide comments or specific instructions to improve your content' })}
                      </p>
                      <div className="relative">
                        <textarea
                          id="refinement-input"
                          value={refinementPrompt}
                          onChange={(e) => setRefinementPrompt(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={t('refineContent.placeholder', { defaultValue: 'E.g., Make it more concise, add more data points, change the tone to be more professional...' })}
                          rows={5}
                        />
                      </div>
                      
                      {/* Button with loading state */}
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleRefinementSubmit}
                          disabled={isRefinementLoading || !refinementPrompt.trim() || isGenerating}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {isRefinementLoading ? (
                            <>
                              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>{t('contentGeneration.refining', { defaultValue: 'Refining Content...' })}</span>
                            </>
                          ) : (
                            <span>{t('refineContent.refineButton', { defaultValue: 'Refine' })}</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Change Persona Section */}
                  {generatedContent && !isGenerating && (
                    <div className="mt-8 border-t border-gray-200 pt-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        {safeContentGenerationTranslate('contentGeneration.choosePersona', 'Choose an AI Persona')}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {safeContentGenerationTranslate('contentGeneration.regenerateText', 'Regenerate your content with any AI persona voice (including the current one for new variations)')}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                        {(() => {
                          // Define all personas in a variable for easier management
                          const allPersonas = [
                            {
                              id: 'ariastar',
                              name: 'AriaStar',
                              description: t('personas.ariastar.description', { defaultValue: 'Friendly, relatable tone perfect for social media and blogs' }),
                              icon: '👋'
                            },
                            {
                              id: 'specialist_mentor',
                              name: 'MentorPro',
                              description: t('personas.specialist_mentor.description', { defaultValue: 'Professional, authoritative voice for technical content' }),
                              icon: '👨‍🏫'
                            },
                            {
                              id: 'ai_collaborator',
                              name: 'AIInsight',
                              description: t('personas.ai_collaborator.description', { defaultValue: 'Balanced, analytical tone for research and reports' }),
                              icon: '🤖'
                            },
                            {
                              id: 'sustainable_advocate',
                              name: 'EcoEssence',
                              description: t('personas.sustainable_advocate.description', { defaultValue: 'Passionate voice for sustainability and social impact' }),
                              icon: '🌱'
                            },
                            {
                              id: 'data_visualizer',
                              name: 'DataStory',
                              description: t('personas.data_visualizer.description', { defaultValue: 'Clear, data-driven narrative style' }),
                              icon: '📊'
                            },
                            {
                              id: 'multiverse_curator',
                              name: 'NexusVerse',
                              description: t('personas.multiverse_curator.description', { defaultValue: 'Creative, engaging tone for multimedia content' }),
                              icon: '🎨'
                            },
                            {
                              id: 'ethical_tech',
                              name: 'TechTranslate',
                              description: t('personas.ethical_tech.description', { defaultValue: 'Balanced voice for explaining complex technical concepts' }),
                              icon: '⚙️'
                            },
                            {
                              id: 'niche_community',
                              name: 'CommunityForge',
                              description: t('personas.niche_community.description', { defaultValue: 'Engaging tone for building community and connection' }),
                              icon: '👥'
                            },
                            {
                              id: 'synthesis_maker',
                              name: 'SynthesisSage',
                              description: t('personas.synthesis_maker.description', { defaultValue: 'Insightful tone for connecting ideas across domains' }),
                              icon: '🧠'
                            }
                          ];
                          
                          // No longer filtering out current persona - showing all personas
                          console.log('Rendering all', allPersonas.length, 'personas');
                          
                          return allPersonas.map((persona, index) => (
                            <button
                              key={`${persona.id}-${index}`}
                              onClick={() => {
                                if (isGenerating) return;
                                
                                // Change persona and regenerate
                                changePersonaAndRegenerate(persona.id);
                              }}
                              className={`p-4 border rounded-lg text-left transition-all hover:border-blue-500 hover:shadow-md flex items-center h-full ${
                                currentPersona === persona.id ? 'border-blue-500 bg-blue-50' : ''
                              }`}
                              disabled={isGenerating}
                            >
                              <div className="text-2xl mr-3">{persona.icon}</div>
                              <div>
                                <h4 className="text-md font-medium text-gray-900">{persona.name}</h4>
                                <p className="text-xs text-gray-500">{persona.description}</p>
                                {currentPersona === persona.id && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                    {language === 'es' ? 'Actual' : 'Current'}
                                  </span>
                                )}
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Version History */}
                  {contentVersions.length > 1 && (
                    <div className="mt-8 border-t border-gray-200 pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {t('contentGeneration.versionHistory', { defaultValue: 'Version History' })}
                        </h3>
                        <button
                          onClick={() => setShowVersionHistory(!showVersionHistory)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {showVersionHistory ? t('contentGeneration.hideHistory', { defaultValue: 'Hide History' }) : t('contentGeneration.showHistory', { defaultValue: 'Show History' })}
                        </button>
                      </div>
                      
                      {showVersionHistory && (
                        <div className="space-y-4">
                          {contentVersions.map((version, index) => (
                            <div key={index} className="p-4 border border-gray-200 rounded-md">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">
                                  {t('contentGeneration.versionNumber', 
                                    { defaultValue: 'Version {{number}} - {{date}}', 
                                      number: index + 1, 
                                      date: new Date(version.timestamp).toLocaleString() 
                                    }
                                  )}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {t('contentGeneration.personaLabel', 
                                    { defaultValue: 'Persona: {{persona}}', 
                                      persona: getFormattedPersonaName(version.persona) 
                                    }
                                  )}
                                </span>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setGeneratedContent(version.content);
                                    setPrerenderedContent(renderSimpleMarkdown(version.content));
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  {t('contentGeneration.restoreVersion', { defaultValue: 'Restore this version' })}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmDialog
        isOpen={dialogOpen}
        message={dialogMessage}
        onConfirm={() => {
          dialogConfirmAction();
          setDialogOpen(false);
        }}
        onCancel={() => {
          dialogCancelAction();
          setDialogOpen(false);
        }}
      />
    </AppShell>
  );
}

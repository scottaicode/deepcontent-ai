/**
 * YouTubeTranscriptInput.tsx
 * Component for inputting YouTube URLs and fetching transcripts
 * 
 * This component provides a user interface for fetching transcripts from YouTube videos.
 * It uses the Supadata AI API via our internal API endpoint.
 * 
 * For detailed documentation, see: /docs/YouTube-Transcript-Feature.md
 */

'use client';

import React, { useState, useEffect } from 'react';
import { isValidYouTubeUrl, fetchYouTubeTranscript, extractYouTubeVideoId } from '@/app/lib/services/YouTubeTranscriptService';
import * as BackupService from '@/app/lib/services/backups/YouTubeTranscriptBackupService';
import { useToast } from '@/lib/hooks/useToast';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { Loader2, Play, Sparkles, Youtube, PlayCircle, AlertTriangle, Check, RefreshCw, Lightbulb, X, Copy, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

// Import markdown rendering utilities
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Utility function to convert markdown to HTML safely
const markdownToHtml = (markdown: string): string => {
  const rawHtml = marked.parse(markdown) as string;
  return DOMPurify.sanitize(rawHtml);
};

interface YouTubeTranscriptInputProps {
  url: string;
  onUrlChange: (url: string) => void;
  onTranscriptFetched: (transcript: string, videoUrl: string) => void;
  transcript: string;
  showFullTranscript: boolean;
  onToggleTranscript: () => void;
  className?: string;
}

// Add YouTube iframe API types
interface YouTubePlayerState {
  UNSTARTED: number;
  ENDED: number;
  PLAYING: number;
  PAUSED: number;
  BUFFERING: number;
  CUED: number;
}

interface YouTubePlayer {
  getVideoData: () => { video_id: string, title: string };
  getDuration: () => number;
  getCurrentTime: () => number;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  getAvailableQualityLevels: () => string[];
  addEventListener: (event: string, listener: (event: any) => void) => void;
  removeEventListener: (event: string, listener: (event: any) => void) => void;
  destroy: () => void;
  getPlayerState: () => number;
  cueVideoById: (videoId: string) => void;
  mute: () => void;
  getOptions: (module: string) => string[];
  hasModule: (moduleName: string) => boolean;
  loadModule: (moduleName: string) => void;
  stopVideo: () => void;
}

declare global {
  interface Window {
    YT?: {
      loaded: number;
      ready: (callback: () => void) => void;
      Player: new (
        element: string | HTMLElement,
        options: {
          videoId?: string;
          width?: number | string;
          height?: number | string;
          playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            cc_load_policy?: 0 | 1;
            cc_lang_pref?: string;
            modestbranding?: 0 | 1;
            origin?: string;
          };
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YouTubePlayer;
      PlayerState: YouTubePlayerState;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YouTubeTranscriptInput: React.FC<YouTubeTranscriptInputProps> = ({
  url,
  onUrlChange,
  onTranscriptFetched,
  transcript,
  showFullTranscript,
  onToggleTranscript,
  className = '',
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  const [showAdminTools, setShowAdminTools] = useState(false);

  // Add a reference for the player container
  const playerContainerRef = React.useRef<HTMLDivElement>(null);
  const [clientSideExtractionMode, setClientSideExtractionMode] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const playerInstanceRef = React.useRef<YouTubePlayer | null>(null);

  useEffect(() => {
    // Reset error when URL changes
    if (url) {
      setError(null);
    }
    
    // Reset the transcript copy state
    setHasCopied(false);
    
    // Extract YouTube ID from URL only if URL is present
    if (url) {
      const id = extractYouTubeVideoId(url);
      setYoutubeId(id);
    } else {
      setYoutubeId(null); // Reset youtubeId if URL is cleared
    }
  }, [url]);

  // Check if admin tools should be shown (client-side only)
  useEffect(() => {
    const isDevOrDebug = 
      process.env.NODE_ENV !== 'production' || 
      window.location.hostname.includes('localhost') ||
      window.location.search.includes('debug=true');
    
    setShowAdminTools(isDevOrDebug);
  }, []);

  // Load YouTube iframe API
  useEffect(() => {
    // Only load this in browser environments
    if (typeof window === 'undefined') return;

    // Add the YouTube iframe API script
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Define the callback that YouTube will call when API is ready
    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube iframe API ready');
    };

    return () => {
      // Cleanup
      window.onYouTubeIframeAPIReady = undefined;
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
      }
    };
  }, []);

  const getErrorMessage = (err: any): string => {
    // Log the raw error object to help with debugging
    console.log('🔍 CLIENT DIAGNOSTIC: Processing error in getErrorMessage:', {
      error: err,
      messageType: typeof err.message,
      messageValue: err.message,
      errorType: typeof err,
      stack: err.stack?.slice(0, 100)
    });

    const msg = err.message || 'Unknown error occurred';
    
    // Handle empty or template errors
    if (msg === '{0}' || msg === 'Error: {0}' || msg === 'Error: {}' || msg === '{}' || 
        msg === 'Error: (0)' || msg === '(0)' || msg.includes('Error: {0}. Please') ||
        msg === 'Error: {0}. Please try again or contact support if the problem persists.') {
      console.log('🔍 CLIENT DIAGNOSTIC: Detected template error pattern');
      return 'Configuration error: The YouTube transcript service encountered an error. Please try again later.';
    }
    
    // Handle specific known error patterns
    if (msg.includes('transcript-unavailable') || 
        msg.includes('No transcript is available') ||
        msg.includes('No transcript available') ||
        msg.includes('transcript available') ||
        msg.includes('Transcript is disabled') ||
        msg.includes('captions disabled') ||
        msg.includes('uploader')) {
      console.log('🔍 CLIENT DIAGNOSTIC: Detected no captions error pattern');
      return t('youtubeTranscript.errors.noTranscript', { 
        defaultValue: 'This video does not have captions or transcripts available. Please try a different video that has captions enabled.' 
      });
    }
    
    // API configuration errors
    if (msg.includes('API configuration error') || 
        msg.includes('Missing API key') || 
        msg.includes('No valid access key') ||
        msg.includes('Authentication failed') ||
        msg.includes('403')) {
      console.log('🔍 CLIENT DIAGNOSTIC: Detected API configuration error');
      return 'The YouTube transcript service is experiencing issues. Please try again later.';
    }
    
    // Network errors
    if (msg.includes('Network error') || 
        msg.includes('Failed to fetch') || 
        msg.includes('Unable to connect') ||
        msg.includes('internet connection') ||
        msg.includes('timeout')) {
      console.log('🔍 CLIENT DIAGNOSTIC: Detected network error');
      return 'Unable to connect to the transcript service. Please check your internet connection and try again.';
    }
    
    // For unexpected errors, give a more detailed message to help with debugging
    console.log('🔍 CLIENT DIAGNOSTIC: Using default error message');
    return t('youtubeTranscript.errors.unknown', { 
      defaultValue: `Error: ${msg}. Please try again or contact support if the issue persists.` 
    });
  };
  
  const handleFetchTranscript = async () => {
    if (!youtubeId) return;
    
    setIsLoading(true);
    setError(null);
    
    console.log('[DEBUG-FRONTEND] Fetching transcript for:', youtubeId);
    
    try {
      // Try to extract transcript using the API
      const response = await fetch(`/api/youtube-transcript?videoId=${youtubeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[DEBUG-FRONTEND] Transcript response received:', { 
        status: response.status,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get transcript');
      }
      
      const data = await response.json();
      
      if (data.transcript) {
        console.log('[DEBUG-FRONTEND] Transcript found, length:', data.transcript.length);
        
        // Use the transcript formatter function to clean and format
        const formattedTranscript = formatTranscript(data.transcript);
        
        // Call the callback with the transcript and URL
        onTranscriptFetched(formattedTranscript, url);
        
        // Clear URL after successful transcription
        onUrlChange('');
      } else {
        throw new Error('No transcript content returned');
      }
    } catch (err: any) {
      console.error('[DEBUG-FRONTEND] Transcript fetch error:', err);
      
      // Check if error is about missing transcript/captions
      if (err.message && (
        err.message.includes('captions') || 
        err.message.includes('transcript') || 
        err.message.includes('uploader') || 
        err.message.includes('No transcript') ||
        err.message.includes('Transcript is disabled')
      )) {
        // Instead of showing error and "Extract Research Content" button,
        // automatically try research extraction
        console.log('[DEBUG-FRONTEND] Standard transcript unavailable, automatically trying research extraction');
        toast({
          title: 'Standard transcript unavailable',
          description: 'Automatically trying AI-enhanced research extraction...',
        });
        
        // Call the research extraction function directly
        handleAudioTranscription();
        return;
      }
      
      // For other types of errors, show the error message
      setError(err.message || 'Failed to get transcript');
      setIsLoading(false);
    }
  };
  
  // Helper to create a nicely formatted transcript with metadata
  const formatTranscript = (
    text: string, 
    lang?: string, 
    url?: string, 
    isFallback?: boolean,
    isAiGenerated?: boolean
  ): string => {
    // Clean the text first to ensure consistent formatting
    const cleanedText = text
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // Format as markdown with cleaner structure
    let formattedText = '';
    
    // If it's already markdown (contains #), keep it as is but ensure proper spacing
    if (cleanedText.includes('#')) {
      formattedText = cleanedText;
    } else {
      // Convert plain text to a more research-friendly format
      // Break into paragraphs for better readability
      const paragraphs = cleanedText
        .split(/(?<=\.|\?|\!) (?=[A-Z])/) // Split at sentences that end with a period followed by a capital letter
        .reduce((acc: string[], sentence, i, arr) => {
          // Group every 2-3 sentences into a paragraph for readability
          const paragraphIndex = Math.floor(i / 3);
          if (!acc[paragraphIndex]) acc[paragraphIndex] = '';
          acc[paragraphIndex] += (acc[paragraphIndex] ? ' ' : '') + sentence;
          return acc;
        }, []);
      
      // Format as markdown
      formattedText = '## Transcript Content\n\n' + paragraphs.join('\n\n');
    }
    
    // Add metadata
    let metadata = '';
    
    if (url) {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        metadata += `## Source\n[YouTube Video](${url})`;
        
        // Add embedded thumbnail image for reference
        metadata += `\n\n![Thumbnail](https://img.youtube.com/vi/${videoId}/mqdefault.jpg)\n\n`;
      } else {
        metadata += `## Source\n${url}\n\n`;
      }
    }
    
    // Add language information if available
    if (lang && lang !== 'auto' && lang !== 'en') {
      metadata += `**Original Language:** ${lang.toUpperCase()}\n\n`;
    }
    
    // Add appropriate notices
    if (isAiGenerated) {
      metadata += `> **Note:** This transcript was processed using AI speech recognition and may contain minor inaccuracies.\n\n`;
    }
    
    if (isFallback) {
      metadata += `> **Note:** This is alternative content provided as no official transcript was available.\n\n`;
    }
    
    // Combine metadata with transcript content
    return `# Research Content from YouTube\n\n${metadata}${formattedText}`;
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url && !isLoading) {
      e.preventDefault();
      handleFetchTranscript();
    }
  };

  const handleCopyTranscript = () => {
    if (!transcript) return;
    
    try {
      // First try the modern clipboard API
      navigator.clipboard.writeText(transcript).then(() => {
        setHasCopied(true);
        toast({
          title: t('youtubeTranscript.copied', { defaultValue: 'Copied to clipboard' }),
          description: t('youtubeTranscript.copiedDescription', { defaultValue: 'The transcript has been copied to your clipboard.' }),
        });
        
        // Reset the copied state after a delay
        setTimeout(() => {
          setHasCopied(false);
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy transcript:', err);
        toast({
          title: 'Copy failed',
          description: 'Couldn\'t copy to clipboard. Try selecting the transcript manually.',
          variant: 'destructive',
        });
      });
    } catch (error) {
      console.error('Copy to clipboard not supported', error);
      // Use fallback with a temporary textarea for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = transcript;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setHasCopied(true);
        toast({
          title: t('youtubeTranscript.copied', { defaultValue: 'Copied to clipboard' }),
          description: t('youtubeTranscript.copiedDescription', { defaultValue: 'The transcript has been copied to your clipboard.' }),
        });
        
        setTimeout(() => {
          setHasCopied(false);
        }, 2000);
      } catch (fallbackError) {
        console.error('Fallback copy method failed:', fallbackError);
        toast({
          title: 'Copy failed',
          description: 'Couldn\'t copy to clipboard. Try selecting the transcript manually.',
          variant: 'destructive',
        });
      }
    }
  };

  const checkApiKey = async () => {
    setApiStatus('checking');
    setDiagnosticInfo(null);
    
    try {
      // Call our diagnostic endpoint
      const response = await fetch('/api/youtube-direct/check-api');
      const data = await response.json();
      
      setDiagnosticInfo(JSON.stringify(data, null, 2));
      
      if (data.success) {
        setApiStatus('success');
        toast({
          title: 'API Check Successful',
          description: 'The YouTube API key is valid and properly configured.',
        });
      } else {
        setApiStatus('error');
        toast({
          title: 'API Check Failed',
          description: data.message || 'The YouTube API key is invalid or improperly configured.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('Error checking API key:', err);
      setApiStatus('error');
      setDiagnosticInfo(err.message || 'Network error occurred');
      toast({
        title: 'API Check Error',
        description: 'An error occurred while checking the API key.',
        variant: 'destructive',
      });
    }
  };

  const getThumbnailUrl = () => {
    return youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'Missing API Key',
        description: 'Please enter an API key.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const response = await fetch('/api/settings/update-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service: 'youtube', apiKey }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save API key');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'API Key Saved',
          description: 'Your YouTube API key has been saved successfully.',
        });
        checkApiKey();
      } else {
        throw new Error(data.message || 'Failed to save API key');
      }
    } catch (err: any) {
      console.error('Error saving API key:', err);
      toast({
        title: 'Error Saving API Key',
        description: err.message || 'An error occurred while saving the API key.',
        variant: 'destructive',
      });
    }
  };

  // Add the diagnostic handler function
  const handleDiagnosticTest = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 CLIENT DIAGNOSTIC: Running diagnostic test with known working video');
      
      // Call the API with the test parameter to use a known working video
      const response = await fetch(`/api/youtube-direct?test=working`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.transcript) {
        toast({
          title: 'API Test Successful',
          description: `Successfully retrieved transcript from test video (${data.segments} segments)`,
        });
        
        // Update the input field with the tested video ID
        if (data.testVideoId) {
          onUrlChange(`https://youtube.com/watch?v=${data.testVideoId}`);
        }
        
        // Format the transcript
        const formattedTranscript = formatTranscript(
          data.transcript, 
          data.detectedLanguage, 
          `https://youtube.com/watch?v=${data.videoId}`,
          false,
          data.isAiGenerated
        );
        
        // Call the callback with the transcript and URL
        onTranscriptFetched(formattedTranscript, `https://youtube.com/watch?v=${data.videoId}`);
      } else {
        throw new Error('No transcript returned from test API');
      }
    } catch (err: any) {
      console.error('Error in diagnostic test:', err);
      setError(`Diagnostic test failed: ${err.message}`);
      toast({
        title: 'API Test Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle client-side caption extraction
  const handleClientSideExtraction = async () => {
    if (!youtubeId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fall back to server-side method first
      await handleFetchTranscript();
    } catch (err) {
      // Server-side method failed, show a simple message about captions
      console.error('Server-side extraction failed, providing fallback message');
      
      // Create a fallback message
      const videoTitle = 'YouTube Video';
      const transcriptText = `# YouTube Video Analysis

## Video ID: ${youtubeId}

YouTube's API restrictions prevent us from automatically extracting the full transcript for this video.

If this video has closed captions available, you can view them by:

1. Opening the video directly: https://www.youtube.com/watch?v=${youtubeId}
2. Clicking the "CC" button in the YouTube player

For your research, consider watching the video with captions enabled and taking notes on key points.
`;
      
      // Format and display the fallback message
      const formattedTranscript = formatTranscript(
        transcriptText, 
        'en', 
        `https://youtube.com/watch?v=${youtubeId}`,
        true, // Treat as pre-formatted
        false // Not AI generated
      );
      
      // Call the callback with the transcript and URL
      onTranscriptFetched(formattedTranscript, url);
      
      // Show guidance toast
      toast({
        title: 'Alternative Method',
        description: 'We provided guidance on how to access captions for this video directly on YouTube.',
        variant: 'default',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Try the backup service directly
  const handleBackupService = async () => {
    if (!youtubeId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting to use backup service directly');
      
      // Use the backup service to fetch the transcript
      const transcript = await BackupService.fetchDirectTranscript(youtubeId);
      
      if (transcript && transcript.length > 0) {
        // Format the transcript using the backup service
        const formattedTranscript = BackupService.formatTranscriptForResearch(
          transcript,
          `https://youtube.com/watch?v=${youtubeId}`
        );
        
        // Call the callback with the transcript and URL
        onTranscriptFetched(formattedTranscript, url);
        
        toast({
          title: 'Backup Method Succeeded',
          description: 'Successfully retrieved transcript using alternative method.',
          variant: 'default',
        });
      } else {
        throw new Error('Backup service returned empty transcript');
      }
    } catch (err: any) {
      console.error('Backup service failed:', err);
      setError(`Backup method failed: ${err.message}`);
      
      toast({
        title: 'Backup Method Failed',
        description: 'Could not retrieve transcript with alternative method. The video may not have captions.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Try audio transcription when captions aren't available
  const handleAudioTranscription = async () => {
    if (!youtubeId) return;
    
    setIsLoading(true);
    setError(null);
    
    // Add retry logic
    let retryCount = 0;
    const maxRetries = 2;
    
    const attemptTranscription = async (): Promise<boolean> => {
      try {
        console.log(`[DEBUG-FRONTEND] Attempting to extract research content for:`, { 
          youtubeId, 
          url, 
          attempt: retryCount + 1 
        });
        
        // Show toast for each attempt
        toast({
          title: retryCount > 0 ? `Retrying analysis (${retryCount}/${maxRetries})...` : 'Analyzing video...',
          description: 'Extracting research-relevant content from the video',
        });
        
        // Create an AbortController for timeout management
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort();
        }, 30000); // 30 second timeout
        
        try {
          console.log(`[DEBUG-FRONTEND] Sending POST request to /api/youtube/transcript`);
          
          const response = await fetch('/api/youtube/transcript', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              videoId: youtubeId,
              youtubeUrl: url
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeout); // Clear the timeout if response is received
          
          console.log(`[DEBUG-FRONTEND] Response received:`, {
            status: response.status,
            ok: response.ok,
            contentType: response.headers.get('Content-Type')
          });
          
          // Handle timeout status codes specifically
          if (response.status === 504 || response.status === 502 || response.status === 408) {
            console.log(`[DEBUG-FRONTEND] Received timeout status code: ${response.status}`);
            throw new Error('Research extraction service timed out. Please try again later.');
          }
          
          // Handle other non-200 status codes
          if (!response.ok) {
            const errorText = await response.text();
            console.log(`[DEBUG-FRONTEND] Error response:`, errorText);
            
            try {
              const errorJson = JSON.parse(errorText);
              throw new Error(errorJson.error || errorJson.message || `Server error (${response.status})`);
            } catch (parseError) {
              throw new Error(errorText || `Server error (${response.status})`);
            }
          }
          
          // Get the response as text first to ensure proper parsing
          const responseText = await response.text();
          console.log(`[DEBUG-FRONTEND] Research extraction response text length:`, responseText.length);
          
          if (!responseText || responseText.trim() === '') {
            throw new Error('Research extraction service returned an empty response');
          }
          
          // Try to parse the JSON
          let data;
          try {
            data = JSON.parse(responseText);
            console.log(`[DEBUG-FRONTEND] Successfully parsed response JSON`);
          } catch (parseError) {
            console.error(`[DEBUG-FRONTEND] Failed to parse research extraction response`, parseError);
            
            if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
              throw new Error('Research extraction service returned an HTML error page');
            } else if (responseText.includes('error') || responseText.includes('exception')) {
              throw new Error('Research extraction service error: ' + responseText.substring(0, 100));
            } else {
              throw new Error('Invalid response from research extraction service');
            }
          }
          
          // Handle rejected content
          if (data.rejected || data.source === 'rejection' || response.status === 400) {
            console.log(`[DEBUG-FRONTEND] Content was rejected by backend`);
            throw new Error(data.message || data.error || 'Content not suitable for research purposes');
          }
          
          // Success case - we have transcript data
          if (data.transcript) {
            console.log(`[DEBUG-FRONTEND] Research extraction succeeded with source:`, data.source);
            
            // Check if the result is just fallback content
            if (data.isFallback || data.source === 'fallback-analysis') {
              console.warn('[DEBUG-FRONTEND] Received fallback content, not using for research.');
              // Throw an error to prevent passing fallback to Perplexity
              throw new Error('Video details could not be fully retrieved, unable to perform research.');
            }
            
            // Clean any HTML entities that might still be in the transcript
            let cleanTranscript = data.transcript;
            if (typeof cleanTranscript === 'string') {
              cleanTranscript = cleanTranscript
                .replace(/&#39;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\r\n/g, '\n');
            }
            
            // Call the callback with the clean transcript and URL
            onTranscriptFetched(cleanTranscript, url);
            
            // Use different toast message based on content type
            const isPerplexityEnhanced = data.source === 'perplexity-enhanced';
            
            if (isPerplexityEnhanced) {
              toast({
                title: 'AI-Enhanced Research Generated',
                description: 'Successfully generated AI-enhanced research content',
              });
            } else {
              toast({
                title: 'Research Content Extracted',
                description: 'Successfully extracted research-relevant content',
              });
            }
            
            // Clear URL after successful transcription
            onUrlChange('');
            return true;
          }
          
          console.log(`[DEBUG-FRONTEND] No transcript data in response`);
          throw new Error('No usable content available for research');
        } catch (fetchError: any) {
          clearTimeout(timeout);
          
          if (fetchError.name === 'AbortError' || 
            fetchError.message?.includes('timed out') || 
            fetchError.message?.includes('timeout')) {
            console.log(`[DEBUG-FRONTEND] Request timed out or aborted`);
            throw new Error('Research extraction request timed out. Please try again later.');
          }
          
          throw fetchError;
        }
      } catch (err: any) {
        const isTimeoutError = 
          err.name === 'AbortError' || 
          err.message?.includes('timed out') ||
          err.message?.includes('timeout');
            
        // If this was a timeout and we haven't reached max retries, allow retry
        if (isTimeoutError && retryCount < maxRetries) {
          console.log(`[DEBUG-FRONTEND] Timeout error on attempt ${retryCount + 1}, will retry`);
          retryCount++;
          
          // Wait before retry (exponential backoff)
          toast({
            title: 'Extraction timed out',
            description: `Waiting ${2 ** retryCount} seconds before retrying...`,
            variant: 'default',
          });
          
          await new Promise(r => setTimeout(r, 2 ** retryCount * 1000));
          return false; // Signal for retry
        }
        
        // Either not a timeout or we've reached max retries
        throw err;
      }
    };
    
    try {
      // Try transcription with retries
      let success = false;
      while (!success && retryCount <= maxRetries) {
        success = await attemptTranscription();
      }
    } catch (err: any) {
      console.error(`[DEBUG-FRONTEND] Research extraction failed after ${retryCount} retries:`, err);
      
      // Special case for aborted/timeout requests
      if (err.name === 'AbortError' || err.message?.includes('timed out') || err.message?.includes('timeout')) {
        setError('Research extraction service timed out. Please try again later.');
        
        toast({
          title: 'Extraction Timed Out',
          description: `The research extraction process timed out after ${retryCount} ${retryCount === 1 ? 'attempt' : 'attempts'}. Please try again later.`,
          variant: 'destructive',
        });
      }
      // Special case for no audio formats error
      else if (err.message?.includes('No audio formats available')) {
        setError('This video cannot be analyzed or used for research');
        
        toast({
          title: 'Not Suitable for Research',
          description: 'This video cannot be analyzed. Please try a different video with more accessible content.',
          variant: 'destructive',
        });
      } else if (err.message?.includes('No research-valuable') || 
                 err.message?.includes('not suitable for research') ||
                 err.message?.includes('No usable content')) {
        // Handle "not suitable for research" errors
        setError('This video does not contain content that can be used for research');
        
        toast({
          title: 'Not Suitable for Research',
          description: 'This video does not contain content that can be used in the research process. Please try a different video.',
          variant: 'destructive',
        });
      } else if (err.message?.includes('Perplexity API')) {
        // Handle Perplexity API errors
        setError('Research enhancement service is currently unavailable');
        
        toast({
          title: 'Research Enhancement Failed',
          description: 'The AI research enhancement service is temporarily unavailable. Please try again later.',
          variant: 'destructive',
        });
      } else {
        setError(`Research extraction failed: ${err.message}`);
        
        toast({
          title: 'Extraction Failed',
          description: err.message || 'Failed to extract research content. Please try again or use a different video.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to render the "Show more / Show less" link for toggling transcript visibility
  const renderToggleLink = () => {
    if (!transcript) return null;
    
    return (
      <button
        onClick={onToggleTranscript}
        className="flex items-center gap-1 mt-4 text-sm font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
      >
        {showFullTranscript ? (
          <>
            <ChevronUp className="h-4 w-4" />
            {t('youtubeTranscript.hideFullTranscript', { defaultValue: 'Hide full transcript' })}
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            {t('youtubeTranscript.showFullTranscript', { defaultValue: 'Show full transcript' })}
          </>
        )}
      </button>
    );
  };

  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="space-y-4">
        <div className="relative">
          <div className="flex flex-col space-y-2">
            <div className="relative mt-1 flex items-center">
              <input
                type="text"
                placeholder={t('youtubeTranscript.enterUrl', { defaultValue: "Enter YouTube URL" })}
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white pr-10"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Youtube className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                type="button"
                onClick={isLoading ? undefined : handleFetchTranscript}
                disabled={isLoading || !url}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    {t('common.loading', { defaultValue: "Fetching..." })}
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {t('youtubeTranscript.getTranscript', { defaultValue: "Get Transcript" })}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Thumbnail Preview for valid YouTube URL */}
        {youtubeId && !transcript && !error && !isLoading && (
          <div className="mt-2 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center">
            <img 
              src={getThumbnailUrl() || ''} 
              alt="YouTube thumbnail" 
              className="w-full max-w-xs rounded-md shadow-md hover:shadow-lg transition-shadow duration-200"
            />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
              {t('youtubeTranscript.readyToFetch', { defaultValue: "Ready to fetch transcript. Click the button above." })}
            </p>
          </div>
        )}
        
        {/* Empty State when no URL is provided */}
        {!youtubeId && !transcript && !error && !isLoading && (
          <div className="mt-2 flex flex-col items-center justify-center p-6 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="p-3 mb-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <Youtube className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h4 className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('youtubeTranscript.addVideo', { defaultValue: 'Add a YouTube video for analysis' })}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('youtubeTranscript.enterUrlToFetch', { defaultValue: 'Enter a YouTube URL to fetch its transcript for research and content creation.' })}
            </p>
          </div>
        )}

        {/* Error Message - Standard Errors */}
        {error && !(
          error.includes('captions') || 
          error.includes('transcript') || 
          error.includes('uploader') || 
          error.includes('No transcript') ||
          error.includes('This video')
        ) && (
          <div className="mt-4 p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 w-full">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  {t('youtubeTranscript.error', { defaultValue: "Error" })}
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                  <p>{error || "An unknown error occurred. Please try again."}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Unavailable - Show only the Extract Research Content button */}
        {error && (
          error.includes('captions') || 
          error.includes('transcript') || 
          error.includes('uploader') || 
          error.includes('No transcript') ||
          error.includes('This video')
        ) && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-4">
            <div className="flex items-center mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              <h3 className="text-sm font-medium text-amber-800">Transcript Unavailable</h3>
            </div>
            <p className="text-sm text-amber-700 mb-4">
              This video doesn't have a standard transcript available. We can attempt to extract research-relevant content for your deep research process.
            </p>
            <button
              onClick={handleAudioTranscription}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md flex justify-center items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                  Processing...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Extract Research Content
                </>
              )}
            </button>
            <p className="mt-2 text-xs text-amber-600 text-center">
              We'll try to extract research-relevant content from the video
            </p>
          </div>
        )}

        {/* Transcript Output */}
        {transcript && !isLoading && (
          <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Header section */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-gray-800 p-3 flex justify-between items-center">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center">
                {transcript.includes('Transcript Not Available') || transcript.includes('Important Notice') ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600 dark:text-yellow-400" />
                    {t('youtubeTranscript.transcriptUnavailable', { defaultValue: "Transcript Unavailable" })}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t('youtubeTranscript.transcriptResults', { defaultValue: "Research Content" })}
                  </>
                )}
              </h4>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  disabled={!transcript || hasCopied}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={t('youtubeTranscript.copyToClipboard', { defaultValue: 'Copy to clipboard' })}
                >
                  {hasCopied ? <Check size={18} /> : <Copy size={18} />}
                </button>
                {renderToggleLink()}
              </div>
            </div>
            
            {/* Content section */}
            <div className="bg-white dark:bg-gray-800 p-4">
              <div className={`prose dark:prose-invert prose-sm max-w-none text-gray-700 dark:text-gray-300 transition-all duration-300 ${showFullTranscript ? '' : 'max-h-64 overflow-hidden relative'}`}>
                {/* Render the transcript as markdown */}
                <div 
                  className="transcript-content"
                  dangerouslySetInnerHTML={{ 
                    __html: markdownToHtml(transcript) 
                  }} 
                />
              </div>
              
              {/* Gradient fade for collapsed view */}
              {!showFullTranscript && transcript.length > 300 && (
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-800 to-transparent"></div>
              )}
              
              {/* Expand button for collapsed view */}
              {!showFullTranscript && transcript.length > 300 && (
                <div className="mt-2 text-center">
                  <button
                    onClick={onToggleTranscript}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition-colors duration-200"
                  >
                    <ChevronDown className="mr-1 h-3 w-3" />
                    Show More
                  </button>
                </div>
              )}
            </div>
            
            {/* Usage hint */}
            <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
              This research content is ready to use in your deep research process
            </div>
          </div>
        )}

        {/* Client-side extraction mode indicator */}
        {clientSideExtractionMode && (
          <div className="mt-4 relative">
            <div className="absolute inset-0 bg-gray-800/50 rounded flex items-center justify-center z-10">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg text-center">
                <Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-sm font-medium">Checking for captions...</p>
              </div>
            </div>
            <div ref={playerContainerRef} className="w-full h-48 bg-black rounded"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeTranscriptInput; 
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
    
    // Extract YouTube ID from URL if possible
    const id = extractYouTubeVideoId(url);
    setYoutubeId(id);
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
    const msg = err.message || 'Unknown error occurred';
    
    if (msg.includes('transcript-unavailable') || 
        msg.includes('No transcript is available') ||
        msg.includes('No transcript available') ||
        msg.includes('Transcript is disabled')) {
      return t('youtubeTranscript.errors.noTranscript', { 
        defaultValue: 'This video does not have captions or transcripts available. Please try a different video that has captions enabled.' 
      });
    }
    
    if (msg.includes('Network error') || 
        msg.includes('Failed to fetch') || 
        msg.includes('Unable to connect') ||
        msg.includes('internet connection') ||
        msg.includes('fetch failed')) {
      return t('youtubeTranscript.errors.connection', { 
        defaultValue: 'Unable to connect to the transcript service. Please check your internet connection and try again.' 
      });
    }
    
    if (msg.includes('Invalid YouTube URL')) {
      return t('youtubeTranscript.errors.invalidUrl', { 
        defaultValue: 'Please enter a valid YouTube video URL (e.g., https://www.youtube.com/watch?v=XXXXXX).' 
      });
    }

    if (msg.includes('videoId')) {
      return t('youtubeTranscript.errors.missingId', { 
        defaultValue: 'Could not identify a valid YouTube video ID in the URL. Please ensure you\'re using a standard YouTube video URL.' 
      });
    }
    
    // For unexpected errors, give a more detailed message to help with debugging
    return t('youtubeTranscript.errors.unknown', { 
      defaultValue: `Error: ${msg}. Please try again or contact support if the issue persists.` 
    });
  };
  
  const handleFetchTranscript = async () => {
    if (!url) return;
    
    setIsLoading(true);
    setError('');
    setApiStatus('idle');
    
    console.log('🔍 CLIENT DIAGNOSTIC: Starting transcript fetch', {
      url,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Validate URL format
      if (!isValidYouTubeUrl(url)) {
        console.error('🔍 CLIENT DIAGNOSTIC: Invalid YouTube URL format', {url});
        throw new Error('Invalid YouTube URL. Please enter a valid YouTube video link.');
      }
      
      const videoId = extractYouTubeVideoId(url);
      console.log('🔍 CLIENT DIAGNOSTIC: Extracted video ID', {videoId, url});
      
      // First check if video exists and has captions
      try {
        console.log('🔍 CLIENT DIAGNOSTIC: Performing pre-request validation...');
        const validationResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('🔍 CLIENT DIAGNOSTIC: Video validation result', {
          status: validationResponse.status,
          ok: validationResponse.ok
        });
        
        if (!validationResponse.ok) {
          console.error('🔍 CLIENT DIAGNOSTIC: Video validation failed - video may not exist');
        }
      } catch (validationError) {
        console.warn('🔍 CLIENT DIAGNOSTIC: Video validation check failed', validationError);
        // Continue even if validation fails - the transcript API will give appropriate errors
      }
      
      // Use our direct API endpoint with hardcoded API key for testing
      console.log('🔍 CLIENT DIAGNOSTIC: Requesting transcript from API...');
      console.time('transcript-fetch');
      
      const response = await fetch(`/api/youtube-direct?videoId=${videoId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.timeEnd('transcript-fetch');
      console.log('🔍 CLIENT DIAGNOSTIC: Transcript API response received', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      });
      
      let responseText = '';
      try {
        responseText = await response.text();
        console.log('🔍 CLIENT DIAGNOSTIC: Response text received', {
          length: responseText.length, 
          preview: responseText.substring(0, 100)
        });
      } catch (textError) {
        console.error('🔍 CLIENT DIAGNOSTIC: Failed to read response text', textError);
        throw new Error('Failed to read API response');
      }
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
          console.error('🔍 CLIENT DIAGNOSTIC: API returned error', errorData);
        } catch (parseError) {
          console.error('🔍 CLIENT DIAGNOSTIC: Failed to parse error response', {
            parseError, 
            responseText: responseText.substring(0, 200)
          });
          throw new Error(`Error fetching transcript: ${response.status} ${response.statusText}`);
        }
        
        throw new Error(errorData.error || `Error fetching transcript: ${response.status}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('🔍 CLIENT DIAGNOSTIC: Successfully parsed response', {
          hasTranscript: !!data.transcript,
          transcriptLength: data.transcript?.length || 0,
          source: data.source || 'unknown'
        });
      } catch (parseError) {
        console.error('🔍 CLIENT DIAGNOSTIC: JSON parse error', {
          error: parseError,
          responsePreview: responseText.substring(0, 200)
        });
        throw new Error('Failed to parse transcript data from API');
      }
      
      // Process the transcript - check for error messages in the content
      if (data.content && typeof data.content === 'string' && data.content.includes('"error"')) {
        try {
          // Try to parse error information from content
          const errorInfo = JSON.parse(data.content);
          if (errorInfo.error) {
            console.error('🔍 CLIENT DIAGNOSTIC: Error information in content', errorInfo);
            throw new Error(errorInfo.message || errorInfo.error);
          }
        } catch (parseError) {
          // If we can't parse it, just continue with the content as is
          console.warn('🔍 CLIENT DIAGNOSTIC: Could not parse potential error in content:', parseError);
        }
      }
      
      // Process the transcript
      let transcriptText = '';
      let isFallback = false;
      
      if (data.transcript) {
        // If the API returns a transcript field directly
        transcriptText = data.transcript;
        isFallback = !!data.isFallback;
      } else if (data.content && Array.isArray(data.content)) {
        // If the API returns content as an array of segments
        transcriptText = data.content
          .map((item: any) => item.text)
          .join(' ')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      } else if (typeof data.content === 'string') {
        // If content is already a string
        transcriptText = data.content;
      } else {
        console.error('🔍 CLIENT DIAGNOSTIC: Unexpected response format', {
          dataKeys: Object.keys(data),
          hasTranscript: !!data.transcript,
          hasContent: !!data.content,
          contentType: typeof data.content
        });
        throw new Error('Unexpected response format from transcript service');
      }
      
      if (!transcriptText || transcriptText.length < 10) {
        console.error('🔍 CLIENT DIAGNOSTIC: Transcript too short or empty', {
          length: transcriptText.length,
          preview: transcriptText
        });
        throw new Error('Transcript is too short or empty');
      }
      
      console.log('🔍 CLIENT DIAGNOSTIC: Transcript processed successfully', {
        length: transcriptText.length,
        preview: transcriptText.substring(0, 100) + '...',
        isFallback
      });
      
      // Format the transcript with video info if available
      const formattedTranscript = formatTranscript(transcriptText, data.lang, url, isFallback);
      
      // Call the callback with the transcript and URL
      onTranscriptFetched(formattedTranscript, url);
      
      // Only clear if not a fallback transcript
      if (!isFallback) {
        // Clear the input field after successful fetch
        onUrlChange('');
      } else {
        // Show additional help tooltip for fallback
        toast({
          title: 'Notice: Fallback Content',
          description: 'This video does not have captions available. A fallback message has been provided instead.',
          variant: 'default',
        });
      }
      
    } catch (err: any) {
      console.error('🔍 CLIENT DIAGNOSTIC: Error fetching transcript:', {
        error: err.message,
        stack: err.stack,
        url,
      });
      setError(getErrorMessage(err));
      toast({
        title: 'Error fetching transcript',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      console.log('🔍 CLIENT DIAGNOSTIC: Transcript fetch operation completed');
    }
  };
  
  // Helper to create a nicely formatted transcript with metadata
  const formatTranscript = (text: string, lang?: string, url?: string, isFallback?: boolean): string => {
    const videoId = url ? extractYouTubeVideoId(url) : null;
    const langInfo = lang ? ` (${lang.toUpperCase()})` : '';
    
    // For fallback transcripts, just return the text as is since it's already formatted
    if (isFallback) {
      return text;
    }
    
    // Create a formatted transcript with metadata - use translations
    // Make sure we're using the correct translation keys that exist in both language files
    return `## ${t('youtubeTranscript.title')}${langInfo}
${t('youtubeTranscript.source')}: ${url || t('common.notSpecified')}
${videoId ? `${t('youtubeSection.videoId')}: ${videoId}` : ''}

${text}

[${t('youtubeTranscript.endOfTranscript')}]`;
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url && !isLoading) {
      e.preventDefault();
      handleFetchTranscript();
    }
  };

  const handleCopyTranscript = () => {
    if (transcript) {
      navigator.clipboard.writeText(transcript);
      setHasCopied(true);
      toast({
        title: t('youtubeTranscript.copied'),
        description: t('youtubeTranscript.copiedDescription'),
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setHasCopied(false);
      }, 2000);
    }
  };

  const checkApiKey = async () => {
    setApiStatus('checking');
    setDiagnosticInfo(null);
    
    try {
      // Call our diagnostic endpoint
      const response = await fetch('/api/youtube/check-api');
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
      console.log('�� CLIENT DIAGNOSTIC: Running diagnostic test with known working video');
      
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
          false
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
    setClientSideExtractionMode(true);
    
    try {
      console.log('🔍 CLIENT EXTRACTION: Initializing YouTube player for caption extraction');
      
      // Ensure the container exists
      if (!playerContainerRef.current) {
        throw new Error('Player container not found');
      }
      
      // Create a player instance
      if (window.YT && window.YT.Player) {
        // Clear any existing player
        if (playerInstanceRef.current) {
          playerInstanceRef.current.destroy();
          playerInstanceRef.current = null;
        }
        
        // Create new player
        let transcriptText = '';
        let captionsFound = false;
        
        // Create a hidden player to check for captions
        const player = new window.YT.Player(playerContainerRef.current, {
          videoId: youtubeId,
          width: '320',
          height: '180',
          playerVars: {
            autoplay: 0,
            controls: 1,
            cc_load_policy: 1, // Force closed captions
            cc_lang_pref: 'en',
            modestbranding: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              console.log('🔍 CLIENT EXTRACTION: YouTube player ready');
              setPlayerReady(true);
              playerInstanceRef.current = event.target;
              
              // Check if this video has captions
              const hasCapModules = event.target.hasModule && event.target.hasModule('captions');
              const hasCCOption = event.target.getOptions && event.target.getOptions('captions').length > 0;
              
              captionsFound = hasCapModules || hasCCOption;
              console.log('🔍 CLIENT EXTRACTION: Caption detection:', { 
                hasCapModules, 
                hasCCOption,
                captionsFound
              });
              
              // Get video title for the transcript
              const videoData = event.target.getVideoData();
              const videoTitle = videoData?.title || 'YouTube Video';
              
              // If captions are available, we'll use that information in the response
              if (captionsFound) {
                transcriptText = `# YouTube Video Transcript\n\nTitle: ${videoTitle}\nVideo ID: ${youtubeId}\n\n`;
                transcriptText += `This video has captions available in the YouTube player. To view them:\n\n`;
                transcriptText += `1. Go to the video: https://www.youtube.com/watch?v=${youtubeId}\n`;
                transcriptText += `2. Click the "CC" button in the YouTube player\n\n`;
                transcriptText += `Our system detected that this video has captions, but we couldn't extract the full text automatically due to YouTube API restrictions.\n\n`;
                transcriptText += `You can analyze this video by watching it with captions enabled.`;
              } else {
                throw new Error('No captions detected for this video');
              }
              
              // Mute the player and stop video
              event.target.mute();
              setTimeout(() => {
                event.target.stopVideo();
                
                // Process the transcript and complete the flow
                if (transcriptText) {
                  // Format the transcript
                  const formattedTranscript = formatTranscript(
                    transcriptText, 
                    'en', 
                    `https://youtube.com/watch?v=${youtubeId}`,
                    true // Treat as pre-formatted
                  );
                  
                  // Call the callback with the transcript and URL
                  onTranscriptFetched(formattedTranscript, url);
                  
                  // Show guidance toast
                  toast({
                    title: 'Captions Detected',
                    description: 'This video has captions, but due to YouTube restrictions, we can only confirm their existence, not extract the full text.',
                    variant: 'default',
                  });
                }
              }, 2000);
            },
            onError: (event) => {
              console.error('🔍 CLIENT EXTRACTION: YouTube player error:', event.data);
              throw new Error(`YouTube player error: ${event.data}`);
            }
          }
        });
      } else {
        throw new Error('YouTube iframe API not available');
      }
    } catch (err: any) {
      console.error('🔍 CLIENT EXTRACTION: Error:', err);
      setError(getErrorMessage(err));
      setClientSideExtractionMode(false);
      toast({
        title: 'Error checking for captions',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      // We don't set isLoading to false immediately since the player onReady event will complete the process
      if (!playerReady) {
        setIsLoading(false);
      }
    }
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
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={isLoading ? undefined : handleClientSideExtraction}
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
              
              {/* Admin diagnostic button - only shown if we're in debug mode */}
              {showAdminTools ? (
                <button
                  type="button"
                  onClick={() => handleDiagnosticTest()}
                  disabled={isLoading}
                  className="ml-2 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin mr-1 h-3 w-3" />
                  ) : (
                    <Lightbulb className="mr-1 h-3 w-3" />
                  )}
                  Test API
                </button>
              ) : null}
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

        {/* Error Message */}
        {error && !isLoading && (
          <div className="mt-2 p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400 dark:text-red-300" />
              </div>
              <div className="ml-3 w-full">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-200">{error}</p>
                
                {/* User guidance for API key errors */}
                {error.includes('API key') && (
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-md border border-red-100 dark:border-red-900/30">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('common.whatToDo', { defaultValue: "What to do:" })}</h4>
                    <ul className="mt-1 text-xs text-gray-700 dark:text-gray-300 space-y-1 ml-4 list-disc">
                      <li>{t('youtubeTranscript.apiKeyRequired', { defaultValue: "This feature requires a valid Supadata API key" })}</li>
                      <li>{t('youtubeTranscript.checkApiKey', { defaultValue: "If you're the administrator, check your API key configuration in settings" })}</li>
                      <li>{t('youtubeTranscript.contactAdmin', { defaultValue: "Users should contact their administrator for assistance" })}</li>
                    </ul>
                    <div className="mt-2 flex space-x-3">
                      <a 
                        href="/settings/api-keys" 
                        className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <span className="inline-flex items-center">Go to API settings <ChevronRight className="ml-1 h-3 w-3" /></span>
                      </a>
                      <a 
                        href="/api-test" 
                        className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <span className="inline-flex items-center">Diagnose API Issues <ChevronRight className="ml-1 h-3 w-3" /></span>
                      </a>
                    </div>
                  </div>
                )}
                
                {/* Diagnostic checks */}
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={checkApiKey}
                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/50 dark:text-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    {t('youtubeTranscript.checkApiConfig', { defaultValue: "Check API Configuration" })}
                  </button>
                  
                  {apiStatus === 'checking' && (
                    <div className="text-sm text-red-700 dark:text-red-300 flex items-center">
                      <Loader2 className="animate-spin mr-1 h-3 w-3" />
                      {t('youtubeTranscript.checkingApi', { defaultValue: "Checking API configuration..." })}
                    </div>
                  )}
                  
                  {apiStatus === 'success' && (
                    <div className="text-sm text-green-700 dark:text-green-300 flex items-center">
                      <Check className="mr-1 h-3 w-3" />
                      {t('youtubeTranscript.apiValid', { defaultValue: "API configuration is valid" })}
                    </div>
                  )}
                  
                  {apiStatus === 'error' && (
                    <div className="text-sm text-red-700 dark:text-red-300 flex items-center">
                      <X className="mr-1 h-3 w-3" />
                      {t('youtubeTranscript.apiFailed', { defaultValue: "API configuration failed" })}
                    </div>
                  )}
                  
                  {/* Only show technical details in a collapsible section */}
                  {diagnosticInfo && (
                    <div className="mt-2">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                          {t('youtubeTranscript.technicalDetails', { defaultValue: "Technical details (for administrators)" })}
                        </summary>
                        <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/40 rounded border border-red-200 dark:border-red-800/50 font-mono overflow-auto max-h-32">
                          {diagnosticInfo}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Output */}
        {transcript && !isLoading && (
          <div className={`mt-4 p-4 bg-gradient-to-r from-red-50/50 to-white border border-red-100 rounded-xl dark:from-red-900/10 dark:to-gray-800 dark:border-red-900/30 transition-all duration-300 ${transcript.includes('Transcript Not Available') || transcript.includes('Important Notice') ? 'border-yellow-300 dark:border-yellow-600 from-yellow-50/50 dark:from-yellow-900/10' : ''}`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center">
                {transcript.includes('Transcript Not Available') || transcript.includes('Important Notice') ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600 dark:text-yellow-400" />
                    {t('youtubeTranscript.transcriptUnavailable', { defaultValue: "Transcript Unavailable" })}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t('youtubeTranscript.transcriptResults', { defaultValue: "Transcript Results" })}
                  </>
                )}
              </h4>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition-colors duration-200"
                >
                  {hasCopied ? (
                    <>
                      <Check className="mr-1 h-3 w-3 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
                {onToggleTranscript && (
                  <button
                    type="button"
                    onClick={onToggleTranscript}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label={showFullTranscript ? "Collapse transcript" : "Expand transcript"}
                  >
                    {showFullTranscript ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                )}
              </div>
            </div>
            <div className={`prose dark:prose-invert prose-sm max-w-none text-gray-700 dark:text-gray-300 transition-all duration-300 ${showFullTranscript ? '' : 'max-h-40 overflow-hidden relative'}`}>
              {/* Render the transcript as markdown if it contains formatting */}
              {transcript.includes('#') ? (
                <div dangerouslySetInnerHTML={{ 
                  __html: markdownToHtml(transcript) 
                }} />
              ) : (
                // Otherwise use the simple line break rendering
                transcript.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    <br />
                  </React.Fragment>
                ))
              )}
            </div>
            {!showFullTranscript && transcript.length > 300 && (
              <div className="h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent absolute bottom-1 left-0 right-0"></div>
            )}
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
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
        console.error('🔍 CLIENT DIAGNOSTIC: Video validation error', validationError);
      }
      
      // Now make the actual API request
      const response = await fetch(`/api/youtube-direct?videoId=${videoId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      // Check for API configuration errors specifically
      if (data.error && data.error.includes('{0}')) {
        // This is our generic error template with a missing parameter
        setError('API configuration error: The YouTube transcript service is not properly configured. Please check the API Configuration.');
        toast({
          title: 'API Configuration Error',
          description: 'The YouTube transcript service is not properly configured. Please add your Supadata API key to the .env file.',
          variant: 'destructive'
        });
        throw new Error('API Configuration Error');
      }
      
      // Handle other error cases
      if (data.error) {
        setError(getErrorMessage({ message: data.error }));
        throw new Error(data.error);
      }
      
      if (!data.transcript) {
        setError('No transcript was returned from the API. The video may not have captions available.');
        throw new Error('No transcript returned');
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
      const formattedTranscript = formatTranscript(transcriptText, data.lang, url, isFallback, data.isAiGenerated);
      
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
  const formatTranscript = (
    text: string, 
    lang?: string, 
    url?: string, 
    isFallback?: boolean,
    isAiGenerated?: boolean
  ): string => {
    // Add AI generation notice if applicable
    let transcriptWithSource = text;
    
    if (isAiGenerated) {
      transcriptWithSource = `${text}\n\n---\n*Note: This transcript was generated using AI speech recognition and may not be 100% accurate.*`;
    }
    
    const langNotice = lang && lang !== 'auto' && lang !== 'en' 
      ? `\n\nOriginal language: ${lang.toUpperCase()}`
      : '';
    
    const sourceLink = url 
      ? `\n\nSource: ${url}` 
      : '';
    
    const fallbackNotice = isFallback
      ? '\n\n*This is a fallback response as no official transcript could be retrieved.*'
      : '';
    
    return `${transcriptWithSource}${langNotice}${sourceLink}${fallbackNotice}`;
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
    
    try {
      console.log('Attempting audio transcription for video without captions');
      
      // Call our audio transcription endpoint
      const response = await fetch(`/api/youtube-audio-transcription?videoId=${youtubeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Audio transcription failed:', errorData);
        throw new Error(errorData.error || `Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.transcript) {
        throw new Error('No transcript returned from audio transcription');
      }
      
      // Format the transcript 
      const formattedTranscript = formatTranscript(
        data.transcript,
        'auto',
        `https://youtube.com/watch?v=${youtubeId}`,
        false,
        true // Mark as AI generated
      );
      
      // Call the callback with the transcript and URL
      onTranscriptFetched(formattedTranscript, url);
      
      toast({
        title: 'Audio Transcription Complete',
        description: 'Successfully transcribed audio from the video.',
        variant: 'default',
      });
    } catch (err: any) {
      console.error('Audio transcription failed:', err);
      setError(`Audio transcription failed: ${err.message}`);
      
      toast({
        title: 'Audio Transcription Failed',
        description: err.message || 'Failed to transcribe audio from the video.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
        {error && (
          <div className="mt-4 p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  {t('youtubeTranscript.error', { defaultValue: "Error" })}
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                  <p>{error}</p>
                  
                  {error.includes('API configuration') && (
                    <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded border border-red-200 dark:border-red-800">
                      <h4 className="font-medium mb-2">Configuration Instructions:</h4>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Add <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">SUPADATA_API_KEY=your_api_key</code> to your <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env</code> file</li>
                        <li>Get your API key from <a href="https://supadata.io/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Supadata Dashboard</a></li>
                        <li>Restart your development server</li>
                      </ol>
                      
                      <div className="mt-3 flex space-x-3">
                        <button
                          onClick={checkApiKey}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:text-indigo-100 dark:bg-indigo-700/30 dark:hover:bg-indigo-700/50"
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Check API Configuration
                        </button>
                        
                        <button
                          onClick={handleBackupService}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:text-emerald-100 dark:bg-emerald-700/30 dark:hover:bg-emerald-700/50"
                        >
                          <Lightbulb className="mr-1 h-3 w-3" />
                          Try Backup Method
                        </button>
                      </div>
                    </div>
                  )}

                  {error.includes('transcript available') && (
                    <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded border border-red-200 dark:border-red-800">
                      <h4 className="font-medium mb-2">No Captions Available</h4>
                      <p>This video doesn't have captions, but we can try to transcribe the audio directly.</p>
                      
                      <div className="mt-3">
                        <button
                          onClick={handleAudioTranscription}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 dark:text-purple-100 dark:bg-purple-700/30 dark:hover:bg-purple-700/50"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Transcribe Audio
                        </button>
                      </div>
                      
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Note: Audio transcription uses AI and may not be as accurate as official captions.
                        Limited to videos under 10 minutes.
                      </p>
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
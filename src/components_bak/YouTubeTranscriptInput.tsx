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

import React, { useState } from 'react';
import { isValidYouTubeUrl, fetchYouTubeTranscript, extractYouTubeVideoId } from '@/app/lib/services/YouTubeTranscriptService';
import { useToast } from '@/lib/hooks/useToast';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface YouTubeTranscriptInputProps {
  url: string;
  onUrlChange: (url: string) => void;
  onTranscriptFetched: (transcript: string, videoUrl: string) => void;
  transcript: string;
  showFullTranscript: boolean;
  onToggleTranscript: () => void;
}

export default function YouTubeTranscriptInput({
  url,
  onUrlChange,
  onTranscriptFetched,
  transcript,
  showFullTranscript,
  onToggleTranscript
}: YouTubeTranscriptInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [showApiKeyInfo, setShowApiKeyInfo] = useState(false);
  
  const getErrorMessage = (err: any): string => {
    const msg = err.message || 'Unknown error occurred';
    
    if (msg.includes('transcript-unavailable') || 
        msg.includes('No transcript is available')) {
      return 'This video does not have a transcript available. Please try a different video that has captions enabled.';
    }
    
    if (msg.includes('API configuration error') || 
        msg.includes('Missing API key') || 
        msg.includes('No valid access key') ||
        msg.includes('Authentication failed') ||
        msg.includes('403')) {
      setShowApiKeyInfo(true);
      return 'API key error: A valid Supadata API key is required to use this feature.';
    }
    
    if (msg.includes('Network error') || 
        msg.includes('Failed to fetch') || 
        msg.includes('Unable to connect') ||
        msg.includes('internet connection')) {
      return 'Unable to connect to the transcript service. Please check your internet connection and try again.';
    }
    
    if (msg.includes('No transcript available')) {
      return 'This video does not have a transcript available. Please try a different video that has captions.';
    }
    
    if (msg.includes('Invalid YouTube URL')) {
      return 'Please enter a valid YouTube video URL (e.g., https://www.youtube.com/watch?v=XXXXXX).';
    }
    
    // For unexpected errors, give a more detailed message to help with debugging
    return `Error: ${msg}. Please try again or contact support if the issue persists.`;
  };
  
  const handleFetchTranscript = async () => {
    if (!url) return;
    
    setIsLoading(true);
    setError('');
    setShowApiKeyInfo(false);
    
    try {
      // Validate URL format
      if (!isValidYouTubeUrl(url)) {
        throw new Error('Invalid YouTube URL. Please enter a valid YouTube video link.');
      }
      
      const videoId = extractYouTubeVideoId(url);
      console.log('Fetching transcript for video ID:', videoId);
      
      // Use the GET endpoint with videoId parameter
      const response = await fetch(`/api/youtube/transcript?videoId=${videoId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Error fetching transcript: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process the transcript - check for error messages in the content
      if (data.content && typeof data.content === 'string' && data.content.includes('"error"')) {
        try {
          // Try to parse error information from content
          const errorInfo = JSON.parse(data.content);
          if (errorInfo.error) {
            throw new Error(errorInfo.message || errorInfo.error);
          }
        } catch (parseError) {
          // If we can't parse it, just continue with the content as is
          console.warn('Could not parse potential error in content:', parseError);
        }
      }
      
      // Process the transcript
      let transcriptText = '';
      
      if (data.transcript) {
        // If the API returns a transcript field directly
        transcriptText = data.transcript;
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
        throw new Error('Unexpected response format from transcript service');
      }
      
      if (!transcriptText || transcriptText.length < 10) {
        throw new Error('Transcript is too short or empty');
      }
      
      console.log('Transcript fetched successfully');
      
      // Format the transcript with video info if available
      const formattedTranscript = formatTranscript(transcriptText, data.lang, url);
      
      // Call the callback with the transcript and URL
      onTranscriptFetched(formattedTranscript, url);
      
      // Clear the input field after successful fetch
      onUrlChange('');
      
    } catch (err: any) {
      console.error('Error fetching transcript:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper to create a nicely formatted transcript with metadata
  const formatTranscript = (text: string, lang?: string, url?: string): string => {
    const videoId = url ? extractYouTubeVideoId(url) : null;
    const langInfo = lang ? ` (${lang.toUpperCase()})` : '';
    
    // Create a formatted transcript with metadata - use translations
    return `## ${t('youtubeTranscript.title', { defaultValue: 'YouTube Transcript' })}${langInfo}
${t('youtubeTranscript.source', { defaultValue: 'Source' })}: ${url || t('common.notSpecified', { defaultValue: 'Unknown source' })}
${videoId ? `${t('youtubeSection.videoId', { defaultValue: 'Video ID' })}: ${videoId}` : ''}

${text}

[${t('youtubeTranscript.endOfTranscript', { defaultValue: 'End of Transcript' })}]`;
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url && !isLoading) {
      e.preventDefault();
      handleFetchTranscript();
    }
  };
  
  return (
    <div className="mt-4 mb-6 bg-blue-50 dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-gray-700">
      <div className="mb-3">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300">
          {t('createPage.youtubeSection.transcriptTitle')}
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          {t('createPage.youtubeSection.description')}
        </p>
      </div>
      
      <div className="flex items-center mb-3">
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('createPage.youtubeSection.urlPlaceholder')}
          className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-md mr-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
        />
        <button
          onClick={handleFetchTranscript}
          disabled={isLoading || !url}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('common.loading')}
            </span>
          ) : (
            t('createPage.youtubeSection.addTranscript')
          )}
        </button>
      </div>
      
      {transcript && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-blue-900 dark:text-blue-300">
              {t('createPage.youtubeSection.transcriptPreview')}
            </h4>
            <button
              onClick={onToggleTranscript}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showFullTranscript ? t('createPage.youtubeSection.showLess') : t('createPage.youtubeSection.showMore')}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-3 max-h-60 overflow-y-auto">
            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">
              {showFullTranscript ? transcript : `${transcript.substring(0, 250)}${transcript.length > 250 ? '...' : ''}`}
            </p>
          </div>
          <div className="mt-2">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {t('createPage.youtubeSection.transcriptAdded')}
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-2">
        <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center">
          <span className="text-yellow-500 mr-1">💡</span>
          {t('createPage.youtubeSection.note')}
        </p>
      </div>
    </div>
  );
} 
"use client";

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface ResearchPanelProps {
  contentType: string;
  platform: string;
  title: string;
  onResearchComplete?: (researchData: ResearchData) => void;
}

export interface ResearchData {
  trendingTopics: string[];
  keyPoints: string[];
  suggestions: string;
}

const ResearchPanel: React.FC<ResearchPanelProps> = ({
  contentType,
  platform,
  title,
  onResearchComplete
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [researchTopic, setResearchTopic] = useState('');
  const [researchResults, setResearchResults] = useState<ResearchData | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStatus, setResearchStatus] = useState('');

  const handleTopicSelect = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  // Real implementation using Perplexity API
  const handleResearch = async () => {
    if (!researchTopic && !title) {
      toast({
        title: t('researchPanel.topicRequired'),
        description: t('researchPanel.enterTopic'),
        variant: 'destructive'
      });
      return;
    }

    const topic = researchTopic || title;
    setIsLoading(true);
    setResearchProgress(0);
    setResearchStatus(t('researchPanel.initializing'));
    
    try {
      // Create context object for the API
      const context = `Content Type: ${contentType}, Platform: ${platform}, Target Audience: general`;
      
      // Setup event source for SSE from the Perplexity API
      const eventSource = new EventSource(`/api/perplexity/research-sse?t=${Date.now()}`);
      
      // Send the request to start research
      fetch('/api/perplexity/research-sse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          context,
          sources: ['recent', 'scholar'],
        }),
      }).catch(error => {
        console.error('Error initiating research:', error);
        eventSource.close();
        throw error;
      });
      
      // Listen for progress events
      eventSource.addEventListener('progress', (event) => {
        const data = JSON.parse(event.data);
        setResearchProgress(data.progress);
        setResearchStatus(data.status);
      });
      
      // Listen for research results
      eventSource.addEventListener('result', (event) => {
        const data = JSON.parse(event.data);
        
        // Extract key points from research
        const keyPoints = extractKeyPointsFromResearch(data.research);
        
        // Create result object
        const results: ResearchData = {
          trendingTopics: extractTrendingTopicsFromResearch(data.research),
          keyPoints: keyPoints,
          suggestions: data.research
        };
        
        setResearchResults(results);
        
        if (onResearchComplete) {
          onResearchComplete(results);
        }
        
        toast({
          title: t('researchPanel.completed'),
          description: t('researchPanel.dataGathered'),
          variant: 'success'
        });
        
        eventSource.close();
        setIsLoading(false);
        setResearchProgress(100);
        
        // Reset progress after a delay
        setTimeout(() => {
          setResearchProgress(0);
          setResearchStatus('');
        }, 2000);
      });
      
      // Listen for errors
      eventSource.addEventListener('error', (event) => {
        console.error('Error from research SSE:', event);
        
        toast({
          title: t('researchPanel.failed'),
          description: t('researchPanel.errorGathering'),
          variant: 'destructive'
        });
        
        eventSource.close();
        setIsLoading(false);
        setResearchProgress(0);
      });
      
    } catch (error) {
      console.error('Research error:', error);
      
      toast({
        title: t('researchPanel.failed'),
        description: t('researchPanel.errorGathering'),
        variant: 'destructive'
      });
      
      setIsLoading(false);
      setResearchProgress(0);
    }
  };

  // Helper function to extract trending topics from research
  const extractTrendingTopicsFromResearch = (research: string): string[] => {
    // Look for trend sections in the research
    const trendMarkers = [
      'trending topics',
      'recent trends',
      'current trends',
      'trending in',
      'popular topics'
    ];
    
    for (const marker of trendMarkers) {
      const markerIndex = research.toLowerCase().indexOf(marker);
      if (markerIndex !== -1) {
        // Extract lines after the marker
        const sectionAfterMarker = research.substring(markerIndex);
        const lines = sectionAfterMarker.split('\n').slice(0, 10);
        
        // Find lines that look like list items (bullets, numbers, etc)
        const listItems = lines.filter(line => 
          line.trim().startsWith('-') || 
          line.trim().startsWith('*') || 
          /^\d+\./.test(line.trim())
        );
        
        if (listItems.length > 0) {
          // Clean up list items and return up to 5
          return listItems
            .map(item => item.replace(/^[*\-\d.]+\s*/, '').trim())
            .filter(item => item.length > 0)
            .slice(0, 5);
        }
      }
    }
    
    // Fallback: extract sentences containing "trend" or "popular"
    const sentences = research.split(/[.!?]+/);
    const trendSentences = sentences.filter(sentence => 
      sentence.toLowerCase().includes('trend') || 
      sentence.toLowerCase().includes('popular')
    );
    
    if (trendSentences.length > 0) {
      // Return up to 5 sentences
      return trendSentences
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 10 && sentence.length < 100)
        .slice(0, 5);
    }
    
    // If all else fails, return empty array - the API should provide structured trends
    return [];
  };

  // Helper function to extract key points from research
  const extractKeyPointsFromResearch = (research: string): string[] => {
    // Look for key points, recommendations, or best practices sections
    const keyPointMarkers = [
      'key points',
      'main points',
      'recommendations',
      'best practices',
      'important factors',
      'key factors',
      'key findings'
    ];
    
    for (const marker of keyPointMarkers) {
      const markerIndex = research.toLowerCase().indexOf(marker);
      if (markerIndex !== -1) {
        // Extract lines after the marker
        const sectionAfterMarker = research.substring(markerIndex);
        const lines = sectionAfterMarker.split('\n').slice(0, 15);
        
        // Find lines that look like list items (bullets, numbers, etc)
        const listItems = lines.filter(line => 
          line.trim().startsWith('-') || 
          line.trim().startsWith('*') || 
          /^\d+\./.test(line.trim())
        );
        
        if (listItems.length > 0) {
          // Clean up list items and return up to 6
          return listItems
            .map(item => item.replace(/^[*\-\d.]+\s*/, '').trim())
            .filter(item => item.length > 0)
            .slice(0, 6);
        }
      }
    }
    
    // Fallback: look for sentences that seem like recommendations or best practices
    const sentences = research.split(/[.!?]+/);
    const recommendationSentences = sentences.filter(sentence => 
      sentence.toLowerCase().includes('should') || 
      sentence.toLowerCase().includes('recommend') ||
      sentence.toLowerCase().includes('best practice') ||
      sentence.toLowerCase().includes('important to')
    );
    
    if (recommendationSentences.length > 0) {
      // Return up to 6 sentences
      return recommendationSentences
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 10 && sentence.length < 100)
        .slice(0, 6);
    }
    
    // If all else fails, return an array with one item
    return ["Research completed but no specific key points were identified. Review the full research for insights."];
  };

  // YouTube URL extract functionality
  const handleYouTubeExtract = async () => {
    if (!youtubeUrl) {
      toast({
        title: t('researchPanel.missingUrl'),
        description: t('researchPanel.enterYouTubeUrl'),
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Make a real API call to extract YouTube information
      const response = await fetch('/api/youtube/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Set the research topic to the video title if available
      if (data.title) {
        setResearchTopic(data.title);
      }
      
      toast({
        title: t('researchPanel.youtubeExtracted'),
        description: t('researchPanel.videoInfoExtracted'),
        variant: 'success'
      });
    } catch (error) {
      console.error('YouTube extraction error:', error);
      
      toast({
        title: t('researchPanel.extractionFailed'),
        description: t('researchPanel.errorExtractingInfo'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Content Research</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Gather insights and trends to enhance your {contentType}
        </p>
      </div>
      
      <div className="p-4">
        {/* YouTube URL extract for video content types */}
        {(contentType === 'youtube-script' || contentType === 'video-script' || contentType === 'vlog-script') && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
              <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              YouTube Research
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Extract information from a YouTube video to enhance your research
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste YouTube URL..."
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              />
              <button
                onClick={handleYouTubeExtract}
                disabled={isLoading}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Extract
              </button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Research Topic
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={researchTopic}
              onChange={(e) => setResearchTopic(e.target.value)}
              placeholder="Enter a specific topic to research..."
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              onClick={handleResearch}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Researching...' : 'Research'}
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Leaving this empty will research based on your content title and platform
          </p>
        </div>
        
        {researchResults && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Trending Topics</h4>
              <div className="flex flex-wrap gap-2">
                {researchResults.trendingTopics.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => handleTopicSelect(topic)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedTopics.includes(topic)
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Key Points to Consider</h4>
              <ul className="space-y-1 pl-5 list-disc">
                {researchResults.keyPoints.map((point, index) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300">{point}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Content Suggestions</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-700 rounded-md whitespace-pre-line">
                {researchResults.suggestions}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchPanel; 
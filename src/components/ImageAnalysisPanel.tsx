import React, { useState, useEffect } from 'react';
import { Image, Lightbulb, Loader2, Sparkles, Camera, Zap, Upload, FileImage, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useToast } from '@/lib/hooks/useToast';
import ImageUploader from './ImageUploader';

interface ImageAnalysisPanelProps {
  contextType?: 'general' | 'social-media' | 'landing-page' | 'research';
  onAnalysisComplete?: (analysis: string) => void;
  customPrompt?: string;
  className?: string;
  platformInfo?: {
    platform: string;
    subPlatform: string;
  };
}

const ImageAnalysisPanel: React.FC<ImageAnalysisPanelProps> = ({
  contextType = 'general',
  onAnalysisComplete,
  customPrompt,
  className = '',
  platformInfo,
}) => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customUserPrompt, setCustomUserPrompt] = useState(customPrompt || '');
  const [isResultsExpanded, setIsResultsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (file: File, previewUrl: string) => {
    setImageFile(file);
    setImagePreview(previewUrl);
    setError(null);
    
    // Reset analysis when a new image is uploaded
    setAnalysis('');
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview(null);
    setAnalysis('');
    setError(null);
  };

  const analyzeImage = async () => {
    if (!imageFile) {
      toast({
        title: t('imageAnalysis.noImage', { defaultValue: 'No image' }),
        description: t('imageAnalysis.pleaseUpload', { defaultValue: 'Please upload an image first' }),
        variant: 'destructive',
      });
      return;
    }

    console.log('Starting analysis, image file size:', imageFile.size);
    setIsAnalyzing(true);
    setError(null);

    // Create a timeout to abort the request after 60 seconds
    const timeoutId = setTimeout(() => {
      setIsAnalyzing(false);
      setError('Analysis timed out. Please try again or use a smaller image.');
      toast({
        title: t('imageAnalysis.analysisFailed', { defaultValue: 'Analysis failed' }),
        description: t('imageAnalysis.timeout', { defaultValue: 'Request timed out. Please try again with a smaller image.' }),
        variant: 'destructive',
      });
    }, 60000);

    try {
      // Create form data to send to the API
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // Include platform-specific guidance in the prompt
      let platformSpecificPrompt = '';
      if (contextType === 'social-media') {
        platformSpecificPrompt = 'Focus your analysis specifically on how this image could be used for social media posts. ';
        
        // Use the directly passed platformInfo if available
        const platform = platformInfo?.platform || '';
        const subPlatform = platformInfo?.subPlatform || '';
        
        if (platform) {
          if (subPlatform && subPlatform !== '') {
            platformSpecificPrompt += `The user has specifically selected ${subPlatform} as their target platform. `;
            platformSpecificPrompt += `ONLY provide optimization suggestions for ${subPlatform}. Do NOT suggest content for other platforms. `;
          } else {
            platformSpecificPrompt += `The user has specifically selected ${platform} as their target platform. `;
            platformSpecificPrompt += `ONLY provide optimization suggestions for ${platform}. Do NOT suggest content for other platforms. `;
          }
        }
      } else if (contextType === 'landing-page') {
        platformSpecificPrompt = 'Focus your analysis specifically on how this image could be used for a landing page. Provide suggestions for CTAs, placement, and conversion optimization.';
      } else if (contextType === 'research') {
        platformSpecificPrompt = 'Focus your analysis on extracting data points, insights, and research-worthy information from this image.';
      }
      
      // Add special handling for video platforms like YouTube
      const platform = platformInfo?.platform || '';
      const subPlatform = platformInfo?.subPlatform || '';
      
      // Check if the platform is YouTube or any video platform
      if (platform === 'youtube' || platform === 'video-script' || platform === 'vlog') {
        // Override any previous contextType settings with video-specific guidance
        platformSpecificPrompt = 'Focus your analysis specifically on how this image could be used for video content. ';
        platformSpecificPrompt += 'Consider aspects like visual storytelling, scene composition, and how this would appear in a video. ';
        
        // Add platform-specific guidance
        if (platform === 'youtube') {
          platformSpecificPrompt += 'The user is creating content for YouTube. ';
          
          if (subPlatform) {
            // Add specific guidance based on the YouTube content type
            if (subPlatform === 'educational') {
              platformSpecificPrompt += 'They are making an EDUCATIONAL video. Suggest how this image could be used in educational content, what learning points it illustrates, and how to frame it within tutorial or explainer content. ';
            } else if (subPlatform === 'entertainment') {
              platformSpecificPrompt += 'They are making an ENTERTAINMENT video. Suggest how this image could enhance viewer engagement, create emotional response, or support storytelling in entertainment content. ';
            } else if (subPlatform === 'review') {
              platformSpecificPrompt += 'They are making a REVIEW video. Suggest how this image could highlight product features, demonstrate use cases, or support comparison points in a review format. ';
            } else if (subPlatform.includes('vlog')) {
              platformSpecificPrompt += `They are making a ${subPlatform.toUpperCase()} video. Suggest how this image could be incorporated into vlog-style content, what personal narrative it could support, and how it connects to the creator's experience. `;
            }
          }
          platformSpecificPrompt += 'Provide specific suggestions for YouTube thumbnails, B-roll footage, visual storytelling, and audience retention. ';
        } else if (platform === 'vlog') {
          platformSpecificPrompt += 'The user is creating vlog content. Suggest how this image could be incorporated into personal narrative, what story it tells, and how to frame it within the vlog format. ';
          
          if (subPlatform) {
            platformSpecificPrompt += `Specifically, they're creating a ${subPlatform} vlog. Optimize suggestions for this vlog type. `;
          }
        }
        
        platformSpecificPrompt += 'ONLY provide optimization suggestions for video content. Do NOT suggest content for social media posts or other non-video formats.';
      }
      
      // Combine with any user custom prompt
      const finalPrompt = platformSpecificPrompt + (customUserPrompt ? ' ' + customUserPrompt : '');
      
      if (finalPrompt) {
        formData.append('prompt', finalPrompt);
      }
      
      formData.append('contextType', contextType);
      formData.append('language', language);
      
      // Add platform information to the request if available
      if (platformInfo?.platform) {
        formData.append('platform', platformInfo.platform);
        if (platformInfo.subPlatform) {
          formData.append('subPlatform', platformInfo.subPlatform);
        }
      }

      console.log('Sending image for analysis...');
      console.log('Initiating fetch request to /api/claude/analyze-image');
      
      // Create a controller to allow aborting the fetch
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Set up a fetch timeout
      const fetchTimeoutId = setTimeout(() => {
        console.log('Fetch timeout reached, aborting request');
        controller.abort();
      }, 45000); // 45 second timeout for fetch
      
      const response = await fetch('/api/claude/analyze-image', {
        method: 'POST',
        body: formData,
        signal: signal,
      });
      
      // Clear the fetch timeout since we got a response
      clearTimeout(fetchTimeoutId);
      
      console.log('Received response from API:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from API:', errorData);
        throw new Error(errorData.error || 'Failed to analyze image');
      }

      const data = await response.json();
      console.log('Analysis received successfully');
      
      // Ensure we have the analysis text
      if (!data.analysis) {
        throw new Error('No analysis received from API');
      }
      
      console.log('Setting analysis result in component state');
      setAnalysis(data.analysis);

      // Store directly in sessionStorage to avoid the redirect system entirely
      try {
        // First store our own copy in sessionStorage
        sessionStorage.setItem('imageAnalysisResult', data.analysis);
        console.log('Stored image analysis in sessionStorage directly');
        
        // If we have an onAnalysisComplete callback, call it directly with the analysis text
        // but ONLY if it's not going to cause a redirect
        if (onAnalysisComplete && typeof onAnalysisComplete === 'function') {
          // To avoid potential redirects, we'll just update local state
          // Don't call the callback method that causes redirects
          console.log('Not calling onAnalysisComplete to prevent redirects');
        }
      } catch (storageError) {
        console.error('Failed to store analysis in sessionStorage:', storageError);
      }

      toast({
        title: t('imageAnalysis.analysisComplete', { defaultValue: 'Analysis complete' }),
        description: t('imageAnalysis.claudeAnalyzed', { defaultValue: 'Claude has analyzed your image' }),
      });
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      setError(error.message || 'An error occurred during analysis');
      
      toast({
        title: t('imageAnalysis.analysisFailed', { defaultValue: 'Analysis failed' }),
        description: error.message || t('imageAnalysis.couldNotAnalyze', { defaultValue: 'Could not analyze the image. Please try again.' }),
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
      clearTimeout(timeoutId);
    }
  };

  // Return different content recommendations based on contextType
  const getContextDescription = () => {
    switch(contextType) {
      case 'social-media':
        return t('imageAnalysis.socialMediaDesc', { defaultValue: 'Perfect for social media posts, captions, and hashtag suggestions.' });
      case 'landing-page':
        return t('imageAnalysis.landingPageDesc', { defaultValue: 'Ideal for landing page copy, CTAs, and conversion-focused insights.' });
      case 'research':
        return t('imageAnalysis.researchDesc', { defaultValue: 'Extract data points, insights, and research-worthy information.' });
      default:
        return t('imageAnalysis.defaultDesc', { defaultValue: 'Claude will analyze the image to provide insights for your content creation.' });
    }
  };

  // Icon based on context type
  const getContextIcon = () => {
    switch(contextType) {
      case 'social-media':
        return <Camera className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case 'landing-page':
        return <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'research':
        return <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" />;
      default:
        return <FileImage className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const toggleResultsExpansion = () => {
    setIsResultsExpanded(!isResultsExpanded);
  };

  const formatAnalysisResult = (text: string) => {
    // Split the text into paragraphs
    const paragraphs = text.split('\n\n');
    
    // Process each paragraph
    return paragraphs.map((paragraph, index) => {
      // Skip empty paragraphs
      if (!paragraph.trim()) return null;
      
      // Handle Markdown headings (## Heading)
      if (paragraph.match(/^#+\s/)) {
        const level = paragraph.match(/^(#+)\s/)?.[1].length || 2;
        const headingText = paragraph.replace(/^#+\s/, '');
        
        // Choose heading style based on level
        if (level === 1) {
          return (
            <h2 key={index} className="text-base font-bold mt-6 mb-3 text-gray-800 dark:text-gray-200 border-b pb-1 border-gray-200 dark:border-gray-700">
              {headingText}
            </h2>
          );
        } else {
          return (
            <h3 key={index} className="text-sm font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200">
              {headingText}
            </h3>
          );
        }
      }
      
      // Check if paragraph is a heading (less than 100 chars and ends with a colon)
      const isHeading = paragraph.length < 100 && paragraph.endsWith(':');
      
      // Check if paragraph is a list item
      const isList = paragraph.split('\n').every(line => line.trim().startsWith('-') || line.trim().startsWith('*'));
      
      // Check if paragraph contains bullet points mixed with text
      const hasBulletPoints = paragraph.includes('\n- ') || paragraph.includes('\n* ');
      
      if (isHeading) {
        return (
          <h3 key={index} className="text-sm font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200">
            {paragraph}
          </h3>
        );
      } else if (isList) {
        return (
          <ul key={index} className="list-disc pl-5 space-y-1 mb-3">
            {paragraph.split('\n').map((line, lineIndex) => (
              <li key={`${index}-${lineIndex}`} className="text-sm text-gray-700 dark:text-gray-300">
                {line.replace(/^[-*]\s+/, '')}
              </li>
            ))}
          </ul>
        );
      } else if (hasBulletPoints) {
        // Split the paragraph into text and bullet points
        const parts = paragraph.split(/\n(?=[-*]\s)/);
        return (
          <div key={index} className="mb-3">
            {parts.map((part, partIndex) => {
              if (part.startsWith('- ') || part.startsWith('* ')) {
                return (
                  <ul key={`${index}-list-${partIndex}`} className="list-disc pl-5 space-y-1 mb-2">
                    <li className="text-sm text-gray-700 dark:text-gray-300">
                      {part.replace(/^[-*]\s+/, '')}
                    </li>
                  </ul>
                );
              } else {
                return (
                  <p key={`${index}-text-${partIndex}`} className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                    {part}
                  </p>
                );
              }
            })}
          </div>
        );
      } else {
        // Regular paragraph
        return (
          <p key={index} className="mb-3 text-sm text-gray-700 dark:text-gray-300">
            {paragraph}
          </p>
        );
      }
    }).filter(Boolean); // Remove null elements
  };

  // Add useEffect to check for previously analyzed images on component mount
  // And to clear the analysis when language changes
  useEffect(() => {
    try {
      // Clear analysis when language changes
      const currentLang = typeof document !== 'undefined' 
        ? document.documentElement.lang || 'en'
        : 'en';
      
      // Store the current language in ref so we can detect changes
      const prevLang = sessionStorage.getItem('last_language');
      
      // If the language changed, clear the analysis
      if (prevLang && prevLang !== currentLang) {
        console.log(`[ImageAnalysisPanel] Language changed from ${prevLang} to ${currentLang}, clearing analysis data`);
        sessionStorage.removeItem('imageAnalysisResult');
        setAnalysis('');
        setImageFile(null);
        setImagePreview(null);
      }
      
      // Update the stored language
      sessionStorage.setItem('last_language', currentLang);
      
      // If language is the same, check for stored analysis result
      if (!analysis) {
        const storedAnalysis = sessionStorage.getItem('imageAnalysisResult');
        if (storedAnalysis) {
          console.log('Found stored image analysis, restoring it');
          setAnalysis(storedAnalysis);
        }
      }
    } catch (error) {
      console.error('Error handling image analysis with language changes:', error);
    }
  }, [analysis, language]);

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${className}`}>
      {/* Only show the header if not in the simplified mode */}
      {!className?.includes('border-none') && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-lime-50 dark:from-green-900/20 dark:to-lime-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-800/30 rounded-full">
              {getContextIcon()}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('imageAnalysis.title', { defaultValue: 'Image Analysis' })}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
            {getContextDescription()}
          </p>
        </div>
      )}
      
      <div className="p-5">
        <ImageUploader 
          onImageUpload={handleImageUpload}
          onImageRemove={handleImageRemove}
          initialImage={imagePreview || undefined}
          maxSizeMB={10}
          className="mb-1"
          emptyStateText={t('imageUploader.dragDrop', { defaultValue: "Drag and drop an image, or click to upload" })}
          emptyStateDescription={t('imageAnalysis.defaultDesc', { defaultValue: "Claude will analyze the image to provide insights for your content creation." })}
        />
        
        {imagePreview && (
          <div className="mt-5 transition-all duration-300">
            <div className="flex flex-col space-y-3">
              <label 
                htmlFor="custom-prompt" 
                className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-blue-500" />
                {t('imageAnalysis.customAnalysisInstructions', { defaultValue: "Custom Analysis Instructions (Optional)" })}
              </label>
              <textarea
                id="custom-prompt"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                placeholder={t('imageAnalysis.customPromptPlaceholder', { defaultValue: "E.g., Analyze this product image and suggest selling points..." })}
                value={customUserPrompt}
                onChange={(e) => setCustomUserPrompt(e.target.value)}
              />
            </div>
            
            <button
              type="button"
              onClick={(e) => {
                // Prevent any default behavior
                e.preventDefault();
                // Stop event propagation to parent elements
                e.stopPropagation();
                
                // Prevent any form submission if this is inside a form
                if (e.nativeEvent) {
                  e.nativeEvent.stopImmediatePropagation();
                }
                
                console.log('Analyze button clicked, preventing default behavior');
                console.log('Image file:', imageFile);
                
                // Call the analyze function
                analyzeImage();
              }}
              disabled={isAnalyzing}
              className="mt-4 w-full inline-flex items-center justify-center px-4 py-2.5 border border-green-200 rounded-lg text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:bg-green-200 active:transform active:scale-95"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4 text-green-600" />
                  {t('imageAnalysis.analyzingWithClaude', { defaultValue: "Analyzing with Claude..." })}
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4 text-green-600" />
                  {t('imageAnalysis.analyzeWithClaude', { defaultValue: "Analyze with Claude" })}
                </>
              )}
            </button>
          </div>
        )}
        
        {error && (
          <div className="mt-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center">
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </p>
          </div>
        )}
        
        {analysis && (
          <div className="mt-5 p-4 bg-gradient-to-r from-green-50/50 to-white border border-green-100 rounded-xl dark:from-green-900/10 dark:to-gray-800 dark:border-green-900/30 transition-all duration-300">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-green-500" />
                {t('imageAnalysis.analysisResults', { defaultValue: "Analysis Results" })}
              </h4>
              <button 
                onClick={toggleResultsExpansion}
                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1.5 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                aria-label={isResultsExpanded ? "Collapse results" : "Expand results"}
              >
                {isResultsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
            
            {isResultsExpanded && (
              <div className="prose prose-sm dark:prose-invert prose-headings:font-semibold max-w-none text-gray-700 dark:text-gray-300 transition-all duration-300">
                {formatAnalysisResult(analysis)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageAnalysisPanel; 
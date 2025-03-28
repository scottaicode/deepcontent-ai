import React, { useState } from 'react';
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

  const handleImageUpload = (file: File, previewUrl: string) => {
    setImageFile(file);
    setImagePreview(previewUrl);
    
    // Reset analysis when a new image is uploaded
    setAnalysis('');
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview(null);
    setAnalysis('');
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

    setIsAnalyzing(true);

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
      
      // Combine with any user custom prompt
      const finalPrompt = platformSpecificPrompt + (customUserPrompt ? ' ' + customUserPrompt : '');
      
      if (finalPrompt) {
        formData.append('prompt', finalPrompt);
      }
      
      formData.append('contextType', contextType);
      formData.append('language', language);

      console.log('Sending image for analysis...');
      
      // Call the API
      const response = await fetch('/api/claude/analyze-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from API:', errorData);
        throw new Error(errorData.error || 'Failed to analyze image');
      }

      const data = await response.json();
      console.log('Analysis received');
      
      // Ensure we have the analysis text
      if (!data.analysis) {
        throw new Error('No analysis received from API');
      }
      
      setAnalysis(data.analysis);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data.analysis);
      }

      toast({
        title: t('imageAnalysis.analysisComplete', { defaultValue: 'Analysis complete' }),
        description: t('imageAnalysis.claudeAnalyzed', { defaultValue: 'Claude has analyzed your image' }),
      });
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      toast({
        title: t('imageAnalysis.analysisFailed', { defaultValue: 'Analysis failed' }),
        description: error.message || t('imageAnalysis.couldNotAnalyze', { defaultValue: 'Could not analyze the image. Please try again.' }),
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
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

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${className}`}>
      {/* Only show the header if not in the simplified mode */}
      {!className?.includes('border-none') && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-full">
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
              onClick={analyzeImage}
              disabled={isAnalyzing}
              className="mt-4 w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  {t('imageAnalysis.analyzingWithClaude', { defaultValue: "Analyzing with Claude..." })}
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  {t('imageAnalysis.analyzeWithClaude', { defaultValue: "Analyze with Claude" })}
                </>
              )}
            </button>
          </div>
        )}
        
        {analysis && (
          <div className="mt-5 p-4 bg-gradient-to-r from-blue-50/50 to-white border border-blue-100 rounded-xl dark:from-blue-900/10 dark:to-gray-800 dark:border-blue-900/30 transition-all duration-300">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                {t('imageAnalysis.analysisResults', { defaultValue: "Analysis Results" })}
              </h4>
              <button 
                onClick={toggleResultsExpansion}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                aria-label={isResultsExpanded ? "Collapse results" : "Expand results"}
              >
                {isResultsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
            
            {isResultsExpanded && (
              <div className="prose dark:prose-invert prose-sm max-w-none text-gray-700 dark:text-gray-300 transition-all duration-300">
                {analysis.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageAnalysisPanel; 
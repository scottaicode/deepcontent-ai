"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useContent } from '@/lib/hooks/useContent';
import { useToast } from '@/lib/hooks/useToast';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { MediaUpload } from './MediaUpload';
import ContentCreationSteps from './ContentCreationSteps';
import ResearchPanel, { ResearchData } from './ResearchPanel';
import YouTubeTranscriptInput from './YouTubeTranscriptInput';
import ImageAnalysisPanel from './ImageAnalysisPanel';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface ContentFormProps {
  onSuccess?: () => void;
  onResearch?: (contentDetails: any) => void;
  isLoadingRedirect?: boolean;
}

// Content type mapping based on platform
const platformToContentType = {
  'website': 'article',
  'blog': 'blog-post',
  'social': 'social-post',
  'email': 'email',
  'youtube': 'youtube-script',
  'video-script': 'video-script',
  'vlog': 'vlog-script',
  'podcast': 'podcast-script',
  'presentation': 'business-presentation',
  'google-ads': 'google-ads',
  'research-report': 'research-report'
};

const DEFAULT_PLATFORM = 'social';

type PlatformOption = {
  id: string;
  name: string;
  disabled?: boolean;
};

type PlatformOptionsType = Record<string, Array<PlatformOption>>;

// Platform specific options for the second level selection
const PLATFORM_OPTIONS: PlatformOptionsType = {
  'social': [
    { id: 'facebook', name: 'Facebook' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'twitter', name: 'Twitter' },
    { id: 'linkedin', name: 'LinkedIn' },
    { id: 'tiktok', name: 'TikTok' }
  ],
  'blog': [
    { id: 'company-blog', name: 'Company Blog' },
    { id: 'medium', name: 'Medium' },
    { id: 'wordpress', name: 'WordPress' }
  ],
  'email': [
    { id: 'newsletter', name: 'Newsletter' },
    { id: 'marketing', name: 'Marketing Email' },
    { id: 'sales', name: 'Sales Email' },
    { id: 'welcome', name: 'Welcome Email' }
  ],
  'video-script': [
    { id: 'explainer', name: 'Explainer Video' },
    { id: 'advertisement', name: 'Advertisement' },
    { id: 'tutorial', name: 'Tutorial' },
    { id: 'product-demo', name: 'Product Demo' }
  ],
  'youtube': [
    { id: 'educational', name: 'Educational' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'review', name: 'Review' },
    { id: 'vlog', name: 'Vlog' }
  ],
  'website': [
    { id: 'landing-page', name: 'Landing Page' },
    { id: 'about-page', name: 'About Page' },
    { id: 'product-page', name: 'Product Page' },
    { id: 'services-page', name: 'Services Page' }
  ],
  'podcast': [
    { id: 'interview', name: 'Interview' },
    { id: 'solo', name: 'Solo Episode' },
    { id: 'panel', name: 'Panel Discussion' }
  ],
  'presentation': [
    { id: 'business', name: 'Business Presentation' },
    { id: 'executive', name: 'Executive Summary' },
    { id: 'sales', name: 'Sales Presentation' },
    { id: 'training', name: 'Training Material' },
    { id: 'investor', name: 'Investor Pitch' }
  ],
  'vlog': [
    { id: 'travel', name: 'Travel Vlog' },
    { id: 'daily', name: 'Daily Vlog' },
    { id: 'tutorial', name: 'Tutorial Vlog' }
  ],
  'google-ads': [
    { id: 'search-ads', name: 'Search Ads' },
    { id: 'display-ads', name: 'Display Ads' },
    { id: 'video-ads', name: 'Video Ads' },
    { id: 'shopping-ads', name: 'Shopping Ads' }
  ],
  'research-report': [
    { id: 'market-analysis', name: 'Market Analysis' },
    { id: 'competitor-analysis', name: 'Competitor Analysis' },
    { id: 'industry-trends', name: 'Industry Trends' },
    { id: 'consumer-insights', name: 'Consumer Insights' }
  ]
};

export const ContentForm: React.FC<ContentFormProps> = ({ 
  onSuccess,
  onResearch,
  isLoadingRedirect = false
}) => {
  const { saveContent } = useContent();
  const { toast } = useToast();
  const { t, language } = useTranslation();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Content form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [platform, setPlatform] = useState('social');
  const [subPlatform, setSubPlatform] = useState(''); // Added for specific platform selection
  const [persona, setPersona] = useState('ariastar');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New fields for research
  const [businessType, setBusinessType] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [audienceNeeds, setAudienceNeeds] = useState('');
  
  // YouTube transcript fields
  const [youtubeTranscript, setYoutubeTranscript] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  
  // Research data
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  
  // In the component, add a new state variable for image analysis
  const [imageAnalysis, setImageAnalysis] = useState<string>('');
  
  // Add YouTube URL state for input
  const [youtubeInputUrl, setYoutubeInputUrl] = useState('');
  
  // Determine content type based on selected platform
  const getContentType = () => {
    return platformToContentType[platform as keyof typeof platformToContentType] || 'article';
  };
  
  // Add the appropriate contextType based on platform
  const getImageContextType = (): 'general' | 'social-media' | 'landing-page' | 'research' => {
    if (platform === 'social') return 'social-media';
    if (platform === 'website' && subPlatform === 'landing-page') return 'landing-page';
    if (platform === 'research-report') return 'research';
    return 'general';
  };
  
  const handleStepChange = async (step: number) => {
    if (step === 2 && !title.trim()) {
      toast({
        title: 'Missing Title',
        description: 'Please enter a title before proceeding to research.',
        variant: 'destructive'
      });
      return;
    }
    
    // Check authentication before proceeding to step 2
    if (step === 2) {
      try {
        // Get current user from auth
        const { auth } = await import('@/lib/firebase/firebase');
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          console.error('User not authenticated. Cannot proceed to research.');
          toast({
            title: 'Authentication Required',
            description: 'Please log in to proceed with content research.',
        variant: 'destructive'
      });
      return;
    }
    
    // If moving to step 2 (Research) and onResearch is provided, use deep research flow
        if (onResearch) {
      const contentDetails = {
        contentType: getContentType(),
        platform,
        subPlatform, // Include the selected sub-platform
        businessType: businessType || 'general',
        researchTopic: title,
        targetAudience: targetAudience || 'general audience',
        audienceNeeds,
        youtubeTranscript, // Add YouTube transcript data
        youtubeUrl, // Add YouTube URL
            userId: currentUser.uid, // Add the user ID for tracking
            isPersonalUseCase: false, // Default value
            language: language // Add the current language from useTranslation
      };
      
          console.log('Sending research request with language:', language);
      onResearch(contentDetails);
      return;
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        toast({
          title: 'Error',
          description: 'Failed to verify authentication status.',
          variant: 'destructive'
        });
        return;
      }
    }
    
    setCurrentStep(step);
  };
  
  // Reset sub-platform when platform changes
  useEffect(() => {
    setSubPlatform('');
  }, [platform]);
  
  const handleNextStep = (e: React.MouseEvent) => {
    // Prevent form submission
    e.preventDefault();
    
    console.log('Next button clicked, current step:', currentStep);
    
    if (currentStep === 1) {
      console.log('Validating before proceeding from step 1');
      if (!isStep1Valid()) {
        console.log('Validation failed, not proceeding to next step');
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields before proceeding.',
          variant: 'destructive'
        });
        return;
      }
    }
    
    if (currentStep < 3) {
      console.log('Proceeding to step:', currentStep + 1);
      handleStepChange(currentStep + 1);
    }
  };
  
  const handlePrevStep = (e: React.MouseEvent) => {
    // Prevent form submission
    e.preventDefault();
    
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleResearchComplete = (data: ResearchData) => {
    setResearchData(data);
  };

  const handleAIGenerate = async () => {
    if (!title || !platform || !persona) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields before generating content.',
        variant: 'destructive'
      });
      return;
    }
    
    // Check if sub-platform is required but not selected
    if (PLATFORM_OPTIONS[platform] && PLATFORM_OPTIONS[platform].length > 0 && !subPlatform) {
      toast({
        title: 'Missing Information',
        description: `Please select a specific ${platform} type before generating content.`,
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare the data for the API call
      const contentType = getContentType();
      const enhancedPrompt = {
        contentType,
        platform,
        subPlatform,
        audience: targetAudience || 'general audience',
        prompt: `Create ${contentType} content about ${title} for ${platform} targeting ${targetAudience || 'general audience'}.`,
        topic: title,
        researchData: researchData?.suggestions || '',
        youtubeTranscript: youtubeTranscript || '',
        youtubeUrl: youtubeUrl || '',
        style: persona,
        language
      };
      
      console.log('Calling Claude API for content generation with the following parameters:', JSON.stringify(enhancedPrompt, null, 2));
      console.log('This is a fully dynamic call with no hard-coded content - your specific input will be used to generate content.');
      
      // Call the Claude API
      const response = await fetch('/api/claude/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedPrompt),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to generate content');
      }
      
      const data = await response.json();
      const generatedContent = data.content;
      
      if (!generatedContent) {
        throw new Error('No content was generated by the API');
      }
      
      setContent(generatedContent);
      
      toast({
        title: 'Content Generated Successfully',
        description: 'Claude 3.7 Sonnet has created dynamic content based on your inputs and research.',
        variant: 'success'
      });
      
      // Move to the final step for editing
      setCurrentStep(3);
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'There was an error generating your content.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTagAdd = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  const handleTagRemove = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Update validation to require subPlatform when available
  const isStep1Valid = () => {
    console.log('Validating step 1:', { title, platform, subPlatform });
    console.log('Platform has sub-options:', PLATFORM_OPTIONS[platform]?.length > 0);
    
    // Basic validation
    if (!title.trim() || !platform.trim()) {
      console.log('Failed basic validation - missing title or platform');
      return false;
    }
    
    // If platform has sub-options, require selection
    if (PLATFORM_OPTIONS[platform] && PLATFORM_OPTIONS[platform].length > 0 && !subPlatform.trim()) {
      console.log('Failed sub-platform validation - platform has options but none selected');
      return false;
    }
    
    console.log('Step 1 validation passed');
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }
    
    // Check if sub-platform is required but not selected
    if (PLATFORM_OPTIONS[platform] && PLATFORM_OPTIONS[platform].length > 0 && !subPlatform) {
      toast({
        title: 'Missing sub-platform',
        description: `Please select a specific ${platform} type.`,
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Saving content with data:', { title, platform, subPlatform, persona, contentType: getContentType() });
      
      // Get current user from auth directly
      const { auth } = await import('@/lib/firebase/firebase');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('You must be logged in to save content. Please log in and try again.');
      }
      
      console.log('Current user from Firebase Auth:', currentUser?.uid);
      
      // Create the content data with explicit user ID from auth
      const contentData = {
        title,
        content,
        tags,
        platform,
        subPlatform, // Include the subPlatform in the saved data
        persona,
        status: 'draft' as const,
        contentType: getContentType(),
        mediaUrls: coverImage ? [coverImage] : [],
        userId: currentUser.uid, // Explicitly set user ID from auth
      };
      
      console.log('Final content data with user ID:', contentData);
      
      // Try saving content with a direct call to Firestore
      try {
        // First try the hook
        console.log('Saving content using useContent hook...');
        const contentId = await saveContent(contentData);
        console.log('Content saved successfully with ID:', contentId);
        
        // Toast for success
        toast({
          title: 'Content created',
          description: 'Your content has been saved successfully with ID: ' + contentId,
          variant: 'success'
        });
      } catch (hookError) {
        console.error('Error saving content through hook:', hookError);
        // If hook fails, try direct Firestore access as fallback
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/firebase');
        
        console.log('Trying direct Firestore save as fallback...');
        const docRef = await addDoc(collection(db, 'content'), {
          ...contentData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log('Content saved directly to Firestore with ID:', docRef.id);
        
        toast({
          title: 'Content created (direct)',
          description: 'Your content has been saved directly to Firestore with ID: ' + docRef.id,
          variant: 'success'
        });
      }
      
      // Reset form
      setTitle('');
      setContent('');
      setTags([]);
      setCoverImage('');
      setCurrentStep(1);
      setResearchData(null);
      
      // Force redirect to dashboard after a slight delay
      setTimeout(() => {
        if (onSuccess) {
          console.log('Redirecting to dashboard...');
          onSuccess();
        } else {
          // If no onSuccess callback, navigate directly to dashboard with a full page reload
          console.log('No onSuccess callback, forcing navigation to dashboard...');
          window.location.href = '/dashboard';
        }
      }, 1000);
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'There was an error saving your content. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle YouTube transcript fetch
  const handleTranscriptFetched = (transcript: string, url: string) => {
    setYoutubeTranscript(transcript);
    setYoutubeUrl(url);
    
    toast({
      title: 'YouTube Transcript Added',
      description: 'The transcript has been successfully added to your research.',
      variant: 'success'
    });
  };
  
  // In the handleImageAnalysis handler
  const handleImageAnalysis = (analysis: string) => {
    setImageAnalysis(analysis);
    
    // Append the analysis to the research data if it's valuable
    if (analysis && analysis.length > 100) {
      const formattedAnalysis = `## Image Analysis\n\n${analysis}`;
      
      // Add the analysis to the research data
      setResearchData(prevData => {
        if (!prevData) {
          // Initialize research data if it doesn't exist
          return {
            trendingTopics: [],
            keyPoints: [`Image Analysis: ${analysis.substring(0, 100)}...`],
            suggestions: formattedAnalysis
          };
        }
        
        // Update existing research data
        return {
          ...prevData,
          keyPoints: [...prevData.keyPoints, `Image Analysis: ${analysis.substring(0, 100)}...`],
          suggestions: prevData.suggestions + '\n\n' + formattedAnalysis
        };
      });
      
      toast({
        title: t('imageAnalysis.added', { defaultValue: 'Image Analysis Added' }),
        description: t('imageAnalysis.addedDesc', { defaultValue: 'Image insights added to your research data' }),
      });
    }
  };
  
  // Add new section for business type and audience to step 1
  const renderStep1ContentExtended = () => (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('createPage.contentTitle', { defaultValue: 'Content Title / Topic' })} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder={t('createPage.titlePlaceholder', { defaultValue: 'Enter a title for your content' })}
          required={currentStep === 3}
          aria-required="true"
        />
      </div>
      
      {/* Business Type */}
      <div>
        <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('createPage.businessType', { defaultValue: 'Topic Area / Industry' })}
        </label>
        <input
          type="text"
          id="businessType"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder={t('createPage.businessTypePlaceholder', { defaultValue: 'E.g., E-commerce, Life Coaching, Fitness Training, AI Development, Personal Hobbies' })}
        />
      </div>
      
      {/* Target Audience */}
      <div>
        <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('createPage.targetAudience', { defaultValue: 'Target Audience' })}
        </label>
        <input
          type="text"
          id="targetAudience"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder={t('createPage.targetAudiencePlaceholder', { defaultValue: 'E.g., Small business owners, Coaching clients, Aspiring entrepreneurs, AI enthusiasts' })}
        />
      </div>
      
      {/* Audience Needs */}
      <div>
        <label htmlFor="audienceNeeds" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('createPage.audienceNeeds', { defaultValue: 'Audience Interests / Pain Points' })}
        </label>
        <textarea
          id="audienceNeeds"
          value={audienceNeeds}
          onChange={(e) => setAudienceNeeds(e.target.value)}
          rows={3}
          className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder={t('createPage.audienceNeedsPlaceholder', { defaultValue: 'What does your audience want to learn, achieve, or overcome? E.g., Learning new skills, Building healthy habits, Implementing AI solutions' })}
        />
      </div>
      
      {/* YouTube Transcript Analysis - Added to initial setup */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
          {t('youtubeTranscript.title', { defaultValue: 'YouTube Transcript Analysis' })}
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
          {t('youtubeTranscript.description', { defaultValue: 'Enhance your research by analyzing an existing YouTube video on this topic.' })}
        </p>
        
        {!youtubeTranscript ? (
          <YouTubeTranscriptInput 
            onTranscriptFetched={handleTranscriptFetched}
            url={youtubeInputUrl}
            onUrlChange={setYoutubeInputUrl}
            transcript=""
            showFullTranscript={false}
            onToggleTranscript={() => {}}
          />
        ) : (
          <div className="mt-2">
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <div className="flex-grow">
                <div className="flex items-center mb-1">
                  <svg className="h-4 w-4 text-green-500 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="text-sm font-medium text-green-800 dark:text-green-300">
                    {t('youtubeTranscript.added', { defaultValue: 'YouTube Transcript Added' })}
                </div>
                </div>
                <div className="text-xs text-green-700 dark:text-green-400 mb-2 ml-5.5 pl-0.5">
                  {youtubeUrl ? (
                    <span>
                      Transcript from <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-800 dark:hover:text-green-200 inline-flex items-center">
                        YouTube
                        <svg className="h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a> will enhance your research
                    </span>
                  ) : (
                    <span>Transcript successfully added to your research</span>
                  )}
                </div>
                <div className="ml-5.5 pl-0.5">
                <button
                  onClick={() => setShowFullTranscript(true)}
                  className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm flex items-center"
                    type="button"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Transcript
                </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setYoutubeTranscript('');
                  setYoutubeUrl('');
                  toast({
                    title: 'Transcript Removed',
                    description: 'The YouTube transcript has been removed from your research.',
                    variant: 'default'
                  });
                }}
                className="text-xs px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md flex-shrink-0 ml-2"
                type="button"
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                Remove
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Image Analysis Panel */}
      {['social', 'website', 'research-report', 'blog'].includes(platform) && (
        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg">
          <ImageAnalysisPanel 
            contextType={getImageContextType()}
            onAnalysisComplete={handleImageAnalysis}
            startCollapsed={Boolean(researchData) || currentStep === 3} // Collapsed when on research or content generation step (step 3)
          />
        </div>
      )}
      
      {/* Platform Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Platform <span className="text-red-500">*</span>
        </label>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.keys(platformToContentType).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPlatform(key)}
              className={`py-3 px-4 border-2 rounded-lg text-center font-medium transition-colors duration-200 ${
                platform === key
                  ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:border-gray-600'
              }`}
            >
              {t(`platformOptions.${key}`, { defaultValue: key.charAt(0).toUpperCase() + key.slice(1) })}
            </button>
          ))}
        </div>
        
        {/* Information panel for main platform selection */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <p>{t('createPage.platformSection.info', { defaultValue: 'Select the primary platform for your content. This will determine the appropriate content format and optimization.' })}</p>
        </div>
        
        {/* Add Sub-Platform Selection */}
        {platform && PLATFORM_OPTIONS[platform] && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('createPage.subPlatformSection.title', { defaultValue: 'Choose Specific' })} {t(`platformOptions.${platform}`, { defaultValue: platform.charAt(0).toUpperCase() + platform.slice(1) })}
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PLATFORM_OPTIONS[platform].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSubPlatform(option.id)}
                  className={`py-3 px-4 border-2 rounded-lg text-center font-medium transition-colors duration-200 ${
                    subPlatform === option.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  {t(`subPlatformOptions.${option.id}`, { defaultValue: option.name })}
                </button>
              ))}
            </div>
          </div>
        )}
        </div>
    </div>
  );
  
  return (
    <div className="w-full max-w-4xl mx-auto rounded-lg bg-white shadow-sm p-6 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('createPage.title', { defaultValue: 'Create Content' })}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('createPage.subtitle', { defaultValue: 'Start by telling us about the content you want to create.' })}
        </p>
      </div>
      
      <ContentCreationSteps 
        currentStep={currentStep} 
        onStepChange={handleStepChange} 
      />
      
      <form 
        onSubmit={handleSubmit} 
        className="space-y-8"
        noValidate={currentStep !== 3} // Disable default HTML validation until the final step
      >
        {/* Step 1: Content Setup */}
        {currentStep === 1 && renderStep1ContentExtended()}

        {/* Step 2: Research - Modified for redirection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {isLoadingRedirect ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
                <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
                  Redirecting to research page...
                </p>
              </div>
            ) : (
              <>
                <ResearchPanel 
                  contentType={getContentType()}
                  platform={platform}
                  title={title}
                  onResearchComplete={handleResearchComplete}
                />
                
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleAIGenerate}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Generating...' : 'Generate Content with AI'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Generate Content */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="Write your content here..."
                required
              />
            </div>
            
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tags
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTagAdd();
                    }
                  }}
                  className="flex-1 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="Add tags..."
                />
                <button
                  type="button"
                  onClick={handleTagAdd}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Add
                </button>
              </div>
              
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleTagRemove(tag)}
                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
                      >
                        <span className="sr-only">Remove tag</span>
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Navigation buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1 || isSubmitting}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md shadow-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={isSubmitting || isLoadingRedirect || (currentStep === 1 && !isStep1Valid())}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <div className="mt-8 flex justify-end">
            <button
              type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <span className="animate-spin">⏳</span>
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <>
                    Start Research
                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
            </button>
            </div>
          )}
        </div>
      </form>

      {/* Transcript Modal - Adding back the missing modal */}
      {showFullTranscript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
                YouTube Transcript
              </h3>
              <button
                onClick={() => setShowFullTranscript(false)}
                className="text-gray-500 hover:text-gray-700"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-grow">
              <div className="text-sm mb-3 bg-gray-50 dark:bg-gray-700 p-2 rounded-md flex items-center">
                <span className="font-medium mr-1">Source:</span> 
                <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1 flex items-center">
                  {youtubeUrl}
                  <svg className="h-3.5 w-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700 text-sm whitespace-pre-wrap max-h-full overflow-y-auto shadow-inner">
                {youtubeTranscript}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowFullTranscript(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 flex items-center"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 
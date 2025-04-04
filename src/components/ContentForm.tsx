"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import WebsiteAnalysis from '@/app/components/WebsiteAnalysis';
import DocumentAnalysis, { DocumentAnalysisResult } from './DocumentAnalysis';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { platformToContentType, subPlatformToContentType, getContentTypeFromPlatform } from '@/app/lib/contentTypeDetection';
import { BiWorld } from 'react-icons/bi';

interface ContentFormProps {
  onSuccess?: () => void;
  onResearch?: (contentDetails: any) => void;
  isLoadingRedirect?: boolean;
}

export const ContentForm: React.FC<ContentFormProps> = ({ 
  onSuccess,
  onResearch,
  isLoadingRedirect = false
}) => {
  const { saveContent } = useContent();
  const toast = useToast();
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
  
  // Document analysis fields
  const [documentContent, setDocumentContent] = useState<DocumentAnalysisResult | null>(null);
  const [showFullDocument, setShowFullDocument] = useState(false);
  
  // Research data
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  
  // In the component, add a new state variable for image analysis
  const [imageAnalysis, setImageAnalysis] = useState<string>('');
  
  // Add a state for tracking which platform is currently expanded
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  
  // Platform specific options with translations
  const PLATFORM_OPTIONS: Record<string, Array<{id: string, name: string}>> = useMemo(() => ({
    'social': [
      { id: 'facebook', name: t('subPlatformOptions.facebook', { defaultValue: 'Facebook' }) },
      { id: 'instagram', name: t('subPlatformOptions.instagram', { defaultValue: 'Instagram' }) },
      { id: 'twitter', name: t('subPlatformOptions.twitter', { defaultValue: 'Twitter' }) },
      { id: 'linkedin', name: t('subPlatformOptions.linkedin', { defaultValue: 'LinkedIn' }) },
      { id: 'tiktok', name: t('subPlatformOptions.tiktok', { defaultValue: 'TikTok' }) }
    ],
    'blog': [
      { id: 'company-blog', name: t('subPlatformOptions.company-blog', { defaultValue: 'Company Blog' }) },
      { id: 'medium', name: t('platforms.medium', { defaultValue: 'Medium' }) },
      { id: 'wordpress', name: t('subPlatformOptions.wordpress', { defaultValue: 'WordPress' }) }
    ],
    'email': [
      { id: 'newsletter', name: t('subPlatformOptions.newsletter', { defaultValue: 'Newsletter' }) },
      { id: 'marketing', name: t('subPlatformOptions.marketing', { defaultValue: 'Marketing Email' }) },
      { id: 'sales', name: t('subPlatformOptions.sales', { defaultValue: 'Sales Email' }) },
      { id: 'welcome', name: t('subPlatformOptions.welcome', { defaultValue: 'Welcome Email' }) }
    ],
    'video-script': [
      { id: 'explainer', name: t('subPlatformOptions.explainer', { defaultValue: 'Explainer Video' }) },
      { id: 'advertisement', name: t('subPlatformOptions.advertisement', { defaultValue: 'Advertisement' }) },
      { id: 'tutorial', name: t('subPlatformOptions.tutorial', { defaultValue: 'Tutorial' }) },
      { id: 'product-demo', name: t('subPlatformOptions.product-demo', { defaultValue: 'Product Demo' }) }
    ],
    'youtube': [
      { id: 'educational', name: t('subPlatformOptions.educational', { defaultValue: 'Educational' }) },
      { id: 'entertainment', name: t('subPlatformOptions.entertainment', { defaultValue: 'Entertainment' }) },
      { id: 'review', name: t('subPlatformOptions.review', { defaultValue: 'Review' }) },
      { id: 'vlog-style', name: t('subPlatformOptions.vlog-style', { defaultValue: 'Vlog' }) },
      { id: 'travel', name: t('subPlatformOptions.travel', { defaultValue: 'Travel Vlog' }) },
      { id: 'daily', name: t('subPlatformOptions.daily', { defaultValue: 'Daily Vlog' }) },
      { id: 'tutorial-vlog', name: t('subPlatformOptions.tutorial-vlog', { defaultValue: 'Tutorial Vlog' }) }
    ],
    'podcast': [
      { id: 'interview', name: t('subPlatformOptions.interview', { defaultValue: 'Interview' }) },
      { id: 'solo', name: t('subPlatformOptions.solo', { defaultValue: 'Solo Episode' }) },
      { id: 'panel', name: t('subPlatformOptions.panel', { defaultValue: 'Panel Discussion' }) }
    ],
    'presentation': [
      { id: 'business', name: t('subPlatformOptions.business', { defaultValue: 'Business Presentation' }) },
      { id: 'executive', name: t('subPlatformOptions.executive', { defaultValue: 'Executive Summary' }) },
      { id: 'sales-presentation', name: t('subPlatformOptions.sales-presentation', { defaultValue: 'Sales Presentation' }) },
      { id: 'training', name: t('subPlatformOptions.training', { defaultValue: 'Training Material' }) },
      { id: 'investor', name: t('subPlatformOptions.investor', { defaultValue: 'Investor Pitch' }) }
    ],
    'google-ads': [
      { id: 'search-ads', name: t('subPlatformOptions.search-ads', { defaultValue: 'Search Ads' }) },
      { id: 'display-ads', name: t('subPlatformOptions.display-ads', { defaultValue: 'Display Ads' }) },
      { id: 'video-ads', name: t('subPlatformOptions.video-ads', { defaultValue: 'Video Ads' }) },
      { id: 'shopping-ads', name: t('subPlatformOptions.shopping-ads', { defaultValue: 'Shopping Ads' }) }
    ],
    'research-report': [
      { id: 'market-analysis', name: t('subPlatformOptions.market-analysis', { defaultValue: 'Market Analysis' }) },
      { id: 'competitor-analysis', name: t('subPlatformOptions.competitor-analysis', { defaultValue: 'Competitor Analysis' }) },
      { id: 'industry-trends', name: t('subPlatformOptions.industry-trends', { defaultValue: 'Industry Trends' }) },
      { id: 'consumer-insights', name: t('subPlatformOptions.consumer-insights', { defaultValue: 'Consumer Insights' }) }
    ]
  }), [t, language]);
  
  // Add a new state variable for storing website content
  const [websiteContent, setWebsiteContent] = useState<any>(null);
  
  // Determine content type based on selected platform
  const getContentType = () => {
    // If we have a subPlatform selected, use the mapped content type
    if (subPlatform && subPlatformToContentType[subPlatform]) {
      return subPlatformToContentType[subPlatform];
    }
    
    // If we have a subPlatform but no specific mapping, create a composite content type
    if (subPlatform) {
      if (platform === 'social') {
        return `social-${subPlatform}`;
      } else if (platform === 'email') {
        return `${subPlatform}-email`;
      } else if (platform === 'video-script') {
        return `${subPlatform}-video-script`;
      } else {
        return `${subPlatform}-${getContentTypeFromPlatform(platform) || ''}`;
      }
    }
    
    // Fall back to the standard platform-based content type
    return getContentTypeFromPlatform(platform) || 'article';
  };
  
  // Add the appropriate contextType based on platform
  const getImageContextType = (): 'general' | 'social-media' | 'landing-page' | 'research' => {
    if (platform === 'social' || 
        platform === 'youtube' || 
        platform === 'tiktok' ||
        platform === 'instagram' ||
        platform === 'linkedin' ||
        platform === 'twitter' ||
        platform === 'facebook') {
      return 'social-media';
    }
    if (platform === 'landing-page' || platform === 'website') return 'landing-page';
    if (platform === 'research-report') return 'research';
    return 'general';
  };
  
  const handleStepChange = async (step: number) => {
    if (step === 2 && !title.trim()) {
      safeToast('Please enter a title before proceeding to research.', 'error');
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
          safeToast('Please log in to proceed with content research.', 'error');
          return;
        }
        
        // If moving to step 2 (Research) and onResearch is provided, use deep research flow
        if (onResearch) {
          const contentType = getContentType();
          
          const contentDetails = {
            contentType: contentType,
            platform: platform, // Keep the main platform for categorization
            subPlatform: subPlatform, // Include subPlatform separately
            businessType: businessType || 'general',
            researchTopic: title,
            targetAudience: targetAudience || 'general audience',
            audienceNeeds,
            youtubeTranscript,
            youtubeUrl,
            userId: currentUser.uid,
            isPersonalUseCase: false,
            language: language,
            websiteContent,
            documentContent // Add document content to research data
          };
          
          console.log('Sending research request with details:', {
            contentType,
            platform,
            subPlatform,
            hasWebsiteContent: !!websiteContent
          });
          console.log('Sending research request with language:', language);
          onResearch(contentDetails);
          
          // Store content details in session storage for reference
          sessionStorage.setItem('contentDetails', JSON.stringify(contentDetails));
          
          return;
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        safeToast('Failed to verify authentication status.', 'error');
        return;
      }
    }
    
    setCurrentStep(step);
  };
  
  // Reset sub-platform when platform changes
  useEffect(() => {
    setSubPlatform('');
  }, [platform]);
  
  const handleNextStep = () => {
    console.log('Next button clicked, current step:', currentStep);
    
    if (currentStep === 1) {
      console.log('Validating before proceeding from step 1');
      if (!isStep1Valid()) {
        console.log('Validation failed, not proceeding to next step');
        safeToast('Please fill in all required fields before proceeding.', 'error');
        return;
      }
    }
    
    if (currentStep < 3) {
      console.log('Proceeding to step:', currentStep + 1);
      handleStepChange(currentStep + 1);
    }
  };
  
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleResearchComplete = (data: ResearchData) => {
    setResearchData(data);
  };

  const handleAIGenerate = async () => {
    if (!title || !platform || !persona) {
      safeToast('Please fill in all required fields before generating content.', 'error');
      return;
    }
    
    // Check if sub-platform is required but not selected
    if (PLATFORM_OPTIONS[platform] && PLATFORM_OPTIONS[platform].length > 0 && !subPlatform) {
      safeToast(`Please select a specific ${platform} type before generating content.`, 'error');
      return;
    }
    
    // In a real implementation, this would call an AI service
    // For now, we'll simulate an AI response
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const selectedTopics = researchData?.trendingTopics.slice(0, 2) || [];
      const keyPoints = researchData?.keyPoints || [];
      const contentType = getContentType();
      
      // Create content details object with proper content type
      const contentDetails = {
        title,
        platform,
        subPlatform,
        contentType,
        targetAudience: targetAudience || 'General audience',
        businessType: businessType || '',
        persona
      };
      
      // Store the content details in session storage for future reference
      sessionStorage.setItem('contentDetails', JSON.stringify(contentDetails));
      console.log('Generated content with details:', contentDetails);
      
      // Generate placeholder content based on inputs and persona
      let personaIntro = '';
      
      // Rich personas get more specialized intros
      switch (persona) {
        case 'ariastar':
          personaIntro = "Hey there friend! It's AriaStar here, and I'm SO excited to chat with you about " + title + ". This is something I've been really diving into lately, and I can't wait to share what I've learned with you!";
          break;
        case 'specialist_mentor':
          personaIntro = "As someone who's dedicated years to mastering this domain, I want to share with you the critical insights about " + title + ". My goal is to distill the most important concepts in a way that accelerates your own journey.";
          break;
        case 'ai_collaborator':
          personaIntro = "Working together, humans and AI can achieve remarkable outcomes. Today, I'd like to explore " + title + " through this collaborative lens, highlighting how our combined perspectives yield superior results.";
          break;
        case 'sustainable_advocate':
          personaIntro = "Living sustainably isn't just a choice—it's a responsibility to our planet. In exploring " + title + ", I want to highlight the eco-conscious approaches that make a genuine difference for our collective future.";
          break;
        case 'data_visualizer':
          personaIntro = "When we look at the data behind " + title + ", fascinating patterns emerge. Let's explore the numbers, trends, and visual insights that tell a compelling story about this topic.";
          break;
        case 'multiverse_curator':
          personaIntro = "Imagine experiencing " + title + " across multiple dimensions and perspectives. Today, we'll journey through different viewpoints and alternate approaches to gain a holistic understanding.";
          break;
        case 'ethical_tech':
          personaIntro = "Technology should serve humanity, not the other way around. Let's examine " + title + " through an ethical lens, considering the human impact and moral implications of these developments.";
          break;
        case 'niche_community':
          personaIntro = "Within our community of passionate enthusiasts, " + title + " has sparked meaningful conversations. I'll share insights from our collective wisdom and the unique perspectives we've developed together.";
          break;
        case 'synthesis_maker':
          personaIntro = "By connecting seemingly disparate ideas about " + title + ", we can discover profound insights. Today, I'll synthesize multiple viewpoints to create a more complete understanding of this complex topic.";
          break;
        case 'professional':
          personaIntro = "In today's professional analysis, we'll examine the key aspects of " + title + " and their implications for stakeholders.";
          break;
        case 'casual':
          personaIntro = "Let's chat about " + title + " in a straightforward way that makes it easy to understand and apply.";
          break;
        case 'technical':
          personaIntro = "This technical breakdown of " + title + " will provide a detailed analysis of the components, methodologies, and implementation strategies.";
          break;
        case 'educational':
          personaIntro = "Today's lesson on " + title + " will cover fundamental concepts, practical applications, and assessment of understanding.";
          break;
        case 'entertaining':
          personaIntro = "Get ready for an exciting journey through the world of " + title + " that will captivate your attention from start to finish!";
          break;
        case 'promotional':
          personaIntro = "Discover how " + title + " can transform your results with these game-changing insights and strategies.";
          break;
        default: // general
          personaIntro = "In this overview of " + title + ", we'll explore the key aspects and relevant insights.";
          break;
      }
      
      // Generate placeholder content based on inputs and persona
      let generatedContent = `# ${title}\n\n## Introduction\n${personaIntro}\n\n`;
      
      if (selectedTopics.length > 0) {
        generatedContent += `## Trending Topics Covered\n${selectedTopics.map(topic => `- ${topic}`).join('\n')}\n\n`;
      }
      
      if (keyPoints.length > 0) {
        generatedContent += `## Key Points\n${keyPoints.map(point => `- ${point}`).join('\n')}\n\n`;
      }
      
      // Special handling for video content types
      if (platform === 'youtube' || platform === 'video-script' || platform === 'vlog') {
        generatedContent += `## Video Script\n`;
        
        // Add persona-specific video intro
        switch (persona) {
          case 'ariastar':
            generatedContent += `[OPENING SCENE - Friendly, casual setting with good lighting]\n`;
            generatedContent += `Hey there, welcome back to the channel! *waves enthusiastically* I'm so excited to chat with you today about ${title}!\n\n`;
            break;
          case 'specialist_mentor':
            generatedContent += `[OPENING SCENE - Professional setting with credentials visible in background]\n`;
            generatedContent += `Welcome, aspiring experts. Today, we're diving deep into ${title} - an area I've spent over a decade mastering.\n\n`;
            break;
          case 'data_visualizer':
            generatedContent += `[OPENING SCENE - Clean, minimal setting with data visualization on screen]\n`;
            generatedContent += `When we analyze the data on ${title}, some fascinating patterns emerge. Let me show you...\n\n`;
            break;
          default:
            generatedContent += `[OPENING SCENE]\n`;
            generatedContent += `Hello everyone, welcome to this ${persona} video about ${title}. Today we'll be covering some key insights on this topic.\n\n`;
        }
        
        generatedContent += `[MAIN CONTENT]\nLet's dive into the main points:\n${keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}\n\n`;
        
        // Add persona-specific closing
        switch (persona) {
          case 'ariastar':
            generatedContent += `[CLOSING - Close-up, warm smile]\nThanks SO much for watching, friends! If you found this helpful, smash that like button and subscribe to join our amazing community! Drop your thoughts in the comments - I read every single one and love hearing from you! See you in the next video! ✌️\n`;
            break;
          case 'specialist_mentor':
            generatedContent += `[CLOSING - Professional posture, direct eye contact]\nAs you implement these strategies, remember that mastery comes through consistent application. If you'd like to deepen your expertise, subscribe for weekly advanced content. Until next time, keep pursuing excellence.\n`;
            break;
          case 'ethical_tech':
            generatedContent += `[CLOSING - Thoughtful expression, subtle environment]\nAs we navigate these technological developments, let's remember to prioritize human well-being and ethical considerations. I'd appreciate hearing your perspectives in the comments. If this resonated with you, consider subscribing for more balanced tech analysis.\n`;
            break;
          default:
            generatedContent += `[CLOSING]\nThanks for watching! Don't forget to like and subscribe for more content like this.\n`;
        }
      } else {
        // Non-video content
        generatedContent += `## Main Content\n`;
        
        // Add persona-specific main content
        switch (persona) {
          case 'ariastar':
            generatedContent += `I've got to tell you, when I first started learning about ${title}, I was totally overwhelmed! But after breaking it down and testing different approaches (with plenty of fails along the way, trust me!), I've discovered some game-changing insights that I just HAVE to share with you.\n\n`;
            generatedContent += `Here's what really made a difference for me:\n\n`;
            keyPoints.forEach(point => generatedContent += `**${point}** - I found this particularly helpful when I was struggling with understanding the basics. It really clicked when I applied it to my own situation!\n\n`);
            generatedContent += `The thing I love most about this topic is how it connects to real life. It's not just theory - it's something you can use TODAY to make a difference.\n\n`;
            break;
          case 'data_visualizer':
            generatedContent += `When we analyze the metrics surrounding ${title}, we uncover revealing patterns that inform our approach. The quantitative evidence suggests several key trends:\n\n`;
            generatedContent += `\`\`\`\nData Snapshot: ${title}\n-----------------------\n`;
            keyPoints.forEach((point, idx) => generatedContent += `Factor ${idx + 1}: ${point} - Impact rating: ${Math.floor(Math.random() * 5) + 6}/10\n`);
            generatedContent += `\`\`\`\n\n`;
            generatedContent += `These data points reveal a clear correlation between implementation strategies and outcome efficacy. The visualization below conceptualizes this relationship:\n\n`;
            generatedContent += `[Data Visualization Placeholder: Relationship between implementation factors and success metrics for ${title}]\n\n`;
            break;
          default:
            generatedContent += `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam eget felis eget urna ultricies tincidunt. Vestibulum tincidunt est vel mauris facilisis, vel aliquam ipsum pulvinar. Proin euismod, urna vel tincidunt ultricies, nunc justo ultricies nunc, vel tincidunt nisl nunc vel eros.\n\n`;
        }
        
        // Add persona-specific conclusion
        generatedContent += `## Conclusion\n`;
        switch (persona) {
          case 'ariastar':
            generatedContent += `I hope these tips help you as much as they've helped me! Remember, we're all on this journey together, and it's totally okay to make mistakes along the way. That's how we learn and grow! Let me know in the comments if you have any questions or if you've tried any of these approaches yourself. I always love hearing from you! ✨\n`;
            break;
          case 'specialist_mentor':
            generatedContent += `As you implement these expert-level strategies, remember that mastery comes through deliberate practice and iterative refinement. The frameworks presented here have been battle-tested across numerous scenarios, but your unique application will undoubtedly generate valuable insights. Continue to build upon this foundation with disciplined execution, and you'll achieve the superior results that separate leaders from followers in this domain.\n`;
            break;
          case 'ethical_tech':
            generatedContent += `As we navigate the implications of ${title}, let us remember that technology should serve humanity's best interests. The ethical considerations outlined above aren't merely philosophical exercises—they're essential guardrails that ensure our innovations contribute to a more equitable and compassionate world. By maintaining this ethical lens, we can harness the power of technology while preserving our shared values and human dignity.\n`;
            break;
          default:
            generatedContent += `Thank you for reading this AI-generated content. Feel free to edit and enhance it to better match your needs.\n`;
        }
      }
      
      setContent(generatedContent);
      
      safeToast('AI has created content based on your inputs and research.', 'success');
      
      // Move to the final step for editing
      setCurrentStep(3);
    } catch (error) {
      safeToast('There was an error generating your content.', 'error');
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
      safeToast('Please fill in all required fields.', 'error');
      return;
    }
    
    // Check if sub-platform is required but not selected
    if (PLATFORM_OPTIONS[platform] && PLATFORM_OPTIONS[platform].length > 0 && !subPlatform) {
      safeToast(`Please select a specific ${platform} type.`, 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const contentType = getContentType();
      console.log('Saving content with data:', { title, platform, subPlatform, persona, contentType });
      
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
        // Use the platform and subPlatform consistently
        platform: platform,
        subPlatform: subPlatform, // Keep the subPlatform for reference
        persona,
        status: 'draft' as const,
        contentType: contentType,
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
        safeToast('Your content has been saved successfully with ID: ' + contentId, 'success');
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
        
        safeToast('Your content has been saved directly to Firestore with ID: ' + docRef.id, 'success');
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
      safeToast('There was an error saving your content. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle YouTube transcript fetch
  const handleTranscriptFetched = (transcript: string, url: string) => {
    setYoutubeTranscript(transcript);
    setYoutubeUrl(url);
    
    safeToast('YouTube transcript added', 'success');
  };
  
  // In the handleImageAnalysis handler
  const handleImageAnalysis = (analysis: string) => {
    setImageAnalysis(analysis);
    
    // Append the analysis to the research data if it's valuable
    if (analysis && analysis.length > 100) {
      const formattedAnalysis = `## Image Analysis\n\n${analysis}`;
      safeToast('Image analysis added', 'success');
      
      // Store the analysis in sessionStorage for use in research instead of redirecting
      try {
        const existingDetails = sessionStorage.getItem('contentDetails');
        if (existingDetails) {
          const details = JSON.parse(existingDetails);
          details.imageAnalysis = analysis;
          details.source = 'imageAnalysis'; // Mark the source to prevent redirection
          sessionStorage.setItem('contentDetails', JSON.stringify(details));
          console.log('Updated content details with image analysis, marked as imageAnalysis source');
          
          // Also call onResearch in this case
          if (onResearch) {
            console.log('Calling onResearch with imageAnalysis source (existing details)');
            const contentDetails = {
              imageAnalysis: analysis,
              source: 'imageAnalysis', // Mark the source to prevent redirection
              platform: platform,
              subPlatform: subPlatform,
              researchTopic: title || 'Image Analysis',
              language
            };
            onResearch(contentDetails);
          }
        } else {
          // Create new content details if none exist
          const newDetails = {
            imageAnalysis: analysis,
            source: 'imageAnalysis' // Mark the source to prevent redirection
          };
          sessionStorage.setItem('contentDetails', JSON.stringify(newDetails));
          
          // Also call onResearch in this case
          if (onResearch) {
            console.log('Calling onResearch with imageAnalysis source (new details)');
            const contentDetails = {
              imageAnalysis: analysis,
              source: 'imageAnalysis', // Mark the source to prevent redirection
              platform: platform,
              subPlatform: subPlatform,
              researchTopic: title || 'Image Analysis',
              language
            };
            onResearch(contentDetails);
          }
        }
      } catch (error) {
        console.error('Error storing image analysis:', error);
      }
    }
    
    // Important: Do NOT navigate away from the current page
    // The issue was caused by automatically advancing to the follow-up page
  };
  
  // Add logging when subPlatform is selected
  const handleSubPlatformSelect = (subPlatformId: string) => {
    console.log(`Sub-platform selected: ${subPlatformId} for main platform: ${platform}`);
    setSubPlatform(subPlatformId);
    
    // Store the main platform (parent) and subplatform
    sessionStorage.setItem('selectedPlatform', platform);
    sessionStorage.setItem('selectedSubPlatform', subPlatformId);
    
    // Derive the proper content type based on platform and subplatform
    let derivedContentType = '';
    
    if (platform === 'social') {
      derivedContentType = `social-${subPlatformId}`;
    } else if (platform === 'email') {
      derivedContentType = `${subPlatformId}-email`;
    } else if (platform === 'blog') {
      derivedContentType = `${subPlatformId}`;
    } else if (platform === 'video-script') {
      derivedContentType = `${subPlatformId}-video-script`;
    } else {
      derivedContentType = `${subPlatformId}-${getContentTypeFromPlatform(platform) || ''}`;
    }
    
    // Store the derived content type
    sessionStorage.setItem('derivedContentType', derivedContentType);
    sessionStorage.setItem('contentType', derivedContentType);
    
    // For platform-specific handling
    if (platform === 'youtube') {
      console.log(`YouTube subplatform selected: ${subPlatformId}`);
      // Set a special flag to indicate this is a YouTube subplatform
      sessionStorage.setItem('parentPlatform', 'youtube');
      
      // Store the content details with the correct parent platform
      try {
        const existingDetails = sessionStorage.getItem('contentDetails');
        if (existingDetails) {
          const details = JSON.parse(existingDetails);
          details.platform = 'youtube'; // Force the main platform to be YouTube
          details.subPlatform = subPlatformId; // Store the selected subplatform
          details.parentPlatform = 'youtube'; // Explicit parent tracking
          details.contentType = derivedContentType; // Store the derived content type
          sessionStorage.setItem('contentDetails', JSON.stringify(details));
          console.log('Updated content details with YouTube parent platform');
        }
      } catch (error) {
        console.error('Error updating content details:', error);
      }
    }
  };

  // Function to toggle platform expansion state
  const togglePlatformExpansion = (platformId: string) => {
    // If clicking on already expanded platform, collapse it
    if (expandedPlatform === platformId) {
      setExpandedPlatform(null);
    } else {
      // Expand the clicked platform
      setExpandedPlatform(platformId);
      setPlatform(platformId);
      
      // Clear any previously selected sub-platform
      setSubPlatform('');
      
      // Store main platform in session storage (clear subPlatform)
      sessionStorage.setItem('selectedPlatform', platformId);
      sessionStorage.removeItem('selectedSubPlatform');
      
      // Reset the content type to the base platform type
      const baseContentType = getContentTypeFromPlatform(platformId) || 'article';
      sessionStorage.setItem('contentType', baseContentType);
      console.log(`Platform changed to ${platformId}, reset content type to ${baseContentType}`);
    }
  };

  // Replace the platform selection grid with the new stacked expandable UI
  const renderPlatformSelection = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow transition-all duration-300 p-5">
      <label className="block text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
        {t('createPage.platformSectionTitle', { defaultValue: 'Select your target platform' })} <span className="text-red-500">*</span>
      </label>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('createPage.platformSection.info', { defaultValue: 'Select the primary platform for your content. This will determine the appropriate content format and optimization.' })}
      </p>
      
      <div className="mt-4 space-y-3">
        {Object.keys(platformToContentType).map((key) => (
          <div key={key} className="border rounded-xl overflow-hidden transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600">
            <div 
              className={`relative p-4 flex justify-between items-center cursor-pointer transition-all duration-300 ${
                expandedPlatform === key 
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-900/30 dark:to-indigo-900/30 dark:border-blue-700' 
                  : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750'
              }`}
              onClick={() => togglePlatformExpansion(key)}
            >
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 transition-all duration-300 ${
                  expandedPlatform === key 
                    ? 'bg-blue-100 dark:bg-blue-800/50' 
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {getPlatformIcon(key)}
                </div>
                <div className="font-medium">
                  {getPlatformDisplayName(key)}
                </div>
              </div>
              <div className={`text-sm transition-transform duration-300 ${expandedPlatform === key ? 'rotate-180 text-blue-500' : 'text-gray-400'}`}>▼</div>
              
              {/* Subtle line at bottom when expanded */}
              {expandedPlatform === key && (
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200 dark:via-blue-700 to-transparent"></div>
              )}
            </div>
            
            {/* Expandable section with sub-platform options */}
            {expandedPlatform === key && (
              <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 p-4">
                {PLATFORM_OPTIONS[key] && PLATFORM_OPTIONS[key].length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t('createPage.subPlatformSection.title', { defaultValue: 'Choose Specific' })}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {PLATFORM_OPTIONS[key].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => handleSubPlatformSelect(option.id)}
                          className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                            subPlatform === option.id
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-650'
                          }`}
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No specific options available for this platform
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
  
  // Helper function to get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'social':
        return <span className="text-blue-500 dark:text-blue-400">🌐</span>;
      case 'blog':
        return <span className="text-green-500 dark:text-green-400">📝</span>;
      case 'email':
        return <span className="text-yellow-500 dark:text-yellow-400">✉️</span>;
      case 'youtube':
        return <span className="text-red-500 dark:text-red-400">🎥</span>;
      case 'video-script':
        return <span className="text-purple-500 dark:text-purple-400">🎬</span>;
      case 'podcast':
        return <span className="text-indigo-500 dark:text-indigo-400">🎙️</span>;
      case 'presentation':
        return <span className="text-orange-500 dark:text-orange-400">📊</span>;
      case 'google-ads':
        return <span className="text-blue-500 dark:text-blue-400">🔍</span>;
      case 'research-report':
        return <span className="text-teal-500 dark:text-teal-400">📊</span>;
      default:
        return <span className="text-gray-500">📄</span>;
    }
  };
  
  const renderStep1ContentExtended = () => (
    <div className="space-y-6">
      {/* Platform Selection - Moved to the top for better UX */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow transition-all duration-300 p-5">
        <label className="block text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
          {t('createPage.platformSection.title')} <span className="text-red-500">*</span>
        </label>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('createPage.platformSection.info')}
        </p>
        
        <div className="mt-4 space-y-3">
          {Object.keys(platformToContentType).map((key) => (
            <div key={key} className="border rounded-xl overflow-hidden transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600">
              <div 
                className={`relative p-4 flex justify-between items-center cursor-pointer transition-all duration-300 ${
                  expandedPlatform === key 
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-900/30 dark:to-indigo-900/30 dark:border-blue-700' 
                    : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750'
                }`}
                onClick={() => togglePlatformExpansion(key)}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 transition-all duration-300 ${
                    expandedPlatform === key 
                      ? 'bg-blue-100 dark:bg-blue-800/50' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {getPlatformIcon(key)}
                  </div>
                  <div className="font-medium">
                    {t(`platformOptions.${key}`, { defaultValue: key.charAt(0).toUpperCase() + key.slice(1).replace('-', ' ') })}
                  </div>
                </div>
                <div className={`text-sm transition-transform duration-300 ${expandedPlatform === key ? 'rotate-180 text-blue-500' : 'text-gray-400'}`}>▼</div>
                
                {/* Subtle line at bottom when expanded */}
                {expandedPlatform === key && (
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200 dark:via-blue-700 to-transparent"></div>
                )}
              </div>
              
              {expandedPlatform === key && PLATFORM_OPTIONS[key] && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-2">
                    {PLATFORM_OPTIONS[key].map((option) => (
                      <div
                        key={option.id}
                        className={`p-3 border rounded-lg text-center cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${
                          subPlatform === option.id 
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-sm dark:from-blue-900/40 dark:to-indigo-900/40 dark:border-blue-600' 
                            : 'bg-white hover:bg-gray-50 border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 dark:border-gray-700'
                        }`}
                        onClick={() => handleSubPlatformSelect(option.id)}
                      >
                        {t(`subPlatformOptions.${option.id}`, { defaultValue: option.name })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Content Title - Moved after platform selection */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-5">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-full">
            <span className="text-blue-500 dark:text-blue-400">📝</span>
          </div>
          {t('createPage.contentTitle')}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('createPage.contentTitle')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder={t('createPage.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          
          {/* Topic Area / Industry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('createPage.businessType')}
            </label>
            <input
              type="text"
              placeholder={t('createPage.businessTypePlaceholder')}
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Audience Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-5">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-full">
            <span className="text-green-500 dark:text-green-400">👥</span>
          </div>
          {t('createPage.audienceSection.title')}
        </h3>
        
        <div className="space-y-4">
          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('createPage.targetAudience')}
            </label>
            <input
              type="text"
              placeholder={t('createPage.targetAudiencePlaceholder')}
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          
          {/* Audience Interests / Pain Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('createPage.audienceNeeds')}
            </label>
            <textarea
              placeholder={t('createPage.audienceNeedsPlaceholder')}
              value={audienceNeeds}
              onChange={(e) => setAudienceNeeds(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Content Analysis Tools */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-5">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-full">
            <span className="text-purple-500 dark:text-purple-400">🔍</span>
          </div>
          {t('createPage.contentAnalysisTitle')}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          {t('createPage.contentAnalysisDescription')}
        </p>

        {/* YouTube Transcript Analysis */}
        <div className="mb-8">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
              <span className="text-red-500 dark:text-red-400 text-sm">🎥</span>
            </div>
            {t('createPage.youtubeTranscriptTitle')}
          </h4>
          <YouTubeTranscriptInput 
            onTranscriptFetched={handleTranscriptFetched}
            url={youtubeUrl}
            onUrlChange={setYoutubeUrl}
            transcript={youtubeTranscript}
            showFullTranscript={showFullTranscript}
            onToggleTranscript={() => setShowFullTranscript(!showFullTranscript)}
          />
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>
        
        {/* Document Analysis */}
        <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg mt-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-500" />
            {t('createPage.documentAnalysisTitle', { defaultValue: 'Document Analysis' })}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {t('createPage.documentAnalysisDescription', { defaultValue: 'Upload documents (PDF, Word, Excel, Text) to analyze and use in your research.' })}
          </p>
          
          <DocumentAnalysis onDocumentAnalyzed={handleDocumentAnalyzed} />
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>
        
        {/* Website Analysis */}
        <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg mt-6">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <BiWorld className="mr-2" />
            {t('platformOptions.website', { defaultValue: 'Website Analysis' })}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('websiteAnalysis.description', { defaultValue: 'Extract information from company websites to enhance your research.' })}
          </p>
          <WebsiteAnalysis 
            onScrapedContent={handleWebsiteContent}
            contentContext={{
              topic: title,
              platform: platform,
              subPlatform: subPlatform,
              targetAudience: targetAudience,
              audienceNeeds: audienceNeeds
            }}
          />
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

        {/* Image Analysis */}
        <div className="mb-0">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <span className="text-blue-500 dark:text-blue-400 text-sm">🖼️</span>
            </div>
            {t('createPage.imageAnalysisTitle')}
          </h4>
          <ImageAnalysisPanel 
            contextType={getImageContextType()}
            className="border-none shadow-none hover:shadow-none"
            platformInfo={{
              platform: platform,
              subPlatform: subPlatform
            }}
          />
        </div>
      </div>
    </div>
  );
  
  // Add useEffect to update contentType on form submission
  useEffect(() => {
    // Create handler for before form submission
    const handleBeforeSubmit = () => {
      // Get the current content type based on platform and subPlatform
      const currentContentType = getContentType();
      
      // Store in session storage for reference by other components
      sessionStorage.setItem('contentType', currentContentType);
      sessionStorage.setItem('platform', platform);
      sessionStorage.setItem('subPlatform', subPlatform || '');
      
      console.log('Form submission preparing with:', {
        contentType: currentContentType,
        platform,
        subPlatform
      });
    };
    
    // Add a listener to the form
    window.addEventListener('beforeunload', handleBeforeSubmit);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeSubmit);
    };
  }, [platform, subPlatform]);
  
  // Add a safe toast function inside the component
  const safeToast = (message: string, type: 'success' | 'error' | 'info') => {
    try {
      if (toast.isReady) {
        if (type === 'success' && typeof toast.success === 'function') {
          toast.success(message);
        } else if (type === 'error' && typeof toast.error === 'function') {
          toast.error(message);
        } else if (type === 'info' && typeof toast.info === 'function') {
          toast.info(message);
        } else if (typeof toast.toast === 'function') {
          toast.toast({
            title: message,
            variant: type === 'success' ? 'success' : type === 'error' ? 'destructive' : 'default'
          });
        }
      }
    } catch (err) {
      console.error('Error showing toast:', err);
    }
  };
  
  // Add a handler for website content
  const handleWebsiteContent = (content: any) => {
    console.log('Website content received in ContentForm:', content);
    setWebsiteContent(content);
    
    // Store in sessionStorage for persistence
    try {
      // Get current content details
      const contentDetailsStr = sessionStorage.getItem('contentDetails');
      if (contentDetailsStr) {
        const contentDetails = JSON.parse(contentDetailsStr);
        contentDetails.websiteContent = content;
        
        // If a business name was extracted from the website, use it
        if (content && content.title && !businessType) {
          // Extract a business name from the website title
          const titleParts = content.title.split(/[|:\-–—]/);
          if (titleParts.length > 0) {
            const extractedBusinessName = titleParts[0].trim();
            setBusinessType(extractedBusinessName);
            contentDetails.businessName = extractedBusinessName;
            
            // Show a toast notification
            safeToast(t('createPage.businessNameExtracted', { defaultValue: 'Business name extracted from website' }), 'success');
          }
        }
        
        // Save updated content details
        sessionStorage.setItem('contentDetails', JSON.stringify(contentDetails));
      }
    } catch (error) {
      console.error('Error storing website content in sessionStorage:', error);
    }
  };
  
  // Add a handler for document analysis
  const handleDocumentAnalyzed = (result: DocumentAnalysisResult) => {
    // Store the new document content
    setDocumentContent(result);
    
    // Show success toast notification
    safeToast(t('createPage.documentContentExtracted', { defaultValue: 'Document content extracted for research' }), 'success');
    
    // If you need to do additional processing for multiple documents in the future
    // you could store them in an array instead of replacing the previous one
    // For example:
    // setDocumentContents(prev => [...prev, result]);
  };

  // For each platform card, get the display name from the platform translation
  const getPlatformDisplayName = (platformId: string) => {
    // First try using the translation system
    const translationKey = `createPage.platforms.${platformId.toLowerCase()}`;
    const translated = t(translationKey);
    
    // If we got back a real translation (not just the key)
    if (typeof translated === 'string' && !translated.includes(translationKey)) {
      return translated;
    }
    
    // As a fallback, use default platform names with capitalization
    return language === 'es' ? 
      translatePlatformToSpanish(platformId) : 
      platformId.charAt(0).toUpperCase() + platformId.slice(1);
  };

  // Function to manually translate platform names to Spanish as a fallback
  const translatePlatformToSpanish = (platformId: string) => {
    const spanishPlatforms: Record<string, string> = {
      'blog': 'Blog',
      'social': 'Redes Sociales',
      'email': 'Correo Electrónico',
      'youtube': 'YouTube',
      'presentation': 'Presentación',
      'google-ads': 'Anuncios de Google',
      'research-report': 'Informe de Investigación'
    };
    
    return spanishPlatforms[platformId] || platformId.charAt(0).toUpperCase() + platformId.slice(1);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-lg bg-white shadow-sm p-6 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <ContentCreationSteps 
        currentStep={currentStep} 
        onStepChange={handleStepChange} 
      />
      
      <form onSubmit={handleSubmit} className="space-y-8">
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
            {t('navigation.previous')}
          </button>
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={isSubmitting || isLoadingRedirect || (currentStep === 1 && !isStep1Valid())}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('navigation.next')}
            </button>
          ) : (
            <div className="mt-8 flex justify-end">
              <button
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {t('contentPage.buttons.generate')}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}; 
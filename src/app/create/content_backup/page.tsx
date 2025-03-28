/**
 * Content Generation Page
 * 
 * This page generates content based on research results, allowing users to:
 * 1. View and customize content settings
 * 2. Generate content using AI based on research insights
 * 3. Export or copy the generated content
 */

"use client";

import Link from "next/link";
import AppShell from "../../../components/AppShell";
import { useState, useEffect, useRef, FormEvent } from "react";
import { getSampleResearch } from "@/app/lib/sampleResearch";
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import { TrendingTopic } from "@/app/lib/api/redditApi";
import { IconFileText, IconDownload, IconFile, IconCopy } from "@tabler/icons-react";
import ApiKeySetupGuide from "../../../components/ApiKeySetupGuide";
import { toast } from 'react-hot-toast';
import YouTubeTranscriptInput from '@/components/YouTubeTranscriptInput';
import { MODEL_CONFIG, getProcessDescription } from '@/app/lib/modelConfig';
import { getPersonaDisplayName } from '@/app/lib/personaUtils';
import { useTranslation } from '@/lib/hooks/useTranslation';
import PersonaStyledContent from '@/components/PersonaStyledContent';
import { useContent } from '@/lib/hooks/useContent';
import FollowUpQuestions from '@/components/FollowUpQuestions';

// Enhanced research results interface including Claude 3.7 Sonnet analysis
interface ResearchResults {
  researchMethod: 'perplexity' | 'trending' | 'claude';
  perplexityResearch?: string;
  trendingTopics?: TrendingTopic[];
  dataSources?: {
    reddit: boolean;
    rss: boolean;
  };
}

// Near the top of the file, update the content details interface
interface ContentDetails {
  contentType: string;
  platform: string;
  subPlatform?: string;
  targetAudience: string;
  researchTopic: string;
  businessType: string;
  businessName?: string; // Add optional businessName property
  primarySubject?: string;
  subjectType?: string;
  subjectDetails?: string;
  youtubeTranscript?: string;
  youtubeUrl?: string;
}

// Update the content settings interface
interface ContentSettings {
  style: string;
  length: string;
  includeCTA: boolean;
  includeHashtags: boolean;
  customHashtags?: string; // Add optional customHashtags property
  slideCount?: string;
  presentationFormat?: string;
  technicalLevel?: string;
  includeExecutiveSummary?: boolean;
  includeActionItems?: boolean;
  includeDataVisualizations?: boolean;
}

export default function ContentGenerator() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { saveContent } = useContent();
  
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
    style: 'ariastar', // Changed from 'professional' to 'ariastar'
    length: 'medium',
    includeCTA: true,
    includeHashtags: true
  });
  
  // Add state for content preview expansion
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [showResearch, setShowResearch] = useState(true); // Set default to true so research is visible by default
  const [showApiInstructions, setShowApiInstructions] = useState(false);
  const [apiTypeToSetup, setApiTypeToSetup] = useState<'anthropic' | 'perplexity'>('anthropic');
  const [isUsingSimulatedClaude, setIsUsingSimulatedClaude] = useState(false);
  
  const [generatedContent, setGeneratedContent] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Add to the ContentPage component's state
  const [samplePost, setSamplePost] = useState<string>('');
  const [samplePostPlatform, setSamplePostPlatform] = useState<string>('');

  // Add state for YouTube transcript in the ContentPage component
  const [youtubeTranscript, setYoutubeTranscript] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);

  // Add state for API mode tracking
  const [apiMode, setApiMode] = useState<'normal' | 'fallback' | 'error'>('normal');
  const [apiErrorDetails, setApiErrorDetails] = useState<string | null>(null);

  // Add the error state variable near other state variables
  const [error, setError] = useState<string | null>(null);

  // Add the missing isLoading state
  const [isLoading, setIsLoading] = useState(true);

  // Add debounce state to prevent multiple simultaneous calls
  const [isStartGenerationDebounced, setIsStartGenerationDebounced] = useState(false);

  // Feedback system states
  const [feedbackText, setFeedbackText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [contentVersions, setContentVersions] = useState<string[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const currentYear = new Date().getFullYear();

  // Helper function to determine if CTA and hashtags options should be shown
  const shouldShowSocialOptions = () => {
    const contentType = contentDetails?.contentType?.toLowerCase() || '';
    const platform = contentDetails?.platform?.toLowerCase() || '';
    return (
      contentType.includes('social') ||
      platform.includes('social') ||
      platform.includes('facebook') ||
      platform.includes('instagram') ||
      platform.includes('twitter') ||
      platform.includes('linkedin') ||
      platform.includes('tiktok')
    );
  };

  // Helper function to determine if presentation options should be shown
  const shouldShowPresentationOptions = () => {
    const contentType = contentDetails?.contentType?.toLowerCase() || '';
    const platform = contentDetails?.platform?.toLowerCase() || '';
    return contentType.includes('presentation') || platform.includes('presentation');
  };

  // Define content styles if it doesn't exist
  const CONTENT_STYLES: Record<string, Array<{id: string, name: string}>> = {
    'blogPost': [
      // Rich Personas (moved to the top)
      { id: 'ariastar', name: 'AriaStar (Relatable Best Friend)' },
      { id: 'specialist_mentor', name: 'MentorPro (Specialist Mentor)' },
      { id: 'ai_collaborator', name: 'AllInsight (AI Collaboration Showcaser)' },
      { id: 'sustainable_advocate', name: 'EcoEssence (Sustainable Lifestyle Advocate)' },
      { id: 'data_visualizer', name: 'DataStory (Real-time Data Visualizer)' },
      { id: 'multiverse_curator', name: 'NexusVerse (Multiverse Experience Curator)' },
      { id: 'ethical_tech', name: 'TechTranslate (Ethical Tech Translator)' },
      { id: 'niche_community', name: 'CommunityForge (Niche Community Cultivator)' },
      { id: 'synthesis_maker', name: 'SynthesisSage (Synthesis Sense-Maker)' },
      // Regular styles (moved below rich personas)
      { id: 'professional', name: 'Professional' },
      { id: 'casual', name: 'Casual' },
      { id: 'enthusiastic', name: 'Enthusiastic' },
      { id: 'informative', name: 'Informative' }
    ],
    'socialMedia': [
      // Rich Personas (moved to the top)
      { id: 'ariastar', name: 'AriaStar (Relatable Best Friend)' },
      { id: 'specialist_mentor', name: 'MentorPro (Specialist Mentor)' },
      { id: 'ai_collaborator', name: 'AllInsight (AI Collaboration Showcaser)' },
      { id: 'sustainable_advocate', name: 'EcoEssence (Sustainable Lifestyle Advocate)' },
      { id: 'data_visualizer', name: 'DataStory (Real-time Data Visualizer)' },
      { id: 'multiverse_curator', name: 'NexusVerse (Multiverse Experience Curator)' },
      { id: 'ethical_tech', name: 'TechTranslate (Ethical Tech Translator)' },
      { id: 'niche_community', name: 'CommunityForge (Niche Community Cultivator)' },
      { id: 'synthesis_maker', name: 'SynthesisSage (Synthesis Sense-Maker)' },
      // Regular styles (moved below rich personas)
      { id: 'professional', name: 'Professional' },
      { id: 'casual', name: 'Casual' },
      { id: 'enthusiastic', name: 'Enthusiastic' },
      { id: 'informative', name: 'Informative' }
    ],
    'Video Script': [
      // Rich Personas (moved to the top)
      { id: 'ariastar', name: 'AriaStar (Relatable Best Friend)' },
      { id: 'specialist_mentor', name: 'MentorPro (Specialist Mentor)' },
      { id: 'ai_collaborator', name: 'AllInsight (AI Collaboration Showcaser)' },
      { id: 'sustainable_advocate', name: 'EcoEssence (Sustainable Lifestyle Advocate)' },
      { id: 'data_visualizer', name: 'DataStory (Real-time Data Visualizer)' },
      { id: 'multiverse_curator', name: 'NexusVerse (Multiverse Experience Curator)' },
      { id: 'ethical_tech', name: 'TechTranslate (Ethical Tech Translator)' },
      { id: 'niche_community', name: 'CommunityForge (Niche Community Cultivator)' },
      { id: 'synthesis_maker', name: 'SynthesisSage (Synthesis Sense-Maker)' },
      // Regular styles (moved below rich personas)
      { id: 'professional', name: 'Professional' },
      { id: 'casual', name: 'Casual' },
      { id: 'enthusiastic', name: 'Enthusiastic' },
      { id: 'informative', name: 'Informative' },
      { id: 'conversational', name: 'Conversational' },
      { id: 'storyteller', name: 'Storyteller' },
      { id: 'motivational', name: 'Motivational' },
      { id: 'educational', name: 'Educational' },
      { id: 'persuasive', name: 'Persuasive' }
    ],
    'video-script': [
      // Rich Personas (moved to the top)
      { id: 'ariastar', name: 'AriaStar (Relatable Best Friend)' },
      { id: 'specialist_mentor', name: 'MentorPro (Specialist Mentor)' },
      { id: 'ai_collaborator', name: 'AllInsight (AI Collaboration Showcaser)' },
      { id: 'sustainable_advocate', name: 'EcoEssence (Sustainable Lifestyle Advocate)' },
      { id: 'data_visualizer', name: 'DataStory (Real-time Data Visualizer)' },
      { id: 'multiverse_curator', name: 'NexusVerse (Multiverse Experience Curator)' },
      { id: 'ethical_tech', name: 'TechTranslate (Ethical Tech Translator)' },
      { id: 'niche_community', name: 'CommunityForge (Niche Community Cultivator)' },
      { id: 'synthesis_maker', name: 'SynthesisSage (Synthesis Sense-Maker)' },
      // Regular styles (moved below rich personas)
      { id: 'professional', name: 'Professional' },
      { id: 'casual', name: 'Casual' },
      { id: 'enthusiastic', name: 'Enthusiastic' },
      { id: 'informative', name: 'Informative' },
      { id: 'conversational', name: 'Conversational' },
      { id: 'storyteller', name: 'Storyteller' },
      { id: 'motivational', name: 'Motivational' },
      { id: 'educational', name: 'Educational' },
      { id: 'persuasive', name: 'Persuasive' }
    ],
    'email': [
      // Rich Personas (moved to the top)
      { id: 'ariastar', name: 'AriaStar (Relatable Best Friend)' },
      { id: 'specialist_mentor', name: 'MentorPro (Specialist Mentor)' },
      { id: 'ai_collaborator', name: 'AllInsight (AI Collaboration Showcaser)' },
      { id: 'sustainable_advocate', name: 'EcoEssence (Sustainable Lifestyle Advocate)' },
      { id: 'data_visualizer', name: 'DataStory (Real-time Data Visualizer)' },
      { id: 'multiverse_curator', name: 'NexusVerse (Multiverse Experience Curator)' },
      { id: 'ethical_tech', name: 'TechTranslate (Ethical Tech Translator)' },
      { id: 'niche_community', name: 'CommunityForge (Niche Community Cultivator)' },
      { id: 'synthesis_maker', name: 'SynthesisSage (Synthesis Sense-Maker)' },
      // Regular styles (moved below rich personas)
      { id: 'professional', name: 'Professional' },
      { id: 'casual', name: 'Casual' },
      { id: 'enthusiastic', name: 'Enthusiastic' },
      { id: 'informative', name: 'Informative' },
      { id: 'conversational', name: 'Conversational' },
      { id: 'storyteller', name: 'Storyteller' },
      { id: 'motivational', name: 'Motivational' },
      { id: 'educational', name: 'Educational' },
      { id: 'persuasive', name: 'Persuasive' }
    ],
    'default': [
      // Rich Personas (moved to the top)
      { id: 'ariastar', name: 'AriaStar (Relatable Best Friend)' },
      { id: 'specialist_mentor', name: 'MentorPro (Specialist Mentor)' },
      { id: 'ai_collaborator', name: 'AllInsight (AI Collaboration Showcaser)' },
      { id: 'sustainable_advocate', name: 'EcoEssence (Sustainable Lifestyle Advocate)' },
      { id: 'data_visualizer', name: 'DataStory (Real-time Data Visualizer)' },
      { id: 'multiverse_curator', name: 'NexusVerse (Multiverse Experience Curator)' },
      { id: 'ethical_tech', name: 'TechTranslate (Ethical Tech Translator)' },
      { id: 'niche_community', name: 'CommunityForge (Niche Community Cultivator)' },
      { id: 'synthesis_maker', name: 'SynthesisSage (Synthesis Sense-Maker)' },
      // Regular styles (moved below rich personas)
      { id: 'professional', name: 'Professional' },
      { id: 'casual', name: 'Casual' },
      { id: 'enthusiastic', name: 'Enthusiastic' },
      { id: 'informative', name: 'Informative' },
      { id: 'conversational', name: 'Conversational' },
      { id: 'storyteller', name: 'Storyteller' },
      { id: 'motivational', name: 'Motivational' },
      { id: 'educational', name: 'Educational' },
      { id: 'persuasive', name: 'Persuasive' }
    ],
    'youtube-script': [
      // Rich Personas
      { id: 'ariastar', name: 'AriaStar (Relatable Best Friend)' },
      { id: 'specialist_mentor', name: 'MentorPro (Specialist Mentor)' },
      { id: 'ai_collaborator', name: 'AllInsight (AI Collaboration Showcaser)' },
      { id: 'sustainable_advocate', name: 'EcoEssence (Sustainable Lifestyle Advocate)' },
      { id: 'data_visualizer', name: 'DataStory (Real-time Data Visualizer)' },
      { id: 'multiverse_curator', name: 'NexusVerse (Multiverse Experience Curator)' },
      { id: 'ethical_tech', name: 'TechTranslate (Ethical Tech Translator)' },
      { id: 'niche_community', name: 'CommunityForge (Niche Community Cultivator)' },
      { id: 'synthesis_maker', name: 'SynthesisSage (Synthesis Sense-Maker)' },
      // Regular styles
      { id: 'professional', name: 'Professional' },
      { id: 'casual', name: 'Casual' },
      { id: 'enthusiastic', name: 'Enthusiastic' },
      { id: 'informative', name: 'Informative' },
      { id: 'conversational', name: 'Conversational' },
      { id: 'storyteller', name: 'Storyteller' },
      { id: 'motivational', name: 'Motivational' },
      { id: 'educational', name: 'Educational' },
      { id: 'persuasive', name: 'Persuasive' }
    ],
    'vlog-script': [
      // Rich Personas
      { id: 'ariastar', name: 'AriaStar (Relatable Best Friend)' },
      { id: 'specialist_mentor', name: 'MentorPro (Specialist Mentor)' },
      { id: 'ai_collaborator', name: 'AllInsight (AI Collaboration Showcaser)' },
      { id: 'sustainable_advocate', name: 'EcoEssence (Sustainable Lifestyle Advocate)' },
      { id: 'data_visualizer', name: 'DataStory (Real-time Data Visualizer)' },
      { id: 'multiverse_curator', name: 'NexusVerse (Multiverse Experience Curator)' },
      { id: 'ethical_tech', name: 'TechTranslate (Ethical Tech Translator)' },
      { id: 'niche_community', name: 'CommunityForge (Niche Community Cultivator)' },
      { id: 'synthesis_maker', name: 'SynthesisSage (Synthesis Sense-Maker)' },
      // Regular styles
      { id: 'professional', name: 'Professional' },
      { id: 'casual', name: 'Casual' },
      { id: 'enthusiastic', name: 'Enthusiastic' },
      { id: 'informative', name: 'Informative' },
      { id: 'conversational', name: 'Conversational' },
      { id: 'storyteller', name: 'Storyteller' },
      { id: 'motivational', name: 'Motivational' },
      { id: 'educational', name: 'Educational' },
      { id: 'vlog', name: 'Vlog Style' },
      { id: 'documentary', name: 'Documentary Style' }
    ]
  };

  // Helper functions moved outside of the render function
  const extractRecommendationsFromDetails = (details: ContentDetails): string[] => {
    // Extract recommendations from research if available
    if (researchResults?.perplexityResearch) {
      return extractRecommendationsFromResearch(researchResults.perplexityResearch, details.researchTopic || '').slice(0, 5);
    }
    
    // Default recommendations if no research available
    return [
      'Focus on value-driven content that educates your audience',
      'Use storytelling to connect emotionally with your audience',
      'Include clear calls to action in your posts',
      'Optimize content length for each specific platform',
      'Utilize relevant hashtags to increase visibility'
    ];
  };
  
  const extractHashtagsFromDetails = (details: ContentDetails): string[] => {
    const hashtags: string[] = [];
    const topic = details.researchTopic || '';
    
    // Add hashtags based on the content details
    if (topic) {
      // Convert the topic to hashtags
      const topicWords = topic.split(' ');
      if (topicWords.length > 0) {
        // Add up to 3 hashtags from the topic
        for (let i = 0; i < Math.min(3, topicWords.length); i++) {
          const word = topicWords[i].replace(/[^\w]/g, '');
          if (word.length > 3) {
            hashtags.push(`#${word}`);
          }
        }
      }
    }
    
    // Add hashtags based on the platform
    if (details.platform === 'instagram') {
      hashtags.push('#Instagram', '#SocialMedia');
    } else if (details.platform === 'facebook') {
      hashtags.push('#Facebook', '#SocialMedia');
    } else if (details.platform === 'twitter') {
      hashtags.push('#Twitter', '#SocialMedia');
    } else if (details.platform === 'linkedin') {
      hashtags.push('#LinkedIn', '#Professional');
    } else if (details.contentType === 'blog-post') {
      hashtags.push('#Blog', '#Content');
    }
    
    // Add hashtags based on the audience
    if (details.targetAudience.toLowerCase().includes('business')) {
      hashtags.push('#Business', '#Entrepreneur');
    } else if (details.targetAudience.toLowerCase().includes('professional')) {
      hashtags.push('#Professional', '#Career');
    }
    
    // Ensure we have at least some generic hashtags if nothing else worked
    if (hashtags.length < 3) {
      hashtags.push('#Tips', '#Advice', '#BestPractices');
    }
    
    // Return unique hashtags (no duplicates) using Array.filter instead of Set
    return hashtags.filter((tag, index) => hashtags.indexOf(tag) === index);
  };

  // Load content details and research results from session storage and Firebase
  useEffect(() => {
    try {
      console.log('Initializing content page...');
      const storedDetails = sessionStorage.getItem('contentDetails');
      const storedResearchData = sessionStorage.getItem('researchData');
      
      if (storedDetails) {
        const parsedDetails = JSON.parse(storedDetails) as ContentDetails;
        console.log('Content details found:', parsedDetails);
        setContentDetails(parsedDetails);
        
        // Set appropriate default content settings based on content type
        const contentType = parsedDetails.contentType?.toLowerCase() || '';
        const isVideoOrBlogContent = 
          contentType.includes('video script') || 
          contentType.includes('video-script') || 
          contentType.includes('vlog') || 
          contentType === 'blog post' || 
          contentType === 'blog-post';
        
        setContentSettings(prevSettings => ({
          ...prevSettings,
          style: 'ariastar', // Default to AriaStar
          includeCTA: !isVideoOrBlogContent, // False for video/blog content
          includeHashtags: !isVideoOrBlogContent // False for video/blog content
        }));
        
        if (parsedDetails.youtubeTranscript) {
          setYoutubeTranscript(parsedDetails.youtubeTranscript);
        }
        
        if (parsedDetails.youtubeUrl) {
          setYoutubeUrl(parsedDetails.youtubeUrl);
        }
      }
      
      // Load research data from session storage
      if (storedResearchData) {
        const parsedResearchData = JSON.parse(storedResearchData);
        console.log('Research data found in session storage:', parsedResearchData);
        
        // Create research results object from research data
        const researchResults: ResearchResults = {
          researchMethod: 'perplexity',
          perplexityResearch: parsedResearchData.research || '',
          trendingTopics: [],
          dataSources: {
            reddit: false,
            rss: false
          }
        };
        
        setResearchResults(researchResults);
        
        // Update content details with YouTube data if available
        if (parsedResearchData.youtubeTranscript) {
          setYoutubeTranscript(parsedResearchData.youtubeTranscript);
          setContentDetails(prev => ({
            ...prev,
            youtubeTranscript: parsedResearchData.youtubeTranscript
          }));
        }
        
        if (parsedResearchData.youtubeUrl) {
          setYoutubeUrl(parsedResearchData.youtubeUrl);
          setContentDetails(prev => ({
            ...prev,
            youtubeUrl: parsedResearchData.youtubeUrl
          }));
        }
      } else {
        // If no research data in session storage, try to load from Firebase
        const loadResearchFromFirebase = async () => {
          try {
            // Get the current user from Firebase Auth
            const { auth } = await import('@/lib/firebase/firebase');
            const currentUser = auth.currentUser;
            
            if (!currentUser) {
              console.error('User not authenticated. Cannot load research data from Firebase.');
              return;
            }
            
            // Load research data from Firebase
            const { collection, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase/firebase');
            
            console.log('Loading research data from Firebase for user:', currentUser.uid);
            
            // Create a query to get the most recent research data for the current user
            const researchQuery = query(
              collection(db, 'research'),
              where('userId', '==', currentUser.uid),
              orderBy('createdAt', 'desc'),
              limit(1)
            );
            
            const querySnapshot = await getDocs(researchQuery);
            
            if (!querySnapshot.empty) {
              const doc = querySnapshot.docs[0];
              const researchData = doc.data();
              console.log('Research data loaded from Firebase:', researchData);
              
              // Create research results object from research data
              const researchResults: ResearchResults = {
                researchMethod: 'perplexity',
                perplexityResearch: researchData.research || '',
                trendingTopics: [],
                dataSources: {
                  reddit: false,
                  rss: false
                }
              };
              
              setResearchResults(researchResults);
              
              // Update content details with research data
              setContentDetails(prev => ({
                ...prev,
                researchTopic: researchData.topic || prev.researchTopic,
                contentType: researchData.contentType || prev.contentType,
                platform: researchData.platform || prev.platform,
                targetAudience: researchData.targetAudience || prev.targetAudience,
                businessType: researchData.businessType || prev.businessType,
                youtubeTranscript: researchData.youtubeTranscript || prev.youtubeTranscript,
                youtubeUrl: researchData.youtubeUrl || prev.youtubeUrl
              }));
              
              // Update YouTube data if available
              if (researchData.youtubeTranscript) {
                setYoutubeTranscript(researchData.youtubeTranscript);
              }
              
              if (researchData.youtubeUrl) {
                setYoutubeUrl(researchData.youtubeUrl);
              }
              
              // Save to session storage for future use
              sessionStorage.setItem('researchData', JSON.stringify({
                ...researchData,
                id: doc.id
              }));
            } else {
              console.log('No research data found in Firebase for user:', currentUser.uid);
            }
          } catch (error) {
            console.error('Error loading research data from Firebase:', error);
          }
        };
        
        loadResearchFromFirebase();
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing content page:', err);
      setIsLoading(false);
    }
  }, []);

  // Add any additional data loading from the nested useEffect that needs to be separate
  // in a new independent useEffect if necessary
  
  // Update the startGeneration function to remove fallback mode and add debounce
  const startGeneration = async () => {
    // Prevent multiple simultaneous calls using debounce
    if (isGenerating || isStartGenerationDebounced) return;
    
    // Set debounce flag to prevent multiple calls
    setIsStartGenerationDebounced(true);
    
    // Add validation for test or minimal input
    const isTestInput = 
      (!contentDetails.researchTopic || contentDetails.researchTopic.toLowerCase() === 'test') &&
      (!contentDetails.targetAudience || contentDetails.targetAudience.toLowerCase() === 'test') &&
      (!contentDetails.contentType || contentDetails.contentType === '') &&
      (!researchResults?.perplexityResearch || researchResults.perplexityResearch.toLowerCase().includes('test'));
    
    // If it's just test input with no meaningful data, show error and abort
    if (isTestInput) {
      setError("Insufficient input for content generation. Please provide meaningful research topic, target audience, and content type information.");
      setTimeout(() => {
        setIsStartGenerationDebounced(false);
      }, 1000);
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setApiMode('normal');
    setApiErrorDetails(null);
    
    // Set up more realistic progress tracking
    setGenerationProgress(5); // Start at 5%
    console.log("Generation started: Progress 5%");
    setStatusMessage(`Preparing content request for ${new Date().getFullYear()} best practices...`);
    
    try {
      // Construct context with all available information
      let context = `Content Type: ${contentDetails.contentType || 'article'}, Platform: ${contentDetails.platform || 'general'}, Target Audience: ${contentDetails.targetAudience || 'general'}`;
      
      // Add research information if available
      if (researchResults?.perplexityResearch) {
        context += `, Research: Available`;
      }
      
      // Add YouTube transcript information if available
      if (youtubeTranscript) {
        context += `, YouTube Content: Available`;
      }
      
      setGenerationProgress(10);
      console.log("Building prompt: Progress 10%");
      setStatusMessage("Building content prompt...");
      
      // Show realistic expected time based on content complexity
      const baseTime = 60; // Base time in seconds (1 minute)
      let estimatedTime = baseTime;
      
      // Add time for research and transcript if present
      if (researchResults?.perplexityResearch) estimatedTime += 30;
      if (youtubeTranscript) estimatedTime += 30;
      
      // Adjust based on content type (video scripts take longer)
      if (contentDetails.contentType === 'Video Script') estimatedTime += 30;
      
      // Update message with realistic estimate (1-3 minutes)
      const estimatedMinutes = Math.ceil(estimatedTime / 60);
      setStatusMessage(`Generating content with Claude 3.7 Sonnet (est. 1-${Math.min(estimatedMinutes, 3)} minutes)...`);
      
      // Build the prompt based on content settings
      const enhancedPrompt = {
        prompt: `Create ${contentDetails.contentType} content for ${contentDetails.platform} targeting ${contentDetails.targetAudience}.`,
        topic: contentDetails.researchTopic || contentDetails.targetAudience,
        context,
        contentType: contentDetails.contentType,
        platform: contentDetails.platform,
        audience: contentDetails.targetAudience,
        researchData: researchResults?.perplexityResearch || '',
        youtubeTranscript,
        youtubeUrl,
        style: contentSettings.style,
        language // Use the language from the hook
      };
      
      console.log('Generating content with Claude API...');
      console.log('Language for content generation:', language);
      
      // Progress simulation that's more realistic
      // Claude usually takes 20-40 seconds for content generation
      setGenerationProgress(15);
      console.log("Starting progress simulation: Progress 15%");
      
      // Progressive updates during the API call
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            console.log("Progress reached 90%, stopping interval");
            return prev;
          }
          // Slowly increment progress, slower at the beginning, faster in the middle
          const increment = prev < 30 ? 2 : prev < 60 ? 4 : prev < 80 ? 2 : 1;
          const newProgress = prev + increment;
          console.log(`Progress updated: ${newProgress}%`);
          return newProgress;
        });
      }, 1000);
      
      // Call the API
      const response = await fetch('/api/claude/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedPrompt),
      });
      
      // Clear the interval when we get a response
      clearInterval(progressInterval);
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle API error with detailed information
        console.error('API error:', data);
        setApiMode('error');
        setApiErrorDetails(data.message || data.error || 'Unknown API error');
        throw new Error(data.message || data.error || 'Failed to generate content');
      }
      
      const generatedContent = data.content;
      if (!generatedContent) {
        throw new Error('No content was generated');
      }
      
      // Apply style transformations and length adjustments to the content
      // First apply the selected style
      let formattedContent = applyContentStyle(generatedContent, contentSettings.style);
      
      // Then adjust for length preference
      formattedContent = adjustContentLength(formattedContent, contentSettings.length);
      
      // Apply call-to-action if enabled
      if (contentSettings.includeCTA) {
        formattedContent = addCallToAction(formattedContent, contentDetails.contentType, contentDetails.platform);
      }
      
      // Add hashtags if enabled
      if (contentSettings.includeHashtags) {
        const hashtags = contentSettings.customHashtags 
          ? contentSettings.customHashtags.split(',').map(tag => tag.trim())
          : extractHashtagsFromDetails(contentDetails);
        formattedContent = addHashtags(formattedContent, hashtags);
      }
      
      // Complete the progress
      setGenerationProgress(100);
      console.log("Generation complete: Progress 100%");
      setStatusMessage(t('contentPage.generated'));
      
      setGeneratedContent(formattedContent);
      setIsGenerating(false);
      
      // Clear status message after a delay
      setTimeout(() => {
        setStatusMessage("");
        setGenerationProgress(0);
      }, 2000);
      
    } catch (error: any) {
      console.error('Error generating content:', error);
      setError(error.message || 'An error occurred while generating content');
      setIsGenerating(false);
      setGenerationProgress(0);
    } finally {
      // Clear the debounce flag after a short delay
      setTimeout(() => {
        setIsStartGenerationDebounced(false);
      }, 1000);
    }
  };
  
  // Helper function to extract business name from audience field
  const extractBusinessName = (audience: string): string => {
    // Look for business identifiers
    if (audience.includes('.com') || audience.includes('.net') || audience.includes('.org') || 
        audience.includes('www.') || audience.includes('Inc.') || audience.includes('LLC') ||
        audience.includes('Ltd.')) {
      
      // Try to extract business name using common patterns
      const businessPatterns = [
        /([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*)\s+is\s+/i,  // "Company is..."
        /([A-Za-z0-9]+\.[A-Za-z0-9]+)/,  // domain.com
        /www\.([A-Za-z0-9]+)\./,  // www.company.com
        /for\s+([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*)/i,  // "for Company"
        /([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*)\.com/i,  // Company.com
        /([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*)\.net/i,  // Company.net
        /([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*)\.org/i,  // Company.org
      ];
      
      for (const pattern of businessPatterns) {
        const match = audience.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    
    return '';
  };
  
  // Helper function to extract topic-specific recommendations from research
  const extractRecommendationsFromResearch = (research: string, topic: string): string[] => {
    const recommendations: string[] = [];
    
    // Look for sections about the topic
    const topicLower = topic.toLowerCase();
    const paragraphs = research.split('\n\n');
    
    // Try to find topic-specific content first
    for (const para of paragraphs) {
      if (para.toLowerCase().includes(topicLower)) {
        // Extract bullet points
        const lines = para.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('-') || line.trim().startsWith('*') || 
              /^\d+\./.test(line.trim()) || line.includes('**')) {
            const cleanLine = line.replace(/^[-*]\s+|\d+\.\s+|\*\*/g, '').trim();
            if (cleanLine && cleanLine.length > 10) {
              recommendations.push(cleanLine);
            }
          }
        }
      }
    }
    
    // If we found some, return them
    if (recommendations.length > 0) {
      return recommendations;
    }
    
    // Otherwise, look for any recommendations or key points
    const keyPointsMatch = research.match(/##\s*Key\s*Points([\s\S]*?)(?=##|$)/i);
    const recommendationsMatch = research.match(/##\s*(?:Recommendations|Content\s*Recommendations)([\s\S]*?)(?=##|$)/i);
    
    if (keyPointsMatch) {
      const points = keyPointsMatch[1].split('\n').filter(line => 
        line.trim().startsWith('-') || 
        line.trim().startsWith('*') || 
        /^\d+\./.test(line.trim())
      );
      recommendations.push(...points.map(p => p.replace(/^[-*\d.]\s*|\*\*/g, '').trim()));
    }
    
    if (recommendationsMatch) {
      const recs = recommendationsMatch[1].split('\n').filter(line => 
        line.trim().startsWith('-') || 
        line.trim().startsWith('*') || 
        /^\d+\./.test(line.trim())
      );
      recommendations.push(...recs.map(p => p.replace(/^[-*\d.]\s*|\*\*/g, '').trim()));
    }
    
    return recommendations;
  };
  
  // Helper function to create default recommendations if none found
  const createDefaultRecommendations = (topic: string, audience: string): string[] => {
    return [
      `${topic} provides unique solutions that address the specific needs of ${audience}`,
      `Highlight the key features and benefits of ${topic} that resonate most with ${audience}`,
      `Share real success stories and testimonials about ${topic} to build credibility`,
      `Explain how ${topic} solves common problems faced by ${audience}`,
      `Present the competitive advantages that make ${topic} the preferred choice`
    ];
  };
  
  // Update Facebook post generator to better incorporate topic information
  const generateFacebookPost = (topic: string, details: ContentDetails) => {
    console.log(`Generating Facebook post about ${topic}`);
    // Using ${currentYear} best practices for Facebook:
    // - Emotional storytelling approach with authenticity
    // - Video-friendly text format
    // - Conversation starter questions
    // - Clear value proposition
    
    // Create an engaging introduction mentioning the specific topic
    const intro = `✨ Excited to share these game-changing insights about ${topic} that are transforming results for ${details.targetAudience}!`;
    
    // Format recommendations as engaging points with emojis
    const body = extractRecommendationsFromResearch(researchResults?.perplexityResearch || '', topic).slice(0, 3).map((rec, index) => {
      const emoji = ['💫', '🌿', '⚡️'][index % 3];
      return `${emoji} ${rec}`;
    }).join('\n\n');
    
    // Add a conversation-starting conclusion that mentions the topic
    const conclusion = `What aspect of ${topic} has made the biggest difference for you? Share your experience below and let's learn from each other!`;
    
    return `${intro}\n\n${body}\n\n${conclusion}`;
  };
  
  // Generate placeholder content based on settings
  const generatePlaceholderContent = (
    contentDetails: ContentDetails,
    isCompanySpecific: boolean = false
  ): string => {
    console.log(`Generating placeholder content for ${contentDetails.contentType} on ${contentDetails.platform}`);
    
    const topic = contentDetails.researchTopic || contentDetails.targetAudience || 'topic';
    const audience = contentDetails.targetAudience || 'general audience';
    const businessName = contentDetails.businessName || '';
    
    // Extract recommendations from research if available
    let recommendations = extractRecommendationsFromResearch(researchResults?.perplexityResearch || '', topic);
    
    // Create default recommendations if none extracted from research
    if (recommendations.length === 0) {
      recommendations = createDefaultRecommendations(topic, audience);
    }
    
    // Generate hashtags
    const hashtags = extractHashtagsFromDetails(contentDetails);
    
    // Check if we're generating for a specific platform
    if (contentDetails.platform === 'facebook') {
      return generateBusinessSpecificContent(recommendations, audience, hashtags, topic, businessName);
    } else if (contentDetails.platform === 'instagram') {
      return generateBusinessSpecificContent(recommendations, audience, hashtags, topic, businessName);
    } else if (contentDetails.platform === 'twitter') {
      return generateTwitterPost(topic, contentDetails);
    } else if (contentDetails.platform === 'linkedin') {
      return generateLinkedInPost(topic, contentDetails);
    } else if (contentDetails.contentType === 'blog-post') {
      return generateBlogPost(recommendations, audience, topic);
    } else if (contentDetails.contentType === 'email') {
      return generateEmailContent(recommendations, audience, topic);
    } else if (contentDetails.contentType === 'video-script') {
      return generateVideoScript(recommendations, audience, topic);
    } else {
      return generateGenericContent(recommendations, audience, hashtags, topic);
    }
  };
  
  // Helper functions for generating different content types
  
  const generateInstagramPost = (topic: string, details: ContentDetails) => {
    console.log(`Generating Instagram post about ${topic}`);
    // Using ${currentYear} best practices for Instagram:
    // - Carousel-style text format
    // - Save-worthy content structure
    // - Strong visual language
    // - Engagement questions
    
    // Create a save-worthy introduction with topic focus
    const intro = `📌 SAVE THIS POST: Essential insights about ${topic} for ${details.targetAudience} that you'll want to reference later 👇\n\n`;
    
    // Format as carousel-style content with strong benefits
    const body = extractRecommendationsFromResearch(researchResults?.perplexityResearch || '', topic).slice(0, 3).map((rec, index) => {
      const emoji = ['1️⃣', '2️⃣', '3️⃣'][index];
      return `${emoji} ${rec}`;
    }).join('\n\n');
    
    // Add save prompt and question to drive engagement
    const conclusion = `\nDouble tap to save this ${topic} guide for later! 💯\n\nWhich of these points about ${topic} resonates most with you? Share in the comments below!`;
    
    return `${intro}${body}${conclusion}`;
  };
  
  const generateTwitterPost = (topic: string, details: ContentDetails) => {
    console.log(`Generating Twitter post about ${topic}`);
    
    const businessName = details.businessName || '';
    const mainPoint = extractRecommendationsFromResearch(researchResults?.perplexityResearch || '', topic)[0] || 
      `Key insight about ${topic} for ${details.targetAudience}`;
    
    // Create a thread opener that features the topic
    const intro = `THREAD: Essential ${topic} insights for ${details.targetAudience} that drive results 👇`;
    
    // First tweet in the thread includes the main point
    const tip = `1/ ${mainPoint}`;
    
    // Add an engagement question related to the topic
    const engagement = `What's your experience with ${topic}? Reply with your insights or questions and I'll share specific solutions.`;
    
    return `${intro}\n\n${tip}\n\n${engagement}`;
  };
  
  const generateLinkedInPost = (topic: string, details: ContentDetails) => {
    console.log(`Generating LinkedIn post about ${topic}`);
    // Using current best practices for LinkedIn:
    // - Personal narrative style
    // - Professional context
    // - Problem-solution framework
    // - Clear formatting
    // - Engagement question
    
    const businessName = details.businessName || '';
    const product = details.primarySubject || topic;
    
    const intro = `For the past year, I've been helping ${details.targetAudience} transform their approach to ${topic}. The results have been nothing short of remarkable.\n\n`;
    
    // Use professional, detailed style for LinkedIn
    let body = `Here's what makes an effective approach to ${topic}:\n\n`;
    
    body += extractRecommendationsFromResearch(researchResults?.perplexityResearch || '', topic).slice(0, 3).map((rec, index) => {
      return `🔹 ${rec}`;
    }).join('\n\n');
    
    // Add professional conclusion
    const conclusion = `\nAs professionals in this field, we have a responsibility to share solutions that actually work. I'd love to hear from others who value evidence-based approaches.\n\nWhat strategies have made the biggest difference for you or your clients?`;
    
    return `${intro}${body}${conclusion}`;
  };
  
  const generateGenericSocialPost = (recommendations: string[], audience: string, hashtags: string[], topic: string) => {
    // Using universal best practices that work across platforms:
    // - Clear, concise messaging
    // - Valuable, actionable information
    // - Engagement prompt
    // - Scannable format
    
    // Create a headline that features the topic prominently
    const headline = `📣 Essential ${topic} insights that ${audience} needs to know:\n\n`;
    
    // Format content in a scannable way with emojis
    const content = recommendations.slice(0, 3).map((rec, index) => {
      const emoji = ['🔑', '💡', '⭐️'][index % 3];
      return `${emoji} ${rec}`;
    }).join('\n\n');
    
    // Add an engagement prompt focused on the topic
    const engagement = `\n\nWhat's your biggest question about ${topic}? Drop it in the comments below and let's discuss!`;
    
    return `${headline}${content}${engagement}`;
  };
  
  // Update the blog post generator to accept a topic parameter
  const generateBlogPost = (recommendations: string[], audience: string, topic: string) => {
    // Using current year best practices for blog posts:
    // - Strong, clear headline
    // - Comprehensive, well-structured content
    // - SEO optimization
    // - Scannable format with subheadings
    
    // Create a compelling title that incorporates the topic
    const title = `# ${topic}: A Comprehensive Guide for ${audience}\n\n`;
    
    // Add an engaging introduction
    const intro = `In today's rapidly evolving landscape, understanding ${topic} has become essential for ${audience}. This guide provides actionable insights based on the latest research and industry best practices.\n\n`;
    
    // Format the main content with subheadings and detailed explanations
    const body = recommendations.map((rec, index) => {
      return `## ${index + 1}. ${rec}\n\nMore details would go here explaining this approach in depth.\n\n`;
    }).join('');
    
    // Add a conclusion with next steps
    const conclusion = `## Summary\n\nImplementing these ${topic} strategies effectively requires consistent application and monitoring. Start with the approach that aligns most closely with your current goals and gradually incorporate the others.\n\n`;
    
    return `${title}${intro}${body}${conclusion}`;
  };
  
  // Update the email content generator to accept a topic parameter
  const generateEmailContent = (recommendations: string[], audience: string, topic: string) => {
    // Using current year best practices for email content:
    // - Personalized, focused subject line
    // - Scannable content with clear sections
    // - Value-first approach
    // - Clear call to action
    
    // Create a compelling subject line with the topic
    const subject = `Subject: Essential ${topic} Insights for ${audience}\n\n`;
    
    // Add a personalized greeting
    const greeting = `Hello,\n\nI wanted to share some valuable insights about ${topic} that have been particularly effective for ${audience} like yourself.\n\n`;
    
    // Format the recommendations as clear, value-focused points
    const body = recommendations.map((rec, index) => {
      return `${index + 1}. ${rec}\n\n`;
    }).join('');
    
    // Add a call to action and signature
    const conclusion = `I hope you find these insights valuable. If you'd like to discuss how these ${topic} strategies could be applied to your specific situation, feel free to reply to this email.\n\nBest regards,\n[Your Name]\n\n`;
    
    return `${subject}${greeting}${body}${conclusion}`;
  };
  
  // Update the video script generator to accept a topic parameter and use research data
  const generateVideoScript = (recommendations: string[], audience: string, topic: string) => {
    // Format the topic for improved display
    const formattedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
    
    // Instead of using a hard-coded format, we'll prepare key information from recommendations
    // The actual formatting will be handled by the Claude API based on research results
    
    // Extract key points from recommendations
    const keyPoints = recommendations.slice(0, Math.min(5, recommendations.length));
    
    // Create a basic structure that Claude will enhance with current best practices
    // based on the research phase
    return `# Video Script for ${formattedTopic}

Topic: ${formattedTopic}
Target Audience: ${audience}
Content Type: Video Script

Key Points to Cover:
${keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

Note: This script should follow the current best practices for video script formatting as determined during research.

The script should include appropriate elements like:
- Professional opening and closing
- Clear scene descriptions where appropriate
- Speaker attributions when needed
- Any other elements that reflect current best practices for video scripts
`;
  };
  
  // Update the generic content generator to accept a topic parameter
  const generateGenericContent = (recommendations: string[], audience: string, hashtags: string[], topic: string) => {
    // Generic content that can be adapted to various formats
    // Focusing on clarity, value, and engagement
    
    // Create a title that incorporates the topic
    const intro = `# ${topic} Strategies for ${audience}\n\n`;
    
    // Format recommendations as clear sections
    const body = recommendations.map((rec, index) => {
      return `## ${index + 1}. ${rec}\n\nMore details would go here explaining this point about ${topic} in depth.\n\n`;
    }).join('');
    
    // Add a conclusion that reinforces the topic focus
    const conclusion = `## Conclusion\n\nImplementing these ${topic} strategies can significantly enhance outcomes for ${audience}. Start with one approach and measure results before expanding to others.\n\n`;
    
    return `${intro}${body}${conclusion}`;
  };
  
  // Helper functions for generating Tranont content
  
  const generateTransontFacebookPost = (recommendations: string[], audience: string, hashtags: string[], topic: string) => {
    // Using current year best practices for Facebook:
    // - Authentic storytelling approach
    // - Video-friendly text structure (as if accompanying a video)
    // - Personal testimony format
    // - Clear value proposition
    // - Conversation starter question
    
    // Extract product names from recommendations if they exist
    let productMentions = '';
    let specificProducts: string[] = [];
    let productDescriptions: {[key: string]: string} = {};
    
    // First, look for specific product details in the recommendations
    const productDetails = recommendations.filter(rec => rec.includes(':'));
    
    if (productDetails.length > 0) {
      // Extract product names and descriptions
      productDetails.forEach(detail => {
        const [product, description] = detail.split(':').map(p => p.trim());
        specificProducts.push(product);
        productDescriptions[product] = description;
      });
      
      // Format product mentions for the intro
      if (specificProducts.length === 1) {
        productMentions = specificProducts[0];
      } else if (specificProducts.length === 2) {
        productMentions = `${specificProducts[0]} and ${specificProducts[1]}`;
      } else if (specificProducts.length > 2) {
        const firstTwo = specificProducts.slice(0, 2).join(' and ');
        productMentions = `${firstTwo} (and other amazing products)`;
      }
    } else {
      // Fallback if no specific products found
      productMentions = "Tranont's wellness products";
      specificProducts = ["ICARIA Life", "VIBE Energy Supplement"];
    }
    
    const intro = `For the past year, I've been helping ${audience} transform their wellness journey with Tranont products like ${productMentions}. The results have been nothing short of remarkable.\n\n`;
    
    // Use professional, detailed style for LinkedIn
    let body = '';
    
    // If we have product details, create a formatted list
    if (productDetails.length > 0) {
      body = "Here's what makes these products so effective:\n\n";
      
      body += productDetails.slice(0, 3).map((detail, index) => {
        const [product, description] = detail.split(':').map(p => p.trim());
        return `🔹 ${product}: ${description}`;
      }).join('\n\n');
    } else {
      // Otherwise use the recommendations
      body = "Here's what makes Tranont's approach so effective:\n\n";
      
      body += recommendations.slice(0, 3).map((rec, index) => {
        return `🔹 ${rec}`;
      }).join('\n\n');
    }
    
    // Add professional conclusion
    const conclusion = `\nAs wellness professionals, we have a responsibility to share solutions that actually work. I'd love to hear from others who value evidence-based approaches to health optimization.\n\nWhat wellness products have made the biggest difference for you or your clients?`;
    
    return `${intro}${body}${conclusion}`;
  };
  
  const generateTransontInstagramPost = (recommendations: string[], audience: string, hashtags: string[], topic: string) => {
    // Using current year best practices for Instagram:
    // - Vertical/carousel format reference
    // - Authentic, person-centered approach
    // - Save-worthy content
    // - Strong visual language
    // - Direct engagement prompt
    
    const intro = `Transform your wellness journey with what's working NOW for ${audience} 👇\n\n`;
    
    // Format as carousel-style content with strong benefits
    const body = recommendations.slice(0, 3).map((rec, index) => {
      const emoji = ['1️⃣', '2️⃣', '3️⃣'][index];
      return `${emoji} ${rec}`;
    }).join('\n\n');
    
    // Add save prompt and question to drive engagement
    const conclusion = `\nSave this post for your wellness journey! 🔖\n\nDouble tap if you're passionate about natural health solutions, and tell me which Tranont product you're most curious about!`;
    
    return `${intro}${body}${conclusion}`;
  };
  
  const generateTransontTwitterPost = (recommendations: string[], audience: string, hashtags: string[], topic: string) => {
    // Using current year best practices for Twitter/X:
    // - Concise, value-first format
    // - Thread-ready structure
    // - Strong hook in first tweet
    // - Conversation starter
    
    const intro = `My ${audience} clients are seeing amazing results with Tranont products. Here's why: [THREAD]`;
    
    // Format recommendations as concise, tweet-friendly points
    let body = '';
    if (recommendations.length > 0) {
      body = recommendations[0];
    }
    
    // Add question to drive engagement
    const conclusion = `What health goals are you working on this month? Tranont products might be the solution you've been searching for.`;
    
    return `${intro}\n\n${body}\n\n${conclusion}`;
  };
  
  const generateTransontSocialPost = (recommendations: string[], audience: string, hashtags: string[], topic: string) => {
    // Generic cross-platform post optimized for:
    // - Authentic storytelling
    // - Clear value proposition
    // - Engagement prompt
    
    const intro = `I've been helping ${audience} transform their health with Tranont products, and the results have been incredible! 💫\n\n`;
    
    // Format recommendations as clear, value-focused points
    const body = recommendations.slice(0, 3).map((rec, index) => {
      const emoji = ['✨', '🌟', '💯'][index % 3];
      return `${emoji} ${rec}`;
    }).join('\n\n');
    
    // Add engagement prompt
    const conclusion = "\nWhat health goals are you working on? Comment below with your biggest wellness challenge, and I'll share which Tranont products might help!";
    
    return `${intro}${body}${conclusion}`;
  };
  
  const generateTransontBlogPost = (recommendations: string[], audience: string, topic: string) => {
    const title = `# Tranont Products and Business Opportunities: A Guide for ${audience}\n\n`;
    const intro = `Tranont has been transforming lives through their premium health products and business opportunities for associates. This guide explores both aspects of Tranont and how they can benefit ${audience}.\n\n`;
    
    const body = recommendations.map((rec, index) => {
      return `## ${index + 1}. ${rec}\n\nMore details would go here explaining this point about Tranont products or business opportunities in depth.\n\n`;
    }).join('');
    
    const conclusion = `## Conclusion\n\nWhether you're interested in Tranont's health products or the business opportunity, there are significant benefits available for ${audience}. Consider reaching out to a Tranont associate to learn more about which options might be right for you.\n\n`;
    
    return `${title}${intro}${body}${conclusion}`;
  };
  
  const generateTransontEmailContent = (recommendations: string[], audience: string, topic: string) => {
    const subject = `Subject: Discover Tranont Products and Business Opportunities for ${audience}\n\n`;
    const greeting = `Dear valued customer,\n\n`;
    const intro = `I wanted to share some information about how Tranont's products and business opportunities have been helping ${audience} like yourself:\n\n`;
    
    const body = recommendations.map((rec, index) => {
      return `${index + 1}. ${rec}\n\n`;
    }).join('');
    
    const conclusion = `We're here to help you learn more about Tranont products or the associate program. Feel free to reply to this email with any questions.\n\n`;
    const signature = `Warm regards,\n\n[Your Name]\nTranont Associate\n[Your Contact Information]`;
    
    return `${subject}${greeting}${intro}${body}${conclusion}${signature}`;
  };
  
  const generateTransontVideoScript = (recommendations: string[], audience: string, topic: string) => {
    const intro = `# Video Script: Tranont Products and Opportunities for ${audience}\n\n`;
    const opening = `[OPENING SCENE: People using Tranont products and successful associates]\n\nVOICEOVER: Discover how Tranont is transforming lives through premium health products and business opportunities. Especially for ${audience}.\n\n`;
    
    const segments = recommendations.map((rec, index) => {
      return `[SEGMENT ${index + 1}]\n\nVOICEOVER: ${rec}\n\n[VISUAL: Show Tranont products or associates in action, with graphical overlays highlighting key benefits]\n\n`;
    }).join('');
    
    const conclusion = `[CLOSING SCENE]\n\nVOICEOVER: Ready to transform your health or create a new income stream? Contact a Tranont associate today to learn how these products and opportunities can work for you.\n\n[DISPLAY CONTACT INFORMATION AND CALL TO ACTION]`;
    
    return `${intro}${opening}${segments}${conclusion}`;
  };
  
  const generateTransontGenericContent = (recommendations: string[], audience: string, hashtags: string[], topic: string) => {
    const intro = `# Tranont Products and Business Opportunities for ${audience}\n\n`;
    const body = recommendations.map((rec, index) => `## ${index + 1}. ${rec}\n\nMore details would go here explaining this approach in depth.\n\n`).join('');
    const conclusion = `## Summary\n\nTranont offers both premium health products and business opportunities that can benefit ${audience}. Explore these options to find the right fit for your needs and goals.\n\n`;
    
    return `${intro}${body}${conclusion}`;
  };
  
  // Helper functions for styling and formatting content
  
  const applyContentStyle = (content: string, style: string) => {
    // If the content is a video script, identify it
    const isVideoScript = content.includes('// TITLE:') && 
                         (content.includes('[SCENE') || content.includes('[OPENING SCENE'));
    
    // If it's a video script and using ariastar style, apply a simplified version of the style
    // that preserves the script format
    if (isVideoScript && style === 'ariastar') {
      // Apply a lighter version of AriaStar style that preserves formatting
      let scriptContent = content;
      
      // Find narrator sections and apply style to those only
      scriptContent = scriptContent.replace(/NARRATOR \(V\.O\):\s*([^\[]+)/g, (match, p1) => {
        // Apply casual, friendly voice to narrator lines only
        let narratorText = p1;
        narratorText = narratorText.replace(/reliable internet/gi, "reliable internet (finally!)");
        narratorText = narratorText.replace(/connectivity/gi, "real connectivity");
        narratorText = narratorText.replace(/but too often/gi, "but let's be real -");
        narratorText = narratorText.replace(/your connection/gi, "your digital lifeline");
        
        // Add some personality with occasional emoji
        narratorText = narratorText.replace(/privacy/gi, "privacy ✨");
        
        return `NARRATOR (V.O.):\n${narratorText}`;
      });
      
      // For customer testimonials, make them more authentic
      scriptContent = scriptContent.replace(/CUSTOMER:\s*"([^"]+)"/g, (match, p1) => {
        let testimonial = p1;
        testimonial = testimonial.replace(/we had to choose/gi, "I was SO tired of choosing");
        testimonial = testimonial.replace(/couldn't handle/gi, "was a total nightmare for");
        testimonial = testimonial.replace(/solved both problems/gi, "changed EVERYTHING");
        
        return `CUSTOMER:\n"${testimonial}"`;
      });
      
      // Modify title to be more AriaStar-like
      scriptContent = scriptContent.replace(/\/\/ TITLE: ([^\n]+)/, '// TITLE: The Internet Connection That Actually Gets You ✨');
      
      return scriptContent;
    }
    
    // If it's a different video script style or not a video script, proceed with normal styling
    switch (style) {
      case 'professional':
        // Already professional, no change needed
        return content;
      case 'casual':
        // Replace some phrases to sound more casual
        return content
          .replace(/essential/gi, 'important')
          .replace(/significantly/gi, 'really')
          .replace(/solutions/gi, 'options')
          .replace(/implementing/gi, 'trying')
          .replace(/connectivity/gi, 'internet')
          .replace(/challenges/gi, 'problems');
      case 'enthusiastic':
        // Add more excitement
        return content
          .replace(/\./g, '!')
          .replace(/important/gi, 'critical')
          .replace(/good/gi, 'amazing')
          .replace(/better/gi, 'fantastic')
          .replace(/improved/gi, 'transformed');
      case 'informative':
        // Add more technical terms
        return content
          .replace(/internet/gi, 'broadband connectivity')
          .replace(/fast/gi, 'high-bandwidth')
          .replace(/reliable/gi, 'low-latency')
          .replace(/better/gi, 'optimized');
      case 'ariastar':
        // Instead of forcing specific phrases, we'll just make minimal adjustments 
        // to enhance the content's style that was already generated by the AI
        let ariaContent = content;
        
        // Use language-specific phrases
        const ariaStarPhrases = language === 'es' ? {
          letsGetReal: "¡Hablemos claro por un segundo! ✨",
          everBeen: "¿Alguna vez te has sentido completamente $1 y te has preguntado si hay más en la vida? ¡YO TAMBIÉN!",
          wildTruth: "Aquí está mi verdad sin filtros",
          changedEverything: "lo cambió TODO (y no exagero)",
          psFinal: "P.D. Sin presión para responder, ¡pero estoy aquí si tienes curiosidad! ¡La mejor decisión que tomé este año (después de cancelar esa suscripción que nunca usaba)! 💕",
          painPoint: "¿Te has encontrado atrapado en $1 pero sigues sintiendo que algo falta?",
          contrast: "A diferencia de los típicos enfoques de $1 que solo añaden más complicaciones, aquí hay una perspectiva fresca.",
          question: "¿Y si tu manera de abordar $1 pudiera crear más alegría, no solo más resultados?",
          story: "Solía pensar que dominar $1 significaba hacer más, más rápido. Entonces algo cambió.",
          futureYou: "¡Tu futuro yo ya te está agradeciendo!",
          qualityOverQuantity: "Recuerda, la magia sucede cuando elegimos calidad sobre cantidad.",
          startWithOne: "Comienza con UN solo cambio. Así es como empieza toda transformación.",
          realTalk: "Hablemos en serio",
          honestMoment: "Un momento de honestidad",
          surprising: "¿Sorprendido? ¡Yo también lo estuve!",
          betterWay: "Existe una mejor manera",
          truthBomb: "Prepárate para una bomba de verdad",
          netflixAnalogy: "Es como cuando encuentras esa serie perfecta en Netflix - ¡no puedes parar!",
          coffeeChatAnalogy: "Como charlar con un amigo que casualmente es experto",
          wifiAnalogy: "Tu conexión a internet es como el café de la mañana - ¡sin él nada funciona bien!",
          challenge: "¿Cuál de estos desafíos suena más como tu día a día?",
          screenTime: "¿Te has encontrado mirando la pantalla preguntándote dónde se fue el día?",
          familiar: "¿Algo de esto te suena familiar, o solo soy yo?",
          ahaCliff: "Y aquí viene la revelación que lo cambia todo..."
        } : {
          letsGetReal: "Let's get real for a sec! ✨",
          everBeen: "Ever felt completely $1 and wondered if there's more to life? SAME!",
          wildTruth: "Here's my wild truth",
          changedEverything: "changed EVERYTHING (not even exaggerating)",
          psFinal: "P.S. No pressure to reply, but if you're curious, I'm here! Best decision I made this year (besides canceling that subscription I never used)! 💕",
          painPoint: "Ever find yourself drowning in [topic] options but still feeling stuck?",
          contrast: "Unlike typical [topic] approaches that just add more complexity, here's a fresh perspective.",
          question: "What if your approach to [topic] could actually create more joy, not just more output?",
          story: "I used to think mastering [topic] meant doing more, faster. Then something changed.",
          futureYou: "Your future self is already thanking you!",
          qualityOverQuantity: "Remember, the magic happens when we choose quality over quantity.",
          startWithOne: "Start with just ONE change. That's how every transformation begins.",
          realTalk: "Real talk",
          honestMoment: "Honest moment",
          surprising: "Surprised? So was I",
          betterWay: "There is a better way",
          truthBomb: "Here comes a truth bomb",
          netflixAnalogy: "It's like finding that perfect Netflix series - you just can't stop!",
          coffeeChatAnalogy: "Like a coffee chat with a friend who happens to be an expert",
          wifiAnalogy: "Your internet connection is like your morning coffee - nothing works without it!",
          challenge: "Which of these challenges sounds most like your day?",
          screenTime: "Have you ever found yourself staring at your screen wondering where the day went?",
          familiar: "Does any of this sound familiar, or is it just me?",
          ahaCliff: "And here comes the game-changing revelation..."
        };
        
        // Check if content already has AriaStar's signature elements
        const hasSignatureStyle = content.includes('✨') || 
                               content.includes('SAME!') || 
                               content.includes('¡YO TAMBIÉN!') ||
                               /Here's my wild truth|Aquí está mi verdad sin filtros/.test(content);
        
        // Make sentences shorter and punchier - split long sentences for AriaStar's characteristic style
          ariaContent = ariaContent.replace(/(\. )([A-Z])/g, '.\n\n$2');
        ariaContent = ariaContent.replace(/(\? )([A-Z])/g, '?\n\n$2');
        ariaContent = ariaContent.replace(/(\! )([A-Z])/g, '!\n\n$2');
        
        // Instead of forcing specific phrases, we'll only add emojis and formatting adjustments
        // to enhance the content's AriaStar style without changing the actual content
        
        // Add some strategic emojis if they're not already present
        if (!hasSignatureStyle) {
          // Add emojis to key sentences (approximately 1 in 5)
          ariaContent = ariaContent.replace(/\b(amazing|fantastic|incredible|life-changing|transformative|breakthrough)\b/gi, '✨ $1 ✨');
          ariaContent = ariaContent.replace(/\b(warning|caution|danger|avoid|mistake|problem|challenge)\b/gi, '⚠️ $1');
          ariaContent = ariaContent.replace(/\b(secret|hack|trick|shortcut|strategy|method)\b/gi, '🔑 $1');
          
          // Add a sparkle emoji to the title if it doesn't have one
          if (!/^#.*✨/.test(ariaContent)) {
            ariaContent = ariaContent.replace(/^#\s+(.+)$/, '# $1 ✨');
          }
          
          // Add a P.S. if there isn't one already and content is long enough
          if (!ariaContent.includes('P.S.') && !ariaContent.includes('P.D.') && ariaContent.length > 500) {
            ariaContent += `\n\nP.S. ${language === 'es' ? ariaStarPhrases.startWithOne : ariaStarPhrases.startWithOne}`;
          }
        }
        
        return ariaContent;
      case 'specialist_mentor':
        // Enhance MentorPro's authoritative but accessible mentor style without forcing content
        let mentorContent = content;
        
        // Check if content already has specialist mentor styling elements
        const hasMentorStyle = mentorContent.includes('Step') || 
                               mentorContent.includes('framework') || 
                               mentorContent.includes('clients') ||
                               mentorContent.includes('mastery');
        
        if (!hasMentorStyle) {
          // Add minimal style enhancements that don't change the core content
          
          // Format headings with a professional style if they exist
          mentorContent = mentorContent.replace(/^#\s+(.+)$/gm, '# $1: Expert Perspective');
          
          // Add professional formatting - improve readability with bullet points for lists
          mentorContent = mentorContent.replace(/(\d+\.\s+)([A-Z])/g, '• $2');
          
          // Enhance any percentages or statistics with professional framing
          mentorContent = mentorContent.replace(/(\d+%)/g, '**$1**');
          
          // Add subtle professional touches to language without changing meaning
          mentorContent = mentorContent.replace(/\b(tips|ideas|suggestions)\b/gi, 'strategies');
          mentorContent = mentorContent.replace(/\b(problems|issues)\b/gi, 'challenges');
        }
        
        return mentorContent;
      case 'ai_collaborator':
        // Enhance AllInsight's transparent AI collaboration style without forcing content
        let aiContent = content;
        
        // Check if content already has AI collaborator styling elements
        const hasAiStyle = aiContent.includes('AI') || 
                           aiContent.includes('collaboration') || 
                           aiContent.includes('partnership') ||
                           aiContent.includes('human');
        
        if (!hasAiStyle) {
          // Add minimal style enhancements that don't change the core content
          
          // Add subtle transparency elements
          if (aiContent.includes('# ')) {
            // If there's a title, add a subtle collaboration note
            aiContent = aiContent.replace(/^#\s+(.+)$/m, '# $1\n\n*Created through thoughtful human-AI collaboration*');
          }
          
          // Add emphasis to technical terms without changing meaning
          aiContent = aiContent.replace(/\b(algorithm|neural network|machine learning|data|analysis)\b/gi, '*$1*');
        }
        
        return aiContent;
      case 'synthesis_maker':
        // Enhance SynthesisSage's synthesis-making style without forcing content
        let synthesisContent = content;
        
        // Check if content already has synthesis style elements
        const hasSynthesisStyle = synthesisContent.includes('connection') || 
                                 synthesisContent.includes('pattern') || 
                                 synthesisContent.includes('intersection') ||
                                 synthesisContent.includes('framework');
        
        if (!hasSynthesisStyle) {
          // Add minimal style enhancements that don't change the core content
          
          // Add emphasis to connective terms
          synthesisContent = synthesisContent.replace(/\b(connects|links|bridges|integrates|combines)\b/gi, '**$1**');
          
          // Format headings to emphasize synthesis if they exist
          synthesisContent = synthesisContent.replace(/^##\s+(.+)$/gm, '## $1 — Connecting Disciplines');
        }
        
        return synthesisContent;
      case 'sustainable_advocate':
        // Enhance EcoEssence's values-based sustainability style without forcing content
        let ecoContent = content;
        
        // Check if content already has sustainability style elements
        const hasEcoStyle = ecoContent.includes('sustainable') || 
                           ecoContent.includes('eco') || 
                           ecoContent.includes('environment') ||
                           ecoContent.includes('mindful');
        
        if (!hasEcoStyle) {
          // Add minimal style enhancements that don't change the core content
          
          // Add subtle eco-friendly emphasis to relevant terms
          ecoContent = ecoContent.replace(/\b(sustainable|green|eco-friendly|natural|organic)\b/gi, '*$1*');
          
          // Format headings with gentle sustainability framing if they exist
          ecoContent = ecoContent.replace(/^#\s+(.+)$/m, '# $1 — For a Mindful Approach');
        }
        
        return ecoContent;
      case 'data_visualizer':
        // Enhance DataStory's data visualization style without forcing content
        let dataContent = content;
        
        // Check if content already has data style elements
        const hasDataStyle = dataContent.includes('data') || 
                            dataContent.includes('trend') || 
                            dataContent.includes('analysis') ||
                            dataContent.includes('metric');
        
        if (!hasDataStyle) {
          // Add minimal style enhancements that don't change the core content
          
          // Add emphasis to data-related terms
          dataContent = dataContent.replace(/\b(data|metrics|statistics|trends|analytics)\b/gi, '**$1**');
          
          // Format percentages and numbers for better visibility
          dataContent = dataContent.replace(/(\d+%|\d+\.\d+)/g, '**$1**');
        }
        
        return dataContent;
      case 'multiverse_curator':
        // Enhance NexusVerse's multiverse experience style without forcing content
        let nexusContent = content;
        
        // Check if content already has multiverse style elements
        const hasNexusStyle = nexusContent.includes('experience') || 
                             nexusContent.includes('immersive') || 
                             nexusContent.includes('journey') ||
                             nexusContent.includes('dimension');
        
        if (!hasNexusStyle) {
          // Add minimal style enhancements that don't change the core content
          
          // Add emphasis to experience-related terms
          nexusContent = nexusContent.replace(/\b(experience|journey|path|world|universe)\b/gi, '*$1*');
          
          // Format headings with gentle multiverse framing if they exist
          nexusContent = nexusContent.replace(/^#\s+(.+)$/m, '# $1 — Across Dimensions');
        }
        
        return nexusContent;
      case 'ethical_tech':
        // Transform content into TechTranslate's ethical tech translation style
        let techContent = content;
        
        // Add ethical tech framing
        techContent = techContent.replace(/^(.*?)([\.\?\!])(\s|$)/m, "# Tech That Serves Humanity: $1$2$3\n\n_Technology explained with ethics at the center_\n\n");
        
        // Add technical context with accessibility
        if (!techContent.includes("technical") && !techContent.includes("works by")) {
          const techText = "**How This Works:** The technical mechanism is [technical explanation], which in human terms means [accessible explanation]. This matters because [ethical implication].\n\n$2$3";
          techContent = techContent.replace(/(\. )([A-Z][^\.]+\.)(\s)/g, `$1\n\n${techText}`);
        }
        
        // Add ethical considerations
        if (!techContent.includes("ethical") && !techContent.includes("implications")) {
          techContent += "\n\n## Ethical Considerations\nEvery technology comes with responsibilities. Here's what to be aware of:\n1. **Data Privacy:** [Privacy implications explained]\n2. **Accessibility:** [Who might be excluded]\n3. **Environmental Impact:** [Sustainability considerations]";
        }
        
        // Add technical-ethical balance
        techContent += "\n\n**Technical Brilliance ≠ Human Value:** Technology is only as good as its service to humanity. This solution balances technical capabilities with ethical guardrails.";
        
        return techContent;
      case 'niche_community':
        // Enhance OurCorner's community building style without forcing content
        let communityContent = content;
        
        // Check if content already has community style elements
        const hasCommunityStyle = communityContent.includes('community') || 
                                 communityContent.includes('member') || 
                                 communityContent.includes('together') ||
                                 communityContent.includes('shared');
        
        if (!hasCommunityStyle) {
          // Add minimal style enhancements that don't change the core content
          
          // Add emphasis to community-related terms
          communityContent = communityContent.replace(/\b(community|together|shared|members|collective)\b/gi, '*$1*');
          
          // Format headings with gentle community framing if they exist
          communityContent = communityContent.replace(/^#\s+(.+)$/m, '# $1 — For Our Community');
        }
        
        return communityContent;
      default:
        return content;
    }
  };
  
  const adjustContentLength = (content: string, length: string) => {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    
    switch (length) {
      case 'short':
        // Reduce to approximately 30-50% of original length
        const shortLength = Math.max(1, Math.floor(sentences.length * 0.4));
        return sentences.slice(0, shortLength).join(' ');
      case 'medium':
        // Keep as is or slightly trim
        return content;
      case 'long':
        // Expand content by approximately 30-50%
        const expandedSentences = [...sentences];
        
        // Add elaboration to some sentences
        for (let i = 0; i < Math.floor(sentences.length * 0.3); i++) {
          const index = Math.floor(Math.random() * sentences.length);
          const elaborations = [
            ' This is particularly important in today\'s environment.',
            ' Many experts in the field agree with this assessment.',
            ' Research has consistently shown this to be effective.',
            ' This approach has been validated in multiple case studies.',
            ' Consider implementing this as a core strategy.'
          ];
          const elaboration = elaborations[Math.floor(Math.random() * elaborations.length)];
          
          if (expandedSentences[index]) {
            expandedSentences[index] = expandedSentences[index].replace(/[.!?]+$/, elaboration + '.');
          }
        }
        
        return expandedSentences.join(' ');
      default:
        return content;
    }
  };
  
  // Generic function to add call to action - no specific company references
  const addCallToAction = (content: string, contentType: string, platform: string): string => {
    let cta = '';
    
    // Add different CTAs based on platform and content type
    if (platform.includes('social') || platform.includes('facebook') || platform.includes('instagram')) {
      cta = '\n\n🌟 Want to learn more? Contact me today for more information about how these approaches can help you.';
      } else if (contentType.includes('blog')) {
      cta = '\n\n## Ready to learn more?\n\nWhether you\'re interested in products or services that address this topic, we can help. [Contact me](https://example.com/consult) to learn more.';
      } else if (contentType.includes('email')) {
      cta = '\n\nReady to learn more? Reply to this email or call (555) 123-4567 to schedule a free consultation.';
      } else if (contentType.includes('video')) {
      cta = '\n\n[CALL TO ACTION]\nVOICEOVER: Contact us today to learn more about our products and services.';
      } else {
      cta = '\n\n## Contact Us\n\nReady to learn more? Contact us today for more information: (555) 123-4567 or visit our website';
    }
    
    return content + cta;
  };
  
  const addHashtags = (content: string, hashtags: string[]) => {
    if (!content || !hashtags || hashtags.length === 0) return content;

    // Check if we need to generate business-specific hashtags
    const businessSpecific = contentDetails.businessName && contentDetails.businessName.trim().length > 0;
    
    // Start with any provided custom hashtags
    let finalHashtags = [...hashtags];
    
    // If it's business-specific, add relevant hashtags
    if (businessSpecific) {
      const businessName = contentDetails.businessName || '';
      const businessType = contentDetails.businessType || '';
      const topic = contentDetails.researchTopic || '';
      
      // Generate business-specific hashtags
      const businessHashtags = [
        `#${businessName.replace(/\s+/g, '')}`,
        `#${businessType.replace(/\s+/g, '')}`,
        `#${topic.replace(/\s+/g, '')}`
      ].filter(tag => tag.length > 1);
      
      finalHashtags = Array.from(new Set([...finalHashtags, ...businessHashtags]));
    }
    
    // Clean and format hashtags
    finalHashtags = finalHashtags
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
      .map(tag => tag.replace(/\s+/g, ''));
    
    // Add hashtags based on content type
    if (contentDetails.platform === 'instagram' || contentDetails.platform === 'twitter') {
      // For Instagram and Twitter, add hashtags at the end
      return `${content}\n\n${finalHashtags.join(' ')}`;
    } else if (contentDetails.platform === 'facebook' || contentDetails.platform === 'linkedin') {
      // For Facebook and LinkedIn, add fewer hashtags, more subtly
      const limitedHashtags = finalHashtags.slice(0, 3);
      return `${content}\n\n${limitedHashtags.join(' ')}`;
    } else {
      // For other content types, add hashtags only if appropriate
    return content;
    }
  };

  // Helper function to get content type text for display
  const getContentTypeText = () => {
    const { contentType, platform } = contentDetails;
    
    let typeText = contentType || 'content';
    let platformText = platform || '';
    
    // Map content type IDs to readable text
    switch (contentType) {
      case 'social-media':
        typeText = 'Social Media Post';
        break;
      case 'blog-post':
        typeText = 'Blog Post';
        break;
      case 'email':
        typeText = 'Email';
        break;
      case 'video-script':
        typeText = 'Video Script';
        break;
      case 'youtube-script':
        typeText = 'YouTube Script';
        break;
    }
    
    // Map platform IDs to readable text
    switch (platform) {
      case 'facebook':
        platformText = 'Facebook';
        break;
      case 'instagram':
        platformText = 'Instagram';
        break;
      case 'twitter':
        platformText = 'Twitter';
        break;
      case 'linkedin':
        platformText = 'LinkedIn';
        break;
      case 'tiktok':
        platformText = 'TikTok';
        break;
    }
    
    return typeText + (platformText ? ` for ${platformText}` : '');
  };

  // Copy content to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent)
      .then(() => {
        alert('Content copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy content: ', err);
        alert('Failed to copy content. Please try selecting and copying manually.');
      });
  };

  // Handle export functionality
  const handleExport = () => {
    setShowExportModal(true);
  };

  // Function to generate PDF from content
  const handlePdfExport = () => {
    try {
      // Save current URL to navigate back after download
      const currentUrl = window.location.href;
      
      // Format date for filename
      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // Prepare content details for the PDF
      const contentTitle = `${contentDetails.contentType} for ${contentDetails.platform || 'General Use'}`;
      const audience = contentDetails.targetAudience || 'General Audience';
      const style = contentSettings.style || 'Standard';
      
      // For long content, use localStorage instead of URL parameters
      localStorage.setItem('printContent', generatedContent);
      localStorage.setItem('printTitle', contentTitle);
      localStorage.setItem('printAudience', audience);
      localStorage.setItem('printStyle', style);
      localStorage.setItem('printDate', formattedDate);
      
      // Navigate to print page with a flag to use localStorage
      const printUrl = `/print?useLocalStorage=true`;
      
      // Open print URL in new tab for PDF saving
      window.open(printUrl, '_blank');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. The content might be too large. Try copying and pasting into a document instead.');
    }
  };

  // Add toggle function for content preview expansion
  const toggleContentExpansion = () => {
    setIsContentExpanded(!isContentExpanded);
  };

  // Function to generate a Tranont-specific LinkedIn post
  const generateTransontLinkedInPost = (
    recommendations: string[],
    audience: string,
    hashtags: string[],
    topic: string
  ): string => {
    // Use personal narrative style for LinkedIn - best practice for current year
    const intro = `🔍 I've discovered something that's changing the game for ${audience}...

When I first heard about ${topic} through Tranont, I was skeptical. But after seeing the results firsthand, I had to share this with my network.`;

    // Format recommendations in a problem-solution framework
    const formattedRecommendations = recommendations
      .slice(0, 3)
      .map((rec, i) => `${i + 1}. ${rec}`)
      .join('\n\n');

    // Professional call to action
    const cta = `🤝 I'd love to connect with fellow professionals who are interested in ${topic}. Has anyone else experienced similar results with Tranont's solutions?

Drop your thoughts in the comments or DM me to continue the conversation!`;

    // Combine all sections
    const post = `${intro}

Here's what makes Tranont's approach to ${topic} so effective:

${formattedRecommendations}

${cta}`;

    return post;
  };

  // Add testing functions for APIs
  const testClaudeApi = async () => {
    try {
      const response = await fetch('/api/claude/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: "This is a test message",
          research: "Test research data",
          platform: "Test platform",
          audience: "Test audience",
          topic: "Test topic",
          contentType: "Test content type"
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        alert(`Claude API Test Error: ${data.error}`);
        return;
      }
      
      // Check if it's a simulated response
      if (typeof data.model === 'string' && data.model.includes("simulation")) {
        alert("Claude API Test: Using simulated response. Please set up a valid API key for production use.");
      } else {
        alert(`Claude API Test: Success! Using real Claude API with model: ${data.model}`);
      }
    } catch (error) {
      console.error('Error testing Claude API:', error);
      alert(`Claude API Test Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const testPerplexityApi = async () => {
    try {
      const response = await fetch('/api/perplexity/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      });

      const data = await response.json();
      
      if (data.error) {
        alert(`Perplexity API Test Error: ${data.error}`);
        return;
      }
      
      alert(`Perplexity API Test Results:
- API Key Exists: ${data.exists ? 'Yes' : 'No'}
- First characters: ${data.firstChars || 'N/A'}
- Valid: ${data.valid ? 'Yes' : 'No'}
- Message: ${data.message || 'No message'}`);
      
    } catch (error) {
      console.error('Error testing Perplexity API:', error);
      alert(`Perplexity API Test Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Add the API status indicators in the correct location
  // Make sure to add this to the component's JSX, such as above or below the content editor

  // In your JSX, add this before or after the content editor
  {/* Add this in the appropriate place in your JSX, such as before or after the editor */}
  {apiMode === 'error' && (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-start">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 className="text-sm font-medium text-red-800">Content Generation Error</h4>
          <p className="text-xs text-red-700 mt-1">
            {apiErrorDetails || 'The AI content generation API encountered an error.'}
          </p>
          <p className="text-xs text-red-700 mt-2">
            Please check your API key configuration and ensure you have sufficient credits available.
          </p>
        </div>
      </div>
    </div>
  )}

  // Now update the contextual reference in the startup message
  // Removing this line as it causes infinite renders by setting state during render
  // setStatusMessage(`Analyzing ${contentDetails.targetAudience} and ${contentDetails.platform} best practices for ${new Date().getFullYear()}...`);

  // Handle content generation with Claude API
  const generateContent = async () => {
    try {
      setIsGenerating(true);
      setError(null); // Changed from setGenerationError to setError
      setGeneratedContent("");
      
      // Extract data from form
      const audience = contentDetails.targetAudience || "users";
      const contentType = contentDetails.contentType;
      const platform = contentDetails.platform;
      let topic = contentDetails.researchTopic || "";
      const businessName = contentDetails.businessName || contentDetails.businessType || "";
      
      // Get recommendations
      const recommendations = extractRecommendationsFromResearch(researchResults?.perplexityResearch || "", topic); // Changed from researchData to researchResults?.perplexityResearch || ""
      const hashtags = extractHashtagsFromDetails(contentDetails);
      
      // Generate the content based on type and platform
      let content = "";
      
      // Social media content generation
      if (contentType === "social") {
        if (platform === "facebook") {
          content = generateBusinessFacebookPost(contentDetails);
        } else if (platform === "instagram") {
          content = generateGenericSocialPost(recommendations, audience, hashtags, topic);
        } else if (platform === "twitter") {
          content = generateGenericSocialPost(recommendations, audience, hashtags, topic);
        } else if (platform === "linkedin") {
          content = generateBusinessLinkedInPost(contentDetails);
        } else {
          content = generateGenericSocialPost(recommendations, audience, hashtags, topic);
        }
      }
      // Email content generation
      else if (contentType === "email") {
        content = generateEmailContent(recommendations, audience, topic);
      }
      // Blog content generation
      else if (contentType === "blog") {
        if (platform === "wordpress") {
          content = generateBusinessWordPressBlog(contentDetails);
        } else if (platform === "medium") {
          content = generateBusinessMediumBlog(contentDetails);
        } else if (platform === "company") {
          content = generateBusinessCompanyBlog(contentDetails);
        } else {
          content = generateBlogPost(recommendations, audience, topic);
        }
      }
      // Video script generation
      else if (contentType === "video") {
        content = generateVideoScript(recommendations, audience, topic);
      }
      // Generic content as fallback
      else {
        content = generateGenericContent(recommendations, audience, hashtags, topic);
      }
      
      // Apply style, length and other formats
      if (contentSettings.style !== "default") {
        content = applyContentStyle(content, contentSettings.style);
      }
      
      if (contentSettings.length !== "medium") {
        content = adjustContentLength(content, contentSettings.length);
      }
      
      // Add call to action if enabled
      if (contentSettings.includeCTA && !shouldHideCTAAndHashtags()) {
        content = addCallToAction(content, contentType, platform);
      }
      
      // Add hashtags if enabled
      if (contentSettings.includeHashtags && hashtags.length > 0 && !shouldHideCTAAndHashtags()) {
        content = addHashtags(content, hashtags);
      }
      
      // Update the generated content
      setGeneratedContent(content);
    } catch (error) {
      console.error("Error generating content:", error);
      setError("Failed to generate content. Please try again."); // Changed from setGenerationError to setError
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle feedback submission to refine content
  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    
    setIsRefining(true);
    
    // Store current version in history
    const currentVersion = generatedContent;
    setContentVersions([...contentVersions, currentVersion]);
    
    try {
      const response = await fetch('/api/claude/refine-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalContent: generatedContent,
          feedback: feedbackText,
          contentType: contentDetails.contentType,
          platform: contentDetails.platform,
          style: contentSettings.style,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to refine content');
      
      const data = await response.json();
      setGeneratedContent(data.content);
      setFeedbackText('');
      
      // Show success message
      toast.success('Content refined successfully!');
      
    } catch (error) {
      console.error('Error refining content:', error);
      setError(`Failed to refine content: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to refine content. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  // Add missing functions for exporting
  const exportAsText = () => {
    if (!generatedContent) return;
    // Create and download a text file
    const element = document.createElement('a');
    const file = new Blob([generatedContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `content-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportAsPDF = () => {
    if (!generatedContent) return;
    // For PDF export, we would typically use a library like jsPDF
    // For now, just alert that the feature is coming soon
    alert('PDF export functionality will be implemented soon.');
  };

  // Rename or define regenerateContent function
  const regenerateContent = () => {
    if (isGenerating) return;
    
    // If we have previous content, save it to the version history
    if (generatedContent) {
      setContentVersions([...contentVersions, generatedContent]);
    }
    
    // Start the generation process
    startGeneration();
  };

  // Add global styles for the loader
  useEffect(() => {
    // Add loader styles to document
    const style = document.createElement('style');
    style.innerHTML = `
      .loader {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      // Clean up when component unmounts
      document.head.removeChild(style);
    };
  }, []);

  // Helper functions for generating blog content for different platforms
  
  // WordPress blog post generator
  const generateWordPressBlogPost = (recommendations: string[], audience: string, topic: string): string => {
    console.log(`Generating WordPress blog about ${topic} for ${audience}`);
    
    // WordPress-specific blog format with SEO focus
    const title = `# ${topic}: A Comprehensive Guide for ${audience}\n\n`;
    
    // WordPress SEO-friendly introduction
    const intro = `## Introduction\n\nIn today's digital landscape, understanding ${topic} is crucial for ${audience}. This comprehensive guide explores key aspects and provides actionable insights based on current best practices.\n\n`;
    
    // Format recommendations as WordPress content sections with headers
    const formattedRecommendations = recommendations
      .slice(0, 5)
      .map((rec, index) => {
        return `## ${index + 1}. ${rec}\n\nWhen considering ${topic}, it's important to understand that ${rec.toLowerCase()}. This approach has proven effective for ${audience} because it addresses specific needs and challenges.\n\n![Related image for ${rec}](https://via.placeholder.com/600x400)\n\n`;
      })
      .join('');
    
    // WordPress-specific conclusion with SEO and CTAs
    const conclusion = `## Conclusion\n\nImplementing these strategies for ${topic} will help ${audience} achieve better results and overcome common challenges. Remember that consistency and adaptation to emerging trends are key to long-term success.\n\n`;
    
    // WordPress-specific metadata section
    const metadata = `<!-- wp:seo-data -->\n<!-- Categories: ${topic}, Best Practices, Guide -->\n<!-- Tags: ${topic.split(' ').join(', ')}, advice for ${audience}, comprehensive guide -->\n<!-- Featured Image: URL to featured image -->\n<!-- excerpt: A comprehensive guide to ${topic} designed specifically for ${audience}, covering best practices and actionable insights. -->\n<!-- /wp:seo-data -->\n\n`;
    
    return metadata + title + intro + formattedRecommendations + conclusion;
  };
  
  // Medium blog post generator
  const generateMediumBlogPost = (recommendations: string[], audience: string, topic: string): string => {
    console.log(`Generating Medium blog about ${topic} for ${audience}`);
    
    // Medium-specific blog format with storytelling focus
    const title = `# ${topic}: What ${audience} Need to Know in ${new Date().getFullYear()}\n\n`;
    
    // Medium-style introduction with hook
    const intro = `## The Landscape Has Changed\n\nRemember when understanding ${topic} seemed straightforward? Those days are long gone. For ${audience}, navigating this complex terrain requires new insights and approaches.\n\n`;
    
    // Personal anecdote (Medium style)
    const personalTouch = `> *"When I first approached ${topic}, I made countless mistakes that cost me time and resources. I'm sharing these insights so you don't have to learn the hard way."*\n\n`;
    
    // Format recommendations as Medium-style sections
    const formattedRecommendations = recommendations
      .slice(0, 5)
      .map((rec, index) => {
        return `## ${index + 1}. ${rec}\n\n${rec} might sound obvious, but its implementation is where most ${audience} stumble. Let me explain why this matters and how to get it right.\n\n`;
      })
      .join('');
    
    // Medium-style conclusion with reflection
    const conclusion = `## Moving Forward\n\nAs we navigate the ever-evolving landscape of ${topic}, remember that what works today might not work tomorrow. The key is to stay adaptable, continue learning, and focus on delivering value to your audience.\n\nWhat strategies have you found effective for ${topic}? Share your experiences in the responses below.\n\n`;
    
    return title + intro + personalTouch + formattedRecommendations + conclusion;
  };
  
  // Company blog post generator
  const generateCompanyBlogPost = (recommendations: string[], audience: string, topic: string): string => {
    console.log(`Generating Company blog about ${topic} for ${audience}`);
    
    // Company blog format with professional, authoritative tone
    const title = `# ${topic}: Expert Insights for ${audience}\n\n`;
    
    // Professional introduction
    const intro = `## Overview\n\nOur team of experts has analyzed current trends and best practices in ${topic} specifically as they relate to ${audience}. This guide presents our findings and actionable recommendations to help you achieve your goals.\n\n`;
    
    // Executive summary
    const executiveSummary = `## Executive Summary\n\nThis analysis of ${topic} reveals that ${audience} can benefit most from focusing on structured implementation, measurement, and continuous optimization. The following sections provide detailed guidance on each key area.\n\n`;
    
    // Format recommendations as professional sections
    const formattedRecommendations = recommendations
      .slice(0, 5)
      .map((rec, index) => {
        return `## ${index + 1}. ${rec}\n\n**Analysis:** Our research indicates that ${rec.toLowerCase()} is a critical factor for success in ${topic}.\n\n**Implementation:** We recommend a phased approach that begins with assessment, followed by strategic planning and measured execution.\n\n**Expected Outcomes:** ${audience} who implement this approach typically see improvements in key performance indicators within 3-6 months.\n\n`;
      })
      .join('');
    
    // Professional conclusion with next steps
    const conclusion = `## Conclusion and Next Steps\n\nImplementing these evidence-based strategies for ${topic} will position ${audience} for success in today's competitive environment. Our team is available for consultation to help tailor these approaches to your specific needs.\n\n`;
    
    return title + intro + executiveSummary + formattedRecommendations + conclusion;
  };
  
  // Tranont versions for different blog platforms
  
  const generateTransontWordPressBlogPost = (recommendations: string[], audience: string, topic: string): string => {
    console.log(`Generating Tranont WordPress blog about ${topic} for ${audience}`);
    
    const title = `# How Tranont's Approach to ${topic} is Transforming Results for ${audience}\n\n`;
    
    const intro = `## The Tranont Difference\n\nIn the world of health and wellness, Tranont stands apart with its unique approach to ${topic}. For ${audience} seeking real results, Tranont's science-backed products and supportive community create a powerful combination.\n\n`;
    
    // Format recommendations as WordPress content sections with headers
    const formattedRecommendations = recommendations
      .slice(0, 5)
      .map((rec, index) => {
        return `## ${index + 1}. ${rec}\n\nTranont's approach to ${rec.toLowerCase()} has proven particularly effective for ${audience}. Our community members report significant improvements when incorporating Tranont products into their daily routine.\n\n![Tranont product results](https://via.placeholder.com/600x400)\n\n`;
      })
      .join('');
    
    const conclusion = `## Join the Tranont Community\n\nThe journey to better health through ${topic} is one you don't have to take alone. Tranont offers both premium products and a supportive community of like-minded individuals and experts ready to help ${audience} achieve their goals.\n\n`;
    
    const metadata = `<!-- wp:seo-data -->\n<!-- Categories: Tranont, ${topic}, Wellness -->\n<!-- Tags: Tranont products, solutions for ${audience}, health journey -->\n<!-- Featured Image: URL to Tranont product image -->\n<!-- excerpt: Discover how Tranont's unique approach to ${topic} is helping ${audience} achieve breakthrough results with premium health products and business opportunities. -->\n<!-- /wp:seo-data -->\n\n`;
    
    return metadata + title + intro + formattedRecommendations + conclusion;
  };
  
  const generateTransontMediumBlogPost = (recommendations: string[], audience: string, topic: string): string => {
    console.log(`Generating Tranont Medium blog about ${topic} for ${audience}`);
    
    const title = `# My Journey with Tranont: How ${topic} Changed Everything for This ${audience.split(' ')[0]}\n\n`;
    
    const intro = `## The Turning Point\n\nSix months ago, I was like many ${audience} – struggling with ${topic} and looking for real solutions. That's when I discovered Tranont, and everything changed.\n\n`;
    
    const personalTouch = `> *"Before Tranont, I tried everything for ${topic}. Nothing provided the results I was looking for until I found their premium health products and supportive community."*\n\n`;
    
    const formattedRecommendations = recommendations
      .slice(0, 5)
      .map((rec, index) => {
        return `## ${index + 1}. ${rec}\n\nWhat makes Tranont's approach to ${rec.toLowerCase()} different is their commitment to quality and science. As a ${audience.split(' ')[0]}, I immediately noticed the difference in how I felt and the results I achieved.\n\n`;
      })
      .join('');
    
    const conclusion = `## My Invitation to You\n\nIf you're a ${audience} struggling with ${topic}, know that there's a better way. Tranont has transformed my approach to health and wellness, and it can do the same for you.\n\nReach out if you'd like to learn more about my personal journey or how Tranont's products might help with your specific goals.\n\n`;
    
    return title + intro + personalTouch + formattedRecommendations + conclusion;
  };
  
  const generateTransontCompanyBlogPost = (recommendations: string[], audience: string, topic: string): string => {
    console.log(`Generating Tranont Company blog about ${topic} for ${audience}`);
    
    const title = `# Tranont's Approach to ${topic}: A Guide for ${audience}\n\n`;
    
    const intro = `## Tranont's Mission\n\nAt Tranont, we're committed to helping ${audience} achieve optimal health and wellness through our premium products and supportive community. Our approach to ${topic} is based on scientific research, quality ingredients, and real-world results.\n\n`;
    
    const executiveSummary = `## Product Overview\n\nTranont offers several key products that address different aspects of ${topic}, each formulated with high-quality ingredients and manufactured in FDA-registered facilities. Our solutions are specifically designed to meet the needs of ${audience}.\n\n`;
    
    const formattedRecommendations = recommendations
      .slice(0, 5)
      .map((rec, index) => {
        return `## ${index + 1}. ${rec}\n\n**Tranont Solution:** Our approach to ${rec.toLowerCase()} combines premium products with community support and education.\n\n**Customer Results:** ${audience} using our products report significant improvements in ${topic.toLowerCase()}-related challenges within weeks of consistent use.\n\n**Expert Insight:** Tranont's health professionals recommend combining our products with lifestyle modifications for optimal results.\n\n`;
      })
      .join('');
    
    const conclusion = `## Begin Your Tranont Journey\n\nWhether you're interested in addressing ${topic} through our premium health products or exploring the business opportunity as a Tranont associate, our team is here to support you every step of the way.\n\nContact a Tranont associate today to learn which products are best suited for your specific needs as a ${audience}.\n\n`;
    
    return title + intro + executiveSummary + formattedRecommendations + conclusion;
  };

  // Add this function before the return statement
  const handleSaveContent = async () => {
    try {
      if (!generatedContent.trim()) {
        toast.error('No content to save. Please generate content first.');
        return;
      }

      // Get current user from auth
      const { auth } = await import('@/lib/firebase/firebase');
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        toast.error('You must be logged in to save content. Please log in and try again.');
        return;
      }
      
      console.log('Saving content to dashboard with user ID:', currentUser.uid);
      
      // Extract title from content or use the research topic
      let title = contentDetails.researchTopic || 'Untitled Content';
      
      // Try to extract title from the first heading in the content
      const titleMatch = generatedContent.match(/^# (.+)$/m);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1];
      }
      
      // Create tags from the content details
      const tags = [
        contentDetails.contentType,
        contentDetails.platform,
        ...(contentDetails.researchTopic ? [contentDetails.researchTopic.split(' ')[0]] : [])
      ].filter(Boolean);
      
      // Create the content data
      const contentData = {
        title,
        content: generatedContent,
        tags,
        platform: contentDetails.platform || 'general',
        subPlatform: contentDetails.subPlatform || '',
        persona: contentSettings.style || 'ariastar',
        status: 'draft' as const,
        contentType: contentDetails.contentType || 'general',
        mediaUrls: [],
        userId: currentUser.uid,
      };
      
      console.log('Saving content with data:', contentData);
      
      // Try saving content using the hook
      const contentId = await saveContent(contentData);
      console.log('Content saved successfully with ID:', contentId);
      
      toast.success('Content saved successfully to your dashboard!');
      
      // Redirect to dashboard after a slight delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
      
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error(error instanceof Error ? error.message : 'There was an error saving your content. Please try again.');
      
      // Try direct Firestore access as fallback
      try {
        console.log('Attempting direct Firestore save as fallback...');
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/firebase');
        const { auth } = await import('@/lib/firebase/firebase');
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        
        // Extract title from content or use the research topic
        let title = contentDetails.researchTopic || 'Untitled Content';
        
        // Try to extract title from the first heading in the content
        const titleMatch = generatedContent.match(/^# (.+)$/m);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1];
        }
        
        // Create tags from the content details
        const tags = [
          contentDetails.contentType,
          contentDetails.platform,
          ...(contentDetails.researchTopic ? [contentDetails.researchTopic.split(' ')[0]] : [])
        ].filter(Boolean);
        
        const docRef = await addDoc(collection(db, 'content'), {
          title,
          content: generatedContent,
          tags,
          platform: contentDetails.platform || 'general',
          subPlatform: contentDetails.subPlatform || '',
          persona: contentSettings.style || 'ariastar',
          status: 'draft' as const,
          contentType: contentDetails.contentType || 'general',
          mediaUrls: [],
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log('Content saved directly to Firestore with ID:', docRef.id);
        toast.success('Content saved directly to your dashboard!');
        
        // Redirect to dashboard after a slight delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (fallbackError) {
        console.error('Fallback save failed:', fallbackError);
        toast.error('All attempts to save content failed. Please try again later.');
      }
    }
  };

  // Helper function to determine if CTA and hashtags options should be hidden
  const shouldHideCTAAndHashtags = () => {
    const contentType = contentDetails?.contentType?.toLowerCase() || '';
    const platform = contentDetails?.platform?.toLowerCase() || '';
    return contentType.includes('presentation') || platform.includes('presentation');
  };

  // Generic social media post generator for any company/product
  const generateSocialPostForBusiness = (recommendations: string[], audience: string, hashtags: string[], topic: string, businessName: string = '') => {
    // Using current best practices for social media:
    // - Authentic storytelling approach
    // - Video-friendly text structure (as if accompanying a video)
    // - Personal testimony format
    // - Clear value proposition
    // - Conversation starter question
    
    // Create product mentions dynamically
    let productMention = businessName ? `${businessName}'s ${topic}` : topic;
    
    const intro = `I've been helping ${audience} transform their experience with ${productMention}. The results have been nothing short of remarkable.\n\n`;
    
    // Use professional, detailed style
    let body = `Here's what makes ${businessName ? `${businessName}'s` : 'this'} approach so effective:\n\n`;
    
    body += recommendations.slice(0, 3).map((rec, index) => {
      return `🔹 ${rec}`;
    }).join('\n\n');
    
    // Add professional conclusion
    const conclusion = `\nAs professionals, we have a responsibility to share solutions that actually work. I'd love to hear from others who value evidence-based approaches.\n\nWhat questions do you have about ${topic}?`;
    
    return `${intro}${body}${conclusion}`;
  };

  // Replace the helper functions section for Tranont content
  // Helper functions for generating content for any business
  const generateBusinessSpecificContent = (recommendations: string[], audience: string, hashtags: string[], topic: string, businessName: string = '') => {
    // Using universal best practices with business customization
    const companyName = businessName || "our business";
    
    // Create a headline that features the business and topic
    const headline = `📣 Essential ${topic} insights that ${audience} needs to know from ${companyName}:\n\n`;
    
    // Format content in a scannable way with emojis
    const content = recommendations.slice(0, 3).map((rec, index) => {
      const emoji = ['🔑', '💡', '⭐️'][index % 3];
      return `${emoji} ${rec}`;
    }).join('\n\n');
    
    // Add an engagement prompt focused on the topic and business
    const engagement = `\n\nWhat's your biggest question about ${topic}? Drop it in the comments below and let's discuss how ${companyName} can help!`;
    
    return `${headline}${content}${engagement}`;
  };

  // Check if this is business-specific content
  const isBusinessSpecificContent = contentDetails.targetAudience?.toLowerCase().includes(contentDetails.businessType?.toLowerCase() || '') ||
    contentDetails.researchTopic?.toLowerCase().includes(contentDetails.businessType?.toLowerCase() || '') ||
    (contentDetails.businessType && contentDetails.businessType.length > 0);

  // Generate hashtags based on content
  let hashtags = [];
  if (isBusinessSpecificContent && contentDetails.businessType) {
    hashtags = [`#${contentDetails.businessType}`, '#HealthAndWellness', '#BusinessOpportunity', '#Quality', '#CustomerService'];
  } else {
    // Generic hashtags based on content type
    if (contentDetails.contentType === 'Social Media Post') {
      hashtags = ['#Wellness', '#Health', '#LifestyleChange'];
    } else if (contentDetails.contentType === 'Email') {
      hashtags = ['#Newsletter', '#Updates', '#StayInformed'];
    } else {
      hashtags = ['#Blog', '#Article', '#InformationSharing'];
    }
  }

  // Add platform-specific hashtags
  if (contentDetails.platform === 'Instagram') {
    hashtags.push('#InstagramPost', '#InstaHealth', '#WellnessJourney');
  } else if (contentDetails.platform === 'Facebook') {
    hashtags.push('#FacebookCommunity', '#SocialMedia', '#Connection');
  } else if (contentDetails.platform === 'Twitter') {
    hashtags.push('#TwitterTips', '#QuickUpdates', '#TrendingTopics');
  } else if (contentDetails.platform === 'LinkedIn') {
    hashtags.push('#ProfessionalNetwork', '#BusinessInsights', '#CareerGrowth');
  }

  // Add topic-specific hashtags if available
  if (contentDetails.researchTopic) {
    const topicHashtag = `#${contentDetails.researchTopic.replace(/\s+/g, '')}`;
    hashtags.push(topicHashtag);
  }

  // Add audience-specific hashtags if available
  if (contentDetails.targetAudience) {
    const audienceHashtag = `#${contentDetails.targetAudience.replace(/\s+/g, '')}`;
    hashtags.push(audienceHashtag);
  }

  const getSocialMediaPlatforms = () => {
    return [
      { id: 'facebook', name: t('contentPage.platforms.facebook') },
      { id: 'instagram', name: t('contentPage.platforms.instagram') },
      { id: 'twitter', name: t('contentPage.platforms.twitter') }, 
      { id: 'linkedin', name: t('contentPage.platforms.linkedin') },
      { id: 'tiktok', name: t('contentPage.platforms.tiktok') },
      { id: 'youtube', name: t('contentPage.platforms.youtube') },
      { id: 'reddit', name: t('contentPage.platforms.reddit') },
      { id: 'pinterest', name: t('contentPage.platforms.pinterest') },
      { id: 'threads', name: t('contentPage.platforms.threads') }
    ];
  };

  // Replace all instances of Tranont with generic business terminology
  const generateBusinessFacebookPost = (contentDetails: any) => {
    const { targetAudience, recommendations, businessType, researchTopic, topic } = contentDetails;
    let audience = targetAudience || "health-conscious individuals";
    const recommendations5 = recommendations?.slice(0, 5) || [];
    const topic1 = topic || researchTopic || "health and wellness";
    
    // Get product mentions
    let productMentions = "our premium products";
    if (businessType) {
      productMentions = `our ${businessType} products`;
    }
    
    const intro = `For the past year, I've been helping ${audience} transform their journey with ${productMentions}. The results have been nothing short of remarkable.\n\n`;
    
    // Generate the post body
    let body = "Here's what makes our approach so effective:\n\n";
    recommendations5.forEach((rec: string, index: number) => {
      body += `${index + 1}. ${rec}\n`;
    });
    
    // Add a call to action
    const callToAction = `\n\nWhat health goals are you working on? Comment below to learn more about our natural health solutions, and tell me which product you're most curious about!`;
    
    return intro + body + callToAction;
  };

  // Function to generate a business-specific LinkedIn post
  const generateBusinessLinkedInPost = (contentDetails: any) => {
    const { targetAudience, recommendations, researchTopic, topic, businessType } = contentDetails;
    let audience = targetAudience || "professionals";
    const recommendations5 = recommendations?.slice(0, 5) || [];
    const topic1 = topic || researchTopic || "health and wellness";
    const businessName = businessType || "our business";
    
    const intro = `I wanted to share an important discovery that's been transforming lives in my professional network.

When I first heard about ${topic1} through ${businessName}, I was skeptical. But after seeing the results firsthand, I had to share this with my network.`;
    
    let body = "\n\n";
    recommendations5.forEach((rec: string, index: number) => {
      body += `${index + 1}. ${rec}\n`;
    });
    
    const conclusion = `\n\nThe science behind these results is compelling. Has anyone else experienced similar results with our solutions?
    
#ProfessionalDevelopment #${topic1.replace(/\s+/g, '')} #Results

Here's what makes our approach to ${topic1} so effective:`;
    
    return intro + body + conclusion;
  };

  // Generic versions for different blog platforms
  const generateBusinessWordPressBlog = (contentDetails: any) => {
    const { targetAudience, recommendations, researchTopic, topic, businessType } = contentDetails;
    let audience = targetAudience || "health-conscious individuals";
    const recommendations5 = recommendations?.slice(0, 5) || [];
    const topic1 = topic || researchTopic || "health and wellness";
    const businessName = businessType || "Our Business";
    
    console.log(`Generating ${businessName} WordPress blog about ${topic1} for ${audience}`);
    
    const title = `# How Our Approach to ${topic1} is Transforming Results for ${audience}\n\n`;
    
    const intro = `## The ${businessName} Difference\n\nIn the world of health and wellness, we stand apart with our unique approach to ${topic1}. For ${audience} seeking real results, our science-backed products and supportive community create a powerful combination.\n\n`;
    
    let body = "";
    recommendations5.forEach((rec: string, index: number) => {
      return `## ${index + 1}. ${rec}\n\nOur approach to ${rec.toLowerCase()} has proven particularly effective for ${audience}. Our community members report significant improvements when incorporating our products into their daily routine.\n\n![Product results](https://via.placeholder.com/600x400)\n\n`;
    });
    
    const conclusion = `## Join Our Community\n\nThe journey to better health through ${topic1} is one you don't have to take alone. We offer both premium products and a supportive community of like-minded individuals and experts ready to help ${audience} achieve their goals.\n\n`;
    
    const metadata = `<!-- wp:seo-data -->\n<!-- Categories: ${businessName}, ${topic1}, Wellness -->\n<!-- Tags: Premium products, solutions for ${audience}, health journey -->\n<!-- Featured Image: URL to product image -->\n<!-- excerpt: Discover how our unique approach to ${topic1} is helping ${audience} achieve breakthrough results with premium health products and business opportunities. -->\n<!-- /wp:seo-data -->\n\n`;
    
    return metadata + title + intro + body + conclusion;
  };

  const generateBusinessMediumBlog = (contentDetails: any) => {
    const { targetAudience, recommendations, researchTopic, topic, businessType } = contentDetails;
    let audience = targetAudience || "health-conscious individuals";
    const recommendations5 = recommendations?.slice(0, 5) || [];
    const topic1 = topic || researchTopic || "health and wellness";
    const businessName = businessType || "our business";
    
    console.log(`Generating ${businessName} Medium blog about ${topic1} for ${audience}`);
    
    const title = `# My Journey: How ${topic1} Changed Everything for This ${audience.split(' ')[0]}\n\n`;
    
    const intro = `![Health transformation](https://via.placeholder.com/800x400)\n\nLike many ${audience}, I spent years searching for real solutions. That's when I discovered ${businessName}, and everything changed.\n\n`;
    
    const personalTouch = `> *"Before discovering these products, I tried everything for ${topic1}. Nothing provided the results I was looking for until I found their premium health products and supportive community."*\n\n`;
    
    let body = "";
    recommendations5.forEach((rec: string, index: number) => {
      return `## ${index + 1}. ${rec}\n\nWhat makes our approach to ${rec.toLowerCase()} different is the commitment to quality and science. As a ${audience.split(' ')[0]}, I immediately noticed the difference in how I felt and the results I achieved.\n\n`;
    });
    
    const conclusion = `## My Invitation to You\n\nIf you're a ${audience} struggling with ${topic1}, know that there's a better way. This approach has transformed my health and wellness, and it can do the same for you.\n\nReach out if you'd like to learn more about my personal journey or how these products might help with your specific goals.\n\n`;
    
    return title + intro + personalTouch + body + conclusion;
  };

  const generateBusinessCompanyBlog = (contentDetails: any) => {
    const { targetAudience, recommendations, researchTopic, topic, businessType } = contentDetails;
    let audience = targetAudience || "health-conscious individuals";
    const recommendations5 = recommendations?.slice(0, 5) || [];
    const topic1 = topic || researchTopic || "health and wellness";
    const businessName = businessType || "Our Business";
    
    console.log(`Generating ${businessName} Company blog about ${topic1} for ${audience}`);
    
    const title = `# Our Approach to ${topic1}: A Guide for ${audience}\n\n`;
    
    const intro = `## Our Mission\n\nWe're committed to helping ${audience} achieve optimal health and wellness through our premium products and supportive community. Our approach to ${topic1} is based on scientific research, quality ingredients, and a commitment to real results.\n\n`;
    
    const executiveSummary = `## Product Overview\n\nWe offer several key products that address different aspects of ${topic1}, each formulated with high-quality ingredients and manufactured in FDA-registered facilities. Our solutions are specifically designed to help ${audience} overcome common challenges and achieve their goals.\n\n`;
    
    let body = "";
    recommendations5.forEach((rec: string, index: number) => {
      return `## ${index + 1}. ${rec}\n\n**Our Solution:** Our approach to ${rec.toLowerCase()} combines premium products with community support and education.\n\n**Customer Results:** ${audience} using our products report significant improvements in ${topic1.toLowerCase()}-related challenges within weeks of consistent use.\n\n**Expert Insight:** Our health professionals recommend combining our products with lifestyle modifications for optimal results.\n\n`;
    });
    
    const conclusion = `## Begin Your Journey\n\nWhether you're interested in addressing ${topic1} through our premium health products or exploring business opportunities, our team is here to support you every step of the way.\n\nContact us today to learn which products are best suited for your specific needs as a ${audience}.\n\n`;
    
    return title + intro + executiveSummary + body + conclusion;
  };

  return (
    <AppShell hideHeader={true}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('contentPage.title')}</h1>
          <p className="text-gray-600">
            {t('contentPage.subtitle')}
          </p>
          
          {/* AI Enhancement Indicator */}
          <div className="mt-4 flex items-center bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
            <div className="mr-3 bg-blue-100 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-blue-800">
                <strong>{t('contentPage.aiPowered.title')}</strong> {t('contentPage.aiPowered.description')}
              </p>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">{t('contentPage.details')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500 font-medium">{t('contentPage.contentTypeLabel')}</p>
              <p className="font-medium">{getContentTypeText()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500 font-medium">{t('contentPage.targetAudienceLabel')}</p>
              <p className="font-medium">{contentDetails?.targetAudience || '-'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500 font-medium">{t('contentPage.researchTopicLabel')}</p>
              <p className="font-medium">{contentDetails?.researchTopic || '-'}</p>
            </div>
          </div>
        </section>

        {/* Content Settings Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <section className="bg-white rounded-lg shadow-md p-6 h-full">
              <h2 className="text-xl font-semibold mb-4">{t('contentPage.aiSettings')}</h2>
              
              {/* Content Style */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('contentPage.settings.style')}
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={contentSettings.style}
                  onChange={(e) => setContentSettings({...contentSettings, style: e.target.value})}
                >
                  {CONTENT_STYLES[(contentDetails?.contentType && CONTENT_STYLES[contentDetails.contentType]) ? contentDetails.contentType : 
                   (contentDetails?.contentType && CONTENT_STYLES[contentDetails.contentType.replace(/-/g, ' ')]) ? contentDetails.contentType.replace(/-/g, ' ') : 
                   'default'].map((style) => (
                    <option key={style.id} value={style.id}>
                      {style.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Content Length */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('contentPage.settings.length')}
                </label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={contentSettings.length}
                  onChange={(e) => setContentSettings({...contentSettings, length: e.target.value})}
                >
                  <option value="short">{t('contentPage.lengthOptions.short')}</option>
                  <option value="medium">{t('contentPage.lengthOptions.medium')}</option>
                  <option value="long">{t('contentPage.lengthOptions.long')}</option>
                </select>
              </div>
              
              {/* Presentation-specific options */}
              {shouldShowPresentationOptions() && (
                <>
                  {/* Divider with label */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-2 text-sm text-gray-500">{t('contentPage.settings.presentationOptions')}</span>
                    </div>
                  </div>
                
                  {/* Slide Count */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contentPage.settings.slideCount')}
                    </label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={contentSettings.slideCount || '10'}
                      onChange={(e) => setContentSettings({...contentSettings, slideCount: e.target.value})}
                    >
                      <option value="5">{t('contentPage.slideCountOptions.veryShort', {count: 5})}</option>
                      <option value="10">{t('contentPage.slideCountOptions.short', {count: 10})}</option>
                      <option value="15">{t('contentPage.slideCountOptions.medium', {count: 15})}</option>
                      <option value="20">{t('contentPage.slideCountOptions.long', {count: 20})}</option>
                    </select>
                  </div>
                  
                  {/* Presentation Format */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contentPage.settings.presentationFormat')}
                    </label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={contentSettings.presentationFormat || 'informative'}
                      onChange={(e) => setContentSettings({...contentSettings, presentationFormat: e.target.value})}
                    >
                      <option value="informative">{t('contentPage.formatOptions.informative')}</option>
                      <option value="persuasive">{t('contentPage.formatOptions.persuasive')}</option>
                      <option value="analytical">{t('contentPage.formatOptions.analytical')}</option>
                      <option value="inspirational">{t('contentPage.formatOptions.inspirational')}</option>
                    </select>
                  </div>
                  
                  {/* Technical Level */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contentPage.settings.technicalLevel')}
                    </label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={contentSettings.technicalLevel || 'balanced'}
                      onChange={(e) => setContentSettings({...contentSettings, technicalLevel: e.target.value})}
                    >
                      <option value="general">{t('contentPage.technicalOptions.general')}</option>
                      <option value="balanced">{t('contentPage.technicalOptions.balanced')}</option>
                      <option value="technical">{t('contentPage.technicalOptions.technical')}</option>
                      <option value="expert">{t('contentPage.technicalOptions.expert')}</option>
                    </select>
                  </div>
                  
                  {/* Section Options */}
                  <div className="mb-6 space-y-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contentPage.settings.optionalSections')}
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={contentSettings.includeExecutiveSummary !== false}
                        onChange={(e) => setContentSettings({...contentSettings, includeExecutiveSummary: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('contentPage.sectionOptions.executiveSummary')}</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={contentSettings.includeActionItems !== false}
                        onChange={(e) => setContentSettings({...contentSettings, includeActionItems: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('contentPage.sectionOptions.actionItems')}</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={contentSettings.includeDataVisualizations !== false}
                        onChange={(e) => setContentSettings({...contentSettings, includeDataVisualizations: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('contentPage.sectionOptions.dataVisualizations')}</span>
                    </label>
                  </div>
                  
                  {/* Note about future presentation export formats */}
                  <div className="mt-4 mb-6 text-xs text-gray-500 bg-blue-50 p-3 rounded-md border border-blue-100">
                    <div className="flex">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-1 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>
                        {language === 'es' ? 
                          'Próximamente: Exportación directa a PowerPoint, Google Slides y formatos de presentación visuales.' : 
                          'Coming soon: Direct export to PowerPoint, Google Slides, and visual presentation formats.'}
                      </span>
                    </div>
                  </div>
                </>
              )}
              
              {/* CTA Checkbox - Only show for applicable content types */}
              {shouldShowSocialOptions() && !shouldHideCTAAndHashtags() && (
                <div className="mb-6">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={contentSettings.includeCTA}
                      onChange={(e) => setContentSettings({...contentSettings, includeCTA: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('contentPage.settings.includeCTA')}</span>
                  </label>
                </div>
              )}
              
              {/* Hashtags Checkbox - Only show for applicable content types */}
              {shouldShowSocialOptions() && !shouldHideCTAAndHashtags() && (
                <div className="mb-6">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={contentSettings.includeHashtags}
                      onChange={(e) => setContentSettings({...contentSettings, includeHashtags: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('contentPage.settings.includeHashtags')}</span>
                  </label>
                </div>
              )}
              
              <button
                onClick={regenerateContent}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isGenerating}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {t('contentPage.buttons.regenerate')}
              </button>
            </section>
          </div>
          
          <div className="md:col-span-2">
            <section className="bg-white rounded-lg shadow-md p-6 h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{t('contentPage.generatedContent')}</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={copyToClipboard}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <IconCopy className="h-4 w-4 mr-1" />
                    {t('contentPage.buttons.copy')}
                  </button>
                  <button 
                    onClick={exportAsText}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <IconFileText className="h-4 w-4 mr-1" />
                    {t('contentPage.buttons.exportText')}
                  </button>
                  <button 
                    onClick={exportAsPDF}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative"
                  >
                    <IconFile className="h-4 w-4 mr-1" />
                    {t('contentPage.buttons.exportPDF')}
                    <span className="absolute -top-2 -right-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Soon
                    </span>
                  </button>
                </div>
              </div>
              
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-sm border border-gray-100">
                  <div className="w-16 h-16 mb-4 relative">
                    <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-medium mb-2">{t('contentPage.generating')}</h3>
                  <p className="text-gray-500 mb-4 text-center">
                    {statusMessage || t('contentPage.generatingMessage')}
                  </p>
                  
                  {/* Progress bar */}
                  <div className="w-full max-w-md mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-700">{t('contentPage.progress.status')}</span>
                      <span className="text-sm font-medium text-blue-700">{generationProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                        style={{ width: `${generationProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-gray-600 mt-4 text-sm">
                    {generationProgress < 30 && t('contentPage.progress.preparing')}
                    {generationProgress >= 30 && generationProgress < 60 && t('contentPage.progress.generating')}
                    {generationProgress >= 60 && generationProgress < 90 && t('contentPage.progress.formatting')}
                    {generationProgress >= 90 && t('contentPage.progress.finalizing')}
                  </div>
                </div>
              ) : generatedContent ? (
                <div className="mt-6">
                  <PersonaStyledContent
                    content={generatedContent}
                    persona={contentSettings.style || 'professional'}
                    contentType={contentDetails.contentType || 'General Content'}
                    platform={contentDetails.platform || 'General Use'}
                    isExpanded={isContentExpanded}
                    onToggleExpand={toggleContentExpansion}
                  />
                  
                  <div className="mt-6 flex flex-wrap gap-4">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700"
                    >
                      <IconCopy size={16} />
                      Copy to Clipboard
                    </button>
                    
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700"
                    >
                      <IconDownload size={16} />
                      Export
                    </button>
                    
                    <button
                      onClick={handleSaveContent}
                      className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save to Dashboard
                    </button>
                    
                    <button
                      onClick={regenerateContent}
                      className="flex items-center gap-2 rounded-md bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-300 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-700 dark:hover:bg-indigo-800/30"
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <div className="loader mr-2"></div>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      )}
                      {isGenerating ? "Generating..." : "Regenerate"}
                    </button>
                </div>
                  
                  {/* Content Feedback Section */}
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Refine Your Content</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Not completely satisfied? Provide feedback to refine your content.
                    </p>
                    <div className="mt-4">
                  <textarea 
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Example: Make it more conversational, add more data points, focus more on the benefits..."
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                        rows={3}
                      ></textarea>
                    </div>
                    <div className="mt-4 flex justify-end">
                  <button 
                    onClick={handleFeedbackSubmit}
                        disabled={!feedbackText.trim() || isRefining}
                        className="flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 dark:bg-indigo-700 dark:hover:bg-indigo-600"
                  >
                    {isRefining ? (
                      <>
                            <div className="loader mr-2"></div>
                            Refining...
                      </>
                    ) : (
                          'Refine Content'
                    )}
                  </button>
                    </div>
                  </div>
                  
                  {/* Version history */}
                  {contentVersions.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <button
                        onClick={() => setShowVersionHistory(!showVersionHistory)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {showVersionHistory ? 'Hide Version History' : 'Show Version History'}
                      </button>
                      
                      {showVersionHistory && (
                        <div className="mt-2 space-y-1">
                          <h4 className="text-sm font-medium mb-2">Previous Versions</h4>
                          <div className="space-y-1">
                            {contentVersions.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  // Store current version to allow switching back
                                  const currentVersion = generatedContent;
                                  // Set the content to the selected previous version
                                  setGeneratedContent(contentVersions[index]);
                                  // Update versions array with current version at the end
                                  const newVersions = [...contentVersions];
                                  newVersions.splice(index, 1); // Remove the one we're restoring
                                  setContentVersions([...newVersions, currentVersion]);
                                }}
                                className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 py-1 px-2 hover:bg-blue-50 rounded"
                              >
                                Version {index + 1}
                              </button>
                            ))}
                            <div className="block w-full text-left text-sm font-medium text-blue-800 py-1 px-2 bg-blue-50 rounded">
                              Current Version
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add Follow-Up Questions Component */}
                  <FollowUpQuestions 
                    content={generatedContent} 
                    research={researchResults?.perplexityResearch || ''} 
                    transcript={contentDetails.youtubeTranscript || ''}
                    contentDetails={contentDetails}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">{t('contentPage.noContent')}</p>
                </div>
              )}
            </section>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Link href="/create/research" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            {t('common.back')}
          </Link>
        </div>
      </div>
    </AppShell>
  );
} 
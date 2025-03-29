"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/lib/hooks/useTranslation';
import ReactMarkdown from 'react-markdown';

interface LandingPageDetails {
  contentType: string;
  platform: string;
  targetAudience: string;
  businessType?: string;
  researchTopic?: string;
  primarySubject?: string;
  youtubeTranscript?: string;
  deepResearch?: string;
}

interface LandingPageSection {
  id: string;
  name: string;
  icon: string;
  description: string;
  required: boolean;
  selected: boolean;
}

interface LandingPageSettings {
  title: string;
  subtitle: string;
  colorScheme: string;
  includeNewsletter: boolean;
  includeTestimonials: boolean;
  includePricing: boolean;
  ctaText: string;
  ctaUrl: string;
  sections: LandingPageSection[];
}

export default function LandingPageCreator() {
  const router = useRouter();
  const { t } = useTranslation();
  
  // State variables
  const [contentDetails, setContentDetails] = useState<LandingPageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [researchData, setResearchData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [landingPageSettings, setLandingPageSettings] = useState<LandingPageSettings>({
    title: '',
    subtitle: '',
    colorScheme: 'blue',
    includeNewsletter: true,
    includeTestimonials: true,
    includePricing: false,
    ctaText: 'Get Started',
    ctaUrl: '#',
    sections: [
      {
        id: 'hero',
        name: 'Hero Section',
        icon: '🌟',
        description: 'Main headline and initial call to action',
        required: true,
        selected: true
      },
      {
        id: 'features',
        name: 'Features Section',
        icon: '✨',
        description: 'Showcase key features or benefits',
        required: true,
        selected: true
      },
      {
        id: 'how-it-works',
        name: 'How It Works',
        icon: '🔄',
        description: 'Step-by-step process explanation',
        required: false,
        selected: true
      },
      {
        id: 'testimonials',
        name: 'Testimonials',
        icon: '💬',
        description: 'Customer quotes and success stories',
        required: false,
        selected: true
      },
      {
        id: 'pricing',
        name: 'Pricing',
        icon: '💰',
        description: 'Pricing tiers and options',
        required: false,
        selected: false
      },
      {
        id: 'faq',
        name: 'FAQ Section',
        icon: '❓',
        description: 'Frequently asked questions',
        required: false,
        selected: true
      },
      {
        id: 'newsletter',
        name: 'Newsletter Signup',
        icon: '✉️',
        description: 'Email collection form',
        required: false,
        selected: true
      },
      {
        id: 'cta',
        name: 'Call to Action',
        icon: '🔥',
        description: 'Final conversion section',
        required: true,
        selected: true
      }
    ]
  });
  
  // Load content details from session storage
  useEffect(() => {
    try {
      setIsLoading(true);
      
      // Get content details from session storage
      const storedDetails = sessionStorage.getItem('contentDetails');
      const storedResearch = sessionStorage.getItem('deepResearch');
      
      if (storedDetails) {
        const parsedDetails = JSON.parse(storedDetails);
        setContentDetails(parsedDetails);
        
        // Pre-populate title and subtitle based on research topic or business type
        setLandingPageSettings(prev => ({
          ...prev,
          title: parsedDetails.researchTopic || parsedDetails.primarySubject || parsedDetails.businessType || 'Your Landing Page',
          subtitle: `Perfect for ${parsedDetails.targetAudience || 'your audience'}`
        }));
      } else {
        // If no stored details, redirect back to create page
        console.error('No content details found in session storage');
        router.push('/create');
        return;
      }
      
      if (storedResearch) {
        setResearchData(storedResearch);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing landing page creator:', err);
      setIsLoading(false);
      setError('Failed to load content details. Please try again.');
    }
  }, [router]);
  
  // Toggle section selection
  const toggleSection = (sectionId: string) => {
    setLandingPageSettings(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId && !section.required
          ? { ...section, selected: !section.selected }
          : section
      )
    }));
  };
  
  // Handle settings change
  const handleSettingChange = (field: keyof LandingPageSettings, value: any) => {
    setLandingPageSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Generate the landing page HTML/CSS
  const handleGenerateLandingPage = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      // Validate required fields
      if (!landingPageSettings.title.trim()) {
        toast.error('Please enter a title for your landing page');
        setIsGenerating(false);
        return;
      }
      
      // Selected sections
      const selectedSections = landingPageSettings.sections
        .filter(section => section.selected)
        .map(section => section.id);
      
      // Prepare data for the API call
      const requestData = {
        contentDetails,
        landingPageSettings: {
          ...landingPageSettings,
          selectedSections
        },
        researchData
      };
      
      // Call Claude API to generate the landing page
      const response = await fetch('/api/claude/landing-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.html) {
        setGeneratedHtml(data.html);
        // Move to preview step
        setCurrentStep(2);
        toast.success('Landing page generated successfully!');
      } else {
        throw new Error('No HTML content returned from API');
      }
    } catch (err: any) {
      console.error('Error generating landing page:', err);
      setError(`Failed to generate landing page: ${err.message || 'Unknown error'}`);
      toast.error('Error generating landing page. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Export the landing page code
  const handleExportCode = () => {
    if (!generatedHtml) return;
    
    // Create a blob with the HTML content
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Create a link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'landing-page.html';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Landing page HTML exported successfully!');
  };
  
  // Preview the landing page in a new tab
  const handlePreviewLandingPage = () => {
    if (!generatedHtml) return;
    
    // Create a blob with the HTML content
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in a new tab
    window.open(url, '_blank');
    
    // Clean up after a delay to ensure the page loads
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 5000);
  };
  
  // Copy HTML code to clipboard
  const handleCopyHtml = async () => {
    if (!generatedHtml) return;
    
    try {
      await navigator.clipboard.writeText(generatedHtml);
      toast.success('HTML code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy HTML:', err);
      toast.error('Failed to copy HTML code');
    }
  };
  
  // Render step 1 - Landing Page Configuration
  const renderStep1Content = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Landing Page Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Page Title
              </label>
              <input
                type="text"
                value={landingPageSettings.title}
                onChange={(e) => handleSettingChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
                placeholder="Enter your landing page title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subtitle / Tagline
              </label>
              <input
                type="text"
                value={landingPageSettings.subtitle}
                onChange={(e) => handleSettingChange('subtitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
                placeholder="Enter a compelling subtitle"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color Scheme
              </label>
              <select
                value={landingPageSettings.colorScheme}
                onChange={(e) => handleSettingChange('colorScheme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
              >
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
                <option value="red">Red</option>
                <option value="orange">Orange</option>
                <option value="gray">Gray</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Call to Action Text
              </label>
              <input
                type="text"
                value={landingPageSettings.ctaText}
                onChange={(e) => handleSettingChange('ctaText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
                placeholder="e.g., 'Get Started', 'Sign Up', 'Learn More'"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CTA Button Link
              </label>
              <input
                type="text"
                value={landingPageSettings.ctaUrl}
                onChange={(e) => handleSettingChange('ctaUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
                placeholder="e.g., '/signup', 'https://yourdomain.com/contact'"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Page Sections</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select which sections to include in your landing page.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {landingPageSettings.sections.map((section) => (
              <div 
                key={section.id}
                onClick={() => toggleSection(section.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  section.selected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                } ${section.required ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-xl">{section.icon}</div>
                  <div>
                    <h3 className="font-medium">{section.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{section.description}</p>
                    {section.required && (
                      <span className="text-xs text-indigo-600 dark:text-indigo-400">Required</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => router.push('/create')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Back
          </button>
          <button
            onClick={handleGenerateLandingPage}
            disabled={isGenerating}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Landing Page'
            )}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render step 2 - Landing Page Preview and Export
  const renderStep2Content = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Your Landing Page</h2>
          
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="flex gap-2">
              <button
                onClick={handlePreviewLandingPage}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>
              
              <button
                onClick={handleExportCode}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export HTML
              </button>
              
              <button
                onClick={handleCopyHtml}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy HTML
              </button>
            </div>
            
            <button
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Editor
            </button>
          </div>
          
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 border-b border-gray-300 dark:border-gray-600 flex justify-between items-center">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Landing Page Preview</div>
              <div></div>
            </div>
            <div className="bg-white dark:bg-gray-800 h-96 overflow-auto p-4">
              {generatedHtml ? (
                <iframe
                  srcDoc={generatedHtml}
                  title="Landing Page Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts"
                />
              ) : (
                <div className="flex justify-center items-center h-full text-gray-500 dark:text-gray-400">
                  No preview available
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">HTML Source Code</h3>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-xs text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
                {generatedHtml || 'No code generated yet'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <AppShell hideHeader={true}>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Landing Page Builder</h1>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {/* Breadcrumb */}
            <div className="mb-6">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <a href="/create" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                      Create
                    </a>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">Landing Page</span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
            
            {/* Content Details Summary */}
            {contentDetails && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-2">Content Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-sm font-medium text-blue-600 dark:text-blue-400">Type</span>
                    <span className="text-blue-800 dark:text-blue-300">{contentDetails.contentType || 'Landing Page'}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-blue-600 dark:text-blue-400">Platform</span>
                    <span className="text-blue-800 dark:text-blue-300">{contentDetails.platform || 'Web'}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-blue-600 dark:text-blue-400">Target Audience</span>
                    <span className="text-blue-800 dark:text-blue-300">{contentDetails.targetAudience || 'General'}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Main content based on current step */}
            {currentStep === 1 && renderStep1Content()}
            {currentStep === 2 && renderStep2Content()}
          </>
        )}
      </div>
    </AppShell>
  );
} 
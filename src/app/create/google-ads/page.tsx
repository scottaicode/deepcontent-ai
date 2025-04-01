"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface AdDetails {
  contentType: string;
  platform: string;
  targetAudience: string;
  businessType?: string;
  researchTopic?: string;
  primarySubject?: string;
  youtubeTranscript?: string;
  deepResearch?: string;
}

interface Keyword {
  id: string;
  text: string;
  volume: number;
  competition: 'low' | 'medium' | 'high';
  cpc: number;
  score: number;
  selected: boolean;
}

interface AdGroup {
  id: string;
  name: string;
  keywords: Keyword[];
  headlines: string[];
  descriptions: string[];
}

interface AdCampaign {
  name: string;
  objective: string;
  budget: number;
  bidStrategy: string;
  startDate: string;
  endDate: string;
  deviceTargeting: string[];
  locationTargeting: string[];
  adGroups: AdGroup[];
}

export default function GoogleAdsCreator() {
  const router = useRouter();
  const { t } = useTranslation();
  
  // State variables
  const [adDetails, setAdDetails] = useState<AdDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAds, setGeneratedAds] = useState<AdCampaign | null>(null);
  const [researchData, setResearchData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [suggestedKeywords, setSuggestedKeywords] = useState<Keyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Keyword[]>([]);
  const [adObjective, setAdObjective] = useState<string>('sales');
  const [adBudget, setAdBudget] = useState<number>(20);
  const [campaignName, setCampaignName] = useState<string>('');
  const [bidStrategy, setBidStrategy] = useState<string>('maximize-conversions');
  const [generatedHeadlines, setGeneratedHeadlines] = useState<string[]>([]);
  const [generatedDescriptions, setGeneratedDescriptions] = useState<string[]>([]);
  const [selectedHeadlines, setSelectedHeadlines] = useState<string[]>([]);
  const [selectedDescriptions, setSelectedDescriptions] = useState<string[]>([]);
  const [adGroupName, setAdGroupName] = useState<string>('');
  const [deviceTargeting, setDeviceTargeting] = useState<string[]>(['mobile', 'desktop', 'tablet']);
  const [locationTargeting, setLocationTargeting] = useState<string[]>(['United States']);

  // Load content details from session storage
  useEffect(() => {
    try {
      setIsLoading(true);
      
      // Get content details from session storage
      const storedDetails = sessionStorage.getItem('contentDetails');
      const storedResearch = sessionStorage.getItem('deepResearch');
      
      if (storedDetails) {
        const parsedDetails = JSON.parse(storedDetails);
        setAdDetails(parsedDetails);
        
        // Pre-populate campaign name based on research topic or business type
        setCampaignName(
          `${parsedDetails.researchTopic || parsedDetails.primarySubject || parsedDetails.businessType || 'New'} Campaign`
        );
        
        // Pre-populate ad group name
        setAdGroupName(
          `${parsedDetails.platform || 'Main'} Ad Group`
        );
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
      
      // Generate initial keywords
      generateKeywords();
      
    } catch (err) {
      console.error('Error initializing Google Ads creator:', err);
      setIsLoading(false);
      setError('Failed to load content details. Please try again.');
    }
  }, [router]);
  
  // Generate keywords based on content details
  const generateKeywords = async () => {
    try {
      if (!adDetails) return;
      
      setIsGenerating(true);
      
      // Create mock keywords for now - in production this would call an API
      const mockKeywords: Keyword[] = [
        {
          id: '1',
          text: adDetails.researchTopic || adDetails.businessType || 'main keyword',
          volume: Math.floor(Math.random() * 10000) + 1000,
          competition: 'medium',
          cpc: parseFloat((Math.random() * 5 + 0.5).toFixed(2)),
          score: Math.floor(Math.random() * 100),
          selected: true
        }
      ];
      
      // Add more keywords based on business type or research topic
      if (adDetails.businessType) {
        const businessWords = adDetails.businessType.split(' ');
        businessWords.forEach((word, index) => {
          if (word.length > 3) {
            mockKeywords.push({
              id: `business-${index}`,
              text: `best ${word}`,
              volume: Math.floor(Math.random() * 5000) + 500,
              competition: Math.random() > 0.5 ? 'high' : 'medium',
              cpc: parseFloat((Math.random() * 4 + 1).toFixed(2)),
              score: Math.floor(Math.random() * 90 + 10),
              selected: index < 2 // Select the first two by default
            });
          }
        });
      }
      
      // Add audience-based keywords
      if (adDetails.targetAudience) {
        const audienceWords = adDetails.targetAudience.split(' ');
        audienceWords.forEach((word, index) => {
          if (word.length > 3 && index < 3) {
            mockKeywords.push({
              id: `audience-${index}`,
              text: `${word} ${adDetails.businessType || 'services'}`,
              volume: Math.floor(Math.random() * 3000) + 200,
              competition: Math.random() > 0.7 ? 'low' : 'medium',
              cpc: parseFloat((Math.random() * 3 + 0.8).toFixed(2)),
              score: Math.floor(Math.random() * 80 + 20),
              selected: index === 0 // Select just the first one by default
            });
          }
        });
      }
      
      // Set suggested keywords
      setSuggestedKeywords(mockKeywords);
      
      // Initialize selected keywords with pre-selected ones
      setSelectedKeywords(mockKeywords.filter(k => k.selected));
      
      // Generate ad headlines and descriptions
      generateAdContent();
      
    } catch (err) {
      console.error('Error generating keywords:', err);
      setError('Failed to generate keywords. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Generate ad headlines and descriptions
  const generateAdContent = async () => {
    try {
      if (!adDetails) return;
      
      setIsGenerating(true);
      
      // Create mock headlines
      const mockHeadlines = [
        `Top ${adDetails.businessType || 'Services'} for ${adDetails.targetAudience || 'You'}`,
        `${adDetails.businessType || 'Solutions'} That Work | Try Now`,
        `Discover Premium ${adDetails.businessType || 'Options'}`,
        `${adDetails.primarySubject || adDetails.businessType || 'Service'} Experts`,
        `Need ${adDetails.researchTopic || adDetails.businessType || 'Help'}?`,
        `Best-Rated ${adDetails.businessType || 'Service'} Provider`,
        `High-Quality ${adDetails.businessType || 'Solutions'} | Fast Results`,
        `${adDetails.businessType || 'Service'} Starting at $XX`
      ];
      
      // Create mock descriptions
      const mockDescriptions = [
        `Professional ${adDetails.businessType || 'services'} tailored for ${adDetails.targetAudience || 'customers'}. Get started today!`,
        `Top-rated ${adDetails.businessType || 'solutions'} with proven results. 100% satisfaction guarantee.`,
        `Looking for ${adDetails.researchTopic || adDetails.businessType || 'solutions'}? We've got you covered with premium options.`,
        `${adDetails.targetAudience || 'Customers'} trust our ${adDetails.businessType || 'services'}. Join them today and see the difference.`,
        `Affordable ${adDetails.businessType || 'options'} with no compromise on quality. Free consultation available.`,
        `Serving ${adDetails.targetAudience || 'customers'} since 2010. Rated 4.8/5 by satisfied clients.`
      ];
      
      setGeneratedHeadlines(mockHeadlines);
      setGeneratedDescriptions(mockDescriptions);
      
      // Pre-select first 3 headlines and 2 descriptions
      setSelectedHeadlines(mockHeadlines.slice(0, 3));
      setSelectedDescriptions(mockDescriptions.slice(0, 2));
      
    } catch (err) {
      console.error('Error generating ad content:', err);
      setError('Failed to generate ad content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Helper functions for UI
  const toggleKeyword = (keywordId: string) => {
    setSuggestedKeywords(prev => 
      prev.map(k => k.id === keywordId ? { ...k, selected: !k.selected } : k)
    );
    
    const keyword = suggestedKeywords.find(k => k.id === keywordId);
    if (!keyword) return;
    
    if (keyword.selected) {
      setSelectedKeywords(prev => prev.filter(k => k.id !== keywordId));
    } else {
      setSelectedKeywords(prev => [...prev, { ...keyword, selected: true }]);
    }
  };
  
  const toggleHeadline = (headline: string) => {
    if (selectedHeadlines.includes(headline)) {
      setSelectedHeadlines(prev => prev.filter(h => h !== headline));
    } else {
      if (selectedHeadlines.length < 3) {
        setSelectedHeadlines(prev => [...prev, headline]);
      } else {
        toast.error('Maximum 3 headlines allowed. Deselect one first.');
      }
    }
  };
  
  const toggleDescription = (description: string) => {
    if (selectedDescriptions.includes(description)) {
      setSelectedDescriptions(prev => prev.filter(d => d !== description));
    } else {
      if (selectedDescriptions.length < 2) {
        setSelectedDescriptions(prev => [...prev, description]);
      } else {
        toast.error('Maximum 2 descriptions allowed. Deselect one first.');
      }
    }
  };
  
  const getCompetitionColor = (competition: 'low' | 'medium' | 'high') => {
    switch (competition) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-red-600 dark:text-red-400';
      default: return '';
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Generate complete ad campaign
  const generateAdCampaign = () => {
    // Validate inputs
    if (!campaignName) {
      toast.error('Please enter a campaign name');
      return;
    }
    
    if (!adGroupName) {
      toast.error('Please enter an ad group name');
      return;
    }
    
    if (selectedKeywords.length === 0) {
      toast.error('Please select at least one keyword');
      return;
    }
    
    if (selectedHeadlines.length === 0) {
      toast.error('Please select at least one headline');
      return;
    }
    
    if (selectedDescriptions.length === 0) {
      toast.error('Please select at least one description');
      return;
    }
    
    // Create the ad campaign
    const campaign: AdCampaign = {
      name: campaignName,
      objective: adObjective,
      budget: adBudget,
      bidStrategy: bidStrategy,
      startDate: new Date().toISOString().split('T')[0], // Today
      endDate: '', // No end date by default
      deviceTargeting,
      locationTargeting,
      adGroups: [
        {
          id: '1',
          name: adGroupName,
          keywords: selectedKeywords,
          headlines: selectedHeadlines,
          descriptions: selectedDescriptions
        }
      ]
    };
    
    // Set the generated campaign
    setGeneratedAds(campaign);
    
    // Move to next step
    setCurrentStep(2);
    
    toast.success('Ad campaign generated successfully!');
  };
  
  // Export ad campaign as JSON
  const exportCampaign = () => {
    if (!generatedAds) return;
    
    // Create a JSON blob
    const blob = new Blob([JSON.stringify(generatedAds, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaignName.replace(/\s+/g, '-').toLowerCase()}-campaign.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Ad campaign exported successfully!');
  };

  // Render Step 1: Campaign Setup
  const renderStep1Content = () => {
    return (
      <div className="space-y-8">
        {/* Campaign Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Campaign Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Campaign Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
                placeholder="Enter campaign name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Campaign Objective
              </label>
              <select
                value={adObjective}
                onChange={(e) => setAdObjective(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
              >
                <option value="sales">Sales</option>
                <option value="leads">Lead Generation</option>
                <option value="traffic">Website Traffic</option>
                <option value="awareness">Brand Awareness</option>
                <option value="app-installs">App Installs</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Daily Budget (USD)
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={adBudget}
                onChange={(e) => setAdBudget(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bid Strategy
              </label>
              <select
                value={bidStrategy}
                onChange={(e) => setBidStrategy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
              >
                <option value="maximize-conversions">Maximize Conversions</option>
                <option value="maximize-clicks">Maximize Clicks</option>
                <option value="target-cpa">Target CPA</option>
                <option value="manual-cpc">Manual CPC</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ad Group Name
              </label>
              <input
                type="text"
                value={adGroupName}
                onChange={(e) => setAdGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
                placeholder="Enter ad group name"
              />
            </div>
          </div>
        </div>
        
        {/* Keywords */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Keywords</h2>
            <button
              onClick={generateKeywords}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-800/40"
            >
              <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select keywords for your Google Ads campaign. We've suggested some based on your content details.
          </p>
          
          <div className="mb-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-750">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Keyword
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Search Volume
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Competition
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    CPC
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Select
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {suggestedKeywords.map((keyword) => (
                  <tr key={keyword.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {keyword.text}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {keyword.volume.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`capitalize ${getCompetitionColor(keyword.competition)}`}>
                        {keyword.competition}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      ${keyword.cpc.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <input
                        type="checkbox"
                        checked={keyword.selected}
                        onChange={() => toggleKeyword(keyword.id)}
                        className="form-checkbox h-5 w-5 text-indigo-600 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Ad Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Ad Headlines & Descriptions</h2>
            <button
              onClick={generateAdContent}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-800/40"
            >
              Regenerate
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-md font-medium mb-2 text-gray-800 dark:text-gray-200">Headlines (select up to 3)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {generatedHeadlines.map((headline, index) => (
                  <div 
                    key={index}
                    onClick={() => toggleHeadline(headline)}
                    className={`p-3 border rounded-md cursor-pointer ${
                      selectedHeadlines.includes(headline)
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-gray-800 dark:text-gray-200">{headline}</div>
                      <div className="flex-shrink-0">
                        {selectedHeadlines.includes(headline) && (
                          <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-md font-medium mb-2 text-gray-800 dark:text-gray-200">Descriptions (select up to 2)</h3>
              <div className="grid grid-cols-1 gap-3">
                {generatedDescriptions.map((description, index) => (
                  <div 
                    key={index}
                    onClick={() => toggleDescription(description)}
                    className={`p-3 border rounded-md cursor-pointer ${
                      selectedDescriptions.includes(description)
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-gray-800 dark:text-gray-200">{description}</div>
                      <div className="flex-shrink-0">
                        {selectedDescriptions.includes(description) && (
                          <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => router.push('/create')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Back
          </button>
          <button
            onClick={generateAdCampaign}
            disabled={isGenerating}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            Generate Ad Campaign
          </button>
        </div>
      </div>
    );
  };

  // Render Step 2: Campaign Preview
  const renderStep2Content = () => {
    if (!generatedAds) return null;
    
    return (
      <div className="space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Generated Ad Campaign</h2>
          
          <div className="mb-6">
            <div className="flex justify-end space-x-2 mb-4">
              <button
                onClick={exportCampaign}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Campaign
              </button>
            </div>
            
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Campaign Details</h3>
              </div>
              <div className="p-4">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Campaign Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{generatedAds.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Objective</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{generatedAds.objective}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Daily Budget</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">${generatedAds.budget}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Bid Strategy</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{generatedAds.bidStrategy.replace(/-/g, ' ')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Device Targeting</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{generatedAds.deviceTargeting.join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Location Targeting</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">{generatedAds.locationTargeting.join(', ')}</dd>
                  </div>
                </dl>
              </div>
            </div>
            
            {/* Ad Group Details */}
            {generatedAds.adGroups.map(adGroup => (
              <div key={adGroup.id} className="mt-6 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Ad Group: {adGroup.name}</h3>
                </div>
                <div className="p-4">
                  <div className="mb-6">
                    <h4 className="text-md font-medium mb-2 text-gray-800 dark:text-gray-200">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {adGroup.keywords.map(keyword => (
                        <span key={keyword.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {keyword.text}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-md font-medium mb-2 text-gray-800 dark:text-gray-200">Ad Preview</h4>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900">
                      <div className="mb-1 text-sm text-green-700 dark:text-green-500">Ad • www.yourdomain.com</div>
                      <div className="text-lg font-semibold text-blue-800 dark:text-blue-500 mb-1">
                        {adGroup.headlines[0]}
                      </div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                        {adGroup.descriptions[0]}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Your Website • Contact Us • About • Services
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium mb-2 text-gray-800 dark:text-gray-200">All Headlines & Descriptions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Headlines</h5>
                        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                          {adGroup.headlines.map((headline, idx) => (
                            <li key={idx}>{headline}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Descriptions</h5>
                        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                          {adGroup.descriptions.map((description, idx) => (
                            <li key={idx}>{description}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span className="flex items-center">
                <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Edit
              </span>
            </button>
            
            <button
              onClick={() => router.push('/create')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Back to Create
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render loading state
  const renderLoading = () => {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Loading Google Ads Creator...</p>
        </div>
      </div>
    );
  };
  
  // Render error state
  const renderError = () => {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block rounded-full h-12 w-12 bg-red-100 p-2 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">{error}</p>
          <button
            onClick={() => router.push('/create')}
            className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Create
          </button>
        </div>
      </div>
    );
  };
  
  // Main render function
  return (
    <AppShell>
      {isLoading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('google_ads_creator')}
          </h1>
          
          <div className="mb-8">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCurrentStep(1); }}
                  className={`${
                    currentStep === 1
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  1. Campaign Setup
                </a>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); if (generatedAds) setCurrentStep(2); }}
                  className={`${
                    currentStep === 2
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${!generatedAds && 'opacity-50 cursor-not-allowed'}`}
                >
                  2. Campaign Preview
                </a>
              </nav>
            </div>
          </div>
          
          {currentStep === 1 && renderStep1Content()}
          {currentStep === 2 && renderStep2Content()}
        </div>
      )}
    </AppShell>
  );
}

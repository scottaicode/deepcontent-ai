"use client";

import React, { useState, useCallback } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox, CheckedState } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Match the backend interface
interface AdMakerRequest {
  projectName: string;
  productDescription: string;
  targetAudience: string;
  adObjective: string;
  keyMessage: string;
  platforms: string[];
  callToAction?: string;
  numVariations: number;
  elementsToVary: string[];
}

interface AdStudioFormProps {
  onSubmit: (details: AdMakerRequest) => void;
  isLoading: boolean;
}

// Available options
const PLATFORM_OPTIONS = [
  { id: 'facebook_feed', label: 'Facebook Feed' },
  { id: 'instagram_feed', label: 'Instagram Feed' },
  { id: 'instagram_reels', label: 'Instagram Reels' },
  { id: 'instagram_stories', label: 'Instagram Stories' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube_shorts', label: 'YouTube Shorts' },
  { id: 'linkedin_feed', label: 'LinkedIn Feed' },
  { id: 'google_search', label: 'Google Search Ads' }, // Added Google
];

const OBJECTIVE_OPTIONS = [
  { id: 'brand_awareness', label: 'Brand Awareness' },
  { id: 'lead_generation', label: 'Lead Generation' },
  { id: 'sales_conversion', label: 'Sales/Conversion' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'website_traffic', label: 'Website Traffic' },
];

const ELEMENTS_TO_VARY_OPTIONS = [
  { id: 'headline', label: 'Headline/Hook' },
  { id: 'body_copy', label: 'Body Copy/Script' },
  { id: 'visual_angle', label: 'Visual Angle/Style' },
  { id: 'call_to_action', label: 'Call To Action (CTA)' },
  { id: 'offer', label: 'Offer/Value Proposition' },
  { id: 'tone_of_voice', label: 'Tone of Voice' },
];

export const AdStudioForm: React.FC<AdStudioFormProps> = ({ onSubmit, isLoading }) => {
  const { t } = useTranslation(); // Assuming translation hook setup
  const [details, setDetails] = useState<AdMakerRequest>({
    projectName: '',
    productDescription: '',
    targetAudience: '',
    adObjective: OBJECTIVE_OPTIONS[0].id, // Default objective
    keyMessage: '',
    platforms: [PLATFORM_OPTIONS[1].id, PLATFORM_OPTIONS[2].id], // Default platforms
    callToAction: '',
    numVariations: 3,
    elementsToVary: [ELEMENTS_TO_VARY_OPTIONS[0].id], // Default element
  });

  // Use specific event types for inputs/textareas
  const handleInputChange = useCallback((field: keyof AdMakerRequest, event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDetails(prev => ({ ...prev, [field]: event.target.value }));
  }, []);

  // Handle checkbox changes (value is CheckedState from Radix which is boolean | 'indeterminate')
  const handleMultiSelectChange = useCallback((field: 'platforms' | 'elementsToVary', itemId: string, checked: CheckedState) => { 
    const isChecked = checked === true; // Treat indeterminate as false for our logic
    setDetails(prev => {
      const currentSelection = prev[field] || [];
      if (isChecked) {
        return { ...prev, [field]: [...currentSelection, itemId] };
      } else {
        return { ...prev, [field]: currentSelection.filter(id => id !== itemId) };
      }
    });
  }, []);

  // Handle slider changes (value is number[])
  const handleSliderChange = useCallback((field: keyof AdMakerRequest, value: number[]) => {
      setDetails(prev => ({ ...prev, [field]: value[0] }));
  }, []);

  // Renamed handleSelectChange to handleRadioChange for clarity
  const handleRadioChange = useCallback((field: keyof AdMakerRequest, value: string) => {
    setDetails(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Add more robust validation
    if (!details.projectName || !details.productDescription || !details.targetAudience || details.platforms.length === 0 || details.elementsToVary.length === 0) {
      alert('Please fill in all required fields and select at least one platform and element to vary.');
      return;
    }
    onSubmit(details);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: Core Ad Definition */}
      <div className="space-y-4 p-6 border rounded-lg dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">1. Core Ad Definition</h2>
        <div>
          <Label htmlFor="projectName">Project Name *</Label>
          <Input id="projectName" value={details.projectName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('projectName', e)} required placeholder="e.g., Spring Skincare Campaign" />
        </div>
        <div>
          <Label htmlFor="productDescription">Product/Service Description *</Label>
          <Textarea id="productDescription" value={details.productDescription} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('productDescription', e)} required placeholder="Describe the product/service being advertised..." />
        </div>
        <div>
          <Label htmlFor="targetAudience">Target Audience *</Label>
          <Input id="targetAudience" value={details.targetAudience} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('targetAudience', e)} required placeholder="e.g., Women aged 30-50 interested in anti-aging skincare" />
        </div>
        <div className="mb-4"> 
          <Label className="block mb-2">Primary Ad Objective *</Label>
          <RadioGroup 
            value={details.adObjective} 
            onValueChange={(value: string) => handleRadioChange('adObjective', value)}
            className="flex flex-col space-y-2"
          >
            {OBJECTIVE_OPTIONS.map(opt => (
               <div key={opt.id} className="flex items-center space-x-3">
                 <RadioGroupItem value={opt.id} id={`objective-${opt.id}`} />
                 <Label htmlFor={`objective-${opt.id}`} className="font-normal cursor-pointer">{opt.label}</Label>
               </div>
            ))}
          </RadioGroup>
        </div>
        <div>
          <Label htmlFor="keyMessage">Key Message *</Label>
          <Textarea id="keyMessage" value={details.keyMessage} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('keyMessage', e)} required placeholder="What is the single most important message to convey?" />
        </div>
        <div>
          <Label htmlFor="callToAction">Call To Action (Optional)</Label>
          <Input id="callToAction" value={details.callToAction ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('callToAction', e)} placeholder="e.g., Shop Now, Learn More, Sign Up" />
        </div>
      </div>

      {/* Section 2: Platform & Variation Strategy */}
      <div className="space-y-6 p-6 border rounded-lg dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">2. Platform & Variation Strategy</h2>
        
        {/* Target Platforms Group */}
        <div> 
          <Label className="block mb-3 text-base">Target Platforms * <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(Select at least one)</span></Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mt-2">
            {PLATFORM_OPTIONS.map(opt => (
              <div key={opt.id} className="flex items-center space-x-3">
                <Checkbox 
                  id={`platform-${opt.id}`}
                  checked={details.platforms.includes(opt.id)}
                  onCheckedChange={(checked: CheckedState) => handleMultiSelectChange('platforms', opt.id, checked)}
                  className="transition-all hover:scale-110 border-gray-400 dark:border-gray-600 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <label htmlFor={`platform-${opt.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                  {opt.label}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Elements to Vary Group */}
        <div> 
          <Label className="block mb-3 text-base">Elements to Vary * <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(Select at least one)</span></Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mt-2">
            {ELEMENTS_TO_VARY_OPTIONS.map(opt => (
              <div key={opt.id} className="flex items-center space-x-3">
                 <Checkbox 
                  id={`vary-${opt.id}`}
                  checked={details.elementsToVary.includes(opt.id)}
                  onCheckedChange={(checked: CheckedState) => handleMultiSelectChange('elementsToVary', opt.id, checked)}
                  className="transition-all hover:scale-110 border-gray-400 dark:border-gray-600 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <label htmlFor={`vary-${opt.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                  {opt.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Number of Variations Group */}
        <div> 
          <Label htmlFor="numVariations" className="block mb-1 text-base">Number of Variations: <span className="font-bold text-blue-600 dark:text-blue-400">{details.numVariations}</span></Label>
          <Slider
            id="numVariations"
            min={1}
            max={10}
            step={1}
            value={[details.numVariations]}
            onValueChange={(value: number[]) => handleSliderChange('numVariations', value)}
            className="mt-3 w-full"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Ad Variations'}
        </Button>
      </div>
    </form>
  );
}; 
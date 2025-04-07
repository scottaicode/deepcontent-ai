"use client";

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/app/components/LanguageProvider';
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

// --- Option Definitions (Use translation keys) ---
const PLATFORM_OPTIONS_KEYS = [
  { id: 'facebook_feed', key: 'adStudio.platform.facebookFeed' },
  { id: 'instagram_feed', key: 'adStudio.platform.instagramFeed' },
  { id: 'instagram_reels', key: 'adStudio.platform.instagramReels' },
  { id: 'instagram_stories', key: 'adStudio.platform.instagramStories' },
  { id: 'tiktok', key: 'adStudio.platform.tiktok' },
  { id: 'youtube_shorts', key: 'adStudio.platform.youtubeShorts' },
  { id: 'linkedin_feed', key: 'adStudio.platform.linkedinFeed' },
  { id: 'google_search', key: 'adStudio.platform.googleSearch' }, 
];

const OBJECTIVE_OPTIONS_KEYS = [
  { id: 'brand_awareness', key: 'adStudio.objective.brandAwareness' },
  { id: 'lead_generation', key: 'adStudio.objective.leadGeneration' },
  { id: 'sales_conversion', key: 'adStudio.objective.salesConversion' },
  { id: 'engagement', key: 'adStudio.objective.engagement' },
  { id: 'website_traffic', key: 'adStudio.objective.websiteTraffic' },
];

const ELEMENTS_TO_VARY_OPTIONS_KEYS = [
  { id: 'headline', key: 'adStudio.vary.headline' },
  { id: 'body_copy', key: 'adStudio.vary.bodyCopy' },
  { id: 'visual_angle', key: 'adStudio.vary.visualAngle' },
  { id: 'call_to_action', key: 'adStudio.vary.callToAction' },
  { id: 'offer', key: 'adStudio.vary.offer' },
  { id: 'tone_of_voice', key: 'adStudio.vary.toneOfVoice' },
];
// --- End Option Definitions ---

export const AdStudioForm: React.FC<AdStudioFormProps> = ({ onSubmit, isLoading }) => {
  const { t, locale, translations } = useLanguage();
  
  // Helper for translations to ensure consistent key paths
  const getTranslationKey = (key: string) => `adStudio.${key}`;
  
  // Helper for Spanish fallbacks when translations fail
  const getLocalizedText = (key: string, defaultValue: string, spanishValue: string) => {
    return locale === 'es' ? spanishValue : t(getTranslationKey(key), { defaultValue });
  };
  
  // Debug logging for translations
  console.log('AdStudioForm: Current locale:', locale);
  
  // Log translation object structure
  if (translations) {
    console.log('AdStudioForm: Navigation exists:', !!translations.navigation);
    console.log('AdStudioForm: Navigation.adStudio:', 
      translations.navigation ? translations.navigation.adStudio : 'not found');
    console.log('AdStudioForm: adStudio section exists:', !!translations.adStudio);
  }
  
  const [details, setDetails] = useState<AdMakerRequest>({
    projectName: '',
    productDescription: '',
    targetAudience: '',
    adObjective: OBJECTIVE_OPTIONS_KEYS[0].id, // Default objective uses ID
    keyMessage: '',
    platforms: [PLATFORM_OPTIONS_KEYS[1].id, PLATFORM_OPTIONS_KEYS[2].id], // Default platforms use IDs
    callToAction: '',
    numVariations: 3,
    elementsToVary: [ELEMENTS_TO_VARY_OPTIONS_KEYS[0].id], // Default element uses ID
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
      alert(t('adStudio.validation.fillRequired', {defaultValue: 'Please fill in all required fields and select at least one platform and element to vary.'}));
      return;
    }
    onSubmit(details);
  };

  // Helper to generate defaultValue from key
  const generateDefaultValue = (key: string) => key.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() || key;

  // Add Spanish hardcoded fallbacks for key titles/labels
  const section1Title = getLocalizedText('section1Title', '1. Core Ad Definition', '1. Definición Central del Anuncio');
  const section2Title = getLocalizedText('section2Title', '2. Platform & Variation Strategy', '2. Estrategia de Plataforma y Variación');
  const projectNameLabel = getLocalizedText('projectNameLabel', 'Project Name', 'Nombre del Proyecto');
  const productDescriptionLabel = getLocalizedText('productDescriptionLabel', 'Product/Service Description', 'Descripción Producto/Servicio');
  const targetAudienceLabel = getLocalizedText('targetAudienceLabel', 'Target Audience', 'Audiencia Objetivo');
  const adObjectiveLabel = getLocalizedText('adObjectiveLabel', 'Primary Ad Objective', 'Objetivo Principal del Anuncio');
  const keyMessageLabel = getLocalizedText('keyMessageLabel', 'Key Message', 'Mensaje Clave');
  const callToActionLabel = getLocalizedText('callToActionLabel', 'Call To Action (Optional)', 'Llamada a la Acción (Opcional)');
  const targetPlatformsLabel = getLocalizedText('targetPlatformsLabel', 'Target Platforms', 'Plataformas Objetivo');
  const elementsToVaryLabel = getLocalizedText('elementsToVaryLabel', 'Elements to Vary', 'Elementos a Variar');
  const selectAtLeastOne = getLocalizedText('selectAtLeastOne', 'Select at least one', 'Selecciona al menos uno');
  const numVariationsLabel = getLocalizedText('numVariationsLabel', 'Number of Variations:', 'Número de Variaciones:');
  const generateButton = getLocalizedText('generateButton', 'Generate Ad Variations', 'Generar Variaciones de Anuncio');
  const generatingButton = getLocalizedText('generatingButton', 'Generating...', 'Generando...');

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: Core Ad Definition */}
      <div className="space-y-4 p-6 border rounded-lg dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{section1Title}</h2>
        <div>
          <Label htmlFor="projectName">{projectNameLabel} *</Label>
          <Input id="projectName" value={details.projectName} onChange={(e) => handleInputChange('projectName', e)} required placeholder={t(getTranslationKey('projectNamePlaceholder'), { defaultValue: 'e.g., Spring Skincare Campaign' })} />
        </div>
        <div>
          <Label htmlFor="productDescription">{productDescriptionLabel} *</Label>
          <Textarea id="productDescription" value={details.productDescription} onChange={(e) => handleInputChange('productDescription', e)} required placeholder={t(getTranslationKey('productDescriptionPlaceholder'), { defaultValue: 'Describe the product/service being advertised...' })} />
        </div>
        <div>
          <Label htmlFor="targetAudience">{targetAudienceLabel} *</Label>
          <Input id="targetAudience" value={details.targetAudience} onChange={(e) => handleInputChange('targetAudience', e)} required placeholder={t(getTranslationKey('targetAudiencePlaceholder'), { defaultValue: 'e.g., Women aged 30-50 interested in anti-aging skincare' })} />
        </div>
        <div className="mb-4"> 
          <Label className="block mb-2">{adObjectiveLabel} *</Label>
          <RadioGroup 
            value={details.adObjective} 
            onValueChange={(value: string) => handleRadioChange('adObjective', value)}
            className="flex flex-col space-y-2"
          >
            {OBJECTIVE_OPTIONS_KEYS.map(opt => (
               <div key={opt.id} className="flex items-center space-x-3">
                 <RadioGroupItem 
                   value={opt.id} 
                   id={`objective-${opt.id}`} 
                   className="border-gray-400 dark:border-gray-600 data-[state=checked]:border-primary"
                 />
                 <Label htmlFor={`objective-${opt.id}`} className="font-normal cursor-pointer">{t(opt.key, { defaultValue: generateDefaultValue(opt.key) })}</Label>
               </div>
            ))}
          </RadioGroup>
        </div>
        <div>
          <Label htmlFor="keyMessage">{keyMessageLabel} *</Label>
          <Textarea id="keyMessage" value={details.keyMessage} onChange={(e) => handleInputChange('keyMessage', e)} required placeholder={t(getTranslationKey('keyMessagePlaceholder'), { defaultValue: 'What is the single most important message to convey?' })} />
        </div>
        <div>
          <Label htmlFor="callToAction">{callToActionLabel}</Label>
          <Input id="callToAction" value={details.callToAction ?? ''} onChange={(e) => handleInputChange('callToAction', e)} placeholder={t(getTranslationKey('callToActionPlaceholder'), { defaultValue: 'e.g., Shop Now, Learn More, Sign Up' })} />
        </div>
      </div>

      {/* Section 2: Platform & Variation Strategy */}
      <div className="space-y-6 p-6 border rounded-lg dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{section2Title}</h2>
        
        {/* Target Platforms Group */}
        <div> 
          <Label className="block mb-3 text-base">
            {targetPlatformsLabel} * 
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({selectAtLeastOne})</span>
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mt-2">
            {PLATFORM_OPTIONS_KEYS.map(opt => (
              <div key={opt.id} className="flex items-center space-x-3">
                <Checkbox 
                  id={`platform-${opt.id}`}
                  checked={details.platforms.includes(opt.id)}
                  onCheckedChange={(checked: CheckedState) => handleMultiSelectChange('platforms', opt.id, checked)}
                  className="transition-all hover:scale-110 border-gray-400 dark:border-gray-600 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <label htmlFor={`platform-${opt.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                  {t(opt.key, { defaultValue: generateDefaultValue(opt.key) })}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Elements to Vary Group */}
        <div> 
          <Label className="block mb-3 text-base">
            {elementsToVaryLabel} * 
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({selectAtLeastOne})</span>
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 mt-2">
            {ELEMENTS_TO_VARY_OPTIONS_KEYS.map(opt => (
              <div key={opt.id} className="flex items-center space-x-3">
                 <Checkbox 
                  id={`vary-${opt.id}`}
                  checked={details.elementsToVary.includes(opt.id)}
                  onCheckedChange={(checked: CheckedState) => handleMultiSelectChange('elementsToVary', opt.id, checked)}
                  className="transition-all hover:scale-110 border-gray-400 dark:border-gray-600 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <label htmlFor={`vary-${opt.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                  {t(opt.key, { defaultValue: generateDefaultValue(opt.key) })}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Number of Variations Group */}
        <div> 
          <Label htmlFor="numVariations" className="block mb-1 text-base">
            {numVariationsLabel} 
            <span className="font-bold text-blue-600 dark:text-blue-400">{details.numVariations}</span>
          </Label>
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
          {isLoading ? generatingButton : generateButton}
        </Button>
      </div>
    </form>
  );
}; 
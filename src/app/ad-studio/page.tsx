"use client";

import React, { useState, useEffect } from 'react';
// Removed AppShell import as it's likely provided by a root layout
// import AppShell from '@/components/AppShell'; 
import { AdStudioForm } from '@/components/AdStudio/AdStudioForm'; 
import { useToast } from '@/lib/hooks/useToast'; 
import { useLanguage } from '@/app/components/LanguageProvider';

// Interfaces matching backend/form
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

interface AdVariation {
  id: number;
  headline: string;
  bodyScript: string;
  visualGuidance: string;
  platformSuitability: string[];
}

// Translation keys used in this component
const getTranslationKey = (key: string) => `adStudio.${key}`;

export default function AdStudioPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedVariations, setGeneratedVariations] = useState<AdVariation[]>([]);
  const { toast } = useToast();
  const { t, locale, translations } = useLanguage();
  
  // Debug log for translation state
  useEffect(() => {
    console.log('AdStudio: Current locale:', locale);
    
    // Check if translations exist and can be accessed
    if (translations) {
      // Print specific nested path instead of using dot notation
      console.log('AdStudio: Navigation translation:', 
        translations.navigation ? translations.navigation.adStudio : 'not found');
      
      console.log('AdStudio: Full translations structure:', 
        JSON.stringify(translations).substring(0, 200) + '...');
    }
  }, [locale, translations]);

  const handleAdSubmit = async (details: AdMakerRequest) => {
    setIsLoading(true);
    setError(null);
    setGeneratedVariations([]); // Clear previous results
    console.log('Submitting Ad Request:', details);

    try {
      const response = await fetch('/api/admaker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(details),
      });

      if (!response.ok) {
        let errorMsg = t('errors.general', { defaultValue: 'Failed to generate ad variations.' });
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
          if (errorData.details) {
             errorMsg += `: ${errorData.details}`;
          }
        } catch (e) {
          // Ignore if error response is not JSON
        }
        console.error('API Error:', errorMsg);
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      if (!result.variations || result.variations.length === 0) {
         throw new Error(t(getTranslationKey('errors.noVariations'), { defaultValue: 'No ad variations were returned from the API.' }));
      }

      console.log('Received Variations:', result.variations);
      setGeneratedVariations(result.variations);
      toast({ 
        title: t('common.success', { defaultValue: 'Success!' }), 
        description: t(getTranslationKey('successMessage'), { 
          defaultValue: '{count} ad variations generated.',
          replacements: { count: result.variations.length.toString() }
        })
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errors.unknown', { defaultValue: 'An unknown error occurred' });
      setError(errorMessage);
      toast({ 
        variant: "destructive", 
        title: t('common.error', { defaultValue: 'Error' }), 
        description: errorMessage 
      });
      console.error('Submit Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Always use consistent Spanish texts that match the rest of the application
  const pageTitle = locale === 'es' ? 'Estudio de Anuncios' : t('navigation.adStudio');
  const pageDescription = locale === 'es' 
    ? 'Define los parámetros de tu anuncio a continuación para generar variaciones creativas.' 
    : t(getTranslationKey('pageDescription'), { defaultValue: 'Define your ad parameters below to generate creative variations.' });

  // Return only the page-specific content, assuming AppShell is in the root layout
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Add back a page title */}
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        {pageTitle}
      </h1>
      <p className="mb-8 text-gray-600 dark:text-gray-300">
        {pageDescription}
      </p>
        
      {/* Render the Form */}
      <AdStudioForm onSubmit={handleAdSubmit} isLoading={isLoading} />

      {/* Display Area for Results or Errors */}
      <div className="mt-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">{t('common.error', { defaultValue: 'Error' })}: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {generatedVariations.length > 0 && (
          <div className="mt-6 space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
              {locale === 'es' ? 'Variaciones de Anuncio Generadas' : t(getTranslationKey('generatedVariationsTitle'), { defaultValue: 'Generated Ad Variations' })}
            </h2>
            {generatedVariations.map((variation) => (
              <div key={variation.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-2 text-blue-600 dark:text-blue-400">
                  {locale === 'es' ? 'Variación' : t(getTranslationKey('variationLabel'), { defaultValue: 'Variation' })} {variation.id}
                </h3>
                <p className="mb-1">
                  <strong className="font-medium text-gray-700 dark:text-gray-300">
                    {locale === 'es' ? 'Título:' : t(getTranslationKey('headlineLabel'), { defaultValue: 'Headline' })+':'}
                  </strong> {variation.headline}
                </p>
                <p className="mb-1 whitespace-pre-wrap">
                  <strong className="font-medium text-gray-700 dark:text-gray-300">
                    {locale === 'es' ? 'Texto/Guion:' : t(getTranslationKey('bodyScriptLabel'), { defaultValue: 'Body/Script' })+':'}
                  </strong> {variation.bodyScript}
                </p>
                <p className="mb-1 whitespace-pre-wrap">
                  <strong className="font-medium text-gray-700 dark:text-gray-300">
                    {locale === 'es' ? 'Guía Visual:' : t(getTranslationKey('visualGuidanceLabel'), { defaultValue: 'Visual Guidance' })+':'}
                  </strong> {variation.visualGuidance}
                </p>
                <p>
                  <strong className="font-medium text-gray-700 dark:text-gray-300">
                    {locale === 'es' ? 'Plataformas Adecuadas:' : t(getTranslationKey('platformSuitabilityLabel'), { defaultValue: 'Platform Suitability' })+':'}
                  </strong> {variation.platformSuitability.join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
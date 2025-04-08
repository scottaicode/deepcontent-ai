'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { useToast } from '@/lib/hooks/useToast';
import { useLanguage } from '@/app/components/LanguageProvider';

export default function TextToImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [apiLimited, setApiLimited] = useState(false);
  const [textResponse, setTextResponse] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useLanguage();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(t('errors.general'));
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setApiLimited(false);
      setTextResponse(null);

      const response = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      if (data.apiLimited) {
        setApiLimited(true);
      }

      if (data.textResponse) {
        setTextResponse(data.textResponse);
      }

      if (data.image) {
        setGeneratedImage(data.image);
      } else {
        throw new Error('No image data received');
      }
    } catch (err: any) {
      console.error('Error generating image:', err);
      setError(err.message || 'Failed to generate image');
      toast.error(err.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">{t('textToImage.title')}</h1>
          <p className="mt-4 text-lg text-gray-500">
            {t('textToImage.subtitle')}
          </p>
        </div>

        <div className="mt-12">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900">{t('textToImage.infoTitle')}</h3>
                <p className="mt-2 text-sm text-blue-700">
                  {t('textToImage.infoDescription')}
                </p>
                <div className="mt-3">
                  <p className="text-sm text-blue-700">{t('textToImage.note')}</p>
                  <ul className="mt-2 list-disc list-inside text-sm text-blue-700 space-y-1">
                    <li>{t('textToImage.tip1')}</li>
                    <li>{t('textToImage.tip2')}</li>
                    <li>{t('textToImage.tip3')}</li>
                    <li>{t('textToImage.example')}</li>
                  </ul>
                </div>
              </div>

              {apiLimited && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <h3 className="text-amber-800 font-medium mb-2">{t('textToImage.apiLimitTitle')}</h3>
                  <p className="text-amber-700 text-sm">
                    {t('textToImage.apiLimitDescription')}
                  </p>
                  <ul className="list-disc list-inside text-amber-700 text-sm mt-2 ml-2">
                    <li>{t('textToImage.apiLimitReason1')}</li>
                    <li>{t('textToImage.apiLimitReason2')}</li>
                    <li>{t('textToImage.apiLimitReason3')}</li>
                    <li>{t('textToImage.apiLimitReason4')}</li>
                  </ul>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{t('textToImage.errorPrefix')} {error}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  {t('textToImage.promptLabel')}
                </label>
                <div className="mt-1">
                  <textarea
                    rows={4}
                    name="description"
                    id="description"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder={t('textToImage.promptPlaceholder')}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isGenerating || !prompt.trim()
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('textToImage.generating')}
                    </>
                  ) : (
                    t('textToImage.generate')
                  )}
                </button>
              </div>

              {generatedImage && (
                <div className="mt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">{t('textToImage.resultTitle')}</h4>
                  <div className="relative aspect-w-16 aspect-h-9 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={generatedImage}
                      alt={t('textToImage.resultAlt')}
                      className="object-contain w-full h-full"
                    />
                  </div>
                  
                  {textResponse && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900">{t('textToImage.aiCommentary')}</h5>
                      <p className="text-gray-700 mt-2">{textResponse}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
} 
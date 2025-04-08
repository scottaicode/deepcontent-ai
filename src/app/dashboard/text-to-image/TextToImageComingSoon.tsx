'use client';

import { useLanguage } from '@/app/components/LanguageProvider';

export default function TextToImageComingSoon() {
  const { t, locale } = useLanguage();

  // Use translation keys, provide defaults
  const title = t('textToImage.comingSoonTitle', { defaultValue: 'AI Text-to-Image Generator'});
  const comingSoonText = t('common.comingSoon', { defaultValue: 'Coming Soon!' });
  const messageText = t('textToImage.comingSoonMessage', { defaultValue: 'We\'re working on this feature. It will be available soon.' });

  return (
    <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-3xl font-bold mb-6 text-center">
        {title}
      </h1>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg max-w-2xl mx-auto">
        <div className="flex items-center">
          <div className="mr-4">
            {/* Icon */} 
            <svg className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-medium text-blue-800 mb-2">{comingSoonText}</p>
            <p className="text-blue-700">
              {messageText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
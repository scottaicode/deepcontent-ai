'use client';

import { useTranslation } from '@/lib/hooks/useTranslation';
import { useTranslationManager } from '@/app/components/TranslationManager';

export default function MainLanguageSwitcher() {
  const { language, supportedLanguages } = useTranslation();
  const { setApplicationLanguage } = useTranslationManager();
  
  // Use the centralized language management function
  const handleLanguageChange = (lang: string) => {
    console.log('[MainLanguageSwitcher] Changing language to:', lang);
    setApplicationLanguage(lang);
  };
  
  return (
    <div className="flex space-x-2">
      {supportedLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => handleLanguageChange(lang)}
          className={`px-2 py-1 rounded-md text-sm font-medium ${
            language === lang 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          aria-label={`Switch language to ${lang === 'en' ? 'English' : 'Spanish'}`}
        >
          {lang === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}
        </button>
      ))}
    </div>
  );
} 
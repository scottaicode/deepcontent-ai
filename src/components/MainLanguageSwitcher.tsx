'use client';

// import { useRouter, usePathname } from 'next/navigation';
// import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useTranslationManager } from '@/app/components/TranslationManager';

// Language switcher using TranslationManager for client-side updates
export default function MainLanguageSwitcher() {
  // const router = useRouter();
  // const pathname = usePathname(); // Keep pathname to know the current page
  // const [currentLang, setCurrentLang] = useState('en');
  const { language, supportedLanguages } = useTranslation();
  const { setApplicationLanguage } = useTranslationManager();

  // Determine current language preference on client-side mount
  // Reads persisted cookie preference or falls back to document lang / default
  // useEffect(() => {
  //   const getLanguagePreference = () => {
  //     if (typeof document === 'undefined') return 'en';
  //     
  //     // Prioritize cookie over document lang for consistency
  //     const cookieLang = document.cookie.match(/(?:^|;\s*)language=([^;]*)/)?.pop();
  //     const cookiePrefLang = document.cookie.match(/(?:^|;\s*)preferred_language=([^;]*)/)?.pop();
  //     const htmlLang = document.documentElement.lang;
  //     
  //     console.log('[Header LanguageDebug] Sources on mount:', {
  //       html: htmlLang,
  //       cookieLang,
  //       cookiePrefLang
  //     });
  //     
  //     // Set the state based on the determined preference
  //     return cookieLang || cookiePrefLang || htmlLang || 'en';
  //   };
  //   setCurrentLang(getLanguagePreference());
  // }, [pathname]); // Re-check if pathname changes (e.g., after navigation)

  // console.log('[Header LanguageDebug] Current language state:', currentLang);

  // Use the centralized language management function
  const handleLanguageChange = (lang: string) => {
    if (lang === language) return; // Avoid unnecessary changes
    console.log('[MainLanguageSwitcher] Changing language to:', lang);
    setApplicationLanguage(lang);
  };

  // Switch language by setting cookie and forcing a page reload - REMOVED
  // const switchToLanguage = (lang: string) => {
  //   if (lang === currentLang) return;
  //   
  //   console.log(`[CookieReloadSwitcher] Attempting to switch language to: ${lang}`);
  //   
  //   try {
  //     // 1. Set cookies to persist preference
  //     document.cookie = `language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
  //     document.cookie = `preferred_language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
  //     console.log('[LanguageDebug] Set cookies for preference:', document.cookie);
  //
  //     // 2. Update state immediately for UI feedback (optional, as page will reload)
  //     // setCurrentLang(lang);
  //
  //     // 3. Force a full page reload. The browser will send the new cookie value
  //     // on the next request, allowing middleware and hooks to use the correct language.
  //     window.location.reload(); 
  //     
  //     console.log(`[CookieReloadSwitcher] Cookies set to ${lang} and window.location.reload() called.`);
  //
  //   } catch (err) {
  //     console.error('Error in language switch using cookie/reload:', err);
  //   }
  // };

  return (
    // UI driven by language from useTranslation hook
    <div className="flex space-x-2">
      {supportedLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => handleLanguageChange(lang)}
          className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
            language === lang 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          aria-label={`Switch language to ${lang === 'en' ? 'English' : 'Spanish'}`}
          aria-pressed={language === lang}
        >
          {lang === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}
        </button>
      ))}
      {/* <button
        onClick={() => switchToLanguage('en')} 
        className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
          currentLang === 'en' 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        aria-label="Switch language to English"
        aria-pressed={currentLang === 'en'}
      >
        🇺🇸 EN
      </button>
      <button
        onClick={() => switchToLanguage('es')}
        className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
          currentLang === 'es' 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        aria-label="Switch language to Spanish"
        aria-pressed={currentLang === 'es'}
      >
        🇪🇸 ES
      </button> */}
    </div>
  );
} 
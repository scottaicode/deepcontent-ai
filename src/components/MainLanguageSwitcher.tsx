'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// Language switcher using Next.js routing
export default function MainLanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentLang, setCurrentLang] = useState('en');

  // Determine current language on client-side mount
  useEffect(() => {
    const getLanguagePreference = () => {
      if (typeof document === 'undefined') return 'en';
      
      // Prioritize cookie over document lang for consistency
      const cookieLang = document.cookie.match(/(?:^|;\s*)language=([^;]*)/)?.pop();
      const cookiePrefLang = document.cookie.match(/(?:^|;\s*)preferred_language=([^;]*)/)?.pop();
      const htmlLang = document.documentElement.lang;
      
      console.log('[Header LanguageDebug] Sources on mount:', {
        html: htmlLang,
        cookieLang,
        cookiePrefLang
      });
      
      return cookieLang || cookiePrefLang || htmlLang || 'en';
    };
    setCurrentLang(getLanguagePreference());
  }, [pathname]); // Re-check if pathname changes

  console.log('[Header LanguageDebug] Current language state:', currentLang);

  // Switch language using Next.js router
  const switchToLanguage = (lang: string) => {
    if (lang === currentLang) return;
    
    console.log(`[NextJsSwitcher] Attempting to switch language to: ${lang}`);
    
    try {
      // Set cookies to persist preference across reloads/sessions
      document.cookie = `language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
      document.cookie = `preferred_language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
      console.log('[LanguageDebug] Set cookies for preference:', document.cookie);

      // Ensure pathname is valid before pushing
      if (!pathname) {
        console.error('[NextJsSwitcher] Pathname is not available. Cannot switch language.');
        return;
      }

      // Remove existing locale prefix if present (e.g., /en/path -> /path)
      const basePathname = pathname.startsWith('/en/') ? pathname.substring(3) : 
                         pathname.startsWith('/es/') ? pathname.substring(3) : 
                         pathname;
      
      // Construct the new URL with the target locale prefix
      // Ensure basePathname starts with a slash if it's not empty
      const targetPath = lang === 'en' ? `/en${basePathname.startsWith('/') ? '' : '/'}${basePathname}` 
                                    : `/es${basePathname.startsWith('/') ? '' : '/'}${basePathname}`;

      console.log(`[NextJsSwitcher] Navigating to new locale path: ${targetPath}`);
      
      // Use router.push with the new path
      router.push(targetPath);

      // Update state immediately for responsive UI
      setCurrentLang(lang);
      
      console.log(`[NextJsSwitcher] router.push initiated for locale: ${lang}`);

    } catch (err) {
      console.error('Error in language switch using router:', err);
      // Fallback or error handling if needed - maybe try reload?
      // window.location.reload(); // Avoid if possible
    }
  };

  return (
    <div className="flex space-x-2">
      <button
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
      </button>
    </div>
  );
} 
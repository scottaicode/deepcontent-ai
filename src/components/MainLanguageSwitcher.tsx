'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// Language switcher using Next.js routing
// IMPORTANT: This component switches language by navigating to the corresponding
// locale-prefixed path (e.g., /en/page or /es/page) using router.push().
// This is the standard approach for Next.js App Router i18n and avoids
// conflicts caused by direct DOM manipulation or full page reloads.
export default function MainLanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname(); // Gets the current path *including* any locale prefix
  const [currentLang, setCurrentLang] = useState('en');

  // Determine current language preference on client-side mount
  // Reads persisted cookie preference or falls back to document lang / default
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
      
      // Set the state based on the determined preference
      return cookieLang || cookiePrefLang || htmlLang || 'en';
    };
    setCurrentLang(getLanguagePreference());
  }, [pathname]); // Re-check if pathname changes (e.g., after navigation)

  console.log('[Header LanguageDebug] Current language state:', currentLang);

  // Switch language using Next.js router
  const switchToLanguage = (lang: string) => {
    if (lang === currentLang) return; // Avoid unnecessary navigation
    
    console.log(`[NextJsSwitcher] Attempting to switch language to: ${lang}`);
    
    try {
      // Set cookies to persist preference across reloads/sessions
      // This ensures the preference is remembered even if the user closes the browser
      document.cookie = `language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
      document.cookie = `preferred_language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
      console.log('[LanguageDebug] Set cookies for preference:', document.cookie);

      // Ensure pathname is valid before pushing
      if (!pathname) {
        console.error('[NextJsSwitcher] Pathname is not available. Cannot switch language.');
        return;
      }

      // --- Core Logic for App Router Locale Change ---
      // 1. Get the base path by removing any existing locale prefix (/en or /es)
      const basePathname = pathname.startsWith('/en/') ? pathname.substring(3) : 
                         pathname.startsWith('/es/') ? pathname.substring(3) : 
                         pathname;
      
      // 2. Construct the new target URL with the desired locale prefix
      // Ensure basePathname starts with a slash if it's not empty to form a valid path
      const targetPath = lang === 'en' ? `/en${basePathname.startsWith('/') ? '' : '/'}${basePathname}` 
                                    : `/es${basePathname.startsWith('/') ? '' : '/'}${basePathname}`;

      console.log(`[NextJsSwitcher] Navigating to new locale path: ${targetPath}`);
      
      // 3. Use router.push with the new locale-prefixed path.
      // Next.js handles the rest (re-rendering with correct locale content).
      router.push(targetPath);
      // --- End Core Logic ---

      // Update state immediately for responsive UI highlighting on the button
      setCurrentLang(lang);
      
      console.log(`[NextJsSwitcher] router.push initiated for locale: ${lang}`);

    } catch (err) {
      console.error('Error in language switch using router:', err);
    }
  };

  return (
    // UI remains the same, driven by currentLang state
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
'use client';

// Ultra-direct language switcher - no dependencies on any context
export default function MainLanguageSwitcher() {
  // Get current language directly from document - MORE ROBUST VERSION
  const getCurrentLanguage = () => {
    if (typeof document === 'undefined') return 'en';
    
    // Check multiple sources with fallbacks
    const htmlLang = document.documentElement.lang;
    const cookieLang = document.cookie.match(/(?:^|;\s*)language=([^;]*)/)?.pop();
    const cookiePrefLang = document.cookie.match(/(?:^|;\s*)preferred_language=([^;]*)/)?.pop();
    const localStorageLang = localStorage.getItem('language');
    const localStoragePrefLang = localStorage.getItem('preferred_language');
    
    // Debug language sources (optional, can be removed for production)
    console.log('[Header LanguageDebug] Language sources:', {
      html: htmlLang,
      cookieLang,
      cookiePrefLang,
      localStorageLang,
      localStoragePrefLang,
      allCookies: document.cookie
    });
    
    return htmlLang || 
           cookieLang ||
           cookiePrefLang ||
           localStorageLang ||
           localStoragePrefLang ||
           'en';
  };
  
  const currentLang = getCurrentLanguage();
  console.log('[Header LanguageDebug] Current language detected as:', currentLang);

  // Simplified language change with direct approach - always redirects to homepage
  const switchToLanguage = (lang: string) => {
    if (lang === currentLang) return;
    
    console.log(`[SimpleSwitcher] Switching language to: ${lang}`);
    
    try {
      // Set all possible storage locations
      localStorage.setItem('language', lang);
      localStorage.setItem('preferred_language', lang);
      console.log('[LanguageDebug] Updated localStorage values');

      // Set cookies with maximum reliability
      document.cookie = `language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
      document.cookie = `preferred_language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
      console.log('[LanguageDebug] Set cookies:', document.cookie);

      // Set HTML lang
      document.documentElement.lang = lang;
      console.log('[LanguageDebug] Set HTML lang attribute to:', document.documentElement.lang);

      // Force hard reload with URL parameters to bypass caching
      const url = new URL(window.location.href);
      // Check for redirect loop by looking at URL - simple version for header
      const redirectCount = parseInt(url.searchParams.get('redirect_count') || '0');
      if (redirectCount > 2) {
        console.error(`[LanguageDebug] Too many redirects detected (${redirectCount}). Stopping redirect chain.`);
        // Optionally alert the user or handle differently in header
        return; 
      }
      
      // Clear any existing redirect-related params
      url.searchParams.delete('t');
      url.searchParams.delete('lang');

      // Set language and redirect counter parameters
      url.searchParams.set('lang', lang);
      url.searchParams.set('redirect_count', (redirectCount + 1).toString());
      url.searchParams.set('t', Date.now().toString());

      const redirectUrl = url.toString();
      console.log('[LanguageDebug] Redirecting to URL with lang parameter:', redirectUrl);
      window.location.href = redirectUrl;
    } catch (err) {
      console.error('Error in language switch:', err);
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
'use client';

/**
 * MainLanguageSwitcher - Direct language switching implementation
 * Uses the same approach as the middle-page language switcher
 */
export default function MainLanguageSwitcher() {
  // Detect current language from document or default to English
  const getCurrentLanguage = () => {
    if (typeof document === 'undefined') return 'en';
    
    // Check multiple sources with fallbacks
    const htmlLang = document.documentElement.lang;
    const cookieLang = document.cookie.match(/(?:^|;\s*)language=([^;]*)/)?.pop();
    const cookiePrefLang = document.cookie.match(/(?:^|;\s*)preferred_language=([^;]*)/)?.pop();
    const localStorageLang = localStorage.getItem('language');
    const localStoragePrefLang = localStorage.getItem('preferred_language');
    
    // Debug language sources
    console.log('[LanguageDebug] Language sources:', {
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
  
  // Get language code
  const currentLang = getCurrentLanguage();
  console.log('[LanguageDebug] Current language detected as:', currentLang);
  
  // Direct language change with hard redirect
  const switchToLanguage = (lang: string) => {
    if (lang === currentLang) {
      console.log(`[LanguageDebug] Language already set to ${lang}, no change needed`);
      return;
    }
    
    // Check for redirect loop by looking at URL
    const url = new URL(window.location.href);
    const redirectCount = parseInt(url.searchParams.get('redirect_count') || '0');
    
    // Prevent redirect loops by limiting redirect count
    if (redirectCount > 2) {
      console.error(`[LanguageDebug] Too many redirects detected (${redirectCount}). Stopping redirect chain.`);
      alert('Error: Too many language redirects. Please refresh the page and try again.');
      return;
    }
    
    console.log(`[LanguageDebug] Switching language from ${currentLang} to: ${lang} (redirect #${redirectCount + 1})`);
    
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
    } catch (error) {
      console.error('[LanguageDebug] Error switching language:', error);
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
        data-testid="en-lang-button"
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
        data-testid="es-lang-button"
      >
        🇪🇸 ES
      </button>
    </div>
  );
} // Force redeploy Thu Apr  3 10:54:45 PDT 2025

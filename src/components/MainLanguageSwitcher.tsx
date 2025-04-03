'use client';

// Ultra-direct language switcher - no dependencies on any context
export default function MainLanguageSwitcher() {
  // Get current language directly from document
  const currentLang = typeof document !== 'undefined' 
    ? document.documentElement.lang || 'en'
    : 'en';
  
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
        className={`px-2 py-1 rounded-md text-sm font-medium ${
          currentLang === 'en' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Switch language to English"
      >
        🇺🇸 EN
      </button>
      <button
        onClick={() => switchToLanguage('es')}
        className={`px-2 py-1 rounded-md text-sm font-medium ${
          currentLang === 'es' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="Switch language to Spanish"
      >
        🇪🇸 ES
      </button>
    </div>
  );
} 
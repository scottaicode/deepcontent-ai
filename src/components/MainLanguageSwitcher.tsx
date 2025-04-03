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
      // Store the selected language in both storage types
      localStorage.setItem('preferred_language', lang);
      localStorage.setItem('language', lang);
      
      // Set cookies directly
      document.cookie = `language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
      document.cookie = `preferred_language=${lang}; path=/; max-age=${60*60*24*365}; SameSite=Lax`;
      
      // Set the HTML attribute manually
      document.documentElement.lang = lang;
      
      // Always redirect to homepage with language parameter
      window.location.href = `/${lang === 'es' ? '?lang=es' : ''}`;
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
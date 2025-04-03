import { useState, useEffect, useMemo, useCallback } from 'react';
// Remove static imports
// import en from '../../locales/en.json';
// import es from '../../locales/es.json';

// Define available languages
type Language = 'en' | 'es';
// type TranslationFiles = {
//   [key in Language]: Record<string, any>;
// };

// No longer need the static translations object here
// const translations: TranslationFiles = {
//   en,
//   es,
// };

// We use this key for storing language preference
const LANGUAGE_STORAGE_KEY = 'language';
// The other system uses this key
const ALT_LANGUAGE_STORAGE_KEY = 'preferred_language';

// Function to get the stored language preference from any storage mechanism
const getStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';

  // Check both storage locations
  const primary = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const alternative = localStorage.getItem(ALT_LANGUAGE_STORAGE_KEY);

  // Use any valid stored value, with primary taking precedence
  const stored = primary || alternative;

  // Validate that the stored language is supported
  if (stored && (stored === 'en' || stored === 'es')) {
    return stored as Language;
  }

  return 'en'; // Default fallback
};

export function useTranslation() {
  const [language, setLanguage] = useState<Language>('en'); // Will be updated in useEffect
  // State to hold the dynamically loaded translations
  const [currentTranslations, setCurrentTranslations] = useState<Record<string, any> | null>(null);
  const [fallbackTranslations, setFallbackTranslations] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load translations dynamically when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        // Dynamically import the JSON for the current language
        const localeModule = await import(`../../locales/${language}.json`);
        setCurrentTranslations(localeModule.default);

        // Ensure fallback (English) is loaded if not already
        if (!fallbackTranslations) {
           const fallbackModule = await import(`../../locales/en.json`);
           setFallbackTranslations(fallbackModule.default);
        }

        console.log(`[Translation] Loaded translations for: ${language}`);
      } catch (error) {
        console.error(`[Translation] Failed to load translations for ${language}:`, error);
        setCurrentTranslations({}); // Set to empty object on error
         // Try loading fallback if it failed
         if (!fallbackTranslations) {
           try {
             const fallbackModule = await import(`../../locales/en.json`);
             setFallbackTranslations(fallbackModule.default);
           } catch (fallbackError) {
              console.error(`[Translation] Failed to load fallback translations:`, fallbackError);
              setFallbackTranslations({});
           }
         }
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [language, fallbackTranslations]); // Rerun when language changes or fallback needs loading

  // Synchronize with localStorage on mount and handle storage events
  useEffect(() => {
    // Initial sync
    const storedLanguage = getStoredLanguage();
    setLanguage(storedLanguage);

    // Handle storage events to sync across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY || event.key === ALT_LANGUAGE_STORAGE_KEY) {
        const newLanguage = getStoredLanguage();
        setLanguage(newLanguage);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Memoized translation function
  const t = useMemo(() => {
    return (key: string, variables?: Record<string, string | number | undefined>): string => {
      // Return key if still loading or translations failed
      if (isLoading || !currentTranslations || !fallbackTranslations) {
        // console.warn(`[Translation] Attempted to translate "${key}" while loading or failed.`);
        return key;
      }

      try {
        if (!key) {
          console.warn('[Translation] Empty translation key provided');
          return '';
        }

        const keys = key.split('.');

        // Get the translation value from the current language file
        let value = keys.reduce((obj, k) => obj?.[k], currentTranslations as any);

        // If translation not found in current lang, try fallback (English)
        if (value === undefined) {
          console.warn(`[Translation] Missing translation for key: "${key}" in language "${language}". Trying fallback.`);
          value = keys.reduce((obj, k) => obj?.[k], fallbackTranslations as any);

          // If still not found, return the key itself
          if (value === undefined) {
            console.warn(`[Translation] Key "${key}" not found in any language file`);
            return key;
          }
        }

        let stringValue = String(value);

        if (variables && stringValue) {
          Object.entries(variables).forEach(([varKey, varValue]) => {
            if (varValue !== undefined) {
              const escapedKey = varKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              stringValue = stringValue.replace(new RegExp(`{${escapedKey}}`, 'g'), String(varValue));
            }
          });
        }

        return stringValue;
      } catch (error) {
        console.error(`[Translation] Error processing key "${key}":`, error);
        return key;
      }
    };
  // Depend on the loaded translations and loading state
  }, [language, currentTranslations, fallbackTranslations, isLoading]);

  // Function to change the current language
  const changeLanguage = useCallback((newLanguage: Language) => {
    // Basic validation
     if (newLanguage !== 'en' && newLanguage !== 'es') {
        console.error('[Language] Invalid language:', newLanguage);
        return;
     }

    // Store in both systems
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
    localStorage.setItem(ALT_LANGUAGE_STORAGE_KEY, newLanguage);

    // Set HTML lang directly for immediate effect
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLanguage;
    }

    setLanguage(newLanguage); // This will trigger the useEffect to load new translations

    // Force the page to re-render via storage event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', {
        key: LANGUAGE_STORAGE_KEY,
        newValue: newLanguage,
        storageArea: localStorage
      }));
    }
  }, []);

  // Memoize return value
  return useMemo(() => ({
    t,
    language,
    changeLanguage,
    supportedLanguages: ['en', 'es'] as Language[], // Keep this static
    isLoadingTranslations: isLoading, // Expose loading state if needed
  }), [t, language, changeLanguage, isLoading]);
} 
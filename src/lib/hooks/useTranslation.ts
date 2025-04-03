import { useState, useEffect, useMemo, useCallback } from 'react';
import en from '../../locales/en.json';
import es from '../../locales/es.json';

// Define available languages
type Language = 'en' | 'es';
type TranslationFiles = {
  [key in Language]: Record<string, any>;
};

// Translations object with all language files
const translations: TranslationFiles = {
  en,
  es,
};

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
  // Initialize with the stored language preference
  const [language, setLanguage] = useState<Language>('en'); // Will be updated in useEffect

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
      try {
        // Check if key is empty or undefined
        if (!key) {
          console.warn('[Translation] Empty translation key provided');
          return '';
        }
        
        // Split the key by dots to access nested properties
        const keys = key.split('.');
        
        // Get the translation value by traversing the nested structure
        let value = keys.reduce((obj, k) => {
          return obj?.[k];
        }, translations[language] as any);
        
        // If translation not found, log warning and fall back to English
        if (value === undefined) {
          console.warn(`[Translation] Missing translation for key: "${key}" in language "${language}"`);
          
          // Try to get English version as fallback
          value = keys.reduce((obj, k) => obj?.[k], translations['en'] as any);
          
          // If still not found, return the key itself as a last resort
          if (value === undefined) {
            console.warn(`[Translation] Key "${key}" not found in any language file`);
            return key; // Return key as fallback
          }
        }
        
        // Ensure value is a string
        let stringValue = String(value);
        
        // Replace variables in the translation string if provided
        if (variables && stringValue) {
          Object.entries(variables).forEach(([varKey, varValue]) => {
            if (varValue !== undefined) {
              // Escape special RegExp characters in varKey before creating RegExp
              const escapedKey = varKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              stringValue = stringValue.replace(new RegExp(`{${escapedKey}}`, 'g'), String(varValue));
            }
          });
        }
        
        return stringValue;
      } catch (error) {
        console.error(`[Translation] Error processing key "${key}":`, error);
        return key; // Return key as fallback in case of error
      }
    };
  }, [language]);

  // Function to change the current language
  const changeLanguage = useCallback((newLanguage: Language) => {
    if (translations[newLanguage]) {
      // Store in both systems
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      localStorage.setItem(ALT_LANGUAGE_STORAGE_KEY, newLanguage);
      
      // Set HTML lang directly for immediate effect
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLanguage;
      }
      
      setLanguage(newLanguage);
      
      // Force the page to re-render
      if (typeof window !== 'undefined') {
        // Dispatch a storage event to ensure other components pick up the change
        window.dispatchEvent(new StorageEvent('storage', {
          key: LANGUAGE_STORAGE_KEY,
          newValue: newLanguage,
          storageArea: localStorage
        }));
      }
    } else {
      console.error('[Language] Invalid language:', newLanguage);
    }
  }, []);

  // Memoize return value to prevent recreation on each render
  return useMemo(() => ({
    t,
    language,
    changeLanguage,
    supportedLanguages: Object.keys(translations) as Language[],
  }), [t, language, changeLanguage]);
} 
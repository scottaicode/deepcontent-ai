'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
import en from '../../locales/en.json';
import es from '../../locales/es.json';

// Type definition for translations - using a more generic type to avoid strict typing issues
// Since the translations format might differ between files
type TranslationsType = Record<string, any>;

// Map of locale codes to translation objects
const translations: Record<string, TranslationsType> = {
  en,
  es,
};

// We'll use localStorage to persist the user's language preference
const LOCALE_STORAGE_KEY = 'preferred_language';
// The other translation system uses this key
const LEGACY_LOCALE_STORAGE_KEY = 'language';

// Function to get the stored language preference from any storage mechanism
const getStoredLanguage = (): string => {
  if (typeof window === 'undefined') return 'en';
  
  // Check both storage locations
  const primary = localStorage.getItem(LOCALE_STORAGE_KEY);
  const legacy = localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY);
  
  console.log('[LanguageProvider] Getting stored language:', { primary, legacy });
  
  // Use any valid stored value, with primary taking precedence
  const stored = primary || legacy;
  
  // Validate that the stored language is supported
  if (stored && Object.keys(translations).includes(stored)) {
    console.log('[LanguageProvider] Returning valid stored language:', stored);
    return stored;
  }
  
  console.log('[LanguageProvider] No valid stored language, defaulting to en');
  return 'en'; // Default fallback
};

// Define the context type
type LanguageContextType = {
  locale: string;
  setLocale: (locale: string) => void;
  translations: TranslationsType;
  t: (path: string, replacements?: Record<string, string>) => string;
};

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  translations: translations.en,
  t: (path) => path,
});

// Provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<string>('en'); // Default to en, will be updated in useEffect
  const [mounted, setMounted] = useState(false);

  // Load preferred language on mount
  useEffect(() => {
    setMounted(true);
    const initialLocale = getStoredLanguage();
    console.log('[LanguageProvider] Initial locale set to:', initialLocale);
    setLocaleState(initialLocale);
    
    // Set HTML lang attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = initialLocale;
      console.log('[LanguageProvider] Set document.documentElement.lang to:', initialLocale);
    }
    
    // Listen for storage events to sync language across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY || event.key === LEGACY_LOCALE_STORAGE_KEY) {
        const newLocale = getStoredLanguage();
        console.log('[LanguageProvider] Language changed in storage:', newLocale);
        setLocaleState(newLocale);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Set locale and save to localStorage
  const setLocale = (newLocale: string) => {
    console.log('[LanguageProvider] Setting locale to:', newLocale);
    
    if (!Object.keys(translations).includes(newLocale)) {
      console.error('[LanguageProvider] Invalid locale:', newLocale);
      return;
    }
    
    // Set state
    setLocaleState(newLocale);
    console.log('[LanguageProvider] Locale state updated to:', newLocale);
    
    // Save preference to localStorage in both systems
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      localStorage.setItem(LEGACY_LOCALE_STORAGE_KEY, newLocale);
      console.log('[LanguageProvider] Stored locale in localStorage:', newLocale);
      
      // Set HTML lang attribute
      document.documentElement.lang = newLocale;
      console.log('[LanguageProvider] Updated document.documentElement.lang to:', newLocale);
    }
  };

  // Translation function - memoize to prevent recreation on each render
  const t = useMemo(() => {
    return (path: string, replacements?: Record<string, string>): string => {
      console.log(`[LanguageProvider] Translating key: ${path}, Current locale: ${locale}`);
      
      const keys = path.split('.');
      let value: any = translations[locale] || translations.en;
      
      // Navigate through the nested object
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined) {
          console.warn(`[LanguageProvider] Translation key not found: ${path}`);
          return path; // Fallback to the key if translation not found
        }
      }
      
      // Apply replacements if any
      if (replacements && typeof value === 'string') {
        return Object.entries(replacements).reduce(
          (text, [key, val]) => text.replace(new RegExp(`{{${key}}}`, 'g'), val),
          value
        );
      }
      
      return value;
    };
  }, [locale]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    locale,
    setLocale,
    translations: translations[locale] || translations.en,
    t
  }), [locale, t]);

  // Client-side rendering
  if (!mounted) {
    return (
      <LanguageContext.Provider 
        value={{ 
          locale: 'en', 
          setLocale, 
          translations: translations.en, 
          t: (path) => path
        }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook to use the language context
export const useLanguage = () => useContext(LanguageContext);

// Hook to get available locales
export const getAvailableLocales = () => [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
]; 
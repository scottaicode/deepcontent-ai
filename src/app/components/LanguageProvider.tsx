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
  
  // Get from cookies first (which will be set by the middleware)
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };
  
  // Check cookies first (higher priority since middleware sets them)
  const cookiePrimary = getCookie(LOCALE_STORAGE_KEY);
  const cookieLegacy = getCookie(LEGACY_LOCALE_STORAGE_KEY);
  
  // Check localStorage as fallback
  const storagePrimary = localStorage.getItem(LOCALE_STORAGE_KEY);
  const storageLegacy = localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY);
  
  console.log('[LanguageProvider] Language sources:', { 
    cookies: { cookiePrimary, cookieLegacy },
    storage: { storagePrimary, storageLegacy } 
  });
  
  // Prioritize cookies (set by middleware) over localStorage
  const stored = cookiePrimary || cookieLegacy || storagePrimary || storageLegacy;
  
  // Validate that the stored language is supported
  if (stored && Object.keys(translations).includes(stored)) {
    console.log('[LanguageProvider] Using language:', stored);
    return stored;
  }
  
  console.log('[LanguageProvider] No valid language found, defaulting to en');
  return 'en'; // Default fallback
};

// Define the context type
type LanguageContextType = {
  locale: string;
  setLocale: (locale: string, withReload?: boolean) => void;
  translations: TranslationsType;
  t: (path: string, options?: { defaultValue?: string; replacements?: Record<string, string> }) => string;
};

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  translations: translations.en,
  t: (path, options) => options?.defaultValue || path,
});

// Provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state directly with stored language on client
  const [locale, setLocaleState] = useState<string>(() => getStoredLanguage()); 
  const [mounted, setMounted] = useState(false);

  // Effect to handle mounting and hydration consistency
  useEffect(() => {
    setMounted(true);
    // Re-sync on mount in case initial value was different or for server/client consistency
    const currentStoredLocale = getStoredLanguage();
    if (locale !== currentStoredLocale) {
      console.log(`[LanguageProvider] Hydration mismatch or update needed. Syncing locale to: ${currentStoredLocale}`);
      setLocaleState(currentStoredLocale);
    }
    
    // Set HTML lang attribute (ensure it matches state)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentStoredLocale; // Use the definite current value
      console.log('[LanguageProvider] Set document.documentElement.lang on mount:', currentStoredLocale);
    }
    
    // Listen for storage events to sync language across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY || event.key === LEGACY_LOCALE_STORAGE_KEY) {
        const newLocale = getStoredLanguage();
        console.log('[LanguageProvider] Language changed in storage:', newLocale);
        setLocaleState(newLocale);
        // Also update lang attribute on storage change
        if (typeof document !== 'undefined') {
           document.documentElement.lang = newLocale;
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [locale]); // Add locale as dependency to re-run if needed, though primary sync is via storage event

  // Set locale and save to localStorage with reload
  const setLocale = (newLocale: string, withReload: boolean = false) => {
    console.log('[LanguageProvider] Setting locale to:', newLocale);
    
    if (!Object.keys(translations).includes(newLocale)) {
      console.error('[LanguageProvider] Invalid locale:', newLocale);
      return;
    }
    
    // Only reload if the locale is different
    const shouldReload = withReload && locale !== newLocale;
    
    // Set state
    setLocaleState(newLocale);
    console.log('[LanguageProvider] Locale state updated to:', newLocale);
    
    // Save preference to localStorage in both systems
    if (typeof window !== 'undefined') {
      try {
        // Update localStorage
        localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
        localStorage.setItem(LEGACY_LOCALE_STORAGE_KEY, newLocale);
        
        // Set cookies directly
        document.cookie = `preferred_language=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
        document.cookie = `language=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
        
        // Set HTML lang attribute
        document.documentElement.lang = newLocale;
        console.log('[LanguageProvider] Updated storage and lang attribute to:', newLocale);
        
        // Force reload if requested and language changed
        if (shouldReload) {
          console.log('[LanguageProvider] Reloading page to apply language change');
          setTimeout(() => {
            window.location.reload();
          }, 50);
        }
      } catch (error) {
        console.error('[LanguageProvider] Error updating language storage:', error);
      }
    }
  };

  // Translation function - memoize to prevent recreation on each render
  const t = useMemo(() => {
    return (path: string, options?: { defaultValue?: string; replacements?: Record<string, string> }): string => {
      console.log(`[LanguageProvider] Translating key: ${path}, Current locale: ${locale}`);
      
      const keys = path.split('.');
      let value: any = translations[locale] || translations.en;
      
      // Navigate through the nested object
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined) {
          console.warn(`[LanguageProvider] Translation key not found: ${path}`);
          return options?.defaultValue || path;
        }
      }
      
      // Apply replacements if any
      if (options?.replacements && typeof value === 'string') {
        return Object.entries(options.replacements).reduce(
          (text, [key, val]) => text.replace(new RegExp(`{{${key}}}`, 'g'), val),
          value
        );
      }
      
      return String(value);
    };
  }, [locale]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    locale,
    setLocale,
    translations: translations[locale] || translations.en,
    t
  }), [locale, t]);

  // Client-side rendering check - use initial state value before mount
  if (!mounted) {
    // Provide a value consistent with the initial state calculation
    const initialLocale = getStoredLanguage(); // Recalculate or use a shared initial value
    return (
      <LanguageContext.Provider 
        value={{ 
          locale: initialLocale, 
          setLocale, 
          translations: translations[initialLocale] || translations.en, 
          t: (path, options) => options?.defaultValue || path // Keep fallback consistent
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
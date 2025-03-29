// @ts-nocheck
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLanguage } from './LanguageProvider';
import { useTranslation } from '@/lib/hooks/useTranslation';
// @ts-ignore
import Cookies from 'js-cookie';

// Create a context for the unified language management
interface TranslationManagerContextType {
  refreshApp: () => void;
  setApplicationLanguage: (lang: string) => void;
}

const TranslationManagerContext = createContext<TranslationManagerContextType>({
  refreshApp: () => {},
  setApplicationLanguage: () => {}
});

export const useTranslationManager = () => useContext(TranslationManagerContext);

/**
 * TranslationManager is responsible for syncing both translation systems
 * and providing mechanisms to force refresh components when language changes
 */
export function TranslationManager({ children }: { children: React.ReactNode }) {
  const { locale, setLocale } = useLanguage();
  const { language, changeLanguage } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);

  // Force the child components to re-render
  const refreshApp = useCallback(() => {
    console.log('[TranslationManager] Refreshing app components');
    setRefreshKey(prev => prev + 1);
  }, []);

  // Single function to handle language changes app-wide
  const setApplicationLanguage = useCallback((newLanguage: string) => {
    console.log('[TranslationManager] Setting application language:', newLanguage);
    
    // First set localStorage values directly to ensure persistence
    if (typeof window !== 'undefined') {
      // Set in localStorage
      localStorage.setItem('preferred_language', newLanguage);
      localStorage.setItem('language', newLanguage);
      
      // Set in cookies
      Cookies.set('preferred_language', newLanguage, { expires: 365, path: '/' });
      Cookies.set('language', newLanguage, { expires: 365, path: '/' });
      
      // Set HTML lang attribute
      document.documentElement.lang = newLanguage;
      console.log('[TranslationManager] Updated localStorage, cookies, and document.lang:', newLanguage);
    }
    
    // Then update both state systems
    setLocale(newLanguage);
    changeLanguage(newLanguage as any);
    console.log('[TranslationManager] Updated both language systems to:', newLanguage);
    
    // Force refresh the app to ensure all components pick up the new language
    setTimeout(() => {
      refreshApp();
      console.log('[TranslationManager] Forced app refresh after language change');
    }, 10);
  }, [setLocale, changeLanguage, refreshApp]);

  // This effect runs once on component mount to ensure initial sync
  useEffect(() => {
    // Check cookies first (higher priority), then localStorage
    const cookieLanguage = Cookies.get('preferred_language') || Cookies.get('language');
    const storedLanguage = cookieLanguage ||
                          localStorage.getItem('preferred_language') || 
                          localStorage.getItem('language') || 
                          'en';
    
    console.log('[TranslationManager] Initial check - stored language:', { cookieLanguage, storedLanguage });
    console.log('[TranslationManager] Current states:', { locale, language });
    
    // Don't update if already matching to prevent unnecessary re-renders
    if (storedLanguage !== locale || storedLanguage !== language) {
      console.log('[TranslationManager] Initial sync with stored language:', storedLanguage);
      setApplicationLanguage(storedLanguage);
    } else {
      console.log('[TranslationManager] No initial sync needed - languages already match');
    }
  }, []);

  // Listen for language header from middleware
  useEffect(() => {
    // Check for x-language header (set by middleware)
    const checkServerLanguage = () => {
      const metaLang = document.querySelector('meta[name="x-language"]');
      if (metaLang) {
        const serverLanguage = metaLang.getAttribute('content');
        if (serverLanguage && (serverLanguage !== locale || serverLanguage !== language)) {
          console.log('[TranslationManager] Detected server language:', serverLanguage);
          setApplicationLanguage(serverLanguage);
        }
      }
    };
    
    // Run on mount and when navigating
    checkServerLanguage();
    
    // Listen for route changes in Next.js
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', checkServerLanguage);
      return () => window.removeEventListener('popstate', checkServerLanguage);
    }
  }, []);

  // Minimal effect to keep the two systems in sync if they somehow get out of sync
  useEffect(() => {
    if (locale !== language && locale) {
      console.log('[TranslationManager] Correcting language sync discrepancy:', { locale, language });
      setApplicationLanguage(locale);
    }
  }, [locale, language, setApplicationLanguage]);

  return (
    <TranslationManagerContext.Provider 
      value={{ 
        refreshApp, 
        setApplicationLanguage 
      }}
    >
      <div key={refreshKey}>{children}</div>
    </TranslationManagerContext.Provider>
  );
} 
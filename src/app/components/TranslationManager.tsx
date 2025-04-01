'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLanguage } from './LanguageProvider';
import { useTranslation } from '@/lib/hooks/useTranslation';
import UniversalCookies from 'universal-cookie';

// Create a context for the unified language management
interface TranslationManagerContextType {
  refreshApp: () => void;
  setApplicationLanguage: (lang: string, forceReload?: boolean) => void;
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
  const [cookies, setCookies] = useState<UniversalCookies | null>(null);

  // Initialize cookies once on the client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCookies(new UniversalCookies());
    }
  }, []);

  // Force the child components to re-render
  const refreshApp = useCallback(() => {
    console.log('[TranslationManager] Refreshing app components');
    setRefreshKey(prev => prev + 1);
  }, []);

  // Single function to handle language changes app-wide with direct cookie setting
  const setApplicationLanguage = useCallback((newLanguage: string, forceReload: boolean = false) => {
    console.log('[TManagerDebug] Setting application language:', newLanguage, { forceReload });
    
    // Helper function to set cookies directly in document
    const setDocumentCookie = (name: string, value: string, days: number = 365) => {
      const maxAge = days * 24 * 60 * 60;
      document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
    };
    
    // Validate the language is supported (only 'en' or 'es')
    if (!newLanguage || !['en', 'es'].includes(newLanguage)) {
      console.error('[TManagerDebug] Invalid language:', newLanguage);
      return;
    }
    
    // Determine when to reload based on the magnitude of the change
    const isDifferentFromBoth = newLanguage !== locale && newLanguage !== language;
    const shouldReload = forceReload || isDifferentFromBoth;
    console.log('[TManagerDebug] Should reload?', { 
      shouldReload, 
      forceReload, 
      isDifferentFromBoth,
      currentState: { locale, language, newLanguage }
    });
    
    // First set localStorage and cookies directly to ensure persistence
    if (typeof window !== 'undefined') {
      try {
        // Set in localStorage
        localStorage.setItem('preferred_language', newLanguage);
        localStorage.setItem('language', newLanguage);
        
        // Set cookies directly in document
        setDocumentCookie('preferred_language', newLanguage);
        setDocumentCookie('language', newLanguage);
        
        // Also use the cookies library as backup if available
        if (cookies) {
          cookies.set('preferred_language', newLanguage, { path: '/', maxAge: 365 * 24 * 60 * 60 });
          cookies.set('language', newLanguage, { path: '/', maxAge: 365 * 24 * 60 * 60 });
        }
        
        // Set HTML lang attribute
        document.documentElement.lang = newLanguage;
        console.log('[TManagerDebug] Updated storage values:', { 
          localStorage: {
            preferred_language: localStorage.getItem('preferred_language'),
            language: localStorage.getItem('language')
          },
          documentLang: document.documentElement.lang,
          cookies: document.cookie
        });
      } catch (error) {
        console.error('[TManagerDebug] Error updating storage:', error);
      }
    }
    
    // Then update both state systems
    setLocale(newLanguage);
    changeLanguage(newLanguage as any);
    console.log('[TManagerDebug] Updated both language systems to:', newLanguage);
    
    // For language changes, always reload the page for maximum reliability
    if (shouldReload) {
      console.log('[TManagerDebug] Language change requires reload');
      
      // If we're already handling a lang parameter in the URL, just refresh without adding params
      if (window.location.href.includes('lang=')) {
        console.log('[TManagerDebug] URL already has language parameter, using simple refresh');
        // Just refresh the current page, the middleware will handle it
        setTimeout(() => {
          window.location.reload();
        }, 50);
        return;
      }
      
      // Otherwise, use a clean redirect to avoid chains
      setTimeout(() => {
        // Go to the homepage with a clean lang parameter
        window.location.href = `/${newLanguage === 'es' ? '?lang=es' : ''}`;
      }, 50);
      return;
    }
    
    // Only refresh the app if we're not reloading
    setTimeout(() => {
      refreshApp();
      console.log('[TManagerDebug] Forced app refresh after language update');
    }, 50);
  }, [setLocale, changeLanguage, refreshApp, cookies, locale, language]);

  // This effect runs once on component mount to ensure initial sync
  useEffect(() => {
    if (!cookies || typeof window === 'undefined') return;
    
    // Check cookies first (higher priority), then localStorage
    const cookieLanguage = cookies.get('preferred_language') || cookies.get('language');
    const storedLanguage = cookieLanguage ||
                          localStorage.getItem('preferred_language') || 
                          localStorage.getItem('language') || 
                          'en';
    
    console.log('[TranslationManager] Initial check - stored language:', { cookieLanguage, storedLanguage });
    console.log('[TranslationManager] Current states:', { locale, language });
    
    // Don't update if already matching to prevent unnecessary re-renders
    if (storedLanguage !== locale && storedLanguage !== language) {
      console.log('[TranslationManager] Initial sync with stored language:', storedLanguage);
      setApplicationLanguage(storedLanguage);
    } else {
      console.log('[TranslationManager] No initial sync needed - languages already match');
    }
  }, [cookies]);

  // Listen for language header from middleware but avoid loops
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Skip if we're already processing a language URL parameter
    if (window.location.href.includes('lang=')) {
      console.log('[TManagerDebug] URL already has language parameter, skipping x-language check');
      return;
    }
    
    // Check if we should prevent redirects during content generation
    const preventRedirect = sessionStorage.getItem('preventLanguageRedirect') === 'true';
    const inContentFlow = window.location.pathname.includes('/create/content') || 
                          window.location.pathname.includes('/create/research') || 
                          window.location.pathname.includes('/create/followup');
    
    if (preventRedirect && inContentFlow) {
      console.log('[TManagerDebug] In content generation flow, skipping language redirect check');
      return;
    }
    
    // Check for x-language header (set by middleware)
    const checkServerLanguage = () => {
      const metaLang = document.querySelector('meta[name="x-language"]');
      if (metaLang) {
        const serverLanguage = metaLang.getAttribute('content');
        
        // Skip update if either state already matches the server language
        if (!serverLanguage || serverLanguage === locale || serverLanguage === language) {
          return;
        }
        
        console.log('[TManagerDebug] Detected server language different from current states:', {
          serverLanguage,
          locale,
          language
        });
        
        // Update with the server language but WITHOUT forcing a reload
        setApplicationLanguage(serverLanguage, false);
      }
    };
    
    // Run once on mount
    checkServerLanguage();
    
    // No need to listen for popstate as it can cause redirect loops
  }, [locale, language, setApplicationLanguage]);

  // Minimal effect to keep the two systems in sync if they somehow get out of sync
  useEffect(() => {
    // Only sync if we have clear differences and we're not on a page with language params already
    if (window.location.href.includes('lang=')) {
      return; // Skip sync on pages already processing language changes
    }
    
    // Only sync if there's a clear discrepancy and both values exist
    if (locale && language && locale !== language) {
      console.log('[TranslationManager] Correcting language sync discrepancy:', { locale, language });
      // Use locale as source of truth without forcing reload
      setApplicationLanguage(locale, false);
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
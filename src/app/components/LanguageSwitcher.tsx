'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage, getAvailableLocales } from './LanguageProvider';
import { useTranslationManager } from './TranslationManager';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LanguageSwitcher Component
 * 
 * Provides a modern dropdown to switch between available languages with flag icons
 * Designed with transparent partnership and human-centered interaction principles
 */
const LanguageSwitcher: React.FC = () => {
  const { locale, t } = useLanguage();
  const { setApplicationLanguage } = useTranslationManager();
  const locales = getAvailableLocales();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Function to get flag emoji based on language code
  const getFlagEmoji = (code: string) => {
    // Convert language code to country code (for flag emoji)
    const countryCode = code === 'en' ? 'US' : code === 'es' ? 'ES' : code.toUpperCase();
    
    // Convert country code to flag emoji (works in modern browsers)
    // Each letter is converted to a regional indicator symbol
    return countryCode
      .toUpperCase()
      .split('')
      .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  };

  // Handler that uses the centralized language management function
  const handleLanguageChange = (newLocale: string) => {
    setApplicationLanguage(newLocale);
    setIsOpen(false);
  };

  // Get the current locale name
  const getCurrentLocaleName = () => {
    const currentLocale = locales.find(loc => loc.code === locale);
    return currentLocale ? currentLocale.name : locale;
  };
  
  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 py-1 px-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-base" aria-hidden="true">{getFlagEmoji(locale)}</span>
        <span className="text-sm font-medium hidden sm:inline-block">{getCurrentLocaleName()}</span>
        <svg 
          className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden"
          >
            <div 
              className="py-1" 
              role="menu" 
              aria-orientation="vertical" 
              aria-labelledby="language-menu"
            >
              {locales.map((loc) => (
                <button
                  key={loc.code}
                  onClick={() => handleLanguageChange(loc.code)}
                  className={`
                    flex items-center space-x-3 w-full px-4 py-2 text-sm text-left transition-colors duration-200
                    ${locale === loc.code ? 
                      'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 
                      'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                  role="menuitem"
                >
                  <span className="text-lg" aria-hidden="true">{getFlagEmoji(loc.code)}</span>
                  <span className="font-medium">{loc.name}</span>
                  {locale === loc.code && (
                    <svg className="ml-auto h-4 w-4 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('languageSwitcher.improveTranslations')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher; 
"use client";

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

// Default translations
const translations: Record<string, Record<string, string>> = {
  en: {
    'createPage.title': 'Create Content',
    'createPage.subtitle': 'Fill out the form below to generate content',
    // Add more translations as needed
  },
  es: {
    'createPage.title': 'Crear Contenido',
    'createPage.subtitle': 'Complete el formulario a continuación para generar contenido',
    // Add more translations as needed
  }
};

export function useTranslation() {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    // Try to get language from cookie
    const cookieLang = Cookies.get('language') || 'en';
    setLanguage(cookieLang);

    // Listen for header changes
    const handleHeaderChange = () => {
      const langHeader = document.querySelector('meta[name="x-language"]')?.getAttribute('content');
      if (langHeader) {
        setLanguage(langHeader);
      }
    };

    handleHeaderChange();
    window.addEventListener('load', handleHeaderChange);
    return () => window.removeEventListener('load', handleHeaderChange);
  }, []);

  const t = (key: string) => {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    // Fallback to English if the key doesn't exist in the selected language
    return translations.en[key] || key;
  };

  return { t, language, setLanguage };
} 
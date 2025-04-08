'use client';

import React, { useEffect, useState } from 'react';
import ImageEditor from '@/components/ImageEditor';
import AppShell from '@/components/AppShell';
import { useLanguage } from '@/app/components/LanguageProvider';
import ProductionModeFixes from '@/components/ProductionModeFixes';

export default function ImageEditorPage() {
  const { t } = useLanguage();
  const [title, setTitle] = useState('AI Image Editor');
  const [subtitle, setSubtitle] = useState('Transform and enhance your images with AI-powered editing tools');
  
  useEffect(() => {
    // Set the title and subtitle with fallbacks for production mode
    const translatedTitle = t('imageEditor.title');
    const translatedSubtitle = t('imageEditor.subtitle');
    
    if (translatedTitle !== 'imageEditor.title') {
      setTitle(translatedTitle);
    }
    
    if (translatedSubtitle !== 'imageEditor.subtitle') {
      setSubtitle(translatedSubtitle);
    }
  }, [t]);
  
  return (
    <AppShell>
      <ProductionModeFixes />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {title}
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            {subtitle}
          </p>
        </div>
        
        <ImageEditor />
      </div>
    </AppShell>
  );
} 
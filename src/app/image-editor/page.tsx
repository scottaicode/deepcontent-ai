'use client';

import React from 'react';
import ImageEditor from '@/components/ImageEditor';
import AppShell from '@/components/AppShell';
import { useLanguage } from '@/app/components/LanguageProvider';

export default function ImageEditorPage() {
  const { t } = useLanguage();
  
  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('imageEditor.title')}
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            {t('imageEditor.subtitle')}
          </p>
        </div>
        
        <ImageEditor />
      </div>
    </AppShell>
  );
} 
'use client';

import React from 'react';
import AppShell from '@/components/AppShell';
import TextToImageGenerator from '@/components/TextToImageGenerator';
import { useLanguage } from '@/app/components/LanguageProvider';
import ProductionModeFixes from '@/components/ProductionModeFixes';

export default function TextToImagePage() {
  const { t } = useLanguage();
  
  return (
    <AppShell>
      <ProductionModeFixes />
      <div className="container mx-auto px-4 py-8">
        <TextToImageGenerator />
      </div>
    </AppShell>
  );
} 
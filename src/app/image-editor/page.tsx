'use client';

import React from 'react';
import ImageEditor from '@/components/ImageEditor';
import AppShell from '@/components/AppShell';
import ProductionModeFixes from '@/components/ProductionModeFixes';

export default function ImageEditorPage() {
  return (
    <AppShell>
      <ProductionModeFixes />
      <div className="container mx-auto px-4 py-8">
        <ImageEditor />
      </div>
    </AppShell>
  );
} 
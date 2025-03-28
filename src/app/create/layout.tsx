"use client";

import React from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface CreateLayoutProps {
  children: React.ReactNode;
}

export default function CreateLayout({ children }: CreateLayoutProps) {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        {children}
      </div>
    </main>
  );
} 
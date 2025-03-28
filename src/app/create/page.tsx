"use client";

import React, { useState } from 'react';
import { ContentForm } from '@/components/ContentForm';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTranslation } from '@/lib/hooks/useTranslation';

export default function CreateContentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleContentCreationSuccess = () => {
    console.log('Content creation success handler called');
    // Force hard navigation to dashboard
    window.location.href = '/dashboard';
  };

  const handleResearchStart = (contentDetails: any) => {
    if (!user) {
      console.error('User not authenticated. Cannot proceed to research.');
      return;
    }
    
    console.log('Storing content details for research:', contentDetails);
    
    try {
      // Store content details in session storage for the follow-up page
      sessionStorage.setItem('contentDetails', JSON.stringify({
        ...contentDetails,
        userId: user.uid
      }));
      
      setIsRedirecting(true);
      // Navigate directly to the follow-up page, skipping the research page
      router.push('/create/followup');
    } catch (error) {
      console.error('Error storing content details:', error);
    }
  };

  return (
    <div className="container mx-auto pt-24 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">{t('createPage.title') || 'Create Content'}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('createPage.subtitle') || 'Fill out the form below to generate content'}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <ContentForm 
            onSuccess={handleContentCreationSuccess}
            onResearch={handleResearchStart}
            isLoadingRedirect={isRedirecting}
          />
        </div>
      </div>
    </div>
  );
} 
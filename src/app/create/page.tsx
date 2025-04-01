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
    // Force hard navigation to homepage
    window.location.href = '/';
  };

  const handleResearchStart = (contentDetails: any) => {
    if (!user) {
      console.error('User not authenticated. Cannot proceed to research.');
      return;
    }
    
    console.log('Content details received:', contentDetails);
    
    try {
      // Check if this is coming from an image analysis
      if (contentDetails.source === 'imageAnalysis') {
        console.log('Image analysis detected, not redirecting');
        // Just store the content details without redirecting
        sessionStorage.setItem('contentDetails', JSON.stringify({
          ...contentDetails,
          userId: user.uid
        }));
        return;
      }
      
      // Extra check - if imageAnalysis is present and no explicit source is set,
      // assume it's from image analysis to be safe
      if (contentDetails.imageAnalysis && !contentDetails.source) {
        console.log('Image analysis detected (from content), not redirecting');
        // Just store the content details without redirecting
        sessionStorage.setItem('contentDetails', JSON.stringify({
          ...contentDetails,
          source: 'imageAnalysis', // Mark it explicitly
          userId: user.uid
        }));
        return;
      }
      
      // Store content details in session storage for the follow-up page
      sessionStorage.setItem('contentDetails', JSON.stringify({
        ...contentDetails,
        userId: user.uid
      }));
      
      // Only redirect if we're sure this isn't from image analysis
      console.log('Regular content details, redirecting to follow-up page');
      setIsRedirecting(true);
      // Navigate directly to the follow-up page, skipping the research page
      router.push('/create/followup');
    } catch (error) {
      console.error('Error storing content details:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto pt-24 pb-8 px-4 flex-grow">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">{t('createPage.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('createPage.subtitle')}
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

      {/* Footer - Redesigned with clarity and accessibility */}
      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">{t('common.appName')}</h2>
              <p className="text-gray-400 mb-4">{t('homePage.footer.subtitle')}</p>
              <div className="flex space-x-4">
                <span className="text-gray-600 cursor-not-allowed">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </span>
                <span className="text-gray-600 cursor-not-allowed">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('homePage.footer.product')}</h3>
              <ul className="space-y-2">
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.features')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.pricing')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.faq')}</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('homePage.footer.resources')}</h3>
              <ul className="space-y-2">
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.blog')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.guides')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.support')}</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">{t('homePage.footer.company')}</h3>
              <ul className="space-y-2">
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.about')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.careers')}</span></li>
                <li><span className="text-gray-500 cursor-not-allowed">{t('homePage.footer.privacy')}</span></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 mt-8 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} DeepContent. {t('homePage.footer.rights')}</p>
            <div className="mt-4 md:mt-0 text-sm text-gray-400">
              {t('homePage.footer.powered')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 
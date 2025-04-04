"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useContent } from '@/lib/hooks/useContent';
import { useToast } from '@/lib/hooks/useToast';
import { ContentItem } from '@/lib/firebase/contentRepository';
import { useAuth } from '@/lib/hooks/useAuth';
import { testFirestoreConnection } from '@/lib/firebase/firebase';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { sendEmailVerification } from "firebase/auth";

export default function DashboardPage() {
  const { contentList, isLoading, error, deleteContent, archiveContent, restoreContent, refreshContent } = useContent();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean | null>(null);
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Clean up filter function - no need for temporary content anymore
  const filteredContent = useMemo(() => {
    // First filter by tab (status)
    let filtered = contentList.filter(item => {
      if (selectedTab === 'all') return true;
      return item.status === selectedTab;
    });
    
    // Then filter by search term if present
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.title?.toLowerCase().includes(lowercaseSearch) || 
        item.content?.toLowerCase().includes(lowercaseSearch) ||
        item.tags?.some((tag: string) => tag.toLowerCase().includes(lowercaseSearch))
      );
    }
    
    return filtered;
  }, [contentList, selectedTab, searchTerm]);
  
  const handleDelete = async (id: string) => {
    if (window.confirm(t('dashboard.confirmDelete'))) {
      try {
        await deleteContent(id);
        toast({
          title: t('dashboard.deleteSuccess'),
          description: t('dashboard.deleteSuccessDesc'),
          variant: 'success'
        });
      } catch (error) {
        toast({
          title: t('dashboard.deleteError'),
          description: t('dashboard.deleteErrorDesc'),
          variant: 'destructive'
        });
      }
    }
  };
  
  const handleArchive = async (id: string) => {
    try {
      await archiveContent(id);
      toast({
        title: t('dashboard.archiveSuccess'),
        description: t('dashboard.archiveSuccessDesc'),
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: t('dashboard.archiveError'),
        description: t('dashboard.archiveErrorDesc'),
        variant: 'destructive'
      });
    }
  };
  
  const handleRestore = async (id: string) => {
    try {
      await restoreContent(id);
      toast({
        title: t('dashboard.restoreSuccess'),
        description: t('dashboard.restoreSuccessDesc'),
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: t('dashboard.restoreError'),
        description: t('dashboard.restoreErrorDesc'),
        variant: 'destructive'
      });
    }
  };
  
  // Clean up and simplify the refresh function
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);

    try {
      // Test Firestore connection
      const isConnected = await testFirestoreConnection();
      setFirestoreConnected(isConnected);
      
      if (!isConnected) {
        throw new Error(t('dashboard.firestoreConnectionFailed'));
      }
      
      await refreshContent();
      setLastRefreshTime(new Date());
      
      toast({
        title: t('dashboard.refreshSuccess'),
        description: t('dashboard.contentRefreshed'),
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('dashboard.refreshError'),
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Clean up useEffect - simplify initialization
  useEffect(() => {
    // Initial content load - ONLY if user is verified
    if (user?.uid && user.emailVerified && !isRefreshing) {
      console.log('User is verified, attempting initial content load...');
      setIsRefreshing(true);
      
      refreshContent()
        .then(() => {
          setLastRefreshTime(new Date());
        })
        .catch(error => {
          // Error from useContent will be handled by the main render block
          console.error('Error loading content during initial load (verified user):', error);
        })
        .finally(() => {
          setIsRefreshing(false);
        });
    } else if (user?.uid && !user.emailVerified) {
      // User exists but is not verified - Do nothing here.
      // The UI error display logic will handle showing the prompt based on the lack of content 
      // and the user's verification status, or any error caught by handleRefresh if clicked.
      console.log('User is not verified, skipping initial content load.');
    }
    // Only re-run if user ID or verification status changes, or refresh function instance changes.
  }, [user?.uid, user?.emailVerified, refreshContent, isRefreshing, setIsRefreshing, setLastRefreshTime]);
  
  // Add Firestore connection check - keep this as it's important for UX
  useEffect(() => {
    const checkFirestore = async () => {
      const isConnected = await testFirestoreConnection();
      setFirestoreConnected(isConnected);
      
      if (!isConnected) {
        toast({
          title: t('dashboard.dbConnectionIssue'),
          description: t('dashboard.dbConnectionDesc'),
          variant: 'destructive'
        });
      }
    };
    
    checkFirestore();
  }, [toast, t]);
  
  // Add handler for resending verification email
  const handleResendVerification = async () => {
    if (user) {
      try {
        await sendEmailVerification(user);
        toast({
          title: t('auth.verificationSentTitle', { defaultValue: 'Verification Email Sent' }),
          description: t('auth.verificationSentDesc', { defaultValue: 'A new verification email has been sent. Please check your inbox.' }),
          variant: 'success',
        });
      } catch (err) {
        console.error("Error resending verification email:", err);
        toast({
          title: t('common.error'),
          description: t('auth.verificationSendError', { defaultValue: 'Failed to send verification email. Please try again later.' }),
          variant: 'destructive',
        });
      }
    }
  };
  
  const formatDate = (date: string | number | Timestamp | undefined) => {
    if (!date) return 'N/A';
    
    // Handle Firebase Timestamp objects from Firestore
    try {
      // Check if it's a Firebase Timestamp object (has seconds and nanoseconds)
      if (date instanceof Timestamp) {
        const timestamp = new Date(date.seconds * 1000);
        
        // Verify the date is valid
        if (!isNaN(timestamp.getTime())) {
          return timestamp.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } else {
          console.warn('Invalid timestamp value:', date);
          return 'Just now';
        }
      }
      
      // For string or number dates, first validate it's a valid date
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      // If we get here, the date is invalid
      console.warn('Invalid date value:', date);
      return 'Just now';
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Just now';
    }
  };
  
  const renderStatusLabel = (status: string) => {
    type StatusTypes = 'published' | 'draft' | 'archived';
    
    const statusConfig: Record<StatusTypes, { label: string; className: string }> = {
      published: {
        label: t('dashboard.statusPublished'),
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      },
      draft: {
        label: t('dashboard.statusDraft'),
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      },
      archived: {
        label: t('dashboard.statusArchived'),
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      }
    };

    const defaultConfig = {
      label: status,
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };

    const statusKey = status as StatusTypes;
    const config = statusConfig[statusKey] || defaultConfig;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };
  
  const renderContentCard = (item: ContentItem) => {
    // Process title to ensure it's displayed correctly
    const processTitle = (title: string | undefined): string => {
      if (!title) return 'Untitled Content';
      
      // Only clean up specific placeholder formats, preserve actual content titles
      let processedTitle = title;
      
      // Only apply replacements if the title contains certain placeholder patterns
      if (title.includes('company-blog') || title.includes('for company')) {
        processedTitle = title
          .replace(/company-blog for company.*?$/i, '')
          .replace(/for company-.*?$/i, '')
          .replace(/^\s*company-blog\s*/i, '')
          .replace(/company-blog/i, 'Blog')
          .replace(/\[.*?\]/g, '') // Remove any placeholder brackets
          .trim();
      }
      
      // If the title is empty after processing, provide a sensible default
      if (!processedTitle || processedTitle.length < 3) {
        // Return a language-aware default title
        const lang = document.documentElement.lang || 'en'; // Try to detect page language
        return lang === 'es' ? 'Contenido sin título' : 'Untitled Content';
      }
      
      return processedTitle;
    };
    
    return (
      <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 break-words max-w-[80%]">
              {processTitle(item.title)}
            </h3>
            {renderStatusLabel(item.status)}
          </div>
          
          <div className="mt-2 mb-3">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-300 mr-1">Platform:</span> 
              {item.platform}
              {item.subPlatform && item.subPlatform !== item.platform && (
                <span className="ml-1">
                  <span className="text-gray-400 mx-1">•</span>
                  {item.subPlatform}
                </span>
              )}
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300 mr-1">Updated:</span> 
              {formatDate(item.updatedAt)}
            </div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {item.content?.substring(0, 150)}...
          </p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags && Array.from(new Set(item.tags)).map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {tag}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex justify-between mt-auto border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex space-x-2">
            {item.status !== 'archived' ? (
              <>
                <button 
                  onClick={() => handleArchive(item.id || '')}
                  className="px-2 py-1 text-xs font-medium text-gray-700 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {t('dashboard.archive')}
                </button>
              </>
            ) : (
              <button 
                onClick={() => handleRestore(item.id || '')}
                className="px-2 py-1 text-xs font-medium text-gray-700 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {t('dashboard.restore')}
              </button>
            )}
            <button 
              onClick={() => handleDelete(item.id || '')}
              className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
            >
              Delete
            </button>
          </div>
          <Link
            href={`/edit/${item.id}`}
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
          >
            Edit
          </Link>
        </div>
      </div>
    );
  };

  // Enhanced status info section with more details and troubleshooting
  const renderStatusInfo = () => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('dashboard.systemStatus')}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('dashboard.userAuthenticated')}
            </span>
            {user ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <span className="w-2 h-2 mr-1 rounded-full bg-green-500"></span>
                {user.email || t('common.authenticated')}
              </span>
            ) : (
              <div className="flex flex-col items-end">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 mb-2">
                  <span className="w-2 h-2 mr-1 rounded-full bg-red-500"></span>
                  {t('common.notAuthenticated')}
                </span>
                <Link href="/login" className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  {t('dashboard.loginRequired')}
                </Link>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('dashboard.databaseConnection')}
            </span>
            {firestoreConnected === true ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <span className="w-2 h-2 mr-1 rounded-full bg-green-500"></span>
                {t('common.connected')}
              </span>
            ) : firestoreConnected === false ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                <span className="w-2 h-2 mr-1 rounded-full bg-red-500"></span>
                {t('common.connectionFailed')}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 mr-1 rounded-full bg-gray-500 animate-pulse"></span>
                {t('common.checking')}
              </span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('dashboard.lastRefresh')}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {lastRefreshTime ? new Date(lastRefreshTime).toLocaleTimeString() : t('common.never')}
            </span>
          </div>
          
          {!user && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                {t('dashboard.authRequired')}
              </div>
              <Link 
                href="/login" 
                className="inline-flex items-center justify-center w-full py-2 px-4 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.signIn')}
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto pt-24 pb-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('dashboard.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('dashboard.refreshing')}
                  </>
                ) : (
                  <>
                    <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t('dashboard.refresh')}
                  </>
                )}
              </button>
              <Link
                href="/create"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg 
                  className="w-4 h-4 mr-1.5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 4v16m8-8H4" 
                  />
                </svg>
                {t('dashboard.createNew')}
              </Link>
            </div>
          </div>
        </div>

        {renderStatusInfo()}
        
        {/* Only show search and filters if we have content */}
        {!isLoading && !error && contentList.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
            <div className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-64">
                  <label htmlFor="search" className="sr-only">Search</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg 
                        className="h-5 w-5 text-gray-400" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                        />
                      </svg>
                    </div>
                    <input
                      id="search"
                      name="search"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="Search content..."
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center overflow-x-auto">
                  <div className="inline-flex rounded-md shadow-sm" role="group">
                    <button
                      onClick={() => setSelectedTab('all')}
                      className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                        selectedTab === 'all'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedTab('published')}
                      className={`px-4 py-2 text-sm font-medium border-t border-b ${
                        selectedTab === 'published'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                      }`}
                    >
                      Published
                    </button>
                    <button
                      onClick={() => setSelectedTab('draft')}
                      className={`px-4 py-2 text-sm font-medium border-t border-b ${
                        selectedTab === 'draft'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                      }`}
                    >
                      Drafts
                    </button>
                    <button
                      onClick={() => setSelectedTab('archived')}
                      className={`px-4 py-2 text-sm font-medium rounded-r-md border ${
                        selectedTab === 'archived'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                      }`}
                    >
                      Archived
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                {t('common.loading')}
              </span>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('dashboard.loadingContent')}</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center shadow">
            {user && !user.emailVerified && error?.toLowerCase().includes('permission') ? (
              // Specific message for unverified users with permission errors
              <p className="text-yellow-800 dark:text-yellow-300 mb-3">
                {t('auth.verificationRequiredForAccess', { defaultValue: 'Please verify your email address to access your content. Check your inbox for the verification email or click below to resend it.' })}
              </p>
            ) : (
              // Generic error message
              <p className="text-red-800 dark:text-red-300">
                {t('dashboard.errorLoadingContent', { defaultValue: 'Error loading content:' })} {error}
              </p>
            )}
            <div className="mt-4 space-x-3">
              {/* Conditionally show resend button if user exists, isn't verified, and error indicates permission issue */}
              {user && !user.emailVerified && error?.toLowerCase().includes('permission') && (
                <button
                  onClick={handleResendVerification}
                  className="px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-md transition-colors"
                >
                  {t('auth.resendVerification', { defaultValue: 'Resend Verification Email' })}
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors"
              >
                {t('dashboard.tryAgain')}
              </button>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition-colors"
              >
                {t('dashboard.refresh')}
              </button>
            </div>
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
            <svg
              className="mx-auto h-16 w-16 text-blue-500 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              {t('dashboard.welcome')}
            </h3>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {t('dashboard.systemReady')}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center justify-center"
              >
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('dashboard.createFirstContent')}
              </Link>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md inline-flex items-center justify-center"
              >
                {isRefreshing ? (
                  <svg className="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {isRefreshing ? t('dashboard.refreshing') : t('dashboard.refresh')}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContent.map(renderContentCard)}
          </div>
        )}
      </div>
    </div>
  );
} 
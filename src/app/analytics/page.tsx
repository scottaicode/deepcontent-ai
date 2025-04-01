"use client";

import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import ContentAnalyticsDashboard from '@/components/ContentAnalyticsDashboard';
import AppShell from '@/components/AppShell';
import { useRouter } from 'next/navigation';

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Redirect to login if user is not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // Show loading state while authentication is being checked
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-4 max-w-sm w-full">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white">Loading</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Please wait while we load your account...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <AppShell hideHeader={true}>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Content Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track performance metrics for your content across platforms and personas
          </p>
        </div>
        
        <ContentAnalyticsDashboard />
      </div>
    </AppShell>
  );
} 
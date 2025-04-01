"use client";

import React from 'react';
import LeadCaptureForm from './LeadCaptureForm';
import { useContent } from '@/lib/hooks/useContent';

interface ContentLeadFormProps {
  contentId: string;
  title?: string;
  subtitle?: string;
  customFields?: {
    company?: boolean;
    jobTitle?: boolean;
    phone?: boolean;
  };
  theme?: 'light' | 'dark';
  layout?: 'vertical' | 'horizontal';
  className?: string;
  redirectUrl?: string;
  showPreview?: boolean;
}

const ContentLeadForm: React.FC<ContentLeadFormProps> = ({
  contentId,
  title,
  subtitle,
  customFields = {
    company: false,
    jobTitle: false,
    phone: false
  },
  theme = 'light',
  layout = 'vertical',
  className = '',
  redirectUrl,
  showPreview = false
}) => {
  const { content, isLoading, error } = useContent({ contentId });
  
  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="flex items-center justify-center py-4">
          <svg className="animate-spin h-5 w-5 text-primary-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading form...</span>
        </div>
      </div>
    );
  }
  
  if (error || !content) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="text-red-500 dark:text-red-400 text-center py-4">
          {error || 'Content not found. Unable to display lead form.'}
        </div>
      </div>
    );
  }
  
  // Generate dynamic form title and subtitle based on content if not provided
  const formTitle = title || `Get more insights on ${content.title}`;
  const formSubtitle = subtitle || 'Fill out the form below to receive more information about this topic';
  
  // Auto-detect campaign from content
  const campaign = content.platform ? `${content.platform}-${content.contentType}` : content.contentType;
  
  return (
    <div className={`${className}`}>
      {showPreview && (
        <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content Information</h3>
          <div className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Title:</span> {content.title}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Type:</span> {content.contentType?.replace('-', ' ')}
            </p>
            {content.platform && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Platform:</span> {content.platform}
              </p>
            )}
            {content.persona && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Persona:</span> {content.persona}
              </p>
            )}
          </div>
        </div>
      )}
      
      <LeadCaptureForm
        contentId={contentId}
        source={content.contentType || 'content'}
        campaign={campaign}
        medium={content.platform || undefined}
        title={formTitle}
        subtitle={formSubtitle}
        customFields={customFields}
        theme={theme}
        layout={layout}
        redirectUrl={redirectUrl}
        submitButtonText="Get Access"
      />
    </div>
  );
};

export default ContentLeadForm; 
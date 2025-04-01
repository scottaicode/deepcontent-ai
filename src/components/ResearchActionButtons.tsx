"use client";

import React from 'react';
import { useToast } from '@/lib/hooks/useToast';

interface ResearchActionButtonsProps {
  research: string | null;
  isExpanded?: boolean;
  topicName?: string;
  onToggleExpand?: () => void;
  translationFunc?: (key: string, fallback: string) => string;
  variant?: 'default' | 'standalone';
}

const ResearchActionButtons: React.FC<ResearchActionButtonsProps> = ({
  research,
  isExpanded = false,
  topicName = 'research',
  onToggleExpand,
  translationFunc,
  variant = 'default'
}) => {
  const { toast } = useToast();
  
  // Default translation function if none provided
  const t = (key: string, fallback: string): string => {
    if (translationFunc) {
      return translationFunc(key, fallback);
    }
    return fallback;
  };

  const handleCopy = () => {
    if (!research) return;
    
    navigator.clipboard.writeText(research)
      .then(() => {
        toast({
          title: t('common.success', 'Success'),
          description: t('research.copySuccess', 'Research copied to clipboard!'),
          variant: 'success'
        });
      })
      .catch(err => {
        console.error('Failed to copy research: ', err);
        toast({
          title: t('common.error', 'Error'),
          description: t('research.copyError', 'Failed to copy. Please try selecting and copying manually.'),
          variant: 'destructive'
        });
      });
  };

  const handleDownload = () => {
    if (!research) return;
    
    // Create and download a text file
    const element = document.createElement('a');
    const file = new Blob([research], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${topicName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (variant === 'standalone') {
    return (
      <div className="flex items-center justify-end gap-6 bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 rounded-t-md shadow-sm">
        <button
          onClick={handleCopy}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center"
          disabled={!research}
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {t('research.buttons.copy', 'Copy')}
        </button>
        
        <button
          onClick={handleDownload}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center"
          disabled={!research}
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t('research.buttons.download', 'Download')}
        </button>
        
        {onToggleExpand && (
          <button 
            onClick={onToggleExpand}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              {isExpanded ? 
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /> :
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              }
            </svg>
            {isExpanded ? t('research.buttons.collapse', 'Collapse') : t('research.buttons.expand', 'Expand')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex space-x-3 mb-4">
      <button
        onClick={handleCopy}
        className="bg-white hover:bg-gray-50 text-blue-600 py-1.5 px-3 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-medium flex items-center shadow-sm"
        disabled={!research}
      >
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {t('research.buttons.copy', 'Copy')}
      </button>
      
      <button
        onClick={handleDownload}
        className="bg-white hover:bg-gray-50 text-blue-600 py-1.5 px-3 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-medium flex items-center shadow-sm"
        disabled={!research}
      >
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {t('research.buttons.download', 'Download')}
      </button>
      
      {onToggleExpand && (
        <button 
          onClick={onToggleExpand}
          className="bg-white hover:bg-gray-50 text-blue-600 py-1.5 px-3 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-medium flex items-center shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            {isExpanded ? 
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /> :
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            }
          </svg>
          {isExpanded ? t('research.buttons.collapse', 'Collapse') : t('research.buttons.expand', 'Expand')}
        </button>
      )}
    </div>
  );
};

export default ResearchActionButtons;
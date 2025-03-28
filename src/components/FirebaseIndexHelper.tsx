import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface FirebaseIndexHelperProps {
  errorUrls?: string[];
  isVisible?: boolean;
}

/**
 * Component to help users create required Firebase indexes
 * Shows a UI to guide users through fixing Firebase index errors
 */
const FirebaseIndexHelper: React.FC<FirebaseIndexHelperProps> = ({
  errorUrls = [],
  isVisible = true,
}) => {
  const { t } = useTranslation();
  const [showHelper, setShowHelper] = useState(false);
  
  useEffect(() => {
    // Show helper if there are error URLs and it's set to be visible
    setShowHelper(isVisible && errorUrls.length > 0);
    
    // Also setup a listener for Firebase index errors
    const handleConsoleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('The query requires an index')) {
        setShowHelper(true);
      }
    };
    
    window.addEventListener('error', handleConsoleError);
    return () => window.removeEventListener('error', handleConsoleError);
  }, [isVisible, errorUrls]);
  
  // Helper function to extract the index creation URL from an error message
  const extractIndexUrl = (errorMsg: string) => {
    const urlMatch = errorMsg.match(/You can create it here: (https:\/\/console\.firebase\.google\.com\/.+)/);
    return urlMatch ? urlMatch[1] : null;
  };
  
  const handleCreateIndex = (url: string) => {
    // Open the URL in a new tab
    window.open(url, '_blank');
    toast.success(t('firebase.indexHelper.indexCreationStarted', { defaultValue: 'Index creation started in new tab' }));
  };
  
  const handleCreateAllIndexes = () => {
    // Create all indexes by opening each URL in a new tab
    errorUrls.forEach(url => {
      window.open(url, '_blank');
    });
    toast.success(t('firebase.indexHelper.allIndexCreationStarted', { defaultValue: 'All index creations started in new tabs' }));
  };
  
  const handleCreateCommonIndexes = () => {
    // Create the most common indexes
    window.open('/api/firebase/create-indexes?type=content', '_blank');
    window.open('/api/firebase/create-indexes?type=research', '_blank');
    toast.success(t('firebase.indexHelper.commonIndexesCreated', { defaultValue: 'Common indexes creation started' }));
  };
  
  if (!showHelper) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md z-50 border border-amber-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
          {t('firebase.indexHelper.title', { defaultValue: 'Firebase Index Required' })}
        </h3>
        <button 
          onClick={() => setShowHelper(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>
      
      <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
        {t('firebase.indexHelper.description', { 
          defaultValue: 'Your Firebase queries require indexes to be created. This is a one-time setup.'
        })}
      </p>
      
      <div className="space-y-2">
        {errorUrls.length > 0 ? (
          <>
            {errorUrls.map((url, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-xs text-gray-500 truncate max-w-[200px]">Index #{index + 1}</span>
                <button
                  onClick={() => handleCreateIndex(url)}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  {t('firebase.indexHelper.createIndex', { defaultValue: 'Create' })}
                </button>
              </div>
            ))}
            
            {errorUrls.length > 1 && (
              <button
                onClick={handleCreateAllIndexes}
                className="w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mt-2"
              >
                {t('firebase.indexHelper.createAll', { defaultValue: `Create All Indexes (${errorUrls.length})` })}
              </button>
            )}
          </>
        ) : (
          <button
            onClick={handleCreateCommonIndexes}
            className="w-full px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
          >
            {t('firebase.indexHelper.createCommon', { defaultValue: 'Create Common Indexes' })}
          </button>
        )}
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <a 
          href="https://firebase.google.com/docs/firestore/query-data/indexing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {t('firebase.indexHelper.learnMore', { defaultValue: 'Learn about Firebase indexes' })}
        </a>
      </div>
    </div>
  );
};

export default FirebaseIndexHelper; 
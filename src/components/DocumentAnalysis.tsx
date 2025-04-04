"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface DocumentAnalysisProps {
  onDocumentAnalyzed: (result: DocumentAnalysisResult) => void;
}

export interface DocumentAnalysisResult {
  content: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  summary?: string;
}

const DocumentAnalysis: React.FC<DocumentAnalysisProps> = ({ onDocumentAnalyzed }) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  // Commented out unused state when feature is disabled
  // const [isAnalyzing, setIsAnalyzing] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  // const [fileName, setFileName] = useState<string | null>(null);
  // const [documentContent, setDocumentContent] = useState<string>('');
  // const [fileSize, setFileSize] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const [showDocument, setShowDocument] = useState<boolean>(false);
  // const [showResearch, setShowResearch] = useState<boolean>(true);
  // const maxRetries = 3;

  // --- FEATURE FLAG: Set to false to disable the feature ---
  const isDocumentAnalysisEnabled = false;

  // Supported file types (kept for reference)
  const supportedFileTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv'
  ];

  // --- Event Handlers Modified to Respect Feature Flag ---
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!isDocumentAnalysisEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, [isDocumentAnalysisEnabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!isDocumentAnalysisEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, [isDocumentAnalysisEnabled]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!isDocumentAnalysisEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    // No need to set dragging state if disabled
    // if (!isDragging) {
    //   setIsDragging(true);
    // }
  }, [isDocumentAnalysisEnabled]); // Removed isDragging dependency

  // --- Processing logic is bypassed by the flag check ---
  const processFile = async (file: File) => {
    if (!isDocumentAnalysisEnabled) {
        console.log("Document analysis feature is currently disabled.");
        // Set an error or specific state if needed to update UI further, 
        // but current render logic replaces the dropzone entirely.
        return;
    }
    // Original processing logic (commented out / removed) ...
    // setIsAnalyzing(true);
    // setError(null);
    // ... (fetch calls etc.)
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!isDocumentAnalysisEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
       console.log("File dropped, but feature is disabled.");
       // processFile(files[0]); // Bypassed
    }
  }, [isDocumentAnalysisEnabled]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDocumentAnalysisEnabled) return;
    if (e.target.files && e.target.files.length > 0) {
      console.log("File selected, but feature is disabled.");
      // processFile(e.target.files[0]); // Bypassed
    }
  };

  const handleBrowseClick = () => {
    // Allow clicking the area even if disabled, but the input itself is disabled
    if (!isDocumentAnalysisEnabled) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Unused handlers removed or commented out

  // --- Render Logic Updated for Disabled State ---
  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed p-6 rounded-lg text-center transition-colors duration-200 ${
          isDocumentAnalysisEnabled
            ? `cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'}`
            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 cursor-not-allowed opacity-60' // Styles for disabled state
        }`}
        // Only attach handlers if enabled to prevent visual cues like hover effects
        onDragEnter={isDocumentAnalysisEnabled ? handleDragEnter : undefined}
        onDragOver={isDocumentAnalysisEnabled ? handleDragOver : undefined}
        onDragLeave={isDocumentAnalysisEnabled ? handleDragLeave : undefined}
        onDrop={isDocumentAnalysisEnabled ? handleDrop : undefined}
        onClick={isDocumentAnalysisEnabled ? handleBrowseClick : undefined}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileInputChange}
          accept={supportedFileTypes.join(',')}
          disabled={!isDocumentAnalysisEnabled} // HTML disabled attribute
        />

        {/* Static content replacing the dynamic dropzone/status UI */}
        <div className="flex flex-col items-center py-6 text-gray-500 dark:text-gray-400">
           {/* Using a generic warning/info icon */}
           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
          <p className="text-sm font-medium mb-1">
            {t('documentAnalysis.title', { defaultValue: 'Document Analysis' })}
          </p>
           <p className="text-xs">
            {t('common.comingSoon', { defaultValue: 'This feature is temporarily unavailable. Coming soon!' })}
           </p>
           {/* Optional: Show supported formats even when disabled */}
           {/* <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
             ({t('documentAnalysis.supportedFormats', { defaultValue: 'PDF, Word, Excel, Text (Max 10MB)' })})
           </p> */}
        </div>
      </div>
      {/* Result display section is effectively removed as state is never set */}
    </div>
  );
};

export default DocumentAnalysis; 
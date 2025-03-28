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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDocument, setShowDocument] = useState<boolean>(false);

  // Supported file types
  const supportedFileTypes = [
    'application/pdf', // PDF
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword', // DOC
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'application/vnd.ms-excel', // XLS
    'text/plain', // TXT
    'text/csv' // CSV
  ];

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const processFile = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setFileName(file.name);

    try {
      // Check file type
      const isValidType = 
        supportedFileTypes.includes(file.type) || 
        file.name.endsWith('.pdf') || 
        file.name.endsWith('.docx') || 
        file.name.endsWith('.doc') || 
        file.name.endsWith('.xlsx') || 
        file.name.endsWith('.xls') || 
        file.name.endsWith('.txt') || 
        file.name.endsWith('.csv');
      
      if (!isValidType) {
        throw new Error('Unsupported file type. Please upload PDF, Word, Excel, or Text documents.');
      }

      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File is too large. Maximum size is 10MB.');
      }

      // Create FormData for API request
      const formData = new FormData();
      formData.append('file', file);

      // Send to API for processing
      const response = await fetch('/api/document-analysis', {
        method: 'POST',
        body: formData,
      });

      // Handle HTTP error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      
      // Store document content for display
      if (result.content) {
        setDocumentContent(result.content);
      }

      // Call the callback with the analysis result
      onDocumentAnalyzed({
        content: result.content || 'No content extracted',
        fileName: file.name,
        fileType: file.type || 'unknown',
        fileSize: file.size,
        summary: result.summary || 'No summary available'
      });

    } catch (err) {
      console.error('Document analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleShowDocument = () => {
    setShowDocument(!showDocument);
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed p-6 rounded-lg text-center cursor-pointer transition-colors duration-200 ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileInputChange}
          accept=".pdf,.doc,.docx,.xlsx,.xls,.txt,.csv"
        />
        
        {isAnalyzing ? (
          <div className="py-6">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('documentAnalysis.processingFile')} {fileName}...
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {t('documentAnalysis.dragDrop')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('documentAnalysis.supportedFormats')}
            </p>
            
            {error && (
              <div className="mt-4 text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAnalysis; 
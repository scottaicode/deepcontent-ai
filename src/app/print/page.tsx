'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function PrintPage() {
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pageContent, setPageContent] = useState({
    title: 'Generated Content',
    audience: 'General Audience',
    style: 'Standard',
    content: 'No content available',
    date: new Date().toLocaleDateString()
  });

  useEffect(() => {
    // Check if we should use localStorage
    const useLocalStorage = searchParams.get('useLocalStorage') === 'true';
    
    if (useLocalStorage) {
      // Get content from localStorage
      const title = localStorage.getItem('printTitle') || 'Generated Content';
      const audience = localStorage.getItem('printAudience') || 'General Audience';
      const style = localStorage.getItem('printStyle') || 'Standard';
      const content = localStorage.getItem('printContent') || 'No content available';
      const date = localStorage.getItem('printDate') || new Date().toLocaleDateString();
      
      setPageContent({
        title,
        audience,
        style,
        content,
        date
      });
    } else {
      // Get content from URL params (fallback for smaller content)
      const title = searchParams.get('title') || 'Generated Content';
      const audience = searchParams.get('audience') || 'General Audience';
      const style = searchParams.get('style') || 'Standard';
      const content = searchParams.get('content') || 'No content available';
      const date = searchParams.get('date') || new Date().toLocaleDateString();
      
      setPageContent({
        title,
        audience,
        style,
        content,
        date
      });
    }
    
    setIsLoaded(true);
  }, [searchParams]);

  useEffect(() => {
    // Auto-trigger print dialog when page loads and content is ready
    if (isLoaded) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
  
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  return (
    <div className="max-w-4xl mx-auto p-8 print:p-0 bg-white">
      {/* Print Header */}
      <div className="mb-8 flex items-center justify-between border-b pb-6 print:pb-4">
        <div className="flex items-center">
          <div className="relative h-12 w-12 mr-4">
            <Image 
              src="/logo.svg" 
              alt="DeepContent Logo"
              fill
              sizes="48px"
              style={{objectFit: 'contain'}}
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-600">DeepContent</h1>
            <p className="text-sm text-gray-500">AI-Powered Content Creation</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Generated on {pageContent.date}</p>
          <p className="text-xs text-gray-400">Using Claude 3.7 Sonnet Analysis</p>
        </div>
      </div>

      {/* Content Metadata */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{pageContent.title}</h2>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
          <div className="bg-blue-50 px-3 py-1 rounded-full">
            <span className="font-medium">Audience:</span> {pageContent.audience}
          </div>
          <div className="bg-blue-50 px-3 py-1 rounded-full">
            <span className="font-medium">Style:</span> {pageContent.style}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div ref={contentRef} className="prose max-w-none my-6 whitespace-pre-wrap print:whitespace-pre-wrap">
        {pageContent.content}
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-4 border-t text-center text-xs text-gray-500">
        <p>Created with DeepContent - Powered by Claude 3.7 Sonnet and Perplexity Deep Research</p>
        <p className="mt-1">© {new Date().getFullYear()} DeepContent</p>
      </footer>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            color: #000;
            background: #fff;
          }
          @page {
            margin: 2cm;
          }
          .prose {
            font-size: 12pt;
            line-height: 1.5;
          }
          .no-print {
            display: none;
          }
        }
      `}</style>

      {/* Non-print instructions */}
      <div className="mt-16 p-4 bg-gray-100 rounded-lg text-center no-print">
        <h3 className="text-lg font-medium mb-2">PDF Export</h3>
        <p className="mb-4">Your browser's print dialog should have opened automatically.</p>
        <p className="mb-2">To save as PDF:</p>
        <ol className="text-left max-w-md mx-auto mb-4">
          <li className="mb-1">1. Select "Save as PDF" as the destination/printer</li>
          <li className="mb-1">2. Click "Save" or "Print" to download your content as PDF</li>
          <li className="mb-1">3. Close this tab when done</li>
        </ol>
        <button 
          onClick={() => window.print()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Print Again
        </button>
      </div>
    </div>
  );
} 
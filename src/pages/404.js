import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function Custom404() {
  const [path, setPath] = useState('');
  const [redirecting, setRedirecting] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    // Log debugging information
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    console.log('[DEBUG] 404 page loaded for path:', currentPath);
    setPath(currentPath);
    
    // Check if this is the create route
    if (currentPath === '/create') {
      console.log('[DEBUG] Detected /create route, special handling');
      // If this is the create route, redirect immediately to our create page
      window.location.href = '/create';
      return;
    }
    
    // Set up countdown for redirection
    const countdown = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      clearInterval(countdown);
      console.log('[DEBUG] 404 page unmounted');
    };
  }, []);

  // Allow user to cancel redirection
  const cancelRedirect = () => {
    setRedirecting(false);
    console.log('[DEBUG] Redirection cancelled by user');
  };

  return (
    <>
      <Head>
        <title>Page Not Found - DeepContent AI</title>
      </Head>
      <div className="flex flex-col items-center justify-center min-h-screen p-5 text-center">
        <h1 className="text-6xl font-bold mb-6">404</h1>
        <h2 className="text-3xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-lg mb-4 max-w-md">
          The page you are looking for does not exist or might have been moved.
        </p>
        
        {/* Debug information */}
        <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left max-w-md">
          <h3 className="text-md font-semibold mb-2">Debug Information:</h3>
          <p className="text-sm mb-2"><strong>Requested path:</strong> {path}</p>
        </div>
        
        {redirecting ? (
          <>
            <p className="text-sm mb-8">Redirecting to homepage in {secondsLeft} seconds...</p>
            <div className="flex space-x-4">
              <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Go Home Now
              </Link>
              <button 
                onClick={cancelRedirect}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                Stay on This Page
              </button>
            </div>
          </>
        ) : (
          <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Return to Home
          </Link>
        )}
      </div>
    </>
  );
} 
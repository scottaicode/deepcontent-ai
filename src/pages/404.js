import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function Custom404() {
  const [path, setPath] = useState('');
  const [redirecting, setRedirecting] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [detectTime, setDetectTime] = useState(new Date().toISOString());
  const [routeStatus, setRouteStatus] = useState('');

  useEffect(() => {
    // Log debugging information
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    console.log('[DEBUG] 404 page loaded for path:', currentPath);
    console.log('[DEBUG] Full URL:', currentUrl);
    setPath(currentPath);
    
    // VERY IMPORTANT: Special handling for /create route
    if (currentPath === '/create' || currentPath.startsWith('/create/')) {
      console.log('[DEBUG] Detected /create route, immediate action needed');
      setRouteStatus('Create route detected, attempting to fix...');
      
      // Try multiple approaches
      // 1. Try to access the static HTML first 
      window.location.href = '/create/index.html';
      
      // 2. If that doesn't work after a short delay, try direct navigation to create.js
      setTimeout(() => {
        console.log('[DEBUG] Trying fallback approach for /create');
        window.location.href = '/create?bypass=true';
      }, 500);
      
      return;
    }
    
    // Set up countdown for redirection for other routes
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

  // Special function to try alternative routes
  const tryAlternativeRoutes = () => {
    if (path === '/create' || path.startsWith('/create/')) {
      console.log('[DEBUG] Manual attempt to fix create route');
      
      // Try a different approach
      const targetUrl = '/create?manual=true&time=' + new Date().getTime();
      window.location.href = targetUrl;
    }
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
          <p className="text-sm mb-2"><strong>Detected at:</strong> {detectTime}</p>
          <p className="text-sm mb-2"><strong>Status:</strong> {routeStatus || 'Standard 404'}</p>
          {path === '/create' && (
            <button 
              onClick={tryAlternativeRoutes}
              className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
            >
              Try Alternative Route
            </button>
          )}
        </div>
        
        {redirecting && path !== '/create' ? (
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
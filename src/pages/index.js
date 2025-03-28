import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function HomePage() {
  useEffect(() => {
    console.log('[DEBUG] Home page mounted');
    
    // Debug available routes
    console.log('[DEBUG] Available route links:', document.querySelectorAll('a').length);
    
    return () => {
      console.log('[DEBUG] Home page unmounted');
    };
  }, []);

  return (
    <>
      <Head>
        <title>DeepContent AI</title>
        <meta name="description" content="An AI-powered content creation and management platform" />
      </Head>
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <main className="flex flex-col items-center justify-center w-full flex-1 px-5 py-20">
          <h1 className="text-5xl font-bold mb-4">DeepContent AI</h1>
          <p className="text-xl mb-12">An AI-powered content creation and management platform</p>
          
          <div className="flex gap-4">
            <Link 
              href="/create" 
              id="create-link"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
            >
              Get Started
            </Link>
          </div>
          
          {/* Debug Info */}
          <div className="mt-16 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left max-w-md">
            <h3 className="text-md font-semibold mb-2">Navigation Test:</h3>
            <ul className="text-sm">
              <li className="mb-1">
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('[DEBUG] Direct navigation attempt');
                    window.location.href = '/create';
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Direct navigation to /create
                </a>
              </li>
              <li className="mb-1">
                <Link href="/create" className="text-blue-600 hover:underline">
                  Link component to /create
                </Link>
              </li>
            </ul>
          </div>
        </main>
      </div>
    </>
  );
} 
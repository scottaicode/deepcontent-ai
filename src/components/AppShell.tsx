import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MainLanguageSwitcher from './MainLanguageSwitcher';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTranslation } from '@/lib/hooks/useTranslation';
import FirebaseIndexHelper from './FirebaseIndexHelper';

type AppShellProps = {
  children: ReactNode;
  hideHeader?: boolean;  // Add a prop to control header visibility
};

export default function AppShell({ children, hideHeader = false }: AppShellProps) {
  const pathname = usePathname();
  const { user, loading: authLoading, signOut } = useAuth();
  const { t } = useTranslation();
  const [indexErrorUrls, setIndexErrorUrls] = useState<string[]>([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Navigation links
  const navLinks = [
    { name: t('navigation.home', { defaultValue: 'Home' }), href: '/' },
    { name: t('navigation.create', { defaultValue: 'Create' }), href: '/create' },
    { name: t('navigation.dashboard', { defaultValue: 'Dashboard' }), href: '/dashboard' },
    { name: t('navigation.imageEditor', { defaultValue: 'Image Editor' }), href: '/dashboard/image-editor' },
    { name: t('navigation.textToImage', { defaultValue: 'Text-to-Image' }), href: '/dashboard/text-to-image' },
  ];

  useEffect(() => {
    // Listen for Firebase index errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Call the original console.error
      originalConsoleError(...args);
      
      // Check if this is a Firebase index error
      const errorMsg = args.join(' ');
      if (typeof errorMsg === 'string' && errorMsg.includes('The query requires an index')) {
        // Extract the URL from the error message
        const urlMatch = errorMsg.match(/You can create it here: (https:\/\/console\.firebase\.google\.com\/.+)/);
        if (urlMatch && urlMatch[1]) {
          setIndexErrorUrls(prev => {
            // Only add the URL if it's not already in the list
            return prev.includes(urlMatch[1]) ? prev : [...prev, urlMatch[1]];
          });
        }
      }
    };
    
    // Restore the original console.error on cleanup
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  const handleSignOut = async () => {
    console.log('Sign out button clicked');
    try {
      console.log('Attempting to sign out...');
      await signOut();
      console.log('Successfully signed out, redirecting to home page');
      window.location.href = '/';
    } catch (error) {
      // Use a type assertion for the error object
      console.error('Error signing out:', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Only render the header if hideHeader is false */}
      {!hideHeader && (
        <header className="bg-white border-b border-gray-200">
          {/* Top row - Logo and main actions */}
          <div className="border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                {/* Logo */}
                <div className="flex-shrink-0">
                  <Link href="/" className="flex items-center">
                    <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="ml-2.5 text-xl font-bold text-gray-900">DeepContent</span>
                  </Link>
                </div>
                
                {/* Right side actions */}
                <div className="flex items-center space-x-4">
                  {/* User authentication status */}
                  <div className="flex items-center">
                    {authLoading ? (
                      <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                    ) : user ? (
                      <div className="flex items-center">
                        <span className="mr-2 text-sm text-gray-600">
                          {user.displayName || user.email || t('user.anonymous', { defaultValue: 'Signed in' })}
                        </span>
                        <div className="relative">
                          <button 
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 cursor-pointer focus:outline-none"
                          >
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.displayName || 'User'} className="h-8 w-8 rounded-full" />
                            ) : (
                              <span className="text-sm font-medium">
                                {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </button>
                          {isUserMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                              <Link 
                                href="/dashboard" 
                                className="block px-6 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {t('user.dashboard', { defaultValue: 'Dashboard' })}
                              </Link>
                              <Link 
                                href="/settings" 
                                className="block px-6 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {t('user.settings', { defaultValue: 'Settings' })}
                              </Link>
                              <button 
                                onClick={handleSignOut}
                                className="block w-full text-left px-6 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {t('user.signOut', { defaultValue: 'Sign out' })}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Link 
                          href="/auth/login" 
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {t('user.signIn', { defaultValue: 'Sign in' })}
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link 
                          href="/auth/register" 
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          {t('user.register', { defaultValue: 'Register' })}
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  {/* Language switcher */}
                  <MainLanguageSwitcher />
                  
                  {/* Hide Settings and Logout links when they're redundant with the user menu */}
                  {!user && (
                    <>
                      {/* Settings */}
                      <Link 
                        href="/settings" 
                        className="text-gray-500 hover:text-gray-700 p-2"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom row - Navigation */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-12">
              {/* Main navigation */}
              <nav className="flex space-x-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href || 
                    (link.href !== '/' && pathname?.startsWith(link.href));
                  
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
              
              {/* Create button */}
              {!pathname?.startsWith('/create') && (
                <Link
                  href="/create"
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Content
                </Link>
              )}
            </div>
          </div>
          
          {/* User Information Links */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-b border-blue-100 dark:border-blue-800/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-between gap-y-2 gap-x-6 text-sm">
                <div className="hidden sm:block text-blue-700 dark:text-blue-400 font-medium">
                  {t('userInfo.discoverMoreAbout', { defaultValue: 'Discover more about DeepContent:' })}
                </div>
                <div className="flex items-center space-x-4">
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('userInfo.howItWorks', { defaultValue: 'How It Works' })}
                  </Link>
                  <Link
                    href="/app-benefits"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('userInfo.appBenefits', { defaultValue: 'App Benefits' })}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={hideHeader ? "flex-grow bg-gray-50" : "flex-grow bg-gray-50 pt-28"}>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-8 md:mb-0">
              <h2 className="text-2xl font-bold text-blue-500 mb-2">DeepContent</h2>
              <p className="text-gray-300 max-w-md">Content Creation with AI Intelligence</p>
              <p className="text-sm text-gray-400 mt-6">&copy; {new Date().getFullYear()} DeepContent. All rights reserved</p>
              <p className="text-sm text-gray-400 mt-2">Powered by Claude 3.7 Sonnet</p>
            </div>
            {/* other footer content */}
          </div>
        </div>
      </footer>

      {/* Add the Firebase Index Helper */}
      <FirebaseIndexHelper errorUrls={indexErrorUrls} />
    </div>
  );
} 
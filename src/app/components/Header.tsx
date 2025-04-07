'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from './LanguageProvider';
import MainLanguageSwitcher from '@/components/MainLanguageSwitcher';
// import DirectLanguageSwitcher from '@/components/DirectLanguageSwitcher';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePathname } from 'next/navigation';

// Modern icons with fluid design
const Icons = {
  Menu: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Close: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Logo: () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2L21.2132 6.5868L28 8.0132L25.8285 14.4868L28 21.9868L21.2132 23.4132L16 28L10.7868 23.4132L4 21.9868L6.17154 14.4868L4 8.0132L10.7868 6.5868L16 2Z" fill="currentColor" fillOpacity="0.2"/>
      <path d="M16 7L19.0618 9.69693L23 10.5731L21.7082 14.6031L23 18.9269L19.0618 19.8031L16 22.5L12.9382 19.8031L9 18.9269L10.2918 14.6031L9 10.5731L12.9382 9.69693L16 7Z" fill="currentColor"/>
    </svg>
  )
};

const Header: React.FC = () => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isHomepage = pathname === '/';

  // Track scroll position for transparency effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Common button styles to maintain visual consistency
  const buttonClasses = {
    primary: "inline-flex items-center justify-center h-10 px-5 py-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
    secondary: "inline-flex items-center justify-center h-10 px-5 py-0 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
  };

  // Handle logout function
  const handleLogout = async () => {
    console.log('Logout button clicked');
    try {
      console.log('Attempting to sign out...');
      await signOut();
      console.log('Successfully signed out');
      // Force reload the page to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleMenuItemClick = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      console.error('Error handling menu item click:', error);
    }
  };

  // Debug translation for Ad Studio
  console.log('Ad Studio translation:', {
    key: 'navigation.adStudio',
    translation: t('navigation.adStudio'),
    defaultTranslation: t('navigation.adStudio', { defaultValue: 'Ad Studio' })
  });

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrollY > 10 
          ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-shrink-0"
          >
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-blue-600 dark:text-blue-400">
                <Icons.Logo />
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {t('common.appName')}
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <motion.nav 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden md:flex md:items-center md:space-x-8"
          >
            <Link 
              href="/" 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              {t('navigation.home')}
            </Link>
            <Link 
              href="/create" 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              {t('navigation.create')}
            </Link>
            <Link 
              href="/ad-studio" 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              {t('navigation.adStudio', { defaultValue: 'Ad Studio' })}
            </Link>
            <Link 
              href="/dashboard" 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              {t('navigation.dashboard')}
            </Link>
            <Link 
              href="/dashboard/image-editor" 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              {t('navigation.imageEditor')}
            </Link>
            <Link 
              href="/dashboard/text-to-image" 
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              {t('navigation.textToImage')}
            </Link>
          </motion.nav>

          {/* Right side actions */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center space-x-4"
          >
            {isHomepage && <MainLanguageSwitcher />}
            
            {user ? (
              <div className="hidden md:flex items-center space-x-4 relative" ref={userMenuRef}>
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                    {user.email?.[0].toUpperCase() || 'U'}
                  </span>
                  <span>{user.email}</span>
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 top-full">
                    <Link 
                      href="/dashboard"
                      className="block py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = '/dashboard';
                      }}
                    >
                      {t('navigation.dashboard')}
                    </Link>
                    <Link 
                      href="/settings"
                      className="block py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = '/settings';
                      }}
                    >
                      {t('navigation.settings')}
                    </Link>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuItemClick(handleLogout);
                      }}
                      className="block w-full text-left py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {t('navigation.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-4">
                <Link href="/login" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                  {t('navigation.login')}
                </Link>
                <Link href="/signup" className={buttonClasses.primary}>
                  {t('auth.signUp')}
                </Link>
              </div>
            )}
            
            {/* Mobile menu button */}
            <button
              className="md:hidden flex items-center text-gray-700 dark:text-gray-300 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <Icons.Close /> : <Icons.Menu />}
            </button>
          </motion.div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              <Link href="/" className="block py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>{t('navigation.home')}</Link>
              <Link href="/create" className="block py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>{t('navigation.create')}</Link>
              <Link href="/ad-studio" className="block py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>
                {t('navigation.adStudio', { defaultValue: 'Ad Studio' })}
              </Link>
              <Link href="/dashboard" className="block py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>{t('navigation.dashboard')}</Link>
              <Link href="/dashboard/image-editor" className="block py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>{t('navigation.imageEditor')}</Link>
              <Link href="/dashboard/text-to-image" className="block py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" onClick={() => setIsMenuOpen(false)}>{t('navigation.textToImage')}</Link>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                {user ? (
                  <div className="space-y-4">
                    <Link 
                      href="/settings" 
                      className="block py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {t('navigation.settings')}
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {t('navigation.logout')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Link 
                      href="/login" 
                      className="block py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {t('navigation.login')}
                    </Link>
                    <Link 
                      href="/signup" 
                      className="block w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      {t('auth.signUp')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header; 
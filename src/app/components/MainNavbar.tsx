'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MainLanguageSwitcher from '@/components/MainLanguageSwitcher';
import { useLanguage } from './LanguageProvider';
import { usePathname } from 'next/navigation';

/**
 * MainNavbar Component
 * 
 * Main navigation bar with language switcher - designed with modern glass morphism and human-centered interactions
 */
const MainNavbar: React.FC = () => {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if link is active
  const isActive = (path: string): boolean => {
    if (!pathname) return false;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-md py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center group transition-all"
            >
              <div className="flex items-center space-x-1">
                <span className="text-blue-600 dark:text-blue-400 text-2xl font-bold">Deep</span>
                <span className="text-gray-900 dark:text-white text-2xl font-semibold">Content</span>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center space-x-1 md:space-x-2">
            <NavLink href="/create" active={isActive('/create')}>
              {t('navigation.create')}
            </NavLink>
            <NavLink href="/dashboard" active={isActive('/dashboard')}>
              {t('navigation.dashboard')}
            </NavLink>
            <NavLink href="/settings" active={isActive('/settings')}>
              {t('navigation.settings')}
            </NavLink>
            
            {/* Language Switcher */}
            <div className="ml-2 pl-2 md:ml-4 md:pl-4 border-l border-gray-300 dark:border-gray-700">
              <MainLanguageSwitcher />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

// NavLink component for consistent styling
interface NavLinkProps {
  href: string;
  active: boolean | undefined;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ href, active = false, children }) => {
  return (
    <Link 
      href={href} 
      className={`relative px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
      ${active 
        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
        : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/50'
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
      )}
    </Link>
  );
};

export default MainNavbar; 
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './ThemeProvider';

// Import the Theme type from ThemeProvider
type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'icon' | 'switch' | 'dropdown';
}

/**
 * ThemeToggle Component
 * 
 * A modern toggle for switching between light, dark, and system theme modes
 * with smooth animations and visual feedback.
 */
const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  variant = 'icon',
}) => {
  const { theme, setTheme, isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Icons for different themes
  const SunIcon = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="w-5 h-5"
    >
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  );

  const MoonIcon = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="w-5 h-5"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  );

  const SystemIcon = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="w-5 h-5"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  );

  // Get current icon based on theme
  const getCurrentIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon />;
      case 'dark':
        return <MoonIcon />;
      case 'system':
        return isDarkMode ? <MoonIcon /> : <SunIcon />;
      default:
        return <SunIcon />;
    }
  };

  // Get current label based on theme
  const getCurrentLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'Light';
    }
  };

  // Toggle between light and dark directly for icon variant
  const toggleTheme = () => {
    if (variant === 'icon') {
      setTheme(isDarkMode ? 'light' : 'dark');
    } else {
      setIsOpen(!isOpen);
    }
  };

  // Render icon-only toggle
  if (variant === 'icon') {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleTheme}
        className={`
          p-2 rounded-full text-gray-500 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700
          transition-colors duration-200
          ${className}
        `}
        aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isDarkMode ? 'dark' : 'light'}
            initial={{ opacity: 0, rotate: -30 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 30 }}
            transition={{ duration: 0.2 }}
          >
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </motion.div>
        </AnimatePresence>
        
        {showLabel && (
          <span className="ml-2 text-sm font-medium hidden sm:inline-block">
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </span>
        )}
      </motion.button>
    );
  }

  // Render switch variant
  if (variant === 'switch') {
    return (
      <div className={`flex items-center ${className}`}>
        {showLabel && (
          <span className="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            {isDarkMode ? 'Dark' : 'Light'}
          </span>
        )}
        
        <button
          onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200'}
          `}
        >
          <span className="sr-only">Toggle theme</span>
          <motion.span
            layout
            transition={{ type: "spring", stiffness: 700, damping: 30 }}
            className={`
              inline-block h-4 w-4 rounded-full bg-white shadow-lg
              transform ring-0 transition-transform
              ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    );
  }

  // Render dropdown variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggleTheme}
        className="flex items-center space-x-2 p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>{getCurrentIcon()}</span>
        {showLabel && (
          <span className="text-sm font-medium">{getCurrentLabel()}</span>
        )}
        <svg 
          className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50"
          >
            <div className="py-1" role="menu" aria-orientation="vertical">
              {['light', 'dark', 'system'].map((themeOption) => (
                <button
                  key={themeOption}
                  onClick={() => {
                    setTheme(themeOption as Theme);
                    setIsOpen(false);
                  }}
                  className={`
                    flex items-center w-full px-4 py-2 text-sm text-left
                    ${theme === themeOption 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                  role="menuitem"
                >
                  <span className="mr-3">
                    {themeOption === 'light' && <SunIcon />}
                    {themeOption === 'dark' && <MoonIcon />}
                    {themeOption === 'system' && <SystemIcon />}
                  </span>
                  <span className="capitalize">{themeOption}</span>
                  {theme === themeOption && (
                    <svg className="ml-auto h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeToggle; 
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from './LanguageProvider';
import { X, InfoIcon, Lightbulb } from 'lucide-react';

interface InfoBannerProps {
  onClose?: () => void;
}

const InfoBanner: React.FC<InfoBannerProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);

  // Check local storage on mount to see if the banner has been dismissed
  useEffect(() => {
    const bannerState = localStorage.getItem('infoBannerDismissed');
    if (bannerState === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Store the dismissed state in localStorage
    localStorage.setItem('infoBannerDismissed', 'true');
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-100 dark:border-blue-800"
    >
      <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center">
            <InfoIcon className="w-4 h-4 mr-2" />
            <span>
              {t('infoBanner.newUser', { 
                defaultValue: 'New to DeepContent? Learn more about our platform:' 
              })}
            </span>
          </p>
          
          <div className="flex items-center space-x-4">
            <Link 
              href="/how-it-works" 
              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
            >
              <InfoIcon className="w-4 h-4 mr-1" />
              {t('infoBanner.howItWorks', { defaultValue: 'How It Works' })}
            </Link>
            
            <Link 
              href="/app-benefits" 
              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
            >
              <Lightbulb className="w-4 h-4 mr-1" />
              {t('infoBanner.appBenefits', { defaultValue: 'App Benefits' })}
            </Link>
            
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
              aria-label="Close banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InfoBanner; 
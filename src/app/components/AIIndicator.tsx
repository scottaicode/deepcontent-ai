'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from './LanguageProvider';

type AIIndicatorProps = {
  isActive?: boolean;
  type?: 'generating' | 'thinking' | 'researching' | 'ready' | 'idle';
  label?: string;
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left' | 'inline';
  showDetails?: boolean;
  className?: string;
};

/**
 * AIIndicator Component
 * 
 * A visual indicator that shows when AI is being used in the application
 * Part of our transparent partnership design principles
 */
const AIIndicator: React.FC<AIIndicatorProps> = ({
  isActive = false,
  type = 'idle',
  label,
  position = 'bottom-right',
  showDetails = false,
  className = '',
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Define colors based on AI activity type
  const getTypeColor = () => {
    switch (type) {
      case 'generating':
        return 'bg-green-500';
      case 'thinking':
        return 'bg-blue-500';
      case 'researching':
        return 'bg-purple-500';
      case 'ready':
        return 'bg-teal-500';
      case 'idle':
      default:
        return 'bg-gray-500';
    }
  };
  
  // Get appropriate label for the activity
  const getTypeLabel = () => {
    if (label) return label;
    
    switch (type) {
      case 'generating':
        return t('ai.generating') || 'AI Generating Content';
      case 'thinking':
        return t('ai.thinking') || 'AI Processing';
      case 'researching':
        return t('ai.researching') || 'AI Researching';
      case 'ready':
        return t('ai.ready') || 'AI Ready';
      case 'idle':
      default:
        return t('ai.idle') || 'AI Idle';
    }
  };
  
  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-left': 'top-4 left-4',
    'inline': '',
  };
  
  // If not active, don't render
  if (!isActive && type === 'idle') return null;
  
  // For inline positioning, render a simpler version
  if (position === 'inline') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className={`h-2 w-2 rounded-full ${getTypeColor()}`} />
        <span className="text-xs text-gray-600 dark:text-gray-400">{getTypeLabel()}</span>
      </div>
    );
  }
  
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`fixed ${positionClasses[position]} z-50 ${className}`}
        >
          <motion.div
            className={`
              flex items-center cursor-pointer bg-white dark:bg-gray-800 
              border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5
              shadow-lg hover:shadow-xl transition-all duration-300 select-none
              ${isExpanded ? 'pr-4' : 'pr-3'}
            `}
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative flex items-center">
              {/* Pulse animation for the dot */}
              <div className={`relative h-3 w-3 ${isExpanded ? 'mr-3' : 'mr-0'}`}>
                <motion.div
                  className={`absolute inset-0 ${getTypeColor()} rounded-full`}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: 'loop',
                  }}
                />
                <div className={`absolute inset-0 ${getTypeColor()} rounded-full`} />
              </div>
              
              {/* Text label - only shown when expanded */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {getTypeLabel()}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          
          {/* Additional details tooltip */}
          <AnimatePresence>
            {isExpanded && showDetails && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={`
                  absolute ${position === 'bottom-left' || position === 'bottom-right' ? 'bottom-10' : 'top-10'} 
                  ${position === 'bottom-right' || position === 'top-right' ? 'right-0' : 'left-0'} 
                  bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                  rounded-lg shadow-xl p-4 w-64 z-50 mt-2
                `}
              >
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t('ai.aiSystemInfo') || 'AI System Information'}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('ai.status') || 'Status'}:
                      </span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {getTypeLabel()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('ai.model') || 'Model'}:
                      </span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        GPT-4
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('ai.latency') || 'Latency'}:
                      </span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        230ms
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    {t('ai.transparency') || 'We believe in transparency. You always know when AI is being used.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIIndicator; 
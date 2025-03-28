"use client";

import React from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface ContentCreationStepsProps {
  currentStep: number;
  onStepChange: (step: number) => void;
}

const ContentCreationSteps: React.FC<ContentCreationStepsProps> = ({ 
  currentStep, 
  onStepChange 
}) => {
  const { t } = useTranslation();
  
  // Helper function to ensure we always get a string from translation
  const safeTranslate = (key: string, fallback: string): string => {
    const translated = t(key);
    if (typeof translated === 'string') {
      return translated;
    }
    console.warn(`Translation for key "${key}" returned non-string value:`, translated);
    return fallback;
  };
  
  const steps: Step[] = [
    { 
      id: 1, 
      title: safeTranslate('createPage.steps.step1', 'Content Setup'), 
      description: safeTranslate('researchPage.steps.myIdea', 'Select content type & audience')
    },
    { 
      id: 2, 
      title: safeTranslate('researchPage.title', 'Research'), 
      description: safeTranslate('researchPage.steps.target', 'Gather key information')
    },
    { 
      id: 3, 
      title: safeTranslate('contentPage.title', 'Generate Content'), 
      description: safeTranslate('researchPage.steps.followUp', 'Generate custom content')
    }
  ];

  return (
    <div className="mb-8">
      <div className="relative">
        {/* Progress bar */}
        <div className="overflow-hidden h-2 mb-4 flex rounded bg-gray-200 dark:bg-gray-700">
          <div
            className="shadow-none flex flex-col justify-center bg-blue-600 dark:bg-blue-500 transition-all duration-500"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>
        
        {/* Step indicators */}
        <div className="flex justify-between">
          {steps.map((step) => (
            <div key={step.id} className="text-center">
              <button
                onClick={() => onStepChange(step.id)}
                className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  step.id <= currentStep
                    ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.id < currentStep ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.id
                )}
              </button>
              <div className="text-sm mt-2 font-medium text-gray-700 dark:text-gray-300">
                {step.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {step.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContentCreationSteps; 
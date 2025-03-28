"use client";

import React from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { Check, ChevronRight, Settings, Beaker, FilePlus } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
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
      title: safeTranslate('createPage.steps.step1', 'Content Type'), 
      description: safeTranslate('contentType.defineDetails', 'Define your content details'),
      icon: <Settings className="w-5 h-5" />
    },
    { 
      id: 2, 
      title: safeTranslate('researchPage.title', 'Content Research'), 
      description: safeTranslate('contentCreationSteps.researchDescription', 'Gather insights & trends'),
      icon: <Beaker className="w-5 h-5" />
    },
    { 
      id: 3, 
      title: safeTranslate('contentPage.title', 'Content Generator'), 
      description: safeTranslate('contentCreationSteps.contentDescription', 'Create & edit content'),
      icon: <FilePlus className="w-5 h-5" />
    }
  ];

  return (
    <div className="mb-10">
      <div className="relative">
        {/* Progress bar - enhanced with gradient */}
        <div className="overflow-hidden h-2 mb-6 flex rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="shadow-none flex flex-col justify-center bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 transition-all duration-500 ease-in-out"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>
        
        {/* Step indicators - enhanced with better visuals */}
        <div className="flex justify-between relative">
          {/* Connector lines */}
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 z-0"></div>
          
          {steps.map((step) => (
            <div key={step.id} className="text-center z-10 relative">
              <button
                onClick={() => onStepChange(step.id)}
                className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center border-2 transition-all duration-300 transform ${
                  step.id === currentStep 
                    ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 dark:border-blue-500 dark:from-blue-500 dark:to-indigo-500 text-white shadow-lg scale-110'
                    : step.id < currentStep
                    ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                disabled={step.id > currentStep + 1}
              >
                {step.id < currentStep ? (
                  <Check className="w-6 h-6" />
                ) : (
                  step.icon
                )}
              </button>
              
              <div className={`mt-3 transition-all duration-300 ${
                step.id === currentStep ? 'opacity-100' : 'opacity-70'
              }`}>
                <div className={`text-sm font-medium ${
                  step.id === currentStep 
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {step.description}
                </div>
              </div>
              
              {/* Show connector arrow for current step */}
              {step.id === currentStep && step.id < steps.length && (
                <div className="absolute right-0 top-6 transform translate-x-1/2 text-gray-400 dark:text-gray-500 hidden md:block">
                  <ChevronRight className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContentCreationSteps; 
import React from 'react';

interface ExpandCollapseButtonProps {
  isExpanded: boolean;
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'text';
}

/**
 * Standardized button for expanding/collapsing content
 */
const ExpandCollapseButton: React.FC<ExpandCollapseButtonProps> = ({
  isExpanded,
  onClick,
  className = '',
  variant = 'default'
}) => {
  // Base classes for all variants
  const baseClasses = 'text-sm font-medium transition-colors focus:outline-none';
  
  // Variant-specific classes
  const variantClasses = {
    default: 'bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-md',
    outline: 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-md',
    text: 'text-blue-600 hover:text-blue-800'
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      aria-label={isExpanded ? 'Collapse content' : 'Expand content'}
    >
      {/* Icon based on state */}
      <span className="flex items-center">
        {isExpanded ? (
          <>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Collapse
          </>
        ) : (
          <>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Expand
          </>
        )}
      </span>
    </button>
  );
};

export default ExpandCollapseButton; 
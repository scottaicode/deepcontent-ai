'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Define all possible props
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  fullWidth?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  animate?: boolean;
}

/**
 * Modern Button Component
 * 
 * A versatile button component that follows the UI/UX paradigm shift principles.
 * Features animations, multiple variants, and responsive design.
 */
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = 'md',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  onClick,
  href,
  external = false,
  type = 'button',
  icon,
  iconPosition = 'left',
  className = '',
  animate = true,
}) => {
  // Base styles that apply to all variants
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size specific classes
  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    xl: 'px-6 py-3 text-lg',
  };
  
  // Rounded corner classes
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };
  
  // Variant specific classes
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 dark:active:bg-blue-800',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 dark:active:bg-gray-500',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 focus:ring-gray-500',
    text: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 active:bg-blue-100 dark:active:bg-blue-900/30 focus:ring-blue-500',
    gradient: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 focus:ring-blue-500',
  };
  
  // Width and disabled classes
  const widthClasses = fullWidth ? 'w-full' : '';
  const disabledClasses = disabled || isLoading ? 'opacity-60 cursor-not-allowed' : '';

  // Shadow effects for depth
  const shadowClasses = variant !== 'text' && variant !== 'outline' 
    ? 'shadow-sm hover:shadow' 
    : '';
  
  // Animation variants for the button
  const buttonVariants = {
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98, transition: { duration: 0.1 } }
  };

  // Motion props only applied when animate is true and button is not disabled
  const motionProps = animate && !disabled && !isLoading ? {
    whileHover: "hover",
    whileTap: "tap",
    variants: buttonVariants,
  } : {};

  // Loading spinner component
  const LoadingSpinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  // Construct component based on props
  const Component = animate ? motion.button : 'button';

  // Render content with appropriate icon positioning
  const renderContent = () => (
    <>
      {isLoading && <LoadingSpinner />}
      {!isLoading && icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
    </>
  );

  // If href is provided, render as Link component
  if (href) {
    const LinkComponent = animate ? motion.a : 'a';
    
    return (
      <Link href={href} passHref legacyBehavior>
        <LinkComponent
          className={`
            ${baseClasses}
            ${sizeClasses[size]}
            ${roundedClasses[rounded]}
            ${variantClasses[variant]}
            ${widthClasses}
            ${disabledClasses}
            ${shadowClasses}
            ${className}
          `}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          onClick={disabled || isLoading ? undefined : onClick}
          {...motionProps}
        >
          {renderContent()}
        </LinkComponent>
      </Link>
    );
  }

  // Otherwise render as button
  return (
    <Component
      type={type}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${roundedClasses[rounded]}
        ${variantClasses[variant]}
        ${widthClasses}
        ${disabledClasses}
        ${shadowClasses}
        ${className}
      `}
      onClick={disabled || isLoading ? undefined : onClick}
      disabled={disabled || isLoading}
      {...motionProps}
    >
      {renderContent()}
    </Component>
  );
};

export default Button; 
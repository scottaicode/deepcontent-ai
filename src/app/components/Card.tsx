'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  depth?: 'flat' | 'raised' | 'floating';
  variant?: 'default' | 'primary' | 'gradient' | 'glass';
  padding?: 'none' | 'small' | 'medium' | 'large';
  border?: boolean;
  rounded?: 'none' | 'small' | 'medium' | 'large' | 'full';
  animate?: boolean;
  onClick?: () => void;
  hoverEffect?: boolean;
}

/**
 * Modern Card Component
 * 
 * A versatile card component that follows the UI/UX paradigm shift principles.
 * Features glass-morphism, depth effects, animations, and various styling options.
 */
const Card: React.FC<CardProps> = ({
  children,
  className = '',
  depth = 'flat',
  variant = 'default',
  padding = 'medium',
  border = true,
  rounded = 'medium',
  animate = false,
  onClick,
  hoverEffect = true,
}) => {
  // Define classes based on props
  const depthClasses = {
    flat: 'shadow-none',
    raised: 'shadow-md dark:shadow-gray-900/30',
    floating: 'shadow-xl dark:shadow-gray-900/30',
  };

  const variantClasses = {
    default: 'bg-white dark:bg-gray-800',
    primary: 'bg-blue-50 dark:bg-blue-900/20',
    gradient: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850',
    glass: 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg',
  };

  const paddingClasses = {
    none: 'p-0',
    small: 'p-3',
    medium: 'p-5',
    large: 'p-7',
  };

  const roundedClasses = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-xl',
    large: 'rounded-2xl',
    full: 'rounded-full',
  };

  const borderClass = border 
    ? 'border border-gray-100 dark:border-gray-700' 
    : '';

  const clickableClass = onClick 
    ? 'cursor-pointer transition-transform' 
    : '';

  const hoverClass = hoverEffect && onClick
    ? 'hover:shadow-lg hover:-translate-y-1 transition-all duration-300' 
    : '';

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1.0],
      }
    },
    hover: { 
      y: -5,
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      transition: { 
        duration: 0.2,
        ease: 'easeOut',
      }
    },
    tap: { 
      scale: 0.98,
      transition: { 
        duration: 0.1,
      }
    }
  };

  // Base element to use - motion.div if animated, regular div if not
  const Component = animate ? motion.div : 'div';

  // Motion props only applied when animate is true
  const motionProps = animate ? {
    initial: "hidden",
    animate: "visible",
    whileHover: hoverEffect && onClick ? "hover" : undefined,
    whileTap: onClick ? "tap" : undefined,
    variants: cardVariants,
  } : {};

  return (
    <Component
      className={`
        ${depthClasses[depth]}
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${roundedClasses[rounded]}
        ${borderClass}
        ${clickableClass}
        ${hoverClass}
        ${className}
        transition-all duration-300
      `}
      onClick={onClick}
      {...motionProps}
    >
      {children}
    </Component>
  );
};

export default Card; 
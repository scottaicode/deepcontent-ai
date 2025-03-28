"use client";

import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ToastProps } from '@/lib/hooks/useToast';

interface ToastComponentProps extends ToastProps {
  id: string;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastComponentProps> = ({
  id,
  title,
  description,
  variant = 'default',
  duration = 3000,
  onDismiss,
}) => {
  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  // Variant-specific styles
  const variantStyles = {
    default: 'bg-white border-gray-200 text-gray-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    destructive: 'bg-red-50 border-red-200 text-red-900',
  };

  return (
    <div
      className={`max-w-md w-full shadow-lg rounded-lg pointer-events-auto overflow-hidden border ${variantStyles[variant]}`}
    >
      <div className="flex items-start p-4">
        <div className="flex-1">
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="mt-1 text-sm opacity-90">{description}</p>
          )}
        </div>
        <button
          type="button"
          className={`ml-4 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none`}
          onClick={() => onDismiss(id)}
        >
          <span className="sr-only">Close</span>
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: (ToastProps & { id: string })[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 p-4 z-50 max-h-screen overflow-hidden pointer-events-none">
      <div className="flex flex-col space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}; 
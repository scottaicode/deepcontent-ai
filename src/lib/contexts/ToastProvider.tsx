"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ToastContainer } from '@/components/Toast';
import { ToastProps } from '@/lib/hooks/useToast';

interface ToastContextType {
  toast: (props: ToastProps) => void;
  success: (title: string, options?: Omit<ToastProps, 'title' | 'variant'>) => void;
  error: (title: string, options?: Omit<ToastProps, 'title' | 'variant'>) => void;
  info: (title: string, options?: Omit<ToastProps, 'title' | 'variant'>) => void;
  dismiss: (id: string) => void;
  isReady: boolean;
}

// Create a default context with no-op functions to avoid "not a function" errors
const defaultToastContext: ToastContextType = {
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  dismiss: () => {},
  isReady: false
};

const ToastContext = createContext<ToastContextType>(defaultToastContext);

export const useToastContext = () => {
  return useContext(ToastContext);
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([]);
  const [isReady, setIsReady] = useState(false);

  const toast = useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...props, id }]);
  }, []);

  // Add convenience methods
  const success = useCallback((title: string, options?: Omit<ToastProps, 'title' | 'variant'>) => {
    toast({ title, variant: 'success', ...options });
  }, [toast]);

  const error = useCallback((title: string, options?: Omit<ToastProps, 'title' | 'variant'>) => {
    toast({ title, variant: 'destructive', ...options });
  }, [toast]);

  const info = useCallback((title: string, options?: Omit<ToastProps, 'title' | 'variant'>) => {
    toast({ title, variant: 'default', ...options });
  }, [toast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Mark the toast system as ready after initial render
  useEffect(() => {
    // Small delay to ensure everything is mounted
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, dismiss, isReady }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}; 
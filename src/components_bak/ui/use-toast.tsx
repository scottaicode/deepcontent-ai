'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  status?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  isClosable?: boolean;
}

interface ToastContextProps {
  toasts: Toast[];
  toast: (props: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (props: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, ...props };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss
    if (props.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, props.duration || 5000);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, toast: addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const context = useContext(ToastContext);
  if (!context) return null;
  
  const { toasts, removeToast } = context;

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`p-4 rounded-md shadow-md animate-slide-in ${
            toast.status === 'error' ? 'bg-red-50 border border-red-200' :
            toast.status === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
            toast.status === 'info' ? 'bg-blue-50 border border-blue-200' :
            'bg-green-50 border border-green-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`font-medium ${
                toast.status === 'error' ? 'text-red-800' :
                toast.status === 'warning' ? 'text-yellow-800' :
                toast.status === 'info' ? 'text-blue-800' :
                'text-green-800'
              }`}>
                {toast.title}
              </h3>
              {toast.description && (
                <p className={`text-sm mt-1 ${
                  toast.status === 'error' ? 'text-red-600' :
                  toast.status === 'warning' ? 'text-yellow-600' :
                  toast.status === 'info' ? 'text-blue-600' :
                  'text-green-600'
                }`}>
                  {toast.description}
                </p>
              )}
            </div>
            {toast.isClosable !== false && (
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close toast"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Add CSS for animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in {
      animation: slide-in 0.3s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
} 
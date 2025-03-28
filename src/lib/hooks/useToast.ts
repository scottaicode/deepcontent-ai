import { useToastContext } from '@/lib/contexts/ToastProvider';

export type ToastVariant = 'default' | 'success' | 'destructive';

export interface ToastProps {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastContextValue {
  toast: (props: ToastProps) => void;
  success: (title: string, options?: Omit<ToastProps, 'title' | 'variant'>) => void;
  error: (title: string, options?: Omit<ToastProps, 'title' | 'variant'>) => void;
  info: (title: string, options?: Omit<ToastProps, 'title' | 'variant'>) => void;
  dismiss: (id: string) => void;
  isReady: boolean;
}

export function useToast(): ToastContextValue {
  return useToastContext();
} 
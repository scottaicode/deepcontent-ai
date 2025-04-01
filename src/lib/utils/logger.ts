/**
 * Simple logging utility for both development and production environments
 */

// Define log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;

/**
 * Logger function that handles different environments appropriately
 */
export const logger = {
  debug: (message: string, data?: any) => {
    if (!isProduction) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  },
  
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data || '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '');
  },
  
  error: (message: string, error?: any) => {
    // In production, log with additional context for better debugging
    if (isProduction) {
      console.error(`[ERROR] ${message}`, {
        timestamp: new Date().toISOString(),
        error: error instanceof Error 
          ? { 
              message: error.message, 
              stack: error.stack,
              name: error.name 
            } 
          : error,
        environment: isVercel ? 'vercel' : 'production'
      });
    } else {
      console.error(`[ERROR] ${message}`, error || '');
    }
    
    // Additional production error handling could be added here
    // Such as sending to a monitoring service
  }
};

export default logger; 
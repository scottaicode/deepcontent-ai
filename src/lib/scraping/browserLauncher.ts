/**
 * Browser launcher utility for web scraping
 * Supports both Vercel serverless environment and local development
 */

import * as playwright from 'playwright';
import chromium from '@sparticuz/chromium-min'; // Import chromium for serverless

// Detect if we're running on Vercel
const isVercel = process.env.VERCEL === '1';

// Define a generic interface that works with both libraries
export interface BrowserPage {
  goto: (url: string, options?: any) => Promise<any>;
  waitForSelector: (selector: string, options?: any) => Promise<any>;
  evaluate: <T = any>(fnOrSelector: Function | string, ...args: any[]) => Promise<T>;
  content: () => Promise<string>;
  $: (selector: string) => Promise<any>;
  $$: (selector: string) => Promise<any[]>;
  close: () => Promise<void>;
  setDefaultNavigationTimeout: (timeout: number) => void;
}

export interface Browser {
  newPage: () => Promise<BrowserPage>;
  close: () => Promise<void>;
}

/**
 * Launch a headless browser that works in both Vercel and local environments
 */
export async function launchBrowser(): Promise<Browser> {
  console.log('Launching browser in', isVercel ? 'Vercel' : 'local environment');
  
  let browser: playwright.Browser;
  
  try {
    if (isVercel) {
      console.log('Using @sparticuz/chromium-min for Vercel environment');
      const executablePath = await chromium.executablePath();
      
      if (!executablePath) {
        throw new Error('Could not find Chromium executable for Vercel environment.');
      }
      
      console.log(`Chromium executable path: ${executablePath}`);
      // console.log(`Chromium args: ${chromium.args.join(' ')}`); // Redundant now
      
      // Combine args from library with the user-data-dir arg for Vercel
      const launchArgs = [
        ...chromium.args,
        '--user-data-dir=/tmp/chromium-user-data', // Use /tmp for user data
        '--data-path=/tmp/chromium-data-path',      // Use /tmp for data path
        '--disk-cache-dir=/tmp/chromium-cache-dir'  // Use /tmp for cache
      ];
      
      console.log(`Final launch args: ${launchArgs.join(' ')}`);

      // Log environment details before launch
      console.log('Current Working Directory:', process.cwd());
      console.log('Env HOME:', process.env.HOME);
      console.log('Env PWD:', process.env.PWD);
      console.log('Env LAMBDA_TASK_ROOT:', process.env.LAMBDA_TASK_ROOT);
      console.log('Env TMPDIR:', process.env.TMPDIR);
      console.log('Env XDG_CACHE_HOME:', process.env.XDG_CACHE_HOME);
      console.log('Env XDG_CONFIG_HOME:', process.env.XDG_CONFIG_HOME);
      console.log('Env XDG_DATA_HOME:', process.env.XDG_DATA_HOME);
      console.log('Attempting browser launch...');

      browser = await playwright.chromium.launch({
        args: launchArgs, // Use combined args
        executablePath: executablePath,
        headless: true, // Ensure headless is true for Vercel
      });
    } else {
      // Use standard Playwright launch for local development
      console.log('Using local Playwright chromium installation');
      browser = await playwright.chromium.launch({
        headless: true,
      });
    }
    
    return {
      newPage: async () => {
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          viewport: { width: 1920, height: 1080 },
        });
        
        const page = await context.newPage();
        
        // Set timeout for navigation - shorter for Vercel
        page.setDefaultNavigationTimeout(isVercel ? 20000 : 30000);
        
        // Create wrapped page with our interface
        const wrappedPage: BrowserPage = {
          goto: async (url, options) => await page.goto(url, options),
          waitForSelector: async (selector, options) => await page.waitForSelector(selector, options),
          evaluate: async <T = any>(fnOrSelector: Function | string, ...args: any[]): Promise<T> => {
            try {
              return await page.evaluate(fnOrSelector as any, ...args);
            } catch (error) {
              console.error('Evaluate error:', error);
              throw error;
            }
          },
          content: async () => await page.content(),
          $: async (selector) => await page.$(selector),
          $$: async (selector) => await page.$$(selector),
          setDefaultNavigationTimeout: (timeout) => page.setDefaultNavigationTimeout(timeout),
          close: async () => {
            await context.close();
          }
        };
        
        return wrappedPage;
      },
      close: async () => {
        await browser.close();
      }
    };
  } catch (error: unknown) {
    console.error('Failed to launch browser:', error);
    
    // Handle the error with proper type checking
    if (error instanceof Error) {
      throw new Error(`Browser launch failed: ${error.message}`);
    } else {
      throw new Error('Browser launch failed: Unknown error');
    }
  }
} 
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
  // Log environment details immediately
  console.log('[DIAG] launchBrowser called.');
  console.log('[DIAG] isVercel:', isVercel);
  console.log('[DIAG] CWD:', process.cwd());
  console.log('[DIAG] Env HOME:', process.env.HOME);
  console.log('[DIAG] Env PWD:', process.env.PWD);
  console.log('[DIAG] Env LAMBDA_TASK_ROOT:', process.env.LAMBDA_TASK_ROOT);
  console.log('[DIAG] Env TMPDIR:', process.env.TMPDIR);
  console.log('[DIAG] Env XDG_CACHE_HOME:', process.env.XDG_CACHE_HOME);
  console.log('[DIAG] Env XDG_CONFIG_HOME:', process.env.XDG_CONFIG_HOME);
  console.log('[DIAG] Env XDG_DATA_HOME:', process.env.XDG_DATA_HOME);

  let browser: playwright.Browser;
  
  try {
    if (isVercel) {
      console.log('[DIAG] Vercel environment detected. Preparing sparticuz/chromium...');
      
      // Explicitly set HOME and TMPDIR to /tmp for serverless environment
      console.log('[DIAG] Setting process.env.HOME to /tmp');
      process.env.HOME = '/tmp';
      console.log('[DIAG] Setting process.env.TMPDIR to /tmp');
      process.env.TMPDIR = '/tmp';
      
      let executablePath: string | null = null;
      try {
        console.log('[DIAG] Attempting to get executablePath from chromium...');
        executablePath = await chromium.executablePath();
        console.log(`[DIAG] Chromium executablePath obtained: ${executablePath}`);
      } catch (execPathError) {
        console.error('[DIAG] Error getting executablePath from chromium:', execPathError);
        throw new Error(`Failed to get chromium executable path: ${execPathError instanceof Error ? execPathError.message : execPathError}`);
      }
      
      if (!executablePath) {
        throw new Error('Could not find Chromium executable for Vercel environment (executablePath is null).');
      }
      
      // Combine args
      const launchArgs = [
        ...chromium.args,
        '--user-data-dir=/tmp/chromium-user-data',
        '--data-path=/tmp/chromium-data-path',      
        '--disk-cache-dir=/tmp/chromium-cache-dir'  
      ];
      console.log(`[DIAG] Final launch args: ${launchArgs.join(' ')}`);
      
      try {
          console.log('[DIAG] Attempting playwright.chromium.launch...');
          browser = await playwright.chromium.launch({
            args: launchArgs, 
            executablePath: executablePath,
            headless: true, 
          });
          console.log('[DIAG] playwright.chromium.launch successful.');
      } catch(launchError) {
          console.error('[DIAG] Error during playwright.chromium.launch:', launchError);
          // Re-throw the specific launch error with more context
          throw new Error(`Playwright launch failed within Vercel block: ${launchError instanceof Error ? launchError.message : launchError}`);
      }

    } else {
      // Local development launch
      console.log('[DIAG] Local environment detected. Using local Playwright chromium installation');
      try {
          browser = await playwright.chromium.launch({
            headless: true,
          });
          console.log('[DIAG] Local playwright.chromium.launch successful.');
      } catch (localLaunchError) {
          console.error('[DIAG] Error during local playwright.chromium.launch:', localLaunchError);
          throw new Error(`Local Playwright launch failed: ${localLaunchError instanceof Error ? localLaunchError.message : localLaunchError}`);
      }
    }
    
    // Return browser wrapper
    console.log('[DIAG] Browser launch process seemingly successful. Returning browser wrapper.')
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
    // Catch errors from getting executablePath or the specific launch blocks
    console.error('[DIAG] Overall error in launchBrowser:', error);
    if (error instanceof Error) {
      throw new Error(`Browser launch failed: ${error.message}`);
    } else {
      throw new Error('Browser launch failed: Unknown error');
    }
  }
} 
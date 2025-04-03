/**
 * Browser launcher utility for web scraping
 * Supports both Vercel serverless environment and local development
 * Uses chrome-aws-lambda on Vercel
 */

import puppeteer, { Browser as PuppeteerBrowser, Page as PuppeteerPage } from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';

// Detect if we're running on Vercel
const isVercel = process.env.VERCEL === '1';

// Define a generic interface compatible with Puppeteer's Page API
export interface BrowserPage {
  goto: (url: string, options?: any) => Promise<any>;
  waitForSelector: (selector: string, options?: any) => Promise<any>;
  evaluate: <T = any>(fn: Function | string, ...args: any[]) => Promise<T>;
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

export async function launchBrowser(): Promise<Browser> {
  // Log environment details immediately
  console.log('[DIAG] launchBrowser called (using chrome-aws-lambda).');
  console.log('[DIAG] isVercel:', isVercel);
  console.log('[DIAG] CWD:', process.cwd());
  console.log('[DIAG] Env HOME:', process.env.HOME);
  console.log('[DIAG] Env PWD:', process.env.PWD);
  console.log('[DIAG] Env LAMBDA_TASK_ROOT:', process.env.LAMBDA_TASK_ROOT);
  console.log('[DIAG] Env TMPDIR:', process.env.TMPDIR);
  // XDG vars might not be relevant but log anyway
  console.log('[DIAG] Env XDG_CACHE_HOME:', process.env.XDG_CACHE_HOME);
  console.log('[DIAG] Env XDG_CONFIG_HOME:', process.env.XDG_CONFIG_HOME);
  console.log('[DIAG] Env XDG_DATA_HOME:', process.env.XDG_DATA_HOME);

  let browser: PuppeteerBrowser;
  let executablePath: string | null = null;

  try {
    if (isVercel) {
      console.log('[DIAG] Vercel environment detected. Preparing chrome-aws-lambda...');
      
      // HOME/TMPDIR should be set to /tmp if needed by the library internally

      try {
        console.log('[DIAG] Attempting to get executablePath from chrome-aws-lambda...');
        executablePath = await chromium.executablePath;
        console.log(`[DIAG] chrome-aws-lambda executablePath obtained: ${executablePath}`);
      } catch (execPathError) {
        console.error('[DIAG] Error getting executablePath from chrome-aws-lambda:', execPathError);
        throw new Error(`Failed to get chromium executable path: ${execPathError instanceof Error ? execPathError.message : execPathError}`);
      }
      
      if (!executablePath) {
        // Fallback for safety, though executablePath should always be provided by chrome-aws-lambda
         console.warn('[DIAG] chrome-aws-lambda did not provide an executable path directly, trying default lookup (might fail)...');
         // Let puppeteer try default search path - likely won't work on Vercel but provides a fallback attempt
         executablePath = null;
      }
      
      const launchArgs = chromium.args;
      console.log(`[DIAG] Using args from chromium-aws-lambda: ${launchArgs.join(' ')}`);
      
      try {
          console.log('[DIAG] Attempting chromium.puppeteer.launch...');
          browser = await chromium.puppeteer.launch({
            args: launchArgs, 
            executablePath: executablePath || undefined, // Use path if found, else let puppeteer try default
            headless: true, // Explicitly set headless=true for Vercel
          });
          console.log('[DIAG] chrome-aws-lambda puppeteer.launch successful.');
      } catch(launchError) {
          console.error('[DIAG] Error during chrome-aws-lambda puppeteer.launch:', launchError);
          throw new Error(`Puppeteer launch failed within Vercel block: ${launchError instanceof Error ? launchError.message : launchError}`);
      }

    } else {
      // Local development launch - use puppeteer-core, needs local Chrome/Chromium
      console.log('[DIAG] Local environment detected. Attempting local Puppeteer/Chrome launch');
      try {
          browser = await puppeteer.launch({
             headless: true,
             // You might need to provide executablePath to your local Chrome/Chromium here
             // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' // Example for MacOS
          });
          console.log('[DIAG] Local puppeteer.launch successful.');
      } catch (localLaunchError) {
          console.error('[DIAG] Error during local puppeteer.launch:', localLaunchError);
          throw new Error(`Local Puppeteer launch failed: ${localLaunchError instanceof Error ? localLaunchError.message : localLaunchError}`);
      }
    }
    
    // Return browser wrapper - adapted for Puppeteer
    console.log('[DIAG] Browser launch process seemingly successful. Returning browser wrapper.')
    return {
      newPage: async () => {
        const page: PuppeteerPage = await browser.newPage();
        
        // Set User Agent and Viewport
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Set timeout for navigation
        page.setDefaultNavigationTimeout(isVercel ? 20000 : 30000);
        
        // Create wrapped page with our interface (API is very similar)
        const wrappedPage: BrowserPage = {
          goto: async (url, options) => await page.goto(url, options),
          waitForSelector: async (selector, options) => await page.waitForSelector(selector, options),
          evaluate: async <T = any>(fn: Function | string, ...args: any[]): Promise<T> => {
            try {
              // Puppeteer expects a function for evaluate
              if (typeof fn === 'string') {
                  // Basic handling if a string selector is passed; adjust if needed
                  console.warn('[DIAG] evaluate called with string, direct execution not standard in Puppeteer');
                  return await page.evaluate(new Function(fn) as any, ...args);
              } 
              return await page.evaluate(fn as any, ...args);
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
            // In Puppeteer, pages are closed directly, not contexts
            await page.close();
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
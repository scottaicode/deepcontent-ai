import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;
const SUPPORTED_LOCALES = ['en', 'es'];
const DEFAULT_LOCALE = 'en';

/**
 * Enhanced middleware to handle language detection and cookie setting
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // --- Locale detection --- 
  const url = new URL(request.url);
  const langParam = url.searchParams.get('lang');
  const cookieLang = request.cookies.get('preferred_language')?.value || request.cookies.get('language')?.value;
  const browserLang = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];
  
  let detectedLocale = langParam || cookieLang || browserLang || DEFAULT_LOCALE;
  if (!SUPPORTED_LOCALES.includes(detectedLocale)) {
    detectedLocale = DEFAULT_LOCALE;
  }

  console.log('[MiddlewareDebug] Detected locale:', detectedLocale);
  
  // --- Prepare response (NO REWRITE) --- 
  const response = NextResponse.next(); // Proceed without changing the path

  // --- Set cookies and headers --- 
  // Set cookies if necessary to ensure consistency
  if (request.cookies.get('language')?.value !== detectedLocale) {
    response.cookies.set('language', detectedLocale, { path: '/', maxAge: 60*60*24*365, sameSite: 'lax' });
  }
  if (request.cookies.get('preferred_language')?.value !== detectedLocale) {
    response.cookies.set('preferred_language', detectedLocale, { path: '/', maxAge: 60*60*24*365, sameSite: 'lax' });
  }
  response.headers.set('x-language', detectedLocale);
  
  console.log(`[MiddlewareDebug] Passing through path "${pathname}" with locale "${detectedLocale}"`);

  return response;
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    // Match all routes except static files and API
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 
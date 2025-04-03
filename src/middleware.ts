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

  // Check if pathname already has a supported locale prefix
  const pathnameHasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // If locale is already in path, just set cookies/headers and continue
    const currentLocale = pathname.split('/')[1];
    const response = NextResponse.next();
    // Set cookies if necessary (using the locale from the path)
    if (request.cookies.get('language')?.value !== currentLocale) {
      response.cookies.set('language', currentLocale, { path: '/', maxAge: 60*60*24*365, sameSite: 'lax' });
    }
    if (request.cookies.get('preferred_language')?.value !== currentLocale) {
      response.cookies.set('preferred_language', currentLocale, { path: '/', maxAge: 60*60*24*365, sameSite: 'lax' });
    }
    response.headers.set('x-language', currentLocale);
    console.log(`[MiddlewareDebug] Path already has locale (${currentLocale}). Proceeding.`);
    return response;
  }

  // --- Locale detection if prefix is missing --- 
  const url = new URL(request.url);
  const langParam = url.searchParams.get('lang');
  const cookieLang = request.cookies.get('preferred_language')?.value || request.cookies.get('language')?.value;
  const browserLang = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];
  
  let detectedLocale = langParam || cookieLang || browserLang || DEFAULT_LOCALE;
  if (!SUPPORTED_LOCALES.includes(detectedLocale)) {
    detectedLocale = DEFAULT_LOCALE;
  }

  console.log('[MiddlewareDebug] Detected locale for rewrite:', detectedLocale);

  // --- Rewrite the path to include the detected locale --- 
  // Construct the new URL: /<locale>/<original_path>
  const newUrl = request.nextUrl.clone();
  newUrl.pathname = `/${detectedLocale}${pathname}`; // Prepend locale
  
  const response = NextResponse.rewrite(newUrl);

  // Set cookies for future requests
  if (cookieLang !== detectedLocale) {
      response.cookies.set('language', detectedLocale, { path: '/', maxAge: 60*60*24*365, sameSite: 'lax' });
      response.cookies.set('preferred_language', detectedLocale, { path: '/', maxAge: 60*60*24*365, sameSite: 'lax' });
  }
  response.headers.set('x-language', detectedLocale);
  
  console.log(`[MiddlewareDebug] Rewriting path from "${pathname}" to "${newUrl.pathname}"`);

  return response;
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    // Match all routes except static files and API
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 
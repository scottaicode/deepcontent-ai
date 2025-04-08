import { NextRequest, NextResponse } from 'next/server';

/**
 * Enhanced middleware to handle language detection and cookie setting
 */
export function middleware(request: NextRequest) {
  // Skip handling for static assets
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Extract language from URL query params first (highest priority)
  const url = new URL(request.url);
  const langParam = url.searchParams.get('lang');
  
  // Get redirect count to prevent loops - completely skip language handling if we see a redirect_count
  const hasRedirectCount = url.searchParams.has('redirect_count');
  const redirectCount = parseInt(url.searchParams.get('redirect_count') || '0');
  
  // Completely skip language handling for any requests with redirect counts
  // This stops the middleware from potentially creating redirect chains
  if (hasRedirectCount || redirectCount > 0) {
    console.log('[MiddlewareDebug] Request has redirect_count parameter, skipping language handling');
    return NextResponse.next();
  }
  
  // Get language from cookies next
  const cookieLang = 
    request.cookies.get('preferred_language')?.value || 
    request.cookies.get('language')?.value;
  
  // Fallback to browser language
  const browserLang = request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];
  
  // Determine language with this priority: URL param > cookie > browser > default
  let language = langParam || cookieLang || browserLang || 'en';
  
  // Only allow our supported languages
  const supportedLanguage = ['en', 'es'].includes(language) ? language : 'en';
  
  console.log('[MiddlewareDebug] Language detection:', { 
    langParam, 
    cookieLang, 
    browserLang, 
    finalLanguage: supportedLanguage,
    url: request.url
  });
  
  const response = NextResponse.next();

  // Only set cookies if they differ from current or don't exist
  // This helps prevent endless loops due to cookie inconsistencies
  if (!request.cookies.has('preferred_language') || request.cookies.get('preferred_language')?.value !== supportedLanguage) {
    response.cookies.set('preferred_language', supportedLanguage, { 
      path: '/',
      sameSite: 'lax', 
      maxAge: 60 * 60 * 24 * 365 // 1 year
    });
  }
  
  if (!request.cookies.has('language') || request.cookies.get('language')?.value !== supportedLanguage) {
    response.cookies.set('language', supportedLanguage, { 
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    });
  }
  
  // Set language header for client-side access
  response.headers.set('x-language', supportedLanguage);
  
  // Set pathname header so the layout can know which route we're on
  response.headers.set('x-pathname', request.nextUrl.pathname);
  
  console.log('[MiddlewareDebug] Set cookies and headers:', {
    language: supportedLanguage,
    pathname: request.nextUrl.pathname,
    cookies: {
      preferred_language: response.cookies.get('preferred_language')?.value,
      language: response.cookies.get('language')?.value
    },
    headers: {
      'x-language': response.headers.get('x-language'),
      'x-pathname': response.headers.get('x-pathname')
    }
  });
  
  return response;
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 
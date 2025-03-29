import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  // Skip middleware for public files like images, fonts, etc.
  if (PUBLIC_FILE.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Get the preferred language from cookies or headers
  const language = 
    request.cookies.get('preferred_language')?.value || 
    request.cookies.get('language')?.value || 
    request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 
    'en';

  // Only handle languages we support
  const supportedLanguage = ['en', 'es'].includes(language) ? language : 'en';
  
  const response = NextResponse.next();

  // Set language cookies if they don't exist to ensure consistency
  if (!request.cookies.has('preferred_language')) {
    response.cookies.set('preferred_language', supportedLanguage, { 
      path: '/',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    });
  }
  
  if (!request.cookies.has('language')) {
    response.cookies.set('language', supportedLanguage, { 
      path: '/',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    });
  }
  
  // Set language in response headers for client-side access
  response.headers.set('x-language', supportedLanguage);
  
  return response;
}

export const config = {
  matcher: [
    // Skip API routes
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 
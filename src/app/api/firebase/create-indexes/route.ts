import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to redirect users to create Firebase indexes
 * This is a helper endpoint that redirects users to the Firebase console
 * with the correct URL parameters to create the required indexes
 */
export async function GET(request: NextRequest) {
  try {
    // Get the query parameter for the index type
    const searchParams = request.nextUrl.searchParams;
    const indexType = searchParams.get('type') || 'content';
    
    // Firebase project ID - this should be configured in your environment variables
    // For now, we extract it from the referer or use a default
    const referer = request.headers.get('referer') || '';
    const errorLinkMatch = referer.match(/console\.firebase\.google\.com\/v1\/r\/project\/([\w-]+)\/firestore/);
    const projectId = errorLinkMatch ? errorLinkMatch[1] : 'deepcontent-3a822'; // Default or extracted project ID
    
    // Build the Firebase console URL based on index type
    let redirectUrl: string;
    
    if (indexType === 'content') {
      // Index for content collection: userId ASC, createdAt DESC
      redirectUrl = `https://console.firebase.google.com/project/${projectId}/firestore/indexes?create_composite=Ckxwcm9qZWN0cy9kZWVwY29udGVudC0zYTgyMi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvY29udGVudC9pbmRleGVzL18QARABGAEiCgICAQgBEgQIAhADIhQKEHVzZXJJZARCCAgBEAEYASABIhYKCmNyZWF0ZWRBdAQQAxIICAEQARgBKAA=`;
    } else if (indexType === 'research') {
      // Index for research collection: userId ASC, createdAt DESC
      redirectUrl = `https://console.firebase.google.com/project/${projectId}/firestore/indexes?create_composite=Ckdwcm9qZWN0cy9kZWVwY29udGVudC0zYTgyMi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcmVzZWFyY2gvEAEaEgoOEgpjcmVhdGVkQXQQAxgBIhQKEHVzZXJJZARCCAgBEAEYASABIhYKCmNyZWF0ZWRBdAQQAxIICAEQARgBKAA=`;
    } else {
      // If no valid type is specified, redirect to the Firebase console indexes page
      redirectUrl = `https://console.firebase.google.com/project/${projectId}/firestore/indexes`;
    }
    
    // Return a redirect response
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in create-indexes API route:', error);
    return NextResponse.json(
      { error: 'Failed to generate index creation redirect', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // POST method for accepting the direct error URL from the client
  try {
    const body = await request.json();
    const { errorUrl } = body;
    
    if (!errorUrl) {
      return NextResponse.json(
        { error: 'Missing errorUrl parameter' },
        { status: 400 }
      );
    }
    
    // Return a redirect response to the error URL
    return NextResponse.redirect(errorUrl);
  } catch (error) {
    console.error('Error in create-indexes API route:', error);
    return NextResponse.json(
      { error: 'Failed to process index creation request', details: String(error) },
      { status: 500 }
    );
  }
} 
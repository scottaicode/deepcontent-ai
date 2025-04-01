export function getSampleResearch(
  topic: string,
  context: string,
  trendingTopics: any[] = []
): string {
  // Log that this function is being called - this should not happen in production
  console.error('getSampleResearch was called - this should not be used in production');
  
  // Return an error message instead of generating fallback content
  return `
# API ERROR: Claude API Unavailable

The Claude API is currently unavailable. Please check your API configuration and try again.

Required configuration:
- Set a valid ANTHROPIC_API_KEY in your .env.local file
- Ensure you have sufficient API credits
- Check your network connection

No fallback content will be generated as this application requires high-quality, AI-generated research.
  `;
}

export function getGenericContentResearch(
  audience: string, 
  contentType: string, 
  platform: string
): string {
  // Log that this function is being called - this should not happen in production
  console.error('getGenericContentResearch was called - this should not be used in production');
  
  // Return an error message instead of generating fallback content
  return `
# API ERROR: Content Generation API Unavailable

The content generation API is currently unavailable. Please check your API configuration and try again.

Required configuration:
- Set a valid ANTHROPIC_API_KEY in your .env.local file
- Ensure you have sufficient API credits
- Check your network connection

No fallback content will be generated as this application requires high-quality, AI-generated content.
  `;
}

// Delete all other functions - we should not have any company-specific functions
// End of file 
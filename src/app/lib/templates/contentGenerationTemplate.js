/**
 * Content Generation Function Template
 * 
 * This file provides a template for creating new content generation functions
 * that adhere to DeepContent's research-driven architecture.
 * 
 * DO NOT USE THIS FILE DIRECTLY - Copy the template and modify as needed.
 */

/**
 * Template for content generation functions that follow the research-driven approach
 * 
 * @param {string} contentType - Type of content to generate (e.g., "blog post", "social media post")
 * @param {string} platform - Platform where content will be published (e.g., "Instagram", "LinkedIn")
 * @param {string} audience - Target audience for the content
 * @param {string} researchData - REQUIRED: Research data from Perplexity API that includes current best practices
 * @param {Object} additionalParams - Additional parameters specific to this content type
 * @param {string} style - Content style (e.g., "professional", "casual")
 * @returns {Promise<string>} - Generated content
 * 
 * @example
 * // This follows the research-driven approach where content format is determined by research
 * const blogPost = await generateBlogPost(
 *   "Blog Post",
 *   "Medium",
 *   "Tech professionals",
 *   perplexityResearchData, // Research data is REQUIRED
 *   { topic: "AI trends", keywords: ["machine learning", "neural networks"] },
 *   "professional"
 * );
 */
async function generateContentTemplate(
  contentType,
  platform,
  audience,
  researchData, // REQUIRED for research-driven approach
  additionalParams = {},
  style = 'professional'
) {
  // VALIDATION: Ensure research data is provided
  if (!researchData || typeof researchData !== 'string' || researchData.length < 100) {
    throw new Error('Research data is required for research-driven content generation');
  }
  
  // Build prompt with research data
  const prompt = `
    Generate a ${contentType} for ${platform} targeting ${audience}.
    
    Base the content structure and format on these current best practices:
    ${researchData}
    
    Additional parameters:
    ${JSON.stringify(additionalParams)}
    
    Style: ${style}
  `;
  
  // Call content generation API
  const response = await callContentGenerationAPI(prompt);
  
  return response;
}

/**
 * Example implementation of a content generation function following research-driven approach
 * 
 * @param {string} platform - Platform where the post will be published
 * @param {string} audience - Target audience for the post
 * @param {string} researchData - REQUIRED: Research data from Perplexity API
 * @param {Object} additionalParams - Additional parameters
 * @returns {Promise<string>} - Generated social media post
 */
async function generateSocialMediaPost(
  platform,
  audience,
  researchData, // REQUIRED for research-driven approach
  additionalParams = {}
) {
  // VALIDATION: Ensure research data is provided
  if (!researchData || typeof researchData !== 'string' || researchData.length < 100) {
    throw new Error('Research data is required for research-driven content generation');
  }
  
  // Extract platform-specific best practices from research
  const platformBestPractices = extractPlatformBestPractices(researchData, platform);
  
  // Build prompt that allows Claude to determine the best format based on research
  const prompt = `
    Generate a social media post for ${platform} targeting ${audience}.
    
    Base your content structure and format on these current best practices for ${platform}:
    ${platformBestPractices}
    
    Topic: ${additionalParams.topic || 'general'}
    Keywords: ${additionalParams.keywords ? additionalParams.keywords.join(', ') : 'none'}
    
    Important: Format the content according to the best practices for ${platform} as detailed in the research.
    Do not use a generic format - use specifically what works best for ${platform}.
  `;
  
  // Call content generation API
  const response = await callClaudeAPI(prompt);
  
  return response;
}

/**
 * Helper function to extract platform-specific best practices from research data
 * 
 * @param {string} researchData - Research data from Perplexity
 * @param {string} platform - Platform to extract best practices for
 * @returns {string} - Platform-specific best practices
 */
function extractPlatformBestPractices(researchData, platform) {
  // Look for sections about the platform
  const regex = new RegExp(`${platform}[^.!?]*best practices[^.!?]*[.!?]`, 'gi');
  const matches = researchData.match(regex) || [];
  
  if (matches.length > 0) {
    return matches.join('\n\n');
  }
  
  // If no specific section found, return general best practices
  return researchData;
}

// Mock API call for template purposes
async function callClaudeAPI(prompt) {
  // In a real implementation, this would call Claude API
  return "Generated content based on research-driven approach";
}

// Export template functions
module.exports = {
  generateContentTemplate,
  generateSocialMediaPost,
  extractPlatformBestPractices
}; 
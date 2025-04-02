/**
 * Perplexity API Client
 * 
 * This class provides methods for interacting with the Perplexity API,
 * including generating research on specific topics.
 */

export class PerplexityClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.perplexity.ai/chat/completions';
  private model: string = 'sonar-medium-online';  // Use Sonar model as per working backup
  
  constructor(apiKey: string) {
    // Validate API key
    if (!apiKey) {
      console.error('[DIAGNOSTIC] CRITICAL ERROR: Perplexity API key is missing');
      throw new Error('Perplexity API key is missing. Please add PERPLEXITY_API_KEY to your environment variables.');
    }
    
    if (!apiKey.startsWith('pplx-')) {
      console.error('[DIAGNOSTIC] CRITICAL ERROR: Invalid Perplexity API key format');
      throw new Error('Invalid Perplexity API key format. Key should start with "pplx-".');
    }
    
    console.log('[DIAGNOSTIC] Perplexity API key validation passed in client constructor');
    this.apiKey = apiKey;
  }
  
  /**
   * Generate research on a specific topic using Perplexity API
   */
  async generateResearch(prompt: string, options: any = {}): Promise<string> {
    // Get configuration options with defaults
    const maxTokens = options.maxTokens || 4000;
    const temperature = options.temperature || 0.2;
    const timeoutMs = options.timeoutMs || 240000; // 4 minutes timeout
    const language = options.language || 'en';
    
    // Create current date formatting for citations
    const currentDate = new Date();
    const formattedDate = `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    
    // Extract company name from prompt for system prompt enhancement
    let companyName = '';
    const companyMatch = prompt.match(/company-specific information about "(.*?)"/i);
    if (companyMatch && companyMatch[1]) {
      companyName = companyMatch[1];
      console.log('[DIAGNOSTIC] Detected company name from prompt:', companyName);
    }
    
    // Create language-specific instructions
    const languageSpecificInstructions = language === 'es' 
      ? `Proporcione una investigación detallada y bien estructurada en español. Incluya citas y fuentes actuales.`
      : `Provide detailed, well-structured research in English. Include citations and current sources.`;
    
    // Create an enhanced system prompt
    const systemPrompt = 
      `You are a research assistant that provides comprehensive, accurate, and detailed responses based on the latest available information. 
      
      ${languageSpecificInstructions}
      
      ${companyName ? `When researching the company ${companyName}, prioritize information from their official website, LinkedIn page, and social media accounts.` : ''}
      
      Your research should be well-organized with clear headings and include specific, actionable insights.`;
    
    console.log('[DIAGNOSTIC] Perplexity API request configuration:', {
      model: this.model,
      maxTokens,
      temperature,
      language
    });
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      // Configure request body for Sonar model - updated based on successful backup
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      };
      
      // Call API
      console.log(`[DIAGNOSTIC] Calling Perplexity API with ${prompt.length} character prompt...`);
      console.log(`[DIAGNOSTIC] API key being used (first 8 chars): ${this.apiKey.substring(0, 8)}...`);
      
      const startTime = Date.now();
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      const requestDuration = Date.now() - startTime;
      console.log(`[DIAGNOSTIC] Perplexity API response received in ${requestDuration}ms, status: ${response.status}`);
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Check response
      if (!response.ok) {
        // Try to get error details from response
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
          console.error('[DIAGNOSTIC] API error response body:', errorData);
        } catch (e) {
          errorText = await response.text();
          console.error('[DIAGNOSTIC] API error response text:', errorText);
        }
        
        // Create appropriate error based on status code
        if (response.status === 401) {
          console.error('[DIAGNOSTIC] Perplexity API authentication failed with 401 status');
          throw new Error(`Authentication error: API key may be invalid or expired (${response.status})`);
        } else if (response.status === 429) {
          console.error('[DIAGNOSTIC] Perplexity API rate limit exceeded with 429 status');
          throw new Error(`Rate limit exceeded: Too many requests (${response.status})`);
        } else if (response.status >= 500) {
          console.error(`[DIAGNOSTIC] Perplexity API server error (${response.status})`);
          throw new Error(`Perplexity API server error (${response.status}): ${errorText}`);
        } else {
          console.error(`[DIAGNOSTIC] Perplexity API error: ${response.status} ${response.statusText}`);
          throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }
      
      // Parse response
      const data = await response.json();
      console.log('[DIAGNOSTIC] Perplexity API response received successfully and parsed as JSON');
      
      // Extract research content
      const research = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';
        
      if (!research) {
        console.error('[DIAGNOSTIC] No research content found in API response');
        throw new Error('No research content found in API response');
      }
      
      // Log success
      console.log(`[DIAGNOSTIC] Successfully extracted research content, length: ${research.length} characters`);
      
      return research;
    } catch (error: any) {
      // Clear timeout if it exists
      clearTimeout(timeoutId);
      
      // Enhanced error handling
      console.error('[DIAGNOSTIC] Error in Perplexity API request:', error);
      console.error('[DIAGNOSTIC] Error details:', error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : 'Unknown error type');
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout: The API request exceeded the ${timeoutMs/1000} second timeout limit`);
      }
      
      // Network errors
      if (error.message.includes('fetch failed') || error.message.includes('network')) {
        throw new Error(`Network error: Could not connect to Perplexity API - ${error.message}`);
      }
      
      // Re-throw the error with its original message
      throw error;
    }
  }
} 
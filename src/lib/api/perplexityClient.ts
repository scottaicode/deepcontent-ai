/**
 * Perplexity API Client
 * 
 * This class provides methods for interacting with the Perplexity API,
 * including generating research on specific topics.
 */

export class PerplexityClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.perplexity.ai/chat/completions';
  private model: string = 'sonar-deep-research';
  
  constructor(apiKey: string, options: any = {}) {
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
    
    // Set default model with fallbacks
    this.model = options.model || 'sonar-medium-chat'; // Using medium chat instead of deep research
  }
  
  /**
   * Generate research on a specific topic using Perplexity API
   */
  async generateResearch(prompt: string, options: any = {}): Promise<string> {
    // Get configuration options with defaults
    const maxTokens = options.maxTokens || 4000;
    const temperature = options.temperature || 0.2;
    const timeoutMs = options.timeoutMs || 270000; // 4.5 minutes timeout (increased from 4 min)
    const language = options.language || 'en';
    
    // Define model fallback chain
    const modelFallbacks = [
      this.model,                // First try with constructor-set model
      'sonar-medium-chat',       // Medium chat model
      'sonar-small-chat',        // Small chat model
      'mistral-7b-instruct'      // Mistral model as last resort
    ];
    
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
      language,
      timeoutMs,
      modelFallbacks: modelFallbacks.join(', ')
    });
    
    // Try each model in the fallback chain
    let lastError = null;
    for (const currentModel of modelFallbacks) {
      console.log(`[DIAGNOSTIC] Attempting request with model: ${currentModel}`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        // Configure request body
        const requestBody = {
          model: currentModel,
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
        console.log(`[DIAGNOSTIC] Calling Perplexity API with ${prompt.length} character prompt using model ${currentModel}...`);
        
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
        console.log(`[DIAGNOSTIC] Perplexity API response received in ${requestDuration}ms, status: ${response.status}, model: ${currentModel}`);
        
        // Clear timeout
        clearTimeout(timeoutId);
        
        // Check response
        if (!response.ok) {
          // Try to get error details from response
          let errorText = '';
          let errorData = {};
          try {
            errorData = await response.json();
            errorText = JSON.stringify(errorData);
            console.error('[DIAGNOSTIC] API error response body:', errorData);
          } catch (e) {
            errorText = await response.text();
            console.error('[DIAGNOSTIC] API error response text:', errorText);
          }
          
          // Create detailed error info
          const errorInfo = {
            status: response.status,
            statusText: response.statusText,
            model: currentModel,
            errorData,
            errorText
          };
          
          // For 500 errors, we'll try a different model
          if (response.status === 500) {
            console.log(`[DIAGNOSTIC] Server error (500) with model ${currentModel}, will try next model if available`);
            // Store error and continue to next model
            const customError: Error & { info?: any } = new Error(`Perplexity API server error (500) with model ${currentModel}: ${errorText}`);
            customError.info = errorInfo;
            lastError = customError;
            continue; // Skip to next model
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
        console.log(`[DIAGNOSTIC] Successfully extracted research content with model ${currentModel}, length: ${research.length} characters`);
        
        // If we reach here, we've successfully generated research with this model
        return research;
      } catch (error: any) {
        // Clear timeout if it exists
        clearTimeout(timeoutId);
        
        // Check if this is an AbortError (timeout)
        if (error.name === 'AbortError') {
          console.error(`[DIAGNOSTIC] Request timeout with model ${currentModel}, will try next model if available`);
          lastError = new Error(`Request timeout: The API request exceeded the ${timeoutMs/1000} second timeout limit with model ${currentModel}`);
          continue; // Try next model
        }
        
        // Network errors should also try next model
        if (error.message.includes('fetch failed') || error.message.includes('network')) {
          console.error(`[DIAGNOSTIC] Network error with model ${currentModel}, will try next model if available`);
          lastError = new Error(`Network error with model ${currentModel}: ${error.message}`);
          continue; // Try next model
        }
        
        // Enhanced error handling
        console.error('[DIAGNOSTIC] Error in Perplexity API request:', error);
        console.error('[DIAGNOSTIC] Error details:', error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error type');
        
        // Store error for potential re-throw if no models work
        lastError = error;
        
        // For other errors that aren't AbortError or network errors, we'll try the next model
        console.log(`[DIAGNOSTIC] Error with model ${currentModel}, trying next model`);
      }
    }
    
    // If we've tried all models and still have an error, throw the last error
    if (lastError) {
      console.error('[DIAGNOSTIC] All model attempts failed, throwing last error');
      throw lastError;
    }
    
    // This shouldn't happen, but just in case
    throw new Error('Failed to generate research with all available models');
  }
} 
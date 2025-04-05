/**
 * Perplexity API Client
 * 
 * This class provides methods for interacting with the Perplexity API,
 * including generating research on specific topics.
 */

export class PerplexityClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.perplexity.ai/chat/completions';
  private model: string = 'sonar-deep-research';  // Using sonar-deep-research for Perplexity Deep Research
  
  constructor(apiKey: string) {
    // Validate API key
    if (!apiKey) {
      throw new Error('Perplexity API key is missing. Please add PERPLEXITY_API_KEY to your environment variables.');
    }
    
    if (!apiKey.startsWith('pplx-')) {
      throw new Error('Invalid Perplexity API key format. Key should start with "pplx-".');
    }
    
    this.apiKey = apiKey;
  }
  
  /**
   * Generate research on a specific topic using Perplexity API
   */
  async generateResearch(prompt: string, options: any = {}): Promise<string> {
    // Get configuration options with defaults
    const {
      maxTokens = 4000,
      temperature = 0.2,
      timeoutMs = 180000, // 180 second timeout (3 minutes)
      language = 'en'
    } = options;
    
    // Determine system prompt based on language
    const systemPrompt = language === 'es' 
      ? "Eres un asistente de investigación experto que proporciona información detallada y útil. Generas contenido bien estructurado con títulos y secciones claras. Incluyes información relevante, datos estadísticos cuando están disponibles, y tendencias actuales. Tu investigación es exhaustiva y objetiva."
      : "You are an expert research assistant that provides detailed, helpful information. You generate well-structured content with clear headings and sections. You include relevant information, statistical data when available, and current trends. Your research is thorough and objective.";
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      // Configure request body for Sonar Deep Research model
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
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Check response
      if (!response.ok) {
        // Try to get error details from response
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
        } catch (e) {
          errorText = await response.text();
        }
        
        // Create appropriate error based on status code
        if (response.status === 401) {
          throw new Error(`Authentication error: API key may be invalid or expired (${response.status})`);
        } else if (response.status === 429) {
          throw new Error(`Rate limit exceeded: Too many requests (${response.status})`);
        } else if (response.status >= 500) {
          throw new Error(`Perplexity API server error (${response.status}): ${errorText}`);
        } else {
          throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }
      
      // Parse response
      const data = await response.json();
      
      // Extract research content
      const research = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';
      
      // Check for empty results
      if (!research) {
        throw new Error('Empty response from Perplexity API');
      }
      
      return research;
    } catch (error: any) {
      // Clear timeout if it hasn't already fired
      clearTimeout(timeoutId);
      
      // Handle abort errors
      if (error.name === 'AbortError') {
        throw new Error(`Perplexity API request timed out after ${timeoutMs}ms`);
      }
      
      // Re-throw all other errors
      throw error;
    }
  }
} 